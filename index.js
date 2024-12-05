const axios = require('axios');
const { RSI, EMA, MACD, SAR } = require('technicalindicators');

// Telegram 配置
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// BingX API 配置
const API_BASE_URL = 'https://api.bingx.com/api/v1/';
const API_KEY = process.env.apiKey;

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

    // 篩選交易對後進行其他處理，例如分析或發送到 Telegram
    res.status(200).json({ message: '篩選完成', symbols });
  } catch (error) {
    console.error('Error in main process:', error.message);
    res.status(500).json({ error: error.message });
  }
};
