const TelegramBot = require('node-telegram-bot-api');

// 環境變數
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Telegram Bot Token
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;     // Telegram Chat ID

// 定義 API Handler
export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({ success: false, error: 'Only POST requests are allowed' });
            return;
        }

        const { message } = req.body;

        if (!message) {
            res.status(400).json({ success: false, error: 'Message is required' });
            return;
        }

        // 初始化 Telegram Bot
        const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

        // 發送訊息到 Telegram
        await bot.sendMessage(TELEGRAM_CHAT_ID, message);

        res.status(200).json({ success: true, message: 'Message sent to Telegram successfully!' });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
