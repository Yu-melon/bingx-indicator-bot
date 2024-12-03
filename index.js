const ccxt = require("ccxt");
const { RSI, EMA, MACD, SAR } = require("technicalindicators");
const axios = require("axios");

// Telegram 配置
const TELEGRAM_BOT_TOKEN = "你的Telegram Bot Token";
const TELEGRAM_CHAT_ID = "你的Chat ID";

// 初始化 BingX 交易所
const exchange = new ccxt.bingx({
  apiKey: "你的API金鑰",
  secret: "你的API密鑰",
});

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
function generateSignal(indicators) {
  const { rsi, emaShort, emaLong, macd, macdSignal, sar, close } = indicators;

  if (rsi < 50 && emaShort > emaLong && macd > macdSignal && close > sar) {
    return "多方";
  } else if (rsi > 50 && emaShort < emaLong && macd < macdSignal && close < sar) {
    return "空方";
  } else {
    return "觀察";
  }
}

// 抓取數據並計算
async function fetchAndAnalyze(symbol, timeframe = "1d") {
  try {
    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe);
    const formattedData = ohlcv.map((item) => ({
      timestamp: item[0],
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
      volume: item[5],
    }));

    const indicators = await calculateIndicators(formattedData);
    const signal = generateSignal({ ...indicators, close: formattedData.slice(-1)[0].close });

    return {
      symbol,
      rsi: indicators.rsi,
      emaShort: indicators.emaShort,
      emaLong: indicators.emaLong,
      macd: indicators.macd,
      macdSignal: indicators.macdSignal,
      sar: indicators.sar,
      signal,
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    return null;
  }
}

// 發送訊息到 Telegram
async function sendToTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
  });
}

// 主程式
module.exports = async (req, res) => {
  try {
    const symbols = await exchange.loadMarkets();
    const usdtPairs = Object.keys(symbols).filter((symbol) => symbol.endsWith("/USDT"));

    const results = [];
    for (const symbol of usdtPairs) {
      const analysis = await fetchAndAnalyze(symbol);
      if (analysis) {
        results.push(analysis);
      }
    }

    const report = results
      .map(
        (result) =>
          `交易對: ${result.symbol}\nRSI: ${result.rsi.toFixed(2)}\nEMA短期: ${result.emaShort.toFixed(
            2
          )}\nEMA長期: ${result.emaLong.toFixed(2)}\nMACD: ${result.macd.toFixed(
            2
          )}\nMACD信號: ${result.macdSignal.toFixed(2)}\nSAR: ${result.sar.toFixed(2)}\n信號: ${
            result.signal
          }\n`
      )
      .join("\n------------------\n");

    // 發送到 Telegram
    await sendToTelegram(`BingX 分析結果:\n\n${report}`);

    // 回應 API 請求
    res.status(200).json({
      message: "分析完成，結果已發送到 Telegram。",
      data: results,
    });
  } catch (error) {
    console.error("主程式錯誤:", error.message);
    res.status(500).json({ message: "執行錯誤", error: error.message });
  }
};
