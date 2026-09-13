<p align="center">
  <img src="docs/emily.png" alt="Emily Logo" align="center" width="128" height="128">
</p>

<h1 align="center">Emily</h1>

<p align="center">Discord 社群管理工具</p>

<p align="center">
  <a href="https://ntut.club">
    <img
      alt="An NPC Project"
      src="https://img.shields.io/badge/An_NPC_Project-333?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0iI2ZmZiI%2BPHBhdGggZD0iTTQgNHYyNGw4LTggMTYgOFY0bC04IDh6Ii8%2BPC9zdmc%2B"
    >
  </a>
</p>

## 功能

### 身份組群組 (Metaroles)

利用指令製作由多個身份組組成的身份組，便於管理權限。例如透過自動產生「幹部」身份組群組來同時管理所有歷屆幹部身份組。

### 社員 (Membership)

透過對話框填寫資料，並分配身份組，自動化社員加入流程；幹部可於後臺管理社員的加入請求。

### 私人聯絡討論串

伺服器管理員可使用 `/私訊 設定` 指定文字頻道和幹部身份組，Emily 會在頻道中張貼操作說明。伺服器成員按下說明下方的按鈕後，Emily 會建立私人討論串並通知雙方。

## 開發

請依照[慣例式提交](https://www.conventionalcommits.org/zh-hant/v1.0.0/)規範用中文或英文寫提交說明。

### 技術棧

- [Discord.js](https://discord.js.org/)：Discord API 的 Node.js 實作
- [ESBuild](https://esbuild.github.io/)：超高速的 JavaScript 和 TypeScript 打包工具和轉譯器。
- [pnpm](https://pnpm.io/)：Node.js 的套件管理工具
- [Drizzle ORM](https://orm.drizzle.team/)：輕量級且強型別的 ORM（物件關聯映射工具）
- [TypeScript](https://www.typescriptlang.org/)：JavaScript 的超集，提供型別檢查和其他語言功能
- [tsx](https://tsx.is/)：執行 TypeScript 檔案

### 斜線指令

所有斜線指令位於 `src/commands`（`index.ts` 除外）。要增加斜線指令，請在 `src/commands` 新增一個預設匯出 `Command` 型別的檔案，並在 `src/commands/index.ts` 註冊。`Command` 型別位於 `src/types.ts`。

## 部屬

Production images are published to GitHub Container Registry for each semver release:

- `ghcr.io/ntut-npc/emily:<version>` — Emily bot
- `ghcr.io/ntut-npc/emily-migrate:<version>` — database migration job

The production server only needs `compose.yaml` and `.env`; source code and pnpm are not required.

```sh
mkdir -p /srv/emily
cd /srv/emily
# 將 examples/compose.prod.yaml 儲存為 compose.yaml
# 將 examples/.env 儲存為 .env，並填入實際值與 image tag
docker login ghcr.io
docker compose pull
docker compose up -d
```

Compose waits for PostgreSQL to become healthy, runs the migration image, and starts Emily only after the migration succeeds. Set `EMILY_IMAGE_TAG` to the release version to deploy; avoid using `latest` for production rollbacks.

到 [Discord Developers](https://discord.com/developers/applications) 網站建立一個機器人。啟用 `Privileged Gateway Intents` 中的 `Presence Intent` 和 `Server Members Intent`。

最後，用邀請連結來將機器人加入您的Discord伺服器。將「你的\_Client_ID」替換為您機器人的 Client ID：

```url
https://discord.com/api/oauth2/authorize?client_id=你的_Client_ID&permissions=361045691392&scope=bot%20applications.commands
```

私訊操作說明的指定頻道必須讓機器人擁有「查看頻道」、「傳送訊息」、「建立私人討論串」、「在討論串中傳送訊息」和「管理討論串」權限。幹部身份組必須擁有「查看頻道」、「在討論串中傳送訊息」和「讀取訊息歷史」權限，並設為可提及；一般使用者也必須能查看頻道、在討論串中傳送訊息和讀取訊息歷史。

### 資料庫遷移

資料庫遷移會由 `migrate` container 自動執行，不需要在 production server 安裝 pnpm 或 drizzle-kit。只有 migration 成功後，`app` container 才會啟動。

### 部屬到 K2

如果 K2 可以連線 GitHub Container Registry，將 `compose.yaml` 和 `.env` 放到 `/srv/emily` 後執行：

```sh
ssh k2.ntut.club 'cd /srv/emily && docker login ghcr.io && docker compose pull && docker compose up -d'
```
