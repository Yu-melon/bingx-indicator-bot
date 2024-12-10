const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req, res) {
    try {
        // 檢查是否是 GET 請求，用來測試部署
        if (req.method === 'GET') {
            const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
            await bot.sendMessage(TELEGRAM_CHAT_ID, 'Hello, this is a test message from Vercel!');
            res.status(200).json({ success: true, message: 'Test message sent to Telegram!' });
            return;
        }

        // POST 請求，發送自定義訊息
        if (req.method === 'POST') {
            const { message } = req.body;

            if (!message) {
                res.status(400).json({ success: false, error: 'Message is required' });
                return;
            }

            const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
            await bot.sendMessage(TELEGRAM_CHAT_ID, message);

            res.status(200).json({ success: true, message: 'Message sent to Telegram successfully!' });
            return;
        }

        res.status(405).json({ success: false, error: 'Only GET and POST requests are allowed' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
