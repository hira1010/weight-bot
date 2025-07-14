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
  const events = req.body.events;
  for (const event of events) {
    if (event.message && event.message.type === "image") {
      try {
        const stream = await client.getMessageContent(event.message.id);
        const tempPath = path.join(__dirname, "temp.jpg");
        const writer = fs.createWriteStream(tempPath);
        stream.pipe(writer);
        await new Promise((resolve) => writer.on("finish", resolve));

        const result = await Tesseract.recognize(tempPath, "eng+jpn");
        const match = result.data.text.match(/([0-9]{2,3}\.?[0-9]?)\s?kg/i);
        if (match) {
          const weight = match[1];
          await axios.post(process.env.SHEET_SCRIPT_URL, { weight });
          await client.replyMessage(event.replyToken, {
            type: "text",
            text: `記録しました：${weight} kg`,
          });
        } else {
          await client.replyMessage(event.replyToken, {
            type: "text",
            text: "体重を認識できませんでした。",
          });
        }
        fs.unlinkSync(tempPath);
      } catch (err) {
        console.error(err);
      }
    }
  }
  res.sendStatus(200);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});