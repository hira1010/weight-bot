# LINE Weight Bot

## 概要
LINEで送信された体重スクショ画像をOCR処理し、Googleスプレッドシートに記録するBotです。

## 必要な環境変数（.env）
```
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
SHEET_SCRIPT_URL=
```

## デプロイ方法（Render用）
1. GitHubにアップロード
2. Renderで「New Web Service」
3. Build command: `npm install`
4. Start command: `npm start`
5. 環境変数をRenderに設定
6. Webhook URLをLINE Developersに設定