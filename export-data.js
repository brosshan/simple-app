const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'english_hero.db');
if (!fs.existsSync(dbPath)) {
    console.error('錯誤：找不到 english_hero.db 檔案！');
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

const fetchData = (query) => {
    return new Promise((resolve, reject) => {
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

async function exportAll() {
    try {
        console.log('正在從資料庫讀取資料...');
        
        const words = await fetchData('SELECT * FROM words');
        const passages = await fetchData('SELECT * FROM reading_passages');
        const questions = await fetchData('SELECT * FROM reading_questions');
        const users = await fetchData('SELECT id, username, password, role, exam_category FROM users');

        const data = {
            words,
            passages,
            questions,
            users
        };

        fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
        
        console.log('------------------------------------');
        console.log('匯出成功！');
        console.log(`- 單字數量: ${words.length}`);
        console.log(`- 閱讀文章: ${passages.length}`);
        console.log(`- 帳號數量: ${users.length}`);
        console.log('------------------------------------');
        console.log('請現在將 index.html 和 data.json 推送到 GitHub。');

    } catch (err) {
        console.error('匯出失敗：', err.message);
    } finally {
        db.close();
    }
}

exportAll();
