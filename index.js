const axios = require('axios');
const { RSI, EMA, MACD, SAR } = require('technicalindicators');

// Telegram 配置
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// BingX API 配置
const API_BASE_URL = 'https://api.bingx.com/api/v1/';
const API_KEY = process.env.apiKey;

// 獲取 K 線數據
async function fetchKlines(symbol, interval = '1d', limit = 50) {
  try {
    const response = await axios.get(`${API_BASE_URL}market/candles`, {
      params: {
        symbol,
        interval,
        limit,
      },
      headers: {
        'X-BX-APIKEY': API_KEY,
      },
    });
    return response.data.data.map((item) => ({
      timestamp: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  } catch (error) {
    console.error(`Error fetching Klines for ${symbol}:`, error.message);
    return null;
  }
}

// 計算技術指標
async function calculateIndicators(data) {
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

  return {
    rsi,
    emaShort,
    emaLong,
    macd: macdResult.MACD,
    macdSignal: macdResult.signal,
    sar,
  };
}

// 生成信號
function generateSignal(indicators, closePrice) {
  const { rsi, emaShort, emaLong, macd, macdSignal, sar } = indicators;

  if (rsi < 50 && emaShort > emaLong && macd > macdSignal && closePrice > sar) {
    return '多方';
  } else if (rsi > 50 && emaShort < emaLong && macd < macdSignal && closePrice < sar) {
    return '空方';
  } else {
    return '觀察';
  }
}

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
    const symbols = symbolsResponse.data.data
      .filter((s) => s.quoteAsset === 'USDT') // 僅選取 USDT 的交易對
      .map((s) => s.symbol);

    const results = [];
    for (const symbol of symbols) {
      const klines = await fetchKlines(symbol);
      if (klines && klines.length > 0) {
        const latestData = klines.slice(-1)[0];
        const indicators = await calculateIndicators(klines);
        const signal = generateSignal(indicators, latestData.close);

        results.push({
          symbol,
          rsi: indicators.rsi.toFixed(2),
          emaShort: indicators.emaShort.toFixed(2),
          emaLong: indicators.emaLong.toFixed(2),
          macd: indicators.macd.toFixed(2),
          macdSignal: indicators.macdSignal.toFixed(2),
          sar: indicators.sar.toFixed(2),
          signal,
        });
      }
    }

    // 生成報告並發送到 Telegram
    const report = results
      .map(
        (r) =>
          `交易對: ${r.symbol}\nRSI: ${r.rsi}\nEMA短期: ${r.emaShort}\nEMA長期: ${r.emaLong}\nMACD: ${r.macd}\nMACD信號: ${r.macdSignal}\nSAR: ${r.sar}\n信號: ${r.signal}`
      )
      .join('\n\n');
    await sendToTelegram(`BingX 分析結果:\n\n${report}`);

    res.status(200).json({
      message: '分析完成，結果已發送到 Telegram。',
      data: results,
    });
  } catch (error) {
    console.error('Error in main process:', error.message);
    res.status(500).json({ error: error.message });
  }
};
