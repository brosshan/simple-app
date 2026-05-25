const XLSX = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const filePath = 'D:/gemini/英文測驗/題目/note.xlsx';
const dbPath = './english_hero.db';

const db = new sqlite3.Database(dbPath);

async function importExcel() {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Starting import of ${data.length} rows...`);
        
        if (data.length > 0) {
            console.log('Sample data keys:', Object.keys(data[0]));
        }

        db.serialize(() => {
            const stmt = db.prepare("INSERT OR IGNORE INTO words (english, chinese, category) VALUES (?, ?, ?)");
            let count = 0;

            data.forEach(row => {
                // Using keys from the actual data to avoid encoding issues
                const keys = Object.keys(row);
                const english = row[keys[0]] || ''; // '摮'
                const chinese = row[keys[2]] || ''; // '銝剜蝧餉陌'
                const rawCategory = row[keys[3]] || ''; // '蝝/摮貉摮'

                // Map Category
                let category = '初級';
                if (rawCategory && rawCategory.toString().includes('中級')) {
                    category = '中級';
                }

                if (english && chinese) {
                    stmt.run(english.toString().trim(), chinese.toString().trim(), category);
                    count++;
                }
            });

            stmt.finalize(() => {
                console.log(`Successfully processed ${count} words from Excel.`);
                db.close();
            });
        });
    } catch (err) {
        console.error('Import failed:', err.message);
    }
}

importExcel();
