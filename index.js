require("dotenv").config();
const express = require("express");
const { middleware, Client } = require("@line/bot-sdk");
const axios = require("axios");
const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
app.use(express.json());
app.use(middleware(config));
const client = new Client(config);

app.post("/webhook", async (req, res) => {
  const event = req.body.events?.[0];

  if (!event || event.type !== "message" || event.message.type !== "image") {
    return res.sendStatus(200);
  }

  const stream = await client.getMessageContent(event.message.id);
  const tempPath = path.join(__dirname, "temp.jpg");
  const writer = fs.createWriteStream(tempPath);
  stream.pipe(writer);

  writer.on("finish", async () => {
    const result = await Tesseract.recognize(tempPath, "eng+jpn");
    const match = result.data.text.match(/([0-9]{2,3}\.?[0-9]?)\s?kg/i);
    const weight = match ? match[1] : null;

    if (weight) {
      await axios.post(process.env.SHEET_SCRIPT_URL, { weight });
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: `✅ 記録しました：${weight} kg`,
      });
    } else {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: `❌ 体重を読み取れませんでした。\n画像が鮮明か確認してください。`,
      });
    }

    fs.unlinkSync(tempPath);
  });

  res.sendStatus(200);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Bot is running on port", port);
});
