FROM node:10-alpine
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install && npm cache clean --force
COPY . /usr/src/app
CMD ["npm", "start"]
EXPOSE 1990
