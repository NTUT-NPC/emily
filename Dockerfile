FROM node:20-alpine AS base

COPY package.json .
COPY pnpm-lock.yaml .
COPY prisma prisma

RUN corepack enable
RUN corepack install

FROM base AS build

RUN pnpm install

COPY src src
COPY build.ts .
COPY tsconfig.json .
RUN pnpm run build

FROM base AS production

# Tell the app we are in docker
ENV DOCKER true
ENV NODE_ENV production

RUN pnpm install

COPY --from=build index.mjs index.mjs

CMD [ "node", "index.mjs" ]
