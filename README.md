# Emily

北科程式設計研究社 (NPC) 的 Discord 社群管理工具，[舊 Emily][Java Emily] 的 Discord.js 重製版。專案結構是基於 [書呆大學長][ai-chatbot]。

[Java Emily]: https://github.com/ntut-xuan/NPC-Emily
[ai-chatbot]: https://github.com/chenghsuanho/ai-chatbot

## 功能

### 身份組群組 (Metaroles)

利用指令製作由多個身份組組成的身份組，便於管理權限。例如透過自動產生「幹部」身份組群組來同時管理所有歷屆幹部身份組。

## 開發

請依照[慣例式提交][Conventional Commits]規範用中文或英文寫提交說明。

[Conventional Commits]: https://www.conventionalcommits.org/zh-hant/v1.0.0/

### TS-Node 錯誤臨時解方

使用 `ts-node-dev` 開發工具時因為會遇到 [這個問題][ts-node#2000] 無法執行 `pnpm dev`。繞過這個錯誤的臨時解方是先執行 `pnpm ts-node-workaround` 再執行 `pnpm dev`。記得在修改 `tsconfig.json` 後重新執行這個臨時解方，變更才會生效。

[ts-node#2000]: https://github.com/TypeStrong/ts-node/issues/2000

### 斜線指令

所有斜線指令位於 `src/commands`（`index.ts` 與 `types.ts` 除外）。要增加斜線指令，請在 `src/commands` 新增一個預設匯出 `Command` 型別的檔案。`Command` 型別可以在 `src/commands/types.ts` 找到。

## 部屬

你可以用 `Dockerfile` 和在 Docker 部屬這個機器人。大略步驟如下：

```sh
git clone https://github.com/NTUT-NPC/emily
cd emily
cp examples/compose.prod.yaml compose.yaml
cp examples/.env .
# 用文字編輯器填寫 `.env` 檔案
docker compose up -d
```

最後，用邀請連結來將機器人加入您的Discord伺服器。將「你的_Client_ID」替換為您機器人的 Client ID：

```url
https://discord.com/api/oauth2/authorize?client_id=你的_Client_ID&permissions=268437504&scope=bot%20applications.commands
```
