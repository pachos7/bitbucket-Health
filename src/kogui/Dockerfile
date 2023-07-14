FROM node:12
RUN apt-get update
RUN apt-get install make gcc g++
RUN apt-get -qy install netcat
RUN apt-get -y install vim
ENV NODE_TLS_REJECT_UNAUTHORIZED="0"
WORKDIR /app
COPY . /app
COPY package.json /app
RUN npm install
EXPOSE 8080
CMD ['node', 'server.js']
