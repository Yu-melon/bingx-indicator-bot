const axios = require('axios');

const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_ACCESS_TOKEN; // LINE Notify 的 Access Token

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            // 測試訊息
            const response = await axios.post(
                'https://notify-api.line.me/api/notify',
                new URLSearchParams({ message: 'Hello, this is a test message from Vercel via LINE Notify!' }),
                {
                    headers: {
                        Authorization: `Bearer ${LINE_NOTIFY_TOKEN}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            res.status(200).json({ success: true, data: response.data });
            return;
        }

        if (req.method === 'POST') {
            const { message } = req.body;

            if (!message) {
                res.status(400).json({ success: false, error: 'Message is required' });
                return;
            }

            const response = await axios.post(
                'https://notify-api.line.me/api/notify',
                new URLSearchParams({ message }),
                {
                    headers: {
                        Authorization: `Bearer ${LINE_NOTIFY_TOKEN}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            res.status(200).json({ success: true, data: response.data });
            return;
        }

        res.status(405).json({ success: false, error: 'Only GET and POST requests are allowed' });
    } catch (error) {
        console.error('LINE Notify Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data || error.message });
    }
}
export default async function handler(req, res) {
    try {
        console.log('LINE_NOTIFY_ACCESS_TOKEN:', process.env.LINE_NOTIFY_ACCESS_TOKEN); // 打印環境變數
        res.status(200).json({ success: true, message: 'Environment variable check passed!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

