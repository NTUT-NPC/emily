import type { Member } from "#types";

const config = {
  registerCommands: true,
  memberJoinNotificationTimeoutSeconds: 600,
};

/* eslint-disable no-irregular-whitespace */
const messages = {
  error: {
    generic: "糟糕，看來出了些小問題。請把這個問題回報給<@132112879439708160>，謝謝！",
    notInDatabase: "資料庫中沒有這個使用者。",
    notAwaitingConfirmation: "這個使用者並沒有等待幹部確認的加入請求。",
    useInGuild: "請在伺服器內使用這個指令。",
    modalTimeout: "您似乎開啟這個對話框了太久了，請再試一次。",
  },
  join: {
    useDirectMessage: "歡迎您加入我們！建議您私訊我以確保您的隱私喔！",
    configurationMissing: "社員加入通知尚未設定或設定不明確，請聯絡伺服器管理員執行「/社員 設定通知」。",
    configurationInvalid: "社員加入通知頻道目前無法使用，請聯絡伺服器管理員重新執行「/社員 設定通知」。",
    introduction: `# 加入社員
很高興您願意加入我們！

如果您還不知道，以下是加入社員的好處：

- 終身無限參與所有社課
- 獲得一件精美的社團 T-Shirt
- 參加其他社團活動

加入社員的流程如下：

1. 填寫基本資料
2. 等待幹部確認
3. 加入成功！

那麼就讓我們開始吧！如果在加入過程遇到任何問題，請再私訊我一次「/社員 加入」看看。`,
    basicInformation: `# 填寫基本資料

要加入社員，請按下方的「📝 輸入基本資料」按鈕，並在填寫完成後按下「送出」。`,
    committeeConfirmation: `# 幹部確認
    
您的基本資料已經送出，我也已經通知幹部了！請讓幹部向您收取 500 元的社費，並等待幹部確認您的資料。`,
    accept: "恭喜您！您已經成功加入社團！我會分配社員身份組給您，如果沒有得到身份組，請聯絡幹部。",
    reject(reason: string) {
      return `很抱歉，您的加入請求被拒絕了。理由：${reason}\n（您可以輸入「/社員 加入」再試一次）`;
    },
    alreadyJoined: "您已經成功加入社團！",
    notificationSent: "已通知幹部，請等待幹部確認。",
    notificationTimeout(notificationSentDate: Date) {
      return `很抱歉，您在<t:${Math.floor(+notificationSentDate / 1000) + config.memberJoinNotificationTimeoutSeconds}:R>才能再通知一次幹部。`;
    },
    notification(member: Member) {
      return `有新的社員加入請求！<@${member.discordId}> 想要加入社團。
- 電子郵件： ${member.email}
- 姓名　　： ${member.name}
- 學號　　： ${member.studentId}
`;
    },
  },
};

export { config as default, messages };
