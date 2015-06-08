# git@github.com:Coveo/coveo.github.io.server.git
FROM node

ADD . /app
RUN cd '/app' && npm install

EXPOSE 3000

WORKDIR /app
CMD ["npm","start"]
