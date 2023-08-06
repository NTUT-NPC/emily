interface Config {
  registerCommands: boolean;
}

const config: Config = {
  registerCommands: false,
};

export default config;

interface Messages {
  defaultError: string;
  join: {
    useDirectMessage: string;
    confirmationTimeout: string;
    introduction: string;
    basicInformation: string;
    payment: string;
  };
}

export const messages: Messages = {
  defaultError:
    "糟糕，看來出了些小問題。請把這個問題回報給<@132112879439708160>，謝謝！",
  join: {
    useDirectMessage: "歡迎您加入我們！建議您私訊我以確保您的隱私喔！",
    confirmationTimeout: "timeout",
    introduction: `# 加入社員
很高興您願意加入我們！

如果您還不知道，以下是加入社員的好處：

- 免費參加所有社課
- 獲得一件精美的社團 T-Shirt
- 參加其他社團活動

加入社員的流程如下：

1. 填寫基本資料
2. 付費
3. 等待幹部確認
4. 加入成功！

那麼就讓我們開始吧！`,
    basicInformation: `# 填寫基本資料

要加入社員，請按下方的「📝 輸入基本資料」按鈕，並在填寫完成後按下「送出」。`,
    payment: `# 付費`,
  },
};
