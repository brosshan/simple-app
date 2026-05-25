# English Hero 網站部署指南 (GitHub + Render)

這份文件將引導你如何將 `simple-app` 部署到網路上，讓其他人也可以透過網址訪問你的網站。

## 🚀 部署架構說明
由於本專案包含 **Node.js 後端**與 **SQLite 資料庫**，一般的靜態網頁代管（如 GitHub Pages）無法執行。我們將使用以下組合：
1.  **GitHub**: 存放你的原始碼。
2.  **Render.com**: 提供免費的伺服器空間來運行 Node.js 程式。

---

## 🛠 準備工作
我已經為你完成並確認了以下檔案：
- `server.js`: 已支援雲端通訊埠 (PORT) 環境變數。
- `package.json`: 已加入 `"start": "node server.js"` 指令。
- `.gitignore`: 已設定忽略 `node_modules` 與本地資料庫檔案。

---

## 第一階段：將程式碼上傳到 GitHub

1.  **建立 GitHub 儲存庫**：
    - 登入 [GitHub](https://github.com/)。
    - 點擊右上角 `+` -> `New repository`。
    - Repository name 輸入 `english-hero`。
    - 選擇 `Public`，點擊 `Create repository`。

2.  **在電腦執行上傳指令**：
    - 在 `simple-app` 資料夾路徑下開啟終端機 (PowerShell 或 CMD)。
    - 依序輸入以下指令：
    ```bash
    # 初始化 Git
    git init

    # 將所有檔案加入暫存區
    git add .

    # 提交變更
    git commit -m "Prepare for deployment"

    # 設定主分支
    git branch -M main

    # 連結遠端 GitHub (請將下方的「你的帳號」替換為實際名稱)
    git remote add origin https://github.com/你的帳號/english-hero.git

    # 上傳程式碼
    git push -u origin main
    ```

---

## 第二階段：在 Render.com 部署

1.  **註冊與連結**：
    - 前往 [Render.com](https://render.com/) 並註冊帳號。
    - 點擊 Dashboard 中的 **"New"** 按鈕，選擇 **"Web Service"**。
    - 連結你的 GitHub 帳號。

2.  **選擇專案**：
    - 在清單中找到剛才建立的 `english-hero` 儲存庫，點擊 **"Connect"**。

3.  **設定部署參數**：
    - **Name**: `english-hero-test` (或任何你喜歡的名字)。
    - **Region**: 建議選擇 `Singapore` (新加坡) 離台灣較近。
    - **Branch**: `main`。
    - **Runtime**: `Node`。
    - **Build Command**: `npm install`。
    - **Start Command**: `npm start`。
    - **Instance Type**: 選擇 **Free**。

4.  **啟動部署**：
    - 點擊最下方的 **"Create Web Service"**。

---

## 📝 重要注意事項 (必讀)

1.  **SQLite 資料庫限制**：
    - 本專案目前使用 SQLite (檔案型資料庫)。
    - **限制**：Render 的免費版磁碟是「暫時性」的。每當伺服器重新啟動或你更新程式碼時，**手動新增的單字和測試紀錄會被重置回初始狀態**。
    - **解決方法**：如果需要正式營運，建議改用 MongoDB 或 PostgreSQL 等外部資料庫。

2.  **冷啟動 (Cold Start)**：
    - 免費版伺服器若 15 分鐘無人存取會進入休眠。
    - 再次打開網站時，可能需要等待約 **30-60 秒** 讓伺服器「起床」，這是正常現象。

3.  **單字來源**：
    - 部署成功後，系統會自動跑一遍初始化腳本，產生預設的單字庫供你測試。

---
祝你的英文學習網站順利上線！
