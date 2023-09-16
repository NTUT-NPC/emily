FROM node:alpine as build

COPY prisma prisma
COPY package.json .
RUN npm install --omit=dev
RUN npx prisma generate

FROM oven/bun as production
WORKDIR /usr/src/app

# Tell the app we are in docker
ENV DOCKER true

# Workaround for https://github.com/oven-sh/bun/issues/4847 and https://github.com/oven-sh/bun/issues/5320
COPY --from=build node_modules/.prisma node_modules/.prisma

COPY prisma prisma
COPY src src
COPY .env .
COPY bun.lockb .
COPY package.json .
RUN bun install --production

EXPOSE 80
CMD [ "bun", "run", "start" ]
