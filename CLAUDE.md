# 網站維護說明（給 Claude Code）

左貺之（Kuang-Chih Tso）的個人學術網站：https://kuangchihtso.github.io/
純靜態 HTML／CSS／JS，GitHub Pages 直接發布 main 分支的根目錄，沒有建置步驟。

## 檔案

- `index.html`：英文頁（預設頁）
- `zh/index.html`：繁體中文頁
- `assets/site.css`：樣式。兩個底色（深藍 navy、米白 cream）加一個強調色（琥珀 amber）。
  amber 只用在圖 1 的光點、Email 按鈕與鍵盤焦點。區塊以 class `stage`（深藍）或 `paper`（米白）切換底色。
- `assets/site.js`：圖 1 動畫（六角電極模組、光幻視、眨眼、刺激電流波形）與 email 組字。
- `assets/*.jpg`：圖片；加入前一律清除 metadata（EXIF、GPS）。

## 規則

1. 這個 repo 是公開的，推上去的檔案就算刪掉也會留在歷史紀錄。推送前一定先讓 Aji 看過（本機預覽或截圖），他同意才推。
2. 中英兩頁的內容保持同步。
3. 只放已經公開的內容：已發表的論文與專利、已公開的活動與獎項。未發表的數據、照片與構想，送審中的計畫，合作單位的資料，個人電話、住址與私人信箱，一律不放。不確定就先問 Aji。
4. 論文與專利的標題、作者序以 Aji 提供的最新 CV 為準，並由 Aji 確認。
5. 刺激電流波形必須是電荷平衡的雙相脈衝（先陰極、後陽極，兩相等幅等寬）。一個完整脈衝（`2 * PHASE + GAP`）要短於 `INTERVAL`，脈衝不能重疊。
6. 圖 1 的刺激方式要符合 CMOS 多模組裝置：每個模組一次只刺激（點亮）一顆電極，所有模組可以同時運作。
7. 每次修改後更新兩頁頁尾的「Last updated」，以及 `sitemap.xml` 的 `<lastmod>`。

## 本機預覽與檢查

- 在 repo 根目錄執行 `python3 -m http.server 8000`，打開 http://localhost:8000/ 與 http://localhost:8000/zh/ 。
- 手機寬（375 px）與桌機寬（1280 px）都不能出現左右捲動。
- 圖 1 有畫出光點，每個模組同時最多只有一顆電極在亮，波形正負兩相對稱，脈衝之間回到零。
- Email 按鈕連到 mailto，兩頁都沒有 console error。
