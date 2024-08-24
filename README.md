# Emily

北科程式設計研究社 (NPC) 的 Discord 社群管理工具，[舊 Emily](https://github.com/ntut-xuan/NPC-Emily) 的 Discord.js 重製版。專案結構是基於 [書呆大學長](https://github.com/chenghsuanho/ai-chatbot)。

## 功能

### 身份組群組 (Metaroles)

利用指令製作由多個身份組組成的身份組，便於管理權限。例如透過自動產生「幹部」身份組群組來同時管理所有歷屆幹部身份組。

### 社員 (Membership)

透過對話框填寫資料，並分配身份組，自動化社員加入流程；幹部可於後臺管理社員的加入請求。

## 開發

請依照[慣例式提交](https://www.conventionalcommits.org/zh-hant/v1.0.0/)規範用中文或英文寫提交說明。

### 技術棧

- [Discord.js](https://discord.js.org/)：Discord API 的 Node.js 實作
- [ESBuild](https://esbuild.github.io/)：快速的 JavaScript 轉譯器
- [pnpm](https://pnpm.io/)：Node.js 的套件管理工具
- [Prisma](https://www.prisma.io/)：資料庫存取工具
- [tsx](https://tsx.is/)：執行 TypeScript 檔案
- [TypeScript](https://www.typescriptlang.org/)：JavaScript 的超集，提供型別檢查和其他語言功能

### 斜線指令

所有斜線指令位於 `src/commands`（`index.ts` 與 `types.ts` 除外）。要增加斜線指令，請在 `src/commands` 新增一個預設匯出 `Command` 型別的檔案。`Command` 型別可以在 `src/commands/types.ts` 找到。

## 部屬

你可以用 `Dockerfile` 和 `examples` 目錄的各種範例 `compose.yaml` 在 Docker 部屬這個機器人。大略步驟如下：

```sh
git clone https://github.com/NTUT-NPC/emily
cd emily
cp examples/compose.prod.yaml compose.yaml
cp examples/.env .
# 用文字編輯器填寫 `.env` 檔案
docker compose up -d
```

到 [Discord Developers](https://discord.com/developers/applications) 網站建立一個機器人。啟用 `Privileged Gateway Intents` 中的 `Presence Intent` 和 `Server Members Intent`。

最後，用邀請連結來將機器人加入您的Discord伺服器。將「你的\_Client_ID」替換為您機器人的 Client ID：

```url
https://discord.com/api/oauth2/authorize?client_id=你的_Client_ID&permissions=268437504&scope=bot%20applications.commands
```

### 部屬到 K2

如果要部屬到社團的伺服器，可以參考以下這些指令：

```sh
docker build . -t emily
docker save emily | docker -H ssh://k2.ntut.club load
ssh k2.ntut.club 'docker compose -f /srv/emily/compose.yaml up -d'
```
