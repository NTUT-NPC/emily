interface Config {
  registerCommands: boolean;
  defaultErrorMessage: string;
}

const config: Config = {
  registerCommands: true,
  defaultErrorMessage:
    "糟糕，看來出了些小問題。請把這個問題回報給<@132112879439708160>，謝謝！",
};

export default config;
