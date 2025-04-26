// ===============================
// 環境変数ロード
// ===============================
require('dotenv').config();

// ===============================
// ライブラリ読み込み
// ===============================
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const kuromoji = require('kuromoji');

// ===============================
// 環境変数チェック
// ===============================
const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;
const CHANNEL_SECRET = process.env.CHANNEL_SECRET; // いまは未使用だが念のため読み込む

if (!CHANNEL_ACCESS_TOKEN || !CHANNEL_SECRET) {
  console.error('Error: Missing LINE credentials. Check your .env or environment variables.');
  process.exit(1); // 環境変数が無いならサーバーを起動しない
}

// ===============================
// Expressアプリ作成
// ===============================
const app = express();
app.use(bodyParser.json());

// ===============================
// FAQ（キーワードと答えのリスト）
const faq = [
  {
    keywords: ["返品", "返金", "キャンセル"],
    answer: "返品は7日以内なら可能です。"
  },
  {
    keywords: ["送料", "配送料", "配送費"],
    answer: "送料は全国一律500円です。"
  },
  {
    keywords: ["支払い", "決済"],
    answer: "クレジットカードまたはPayPayが使えます。"
  }
];

// ===============================
// Webhook受信エンドポイント
// ===============================
app.post('/webhook', (req, res) => {
  const events = req.body.events;

  events.forEach(event => {
    if (event.type === 'message' && event.message.type === 'text') {
      handleUserMessage(event);
    }
  });

  res.sendStatus(200);
});

// ===============================
// ユーザーメッセージ処理
// ===============================
function handleUserMessage(event) {
  const userMessage = event.message.text;

  kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
    if (err) {
      console.error('形態素解析エラー:', err);
      return;
    }

    const tokens = tokenizer.tokenize(userMessage);
    const words = tokens.map(token => token.surface_form);

    let reply = "すみません、よくわかりませんでした。";

    for (let item of faq) {
      if (item.keywords.some(keyword => words.includes(keyword))) {
        reply = item.answer;
        break;
      }
    }

    replyToLine(event.replyToken, reply);
  });
}

// ===============================
// LINEへの返信処理
// ===============================
function replyToLine(replyToken, replyText) {
  axios.post('https://api.line.me/v2/bot/message/reply', {
    replyToken: replyToken,
    messages: [{ type: 'text', text: replyText }]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
    }
  }).catch(err => {
    console.error('LINE返信エラー:', err.response ? err.response.data : err);
  });
}

// ===============================
// サーバー起動
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ NLP LINE Botサーバー起動中（ポート: ${PORT}）`);
});
