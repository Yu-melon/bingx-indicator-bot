// api/index.js

const TelegramBot = require('node-telegram-bot-api');

// Telegram Bot Token 和 Chat ID
const TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; // 替換為你的 Bot Token
const TELEGRAM_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID'; // 替換為你的 Chat ID

// 定義 HTTP Handler
export default async function handler(req, res) {
    try {
        // 接收的參數（例如從請求體）
        const { message } = req.body || {};

        // 如果沒有提供訊息，回傳錯誤
        if (!message) {
            res.status(400).json({ success: false, error: 'Message is required' });
            return;
        }

        // 初始化 Telegram Bot
        const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

        // 發送訊息到 Telegram
        await bot.sendMessage(TELEGRAM_CHAT_ID, message);

        // 成功回應
        res.status(200).json({ success: true, message: 'Message sent to Telegram successfully!' });
    } catch (error) {
        // 捕捉錯誤
        console.error('Error sending message to Telegram:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
