const XLSX = require('xlsx');
const path = require('path');

const filePath = 'D:/gemini/英文測驗/題目/note.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log('--- Excel Column Headers ---');
    if (data.length > 0) {
        console.log(Object.keys(data[0]));
        console.log('--- Sample Row ---');
        console.log(data[0]);
    } else {
        console.log('Excel file is empty.');
    }
} catch (err) {
    console.error('Error reading Excel:', err.message);
}
