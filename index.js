const express = require('express');
const line = require('@line/bot-sdk');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { GoogleSpreadsheet } = require('google-spreadsheet');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
const client = new line.Client(config);
const upload = multer({ dest: 'uploads/' });

app.post('/webhook', line.middleware(config), async (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) => res.json(result));
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'image') {
    return Promise.resolve(null);
  }

  try {
    const stream = await client.getMessageContent(event.message.id);
    const tempPath = path.join(__dirname, 'temp.jpg');
    const writer = fs.createWriteStream(tempPath);

    stream.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const result = await Tesseract.recognize(tempPath, 'eng+jpn', {
      logger: (m) => console.log(m)
    });

    // weightっぽい数字を探す
    const weightMatch = result.data.text.match(/(\d{2,3}\.\d)/);
    const weight = weightMatch ? weightMatch[1] : null;

    if (!weight) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '体重を読み取れませんでした。はっきり撮ってみてください。'
      });
    } else {
      // スプレッドシートに書き込み（必要なら追加）
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `体重を ${weight} kg として記録しました。`
      });
    }

    // 🔧 安全にファイル削除（エラー無視）
    fs.unlink(tempPath, (err) => {
      if (err) console.error("画像削除エラー:", err);
    });

  } catch (error) {
    console.error("処理エラー:", error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '画像処理中にエラーが発生しました。'
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
