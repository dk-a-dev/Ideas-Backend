# build 
FROM node:alpine as builder

WORKDIR /usr
COPY package.json ./
COPY tsconfig.json ./
RUN ls -a
RUN yarn install
COPY . ./
RUN yarn run build

# production
FROM node:alpine
WORKDIR /usr
COPY package.json ./
RUN yarn install --production=true
COPY --from=builder /usr/dist ./dist

CMD ["node", "dist/index.js"]