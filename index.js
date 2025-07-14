const express = require('express');
const multer = require('multer');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const { google } = require('googleapis');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Google Sheets認証情報
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: process.env.GCP_PROJECT_ID,
    private_key_id: process.env.GCP_PRIVATE_KEY_ID,
    private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GCP_CLIENT_EMAIL,
    client_id: process.env.GCP_CLIENT_ID,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = 'ログ';

// 画像保存用
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

app.post('/webhook', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('⚠️ 画像が添付されていません');
      return res.status(400).send('画像が必要です');
    }

    const imagePath = req.file.path;
    console.log("📷 画像パス:", imagePath);

    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'eng',
      { logger: m => console.log(m) }
    );

    console.log("🔍 OCR結果:", text);

    const match = text.match(/(\d{2,3}(?:\.\d+)?)/);
    if (!match) {
      console.log("❌ 体重らしき数字が見つかりません");
      return res.json({ reply: '体重を読み取れませんでした。はっきり撮ってみて。' });
    }

    const weight = parseFloat(match[1]);
    const now = new Date();
    const date = now.toLocaleDateString('ja-JP');
    const time = now.toLocaleTimeString('ja-JP');

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, time, weight]],
      },
    });

    res.json({ reply: `体重 ${weight}kg を記録したよ！` });

    // ファイル削除（存在確認付き）
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

  } catch (error) {
    console.error('🚨 エラー:', error);
    res.status(500).send('サーバーエラー');
  }
});

app.listen(port, () => {
  console.log(`✅ weight-bot is running on port ${port}`);
});
