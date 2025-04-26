// ライブラリ読み込み
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const kuromoji = require('kuromoji');

// アプリを作る
const app = express();
app.use(bodyParser.json());

// LINE BOTのチャネルアクセストークン
const CHANNEL_ACCESS_TOKEN = 'ここに自分のトークンを貼る';

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

// LINEからメッセージを受け取るWebhook
app.post('/webhook', (req, res) => {
  const events = req.body.events;

  events.forEach(event => {
    if (event.type === 'message' && event.message.type === 'text') {
      handleUserMessage(event);
    }
  });

  res.sendStatus(200);
});

// ユーザーのメッセージを処理する
function handleUserMessage(event) {
  const userMessage = event.message.text;

  // kuromojiで形態素解析！
  kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
    if (err) {
      console.error('形態素解析エラー:', err);
      return;
    }

    const tokens = tokenizer.tokenize(userMessage);
    const words = tokens.map(token => token.surface_form);

    // 初期の返事（マッチしなかった場合）
    let reply = "すみません、よくわかりませんでした。";

    // FAQルールにマッチするか探す
    for (let item of faq) {
      for (let keyword of item.keywords) {
        if (words.includes(keyword)) {
          reply = item.answer;
          break;
        }
      }
      if (reply !== "すみません、よくわかりませんでした。") break;
    }

    // LINEに返事を送る
    replyToLine(event.replyToken, reply);
  });
}

// LINEにメッセージ返信する
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

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`テストサーバーが動いてます！ポート: ${PORT}`);
});
