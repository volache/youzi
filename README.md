# 郵資大師 1.0.0

郵資大師是一套在瀏覽器中執行的郵票庫存與採購規劃工具。資料預設只保存在目前瀏覽器的 LocalStorage，不需要帳號或後端伺服器。

## 主要功能

- 管理 1、5、6、7、8、10、12、15、20、28、35 元郵票的現有庫存與規劃採購量。
- 依每月預算、最低庫存、優先級及理想比例產生三階段採購建議。
- 可直接在首頁鎖定特定面額的採購張數，重新規劃或重設時仍會保留。
- 依郵件種類與重量計算郵資，列出張數最少與面額種類最少的郵票組合。
- 管理月度採購歷史，支援 CSV 匯入與匯出。
- 匯出完整報告、庫存、採購建議與月度分析 CSV。
- 以 JSON 備份或還原完整的本機資料。

## 執行方式

需求：Node.js 18 以上及 npm 9 以上。

```bash
npm install
npm run dev
```

開發伺服器預設使用 `http://localhost:3000`。

## 品質檢查

```bash
npm run lint
npm run build
```

或一次執行：

```bash
npm run check
```

格式化程式：

```bash
npm run format
```

## 專案結構

```text
src/
├── components/      Vue 畫面元件與共用 Modal 標題
├── composables/     採購、郵資、歷史、匯入匯出與儲存邏輯
├── config/          郵票目錄與版本資訊
├── utils/           無狀態共用工具
├── App.vue          功能組裝與 Modal 狀態
├── main.js          應用程式入口
└── style.css        全域樣式與設計 token
```

## 資料與安全

- 系統不會主動將資料傳到伺服器。
- 清除瀏覽器資料可能移除 LocalStorage，重要資料請定期匯出 JSON 備份。
- JSON 還原前會檢查必要欄位並清理數值；不合格式的檔案不會覆蓋目前資料。
- 郵資費率屬於會變動的業務資料，調整 `src/composables/postageRates.js` 前應核對中華郵政最新公告，並更新核對日期與來源。
- 目前郵資費率已於 2026-09-06 依[中華郵政簡明國內函件資費表](https://www.post.gov.tw/post/internet/Postal/index.jsp?ID=2020106)核對；畫面也會顯示核對日期與官方來源。

## 授權

MIT
