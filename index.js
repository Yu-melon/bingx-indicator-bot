const axios = require('axios');
const { RSI, EMA, MACD, SAR } = require('technicalindicators');

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

// 獲取交易對的 K 線數據
async function fetchKlines(symbol, interval = '1d', limit = 50) {
  try {
    const response = await axios.get(`${API_BASE_URL}market/candles`, {
      params: { symbol, interval, limit },
      headers: { 'X-BX-APIKEY': API_KEY },
    });
    return response.data.data.map((item) => ({
      close: parseFloat(item[4]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
    }));
  } catch (error) {
    console.error(`Error fetching Klines for ${symbol}:`, error.message);
    return null;
  }
}

// 計算技術指標並生成信號
function calculateIndicators(data) {
  const closePrices = data.map((item) => item.close);
  const highPrices = data.map((item) => item.high);
  const lowPrices = data.map((item) => item.low);

  const rsi = RSI.calculate({ values: closePrices, period: 7 }).slice(-1)[0];
  const emaShort = EMA.calculate({ values: closePrices, period: 5 }).slice(-1)[0];
  const emaLong = EMA.calculate({ values: closePrices, period: 15 }).slice(-1)[0];
  const macdResult = MACD.calculate({
    values: closePrices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  }).slice(-1)[0];
  const sar = SAR.calculate({
    high: highPrices,
    low: lowPrices,
    step: 0.02,
    max: 0.2,
  }).slice(-1)[0];

  if (!macdResult || !sar || rsi === undefined || emaShort === undefined || emaLong === undefined) {
    return '觀察';
  }

  // 信號邏輯
  if (rsi < 50 && emaShort > emaLong && macdResult.MACD > macdResult.signal && data[data.length - 1].close > sar) {
    return '多方';
  } else if (rsi > 50 && emaShort < emaLong && macdResult.MACD < macdResult.signal && data[data.length - 1].close < sar) {
    return '空方';
  } else {
    return '觀察';
  }
}

// 主程式
module.exports = async (req, res) => {
  try {
    // 獲取支持的交易對
    const symbolsResponse = await axios.get(`${API_BASE_URL}market/symbols`, {
      headers: { 'X-BX-APIKEY': API_KEY },
    });

    console.log("BingX API 返回數據：", JSON.stringify(symbolsResponse.data, null, 2));

    // 處理數據結構
    let symbolsData = [];
    if (Array.isArray(symbolsResponse.data.data)) {
      symbolsData = symbolsResponse.data.data; // 數據是數組
    } else if (symbolsResponse.data.data && typeof symbolsResponse.data.data === 'object') {
      symbolsData = Object.values(symbolsResponse.data.data); // 數據是對象
    } else {
      throw new Error("無法解析 BingX API 返回的數據結構");
    }

    const validSymbols = symbolsData.filter((item) => item.quote_currency === 'USDT');
    const results = { 多方: [], 空方: [], 觀察: [] };

    // 處理每個有效交易對
    for (const symbolData of validSymbols) {
      const klines = await fetchKlines(symbolData.ticker_id);
      if (!klines) continue;

      const signal = calculateIndicators(klines);
      results[signal].push(symbolData.ticker_id);
    }

    // 生成報告
    const report = `
BingX 策略篩選結果：
多方交易對：
${results.多方.join('\n') || '無'}
空方交易對：
${results.空方.join('\n') || '無'}
觀察交易對：
${results.觀察.join('\n') || '無'}
    `;

    // 發送到 Telegram
    await sendToTelegram(report);

    res.status(200).json({ message: '篩選完成，結果已發送到 Telegram。', results });
  } catch (error) {
    console.error('Error in main process:', error.message);
    res.status(500).json({ error: error.message });
  }
};
