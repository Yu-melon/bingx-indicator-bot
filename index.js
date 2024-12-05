const axios = require('axios');

// Telegram 配置
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// BingX API 配置
const API_BASE_URL = 'https://api.bingx.com/api/v1/';
const API_KEY = process.env.apiKey;

// 發送訊息到 Telegram
async function sendToTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
    console.log('Message sent to Telegram!');
  } catch (error) {
    console.error('Error sending message to Telegram:', error.message);
  }
}

// 主程式
module.exports = async (req, res) => {
  try {
    // 獲取交易對數據
    const symbolsResponse = await axios.get(`${API_BASE_URL}market/symbols`, {
      headers: {
        'X-BX-APIKEY': API_KEY,
      },
    });

    // 調試打印返回的數據結構
    console.log("BingX API 返回的數據結構：", JSON.stringify(symbolsResponse.data, null, 2));

    // 初始化有效與略過交易對列表
    let validSymbols = [];
    let skippedSymbols = [];

    // 處理數據結構，篩選有效交易對
    if (Array.isArray(symbolsResponse.data.data)) {
      symbolsResponse.data.data.forEach((item) => {
        if (item.symbol && item.quoteAsset === 'USDT') {
          validSymbols.push(item.symbol);
        } else {
          skippedSymbols.push(item);
        }
      });
    } else if (symbolsResponse.data.data && typeof symbolsResponse.data.data === 'object') {
      Object.values(symbolsResponse.data.data).forEach((item) => {
        if (item.symbol && item.quoteAsset === 'USDT') {
          validSymbols.push(item.symbol);
        } else {
          skippedSymbols.push(item);
        }
      });
    } else {
      console.error("無法解析 BingX API 返回的數據結構");
      res.status(200).json({
        message: '未找到符合條件的交易對，請檢查 API 返回的數據。',
        data: symbolsResponse.data,
      });
      return;
    }

    // 打印有效與略過的交易對
    console.log("篩選出的有效交易對：", validSymbols);
    console.log("被略過的交易對：", skippedSymbols);

    // 如果沒有有效交易對，返回提示信息
    if (validSymbols.length === 0) {
      console.error("未找到任何有效的交易對！");
      res.status(200).json({
        message: '未找到符合條件的交易對。',
        skippedSymbols,
      });
      return;
    }

    // 生成報告並發送到 Telegram
    const report = validSymbols
      .map((symbol) => `交易對: ${symbol}`)
      .join('\n');
    await sendToTelegram(`BingX 有效交易對結果:\n\n${report}`);

    // 返回篩選結果到 API
    res.status(200).json({
      message: '篩選完成，結果已發送到 Telegram。',
      validSymbols,
      skippedSymbols,
    });
  } catch (error) {
    console.error('Error in main process:', error.message);
    res.status(500).json({ error: error.message });
  }
};
