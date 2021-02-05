FROM node:latest
WORKDIR /app
RUN apt-get update
RUN apt-get install -y ffmpeg git make libtool autoconf automake g++ python3
ADD package*.json .
RUN npm i
ADD . .
CMD node .
