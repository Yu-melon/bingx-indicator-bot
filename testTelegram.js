const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function testTelegram() {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: "這是一條測試消息，確認 Telegram Bot 是否可用。",
    });
    console.log('Telegram 測試消息已發送！', response.data);
  } catch (error) {
    console.error('Telegram 測試失敗：', error.message);
  }
}

testTelegram();
