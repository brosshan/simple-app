const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup File Upload
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Excel Template Download
app.get('/api/template', (req, res) => {
  const data = [
    ["English", "Chinese", "Category"],
    ["Example", "例子", "初級"],
    ["Opportunity", "機會", "中級"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");
  
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=GEPT_Template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Excel Bulk Import
app.post('/api/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "請上傳檔案" });
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    db.serialize(() => {
      const stmt = db.prepare("INSERT OR IGNORE INTO words (english, chinese, category) VALUES (?, ?, ?)");
      data.forEach(row => {
        const eng = row.English || row.english || row['英文'];
        const chi = row.Chinese || row.chinese || row['中文'];
        const cat = row.Category || row.category || row['等級'] || '初級';
        if (eng && chi) stmt.run(eng, chi, cat);
      });
      stmt.finalize();
    });
    fs.unlinkSync(req.file.path);
    res.json({ success: true, count: data.length });
  } catch (err) {
    res.status(500).json({ error: "檔案處理失敗: " + err.message });
  }
});

// Database Setup
const db = new sqlite3.Database('./english_hero.db', (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database.');
});

// Initialization function
function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS words (id INTEGER PRIMARY KEY AUTOINCREMENT, english TEXT, chinese TEXT, category TEXT, UNIQUE(english, category))`);
      db.run(`CREATE TABLE IF NOT EXISTS test_records (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, score INTEGER, total_questions INTEGER, category TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'user')`);
      db.run(`CREATE TABLE IF NOT EXISTS failed_words (word_id INTEGER PRIMARY KEY, failed_count INTEGER DEFAULT 1, last_tested_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(word_id) REFERENCES words(id))`);
      db.run(`CREATE TABLE IF NOT EXISTS reading_passages (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, category TEXT)`);
      db.run(`CREATE TABLE IF NOT EXISTS reading_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, passage_id INTEGER, question TEXT, option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT, correct_answer TEXT, FOREIGN KEY(passage_id) REFERENCES reading_passages(id))`);

      db.run("ALTER TABLE users ADD COLUMN exam_category TEXT DEFAULT '初級'", (err) => { if (err && !err.message.includes('duplicate')) {} });
      db.run("ALTER TABLE words ADD COLUMN category TEXT DEFAULT '初級'", (err) => { if (err && !err.message.includes('duplicate')) {} });
      db.run("ALTER TABLE test_records ADD COLUMN user_id INTEGER", (err) => { if (err && !err.message.includes('duplicate')) {} });
      db.run("ALTER TABLE test_records ADD COLUMN category TEXT", (err) => { if (err && !err.message.includes('duplicate')) {} });
      db.run("ALTER TABLE test_records ADD COLUMN failed_word_ids TEXT", (err) => { if (err && !err.message.includes('duplicate')) {} });

      db.run("INSERT OR IGNORE INTO users (username, password, role, exam_category) VALUES (?, ?, ?, ?)", ['admin', 'admin123', 'admin', '中級']);
      
      const elementaryWords = [
        ['Activity', '活動', '初級'], ['Beautiful', '漂亮的', '初級'], ['Breakfast', '早餐', '初級'], ['Camera', '照相機', '初級'],
        ['Delicious', '美味的', '初級'], ['Example', '例子', '初級'], ['Favorite', '最喜愛的', '初級'], ['Garden', '花園', '初級'],
        ['Healthy', '健康的', '初級'], ['Internet', '網路', '初級'], ['Kitchen', '廚房', '初級'], ['Library', '圖書館', '初級'],
        ['Medicine', '藥', '初級'], ['Neighbor', '鄰居', '初級'], ['Outside', '外面', '初級'], ['Practice', '練習', '初級'],
        ['Question', '問題', '初級'], ['Remember', '記得', '初級'], ['Subject', '科目', '初級'], ['Tomorrow', '明天', '初級']
      ];

      const intermediateWords = [
        ['Accomplish', '達成', '中級'], ['Balance', '平衡', '中級'], ['Challenge', '挑戰', '中級'], ['Delight', '欣喜', '中級'],
        ['Efficient', '有效率的', '中級'], ['Flexible', '有彈性的', '中級'], ['Graduate', '畢業', '中級'], ['Harmful', '有害的', '中級'],
        ['Identify', '辨識', '中級'], ['Journal', '日誌', '中級'], ['Knowledge', '知識', '中級'], ['Landscape', '風景', '中級'],
        ['Maintain', '維持', '中級'], ['Negative', '負面的', '中級'], ['Observe', '觀察', '中級'], ['Patience', '耐心', '中級'],
        ['Quality', '品質', '中級'], ['Reasonable', '合理的', '中級'], ['Standard', '標準', '中級'], ['Target', '目標', '中級']
      ];

      const stmt = db.prepare("INSERT OR IGNORE INTO words (english, chinese, category) VALUES (?, ?, ?)");
      elementaryWords.forEach(word => stmt.run(word));
      intermediateWords.forEach(word => stmt.run(word));
      stmt.finalize(() => { resolve(); });
    });
  });
}

// Auth Endpoints
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT id, username, role, exam_category FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: "帳號或密碼錯誤" });
    res.json(user);
  });
});

app.get('/api/users', (req, res) => {
  db.all("SELECT id, username, role, exam_category FROM users", [], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

app.post('/api/users', (req, res) => {
  const { username, password, role, exam_category } = req.body;
  db.run("INSERT INTO users (username, password, role, exam_category) VALUES (?, ?, ?, ?)", [username, password, role || 'user', exam_category || '初級'], function(err) {
    if (err) return res.status(400).json({ error: "帳號已存在或建立失敗" });
    res.json({ id: this.lastID, username, role: role || 'user', exam_category: exam_category || '初級' });
  });
});

app.delete('/api/users/:id', (req, res) => {
  db.run("DELETE FROM users WHERE id = ? AND username != 'admin'", [req.params.id], function(err) {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ success: true });
  });
});

app.get('/api/words', (req, res) => {
  db.all("SELECT * FROM words ORDER BY id DESC", [], (err, rows) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(rows);
  });
});

app.post('/api/words', (req, res) => {
  const { english, chinese, category } = req.body;
  if (!english || !chinese || !category) return res.status(400).json({ error: "請提供完整內容" });
  db.run("INSERT INTO words (english, chinese, category) VALUES (?, ?, ?)", [english, chinese, category], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "此單字在該等級已存在" });
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, english, chinese, category });
  });
});

app.get('/api/words/random', (req, res) => {
  const count = parseInt(req.query.count) || 10;
  const category = req.query.category || '初級';
  
  db.all(`
    SELECT words.* FROM words 
    JOIN failed_words ON words.id = failed_words.word_id
    WHERE words.category = ?
    ORDER BY RANDOM() LIMIT 3
  `, [category], (err, failedRows) => {
    const excludeIds = (failedRows || []).map(r => r.id).concat([0]);
    db.all(`
      SELECT * FROM words 
      WHERE category = ? AND id NOT IN (${excludeIds.join(',')})
      ORDER BY RANDOM() LIMIT ?
    `, [category, count - (failedRows ? failedRows.length : 0)], (err2, randomRows) => {
      const finalWords = [...(failedRows || []), ...(randomRows || [])].sort(() => 0.5 - Math.random());
      res.json(finalWords);
    });
  });
});

app.get('/api/words/failed', (req, res) => {
  const category = req.query.category || '初級';
  db.all(`SELECT words.* FROM words JOIN failed_words ON words.id = failed_words.word_id WHERE words.category = ?`, [category], (err, rows) => {
    if (err) res.status(500).json({ error: err.message }); else res.json(rows);
  });
});

app.post('/api/test/record', (req, res) => {
  const { score, totalQuestions, failedWordIds, user_id, category } = req.body;
  const failedIdsStr = failedWordIds ? failedWordIds.join(',') : '';
  
  db.run("INSERT INTO test_records (user_id, score, total_questions, category, failed_word_ids) VALUES (?, ?, ?, ?, ?)", 
    [user_id, score, totalQuestions, category, failedIdsStr], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (failedWordIds && failedWordIds.length > 0) {
      failedWordIds.forEach(id => {
        db.run(`INSERT INTO failed_words (word_id, failed_count) VALUES (?, 1) ON CONFLICT(word_id) DO UPDATE SET failed_count = failed_count + 1, last_tested_at = CURRENT_TIMESTAMP`, [id]);
      });
    }
    res.json({ success: true });
  });
});

app.get('/api/reports', (req, res) => {
  const { user_id, role } = req.query;
  let query = `SELECT users.username, test_records.* FROM test_records JOIN users ON users.id = test_records.user_id`;
  let params = [];
  if (role !== 'admin') { query += " WHERE user_id = ?"; params.push(user_id); }
  query += " ORDER BY created_at DESC";
  db.all(query, params, (err, rows) => {
    if (err) res.status(500).json({ error: err.message }); else res.json(rows);
  });
});

app.get('/api/reading/random', (req, res) => {
  const category = req.query.category || '初級';
  db.get("SELECT * FROM reading_passages WHERE category = ? ORDER BY RANDOM() LIMIT 1", [category], (err, passage) => {
    if (err || !passage) return res.json(null);
    db.all("SELECT * FROM reading_questions WHERE passage_id = ?", [passage.id], (err, questions) => {
      res.json({ ...passage, questions });
    });
  });
});

const fetch = require('node-fetch');

// ... (existing code)

// Online Cloud Sync (Actual Fetch from Datamuse API for endless variety)
app.post('/api/cloud-sync', async (req, res) => {
  const { category } = req.body;
  
  // 根據級別選擇搜尋種子單字，讓 API 找相關單字
  const seeds = category === '初級' 
    ? ['daily', 'home', 'school', 'food', 'family', 'weather'] 
    : ['technology', 'environment', 'business', 'science', 'economy', 'social'];
  
  const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
  
  try {
    // 從 Datamuse API 抓取與種子單字相關的常用單字
    const response = await fetch(`https://api.datamuse.com/words?rel_trg=${randomSeed}&md=d&max=20`);
    const data = await response.json();
    
    // 過濾出有定義且長度適合的單字
    const validWords = data.filter(item => item.defs && item.word.length > 3);
    const selected = validWords.sort(() => 0.5 - Math.random()).slice(0, 3);

    db.serialize(() => {
      const stmt = db.prepare("INSERT OR IGNORE INTO words (english, chinese, category) VALUES (?, ?, ?)");
      selected.forEach(item => {
        // 簡單處理：將單字首字母大寫，並將其第一個英文定義作為暫時中文占位 (實務上可串接 Google Translate)
        // 這裡為了穩定性，先抓取定義中的關鍵詞或保留英文，建議後續可由管理員在介面微調
        const eng = item.word.charAt(0).toUpperCase() + item.word.slice(1);
        const rawDef = item.defs[0].split('\t').pop(); 
        // 我們這裡使用一個預設的對應表來讓常見單字有正確中文，其餘保留定義
        const commonMap = { 'Sun': '太陽', 'Cloud': '雲', 'Rain': '雨', 'Digital': '數位', 'System': '系統' };
        const chi = commonMap[eng] || `(雲端) ${rawDef.slice(0, 20)}...`;
        
        stmt.run(eng, chi, category);
      });
      stmt.finalize();
    });

    res.json({ success: true, count: selected.length, seed: randomSeed });
  } catch (err) {
    console.error('Cloud Fetch Error:', err);
    res.status(500).json({ error: "聯網抓取失敗" });
  }
});

// Seeding Reading
function initDbWithReading() {
  return initDb().then(() => {
    return new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM reading_passages", (err, row) => {
        if (row && row.count < 5) {
          const newPassages = [
            { title: 'A Trip to the Beach', content: 'Last Sunday, my family went to the beach...', category: '初級', questions: [{ q: 'How was the weather?', a: 'Cold', b: 'Hot', c: 'Rainy', d: 'Snowy', ans: 'B' }] },
            { title: 'The History of Tea', content: 'Tea is one of the most popular beverages...', category: '中級', questions: [{ q: 'Where was tea discovered?', a: 'China', b: 'India', c: 'Japan', d: 'USA', ans: 'A' }] }
          ];
          newPassages.forEach(p => {
            db.run("INSERT OR IGNORE INTO reading_passages (title, content, category) VALUES (?, ?, ?)", [p.title, p.content, p.category], function() {
              const pid = this.lastID;
              p.questions.forEach(q => db.run("INSERT INTO reading_questions (passage_id, question, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?)", [pid, q.q, q.a, q.b, q.c, q.d, q.ans]));
            });
          });
        }
        resolve();
      });
    });
  });
}

initDbWithReading().then(() => {
  app.listen(PORT, () => { console.log(`English Hero running at http://localhost:${PORT}`); });
});
