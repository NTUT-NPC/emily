declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DISCORD_BOT_TOKEN: string;
      DISCORD_APPLICATION_ID: string;
      DATABASE_URL: string;
      DOCKER?: string;
    }
  }
}

export {};
