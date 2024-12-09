const ccxt = require('ccxt');
const technicalindicators = require('technicalindicators');
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');

// 初始化 BingX
async function initializeBingX() {
    try {
        const exchange = new ccxt.bingx({
            apiKey: 'YOUR_BINGX_API_KEY',
            secret: 'YOUR_BINGX_SECRET'
        });
        await exchange.loadMarkets();
        console.log('BingX 交易所連線成功！');
        return exchange;
    } catch (error) {
        console.error('初始化失敗:', error);
        return null;
    }
}

// 抓取 K 線數據
async function fetchData(exchange, symbol, timeframe = '1h', limit = 50) {
    try {
        console.log(`正在抓取 ${symbol} 的 ${timeframe} K 線數據...`);
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
        return ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
            timestamp: new Date(timestamp),
            open,
            high,
            low,
            close,
            volume
        }));
    } catch (error) {
        console.error(`抓取 ${symbol} 數據失敗:`, error);
        return [];
    }
}

// 日 K 高低點篩選
function filterByDailyHighLow(currentPrice, dailyData) {
    if (!dailyData || dailyData.length < 2) {
        console.log('日 K 線數據不足，無法進行高低點篩選。');
        return false;
    }

    // 取前一天的高點和低點
    const prevHigh = dailyData[dailyData.length - 2].high;
    const prevLow = dailyData[dailyData.length - 2].low;

    if (currentPrice > prevHigh || currentPrice < prevLow) {
        console.log(`當前價格 ${currentPrice} 超過前日高點 ${prevHigh} 或低於前日低點 ${prevLow}，符合篩選條件。`);
        return true;
    } else {
        console.log(`當前價格 ${currentPrice} 未超過前日高點 ${prevHigh} 或低於前日低點 ${prevLow}，不符合篩選條件。`);
        return false;
    }
}

// 計算技術指標
function calculateIndicators(data) {
    try {
        const closes = data.map(d => d.close);
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);

        const RSI = technicalindicators.RSI.calculate({ values: closes, period: 7 });
        const EMA_short = technicalindicators.EMA.calculate({ values: closes, period: 5 });
        const EMA_long = technicalindicators.EMA.calculate({ values: closes, period: 15 });
        const MACD = technicalindicators.MACD.calculate({
            values: closes,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });
        const SAR = technicalindicators.SAR.calculate({
            high: highs,
            low: lows,
            step: 0.02,
            max: 0.2
        });

        return {
            RSI,
            EMA_short,
            EMA_long,
            MACD,
            SAR
        };
    } catch (error) {
        console.error('計算技術指標失敗:', error);
        return null;
    }
}

// 信號生成邏輯
function generateSignal(indicators, latestPrice) {
    const { RSI, EMA_short, EMA_long, MACD, SAR } = indicators;

    const lastRSI = RSI[RSI.length - 1];
    const lastEMA_short = EMA_short[EMA_short.length - 1];
    const lastEMA_long = EMA_long[EMA_long.length - 1];
    const lastMACD = MACD[MACD.length - 1];
    const lastSAR = SAR[SAR.length - 1];

    if (
        lastRSI < 50 &&
        lastEMA_short > lastEMA_long &&
        lastMACD.MACD > lastMACD.signal &&
        latestPrice > lastSAR
    ) {
        return '多方';
    } else if (
        lastRSI > 50 &&
        lastEMA_short < lastEMA_long &&
        lastMACD.MACD < lastMACD.signal &&
        latestPrice < lastSAR
    ) {
        return '空方';
    } else {
        return null;
    }
}

// 發送訊息到 Telegram
async function sendToTelegram(message) {
    const TELEGRAM_API_TOKEN = 'YOUR_TELEGRAM_API_TOKEN';
    const TELEGRAM_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID';

    const bot = new TelegramBot(TELEGRAM_API_TOKEN);
    try {
        await bot.sendMessage(TELEGRAM_CHAT_ID, message);
        console.log('訊息已成功發送至 Telegram。');
    } catch (error) {
        console.error('Telegram 傳送失敗:', error);
    }
}

// 主邏輯
(async () => {
    const exchange = await initializeBingX();
    if (!exchange) return;

    const symbols = Object.keys(exchange.markets).filter(symbol => symbol.includes('/USDT'));
    const results = { 多方: [], 空方: [] };

    for (const symbol of symbols) {
        // 抓取日 K 線數據
        const dailyData = await fetchData(exchange, symbol, '1d', 2);
        if (dailyData.length < 2) continue;

        // 抓取當前 1 小時 K 線數據
        const data = await fetchData(exchange, symbol, '1h', 50);
        if (data.length < 50) continue;

        const latestPrice = data[data.length - 1].close;

        // 篩選日 K 高低點條件
        if (!filterByDailyHighLow(latestPrice, dailyData)) continue;

        // 計算技術指標
        const indicators = calculateIndicators(data);
        if (!indicators) continue;

        // 生成信號
        const signal = generateSignal(indicators, latestPrice);
        if (signal) {
            results[signal].push(symbol);
        }
    }

    let message = '交易信號：\n';
    for (const [type, symbols] of Object.entries(results)) {
        message += `\n${type} 信號:\n${symbols.join('\n')}`;
    }

    await sendToTelegram(message);
})();
