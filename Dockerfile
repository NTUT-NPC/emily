FROM node:26.13.0-alpine AS build
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install --global pnpm@12.16.1

COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .
COPY drizzle.config.ts .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY src src
COPY build.ts .
COPY tsconfig.json .
RUN pnpm run build

FROM build AS migrate
CMD [ "pnpm", "exec", "drizzle-kit", "migrate" ]

FROM node:26.13.0-alpine AS production
WORKDIR /app

COPY --from=build /app/index.js .
CMD [ "node", "index.js" ]
