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

RUN pnpm dlx prisma generate --no-hints

COPY --from=build index.cjs index.cjs
CMD [ "node", "index.cjs" ]
