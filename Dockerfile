FROM node:20-alpine AS base
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY package.json .
COPY pnpm-lock.yaml .
COPY prisma prisma

FROM base AS prod-deps

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY src src
COPY build.ts .
COPY tsconfig.json .
RUN pnpm run build

FROM base AS production

RUN pnpm dlx prisma generate --no-hints

COPY --from=build /app/index.cjs .
CMD [ "node", "index.cjs" ]
