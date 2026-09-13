FROM node:20-alpine AS build
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY package.json .
COPY pnpm-lock.yaml .
COPY drizzle.config.ts .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY src src
COPY build.ts .
COPY tsconfig.json .
RUN pnpm run build

FROM build AS migrate
CMD [ "pnpm", "exec", "drizzle-kit", "migrate" ]

FROM node:20-alpine AS production
WORKDIR /app

COPY --from=build /app/index.js .
CMD [ "node", "index.js" ]
