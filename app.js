const Discord = require('discord.js');
const EventEmitter = require('events');
const ytdl = require('ytdl-core');
require('dotenv').config();
const db = require('monk')(process.env.DATABASE);
const collection = db.get(process.env.NAME);

const client = new Discord.Client();
const emitter = new EventEmitter();

const radio = require('./radio.json');
const clr = 0x84840c;
let avatar;

emitter.on('connect', async (data) => {
  const guild = client.guilds.cache.get(data.guild);
  const vc = guild.channels.cache.get(data.vc);
  const tc = guild.channels.cache.get(data.tc);

  const permissions = vc.permissionsFor(client.user);
  if (!permissions.has('CONNECT')) {
    return tc.send({
      embed: {
        color: clr,
        author: {
          name: client.user.username,
          icon_url: avatar,
        },
        description: `:warning: ***I need the permission to join into your voice channel!***`,
      },
    });
  }
  if (!permissions.has('SPEAK')) {
    return tc.send({
      embed: {
        color: clr,
        author: {
          name: client.user.username,
          icon_url: avatar,
        },
        description: `:warning: *** I need the permission to speak in your voice channel!***`,
      },
    });
  }

  let connection = await vc.join();
  let dispatcher = connection.play(
    data.radio.youtube
      ? ytdl(data.radio.link, { quality: 'highestaudio' })
      : data.radio.link
  );

  emitter.on('disconnect', () => {
    connection.disconnect();
    return;
  });

  dispatcher.on('error', () => {
    emitter.emit('refresh', data);
  });
  dispatcher.on('speaking', (v) => {
    if (!v) {
      emitter.emit('refresh', data);
    }
  });
});
emitter.on('refresh', async (data) => {
  emitter.emit('disconnect');
  setTimeout(() => {
    emitter.emit('connect', data);
  }, 1000);
});

client.once('ready', () => {
  avatar = client.user.displayAvatarURL();
  console.log(client.voice.connections);
  collection.find().then((data) => {
    data.forEach((i) => {
      emitter.emit('connect', i);
    });
  });
});

client.on('message', async (message) => {
  let pre = message.content.toLowerCase();
  if (!pre.startsWith(process.env.PREFIX) || message.author.bot) return;

  const textChannel = message.channel;
  const voiceChannel = message.member.voice.channel;

  const args = pre.slice(process.env.PREFIX.length).trim().split(/ +/);
  let command = args.shift();

  if (command === 'h' || command === 'help') {
    return textChannel.send({
      embed: {
        color: clr,
        author: {
          name: client.user.username,
          icon_url: avatar,
        },
        title: 'Help',
        description:
          'This bot is 24/7 unless you disconnect it.' +
          '\n\nFor listening to a radio add this bot to the voice channel you are joined in & type in the commands in a text channel (Bot log info in the same text channel)' +
          '\n\n:white_medium_small_square:  To see available genres & radios of a desired genre type in the commands below respectively:' +
          '\n*`' +
          process.env.PREFIX +
          ' dis' +
          '`*  **&**  *`' +
          process.env.PREFIX +
          ' dis <genre>`*' +
          '\n\n:white_medium_small_square:  For setting the radio you want use:' +
          '\n*`' +
          process.env.PREFIX +
          ' set <genre> <radio_number>`*' +
          '\n\n:white_medium_small_square:  For the current radio status use:' +
          '\n*`' +
          process.env.PREFIX +
          ' s' +
          '`*  **or**  *`' +
          process.env.PREFIX +
          ' status`*' +
          '\n\n:white_medium_small_square:  If you wish to disconnect the bot type in:' +
          '\n*`' +
          process.env.PREFIX +
          ' dc' +
          '`*  **or**  *`' +
          process.env.PREFIX +
          ' disconnect' +
          '`*  **or**  *`' +
          process.env.PREFIX +
          ' leave`*',
      },
    });
  } else if (command === 'dis' || command === 'display') {
    if (!args.length) {
      let genres = Object.keys(radio);
      let msg = '';
      genres.forEach((e, i, a) => {
        if (i === a.length - 1) {
          msg += '`' + e + '`';
        } else {
          msg += '`' + e + '`, ';
        }
      });
      msg +=
        '\n\n\nSelect the desired genre & use the command below to see the radios' +
        '```' +
        process.env.PREFIX +
        ' dis <genre>```' +
        'or```' +
        process.env.PREFIX +
        ' display <genre>```';
      return textChannel.send({
        embed: {
          color: clr,
          author: {
            name: client.user.username,
            icon_url: avatar,
          },
          title: 'Genres:',
          description: msg,
        },
      });
    } else {
      command = args.shift();
      let genres = Object.keys(radio);
      if (genres.includes(command)) {
        let genre = command;
        let radios = radio[genre];
        let msg = '';
        radios.forEach((e, i, a) => {
          if (i === a.length - 1) {
            msg +=
              `**${i + 1})** ` +
              '`' +
              e.radio +
              (e.name ? '` :white_small_square: `' + e.name : '') +
              '`';
          } else {
            msg +=
              `**${i + 1})** ` +
              '`' +
              e.radio +
              (e.name ? '` :white_small_square: `' + e.name : '') +
              '`\n';
          }
        });
        msg +=
          '\n\n\nFor playing the selected radio use:' +
          '```' +
          process.env.PREFIX +
          ` set ${genre} <radio_number>` +
          '```';
        return textChannel.send({
          embed: {
            color: clr,
            author: {
              name: client.user.username,
              icon_url: avatar,
            },
            title: `${genre} Radios:`,
            description: msg,
          },
        });
      } else {
        return textChannel.send({
          embed: {
            color: clr,
            author: {
              name: client.user.username,
              icon_url: avatar,
            },
            description: `:warning: ***Please enter a valid genre!***`,
          },
        });
      }
    }
  } else if (command === 'set') {
    if (!args.length) {
      return textChannel.send({
        embed: {
          color: clr,
          author: {
            name: client.user.username,
            icon_url: avatar,
          },
          description: `:warning: ***Invalid command!*** \n\nUse \`r7; h\` or \`r7; help\` for bot instructions`,
        },
      });
    }
    command = args.shift();
    let genres = Object.keys(radio);
    if (genres.includes(command)) {
      let genre = command;
      if (!args.length) {
        return textChannel.send({
          embed: {
            color: clr,
            author: {
              name: client.user.username,
              icon_url: avatar,
            },
            description: `:warning: ***Please enter a radio number!***`,
          },
        });
      } else {
        command = +args.shift();
        if (isNaN(command) || command < 1 || command > radio[genre].length) {
          return textChannel.send({
            embed: {
              color: clr,
              author: {
                name: client.user.username,
                icon_url: avatar,
              },
              description: `:warning: ***Please enter a valid number!***`,
            },
          });
        } else {
          if (!voiceChannel) {
            return textChannel.send({
              embed: {
                color: clr,
                author: {
                  name: client.user.username,
                  icon_url: avatar,
                },
                description: `:warning: ***You must be in the voice channel!***`,
              },
            });
          }
          collection
            .update(
              {
                guild: message.guild.id,
              },
              {
                $set: {
                  tc: textChannel.id,
                  vc: voiceChannel.id,
                  radio: radio[genre][command - 1],
                },
              },
              {
                upsert: true,
              }
            )
            .then(() => {
              collection.findOne({ guild: message.guild.id }).then((data) => {
                emitter.emit('disconnect');
                setTimeout(() => {
                  emitter.emit('connect', data);
                }, 2000);
                return textChannel.send({
                  embed: {
                    color: clr,
                    author: {
                      name: client.user.username,
                      icon_url: avatar,
                    },
                    title: 'Radio set on:',
                    description:
                      '`' +
                      data.radio.radio +
                      (data.radio.name
                        ? '` :white_small_square: `' + data.radio.name
                        : '') +
                      '`',
                  },
                });
              });
            })
            .catch((err) => {
              console.log(err);
              return textChannel.send({
                embed: {
                  color: clr,
                  author: {
                    name: client.user.username,
                    icon_url: avatar,
                  },
                  description: `:warning: ***An error has occured. Please try again later!***`,
                },
              });
            });
          return;
        }
      }
    } else {
      return textChannel.send({
        embed: {
          color: clr,
          author: {
            name: client.user.username,
            icon_url: avatar,
          },
          description: `:warning: ***Please enter a valid genre!***`,
        },
      });
    }
  } else if (command === 's' || command === 'status') {
    collection
      .findOne({ guild: message.guild.id })
      .then((data) => {
        if (data) {
          return textChannel.send({
            embed: {
              color: clr,
              author: {
                name: client.user.username,
                icon_url: avatar,
              },
              title: 'Radio set on:',
              description:
                '`' +
                data.radio.radio +
                (data.radio.name
                  ? '` :white_small_square: `' + data.radio.name
                  : '') +
                '`',
            },
          });
        } else {
          return textChannel.send({
            embed: {
              color: clr,
              author: {
                name: client.user.username,
                icon_url: avatar,
              },
              description: `:warning: ***No radio has been set!***`,
            },
          });
        }
      })
      .catch((err) => {
        console.log(err);
        return textChannel.send({
          embed: {
            color: clr,
            author: {
              name: client.user.username,
              icon_url: avatar,
            },
            description: `:warning: ***An error has occured. Please try again later!***`,
          },
        });
      });
  } else if (
    command === 'dc' ||
    command === 'disconnect' ||
    command === 'leave'
  ) {
    collection
      .findOneAndDelete({ guild: message.guild.id })
      .then(() => {
        emitter.emit('disconnect');
        return textChannel.send({
          embed: {
            color: clr,
            author: {
              name: client.user.username,
              icon_url: avatar,
            },
            description: `:warning: ***Radio disconnected!***`,
          },
        });
      })
      .catch((err) => {
        console.log(err);
        return textChannel.send({
          embed: {
            color: clr,
            author: {
              name: client.user.username,
              icon_url: avatar,
            },
            description: `:warning: ***An error has occured. Please try again later!***`,
          },
        });
      });
  } else {
    return textChannel.send({
      embed: {
        color: clr,
        author: {
          name: client.user.username,
          icon_url: avatar,
        },
        description: `:warning: ***Invalid command!*** \n\nUse \`r7; h\` or \`r7; help\` for bot instructions`,
      },
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
