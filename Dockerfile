FROM node:20-alpine AS build

RUN corepack enable

COPY package.json .
COPY pnpm-lock.yaml .
COPY tsconfig.json .
COPY prisma prisma
RUN pnpm install

COPY src src
RUN pnpm run build

FROM node:20-alpine AS production
WORKDIR /usr/src/app

# Tell the app we are in docker
ENV DOCKER true
ENV NODE_ENV production

RUN corepack enable

COPY package.json .
COPY pnpm-lock.yaml .
COPY prisma prisma
RUN pnpm install

COPY --from=build index.mjs index.mjs

CMD [ "node", "index.mjs" ]
