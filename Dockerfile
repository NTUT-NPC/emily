# Add pnpm to base image
FROM node:18 as base
RUN npm install --global pnpm

FROM base as build
WORKDIR /usr/src/app

# Install app dependencies and build
COPY ./ ./
RUN pnpm install
RUN pnpm build
RUN pnpm prune --prod


FROM base as deploy
WORKDIR /usr/src/app

# Tell the app we are in docker
ENV DOCKER true

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY package.json .env prisma ./

EXPOSE 80
CMD [ "pnpm", "start" ]
