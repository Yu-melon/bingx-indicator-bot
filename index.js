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
    // 獲取支持的交易對
    const symbolsResponse = await axios.get(`${API_BASE_URL}market/symbols`, {
      headers: {
        'X-BX-APIKEY': API_KEY,
      },
    });

    // 調試打印 API 返回數據結構
    console.log("BingX API 返回的數據結構：", JSON.stringify(symbolsResponse.data, null, 2));

    // 處理不同數據結構
    let symbols = [];
    if (Array.isArray(symbolsResponse.data.data)) {
      symbols = symbolsResponse.data.data
        .filter((item) => item.quoteAsset === 'USDT')
        .map((item) => item.symbol);
    } else if (symbolsResponse.data.data && symbolsResponse.data.data.symbols) {
      symbols = symbolsResponse.data.data.symbols
        .filter((item) => item.quoteAsset === 'USDT')
        .map((item) => item.symbol);
    } else if (symbolsResponse.data.data && typeof symbolsResponse.data.data === 'object') {
      symbols = Object.values(symbolsResponse.data.data)
        .filter((item) => item.quoteAsset === 'USDT')
        .map((item) => item.symbol);
    } else {
      console.error("未知的數據結構：", JSON.stringify(symbolsResponse.data, null, 2));
      throw new Error("無法解析 BingX API 返回的數據");
    }

    console.log("篩選出的交易對：", symbols);

    // 如果未找到交易對，返回提示信息
    if (symbols.length === 0) {
      console.error("未找到符合條件的交易對！");
      res.status(200).json({ message: '未找到符合條件的交易對！' });
      return;
    }

    // 生成報告並發送到 Telegram
    const report = symbols
      .map((symbol) => `交易對: ${symbol}`)
      .join('\n');
    await sendToTelegram(`BingX 篩選結果:\n\n${report}`);

    res.status(200).json({
      message: '篩選完成，結果已發送到 Telegram。',
      symbols,
    });
  } catch (error) {
    console.error('Error in main process:', error.message);
    res.status(500).json({ error: error.message });
  }
};
