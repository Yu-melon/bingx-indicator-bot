const ccxt = require('ccxt');
const fetch = require('node-fetch');

async function initializeBingX() {
    try {
        const exchange = new ccxt.bingx({
            apiKey: 'YOUR_BINGX_API_KEY', // 替換為 BingX API Key
            secret: 'YOUR_BINGX_SECRET' // 替換為 BingX Secret
        });
        await exchange.loadMarkets();
        console.log('BingX 交易所連線成功！');
        return exchange;
    } catch (error) {
        console.error('初始化失敗:', error);
        return null;
    }
}

async function fetchKlineData(exchange, symbol, timeframe = '1h') {
    try {
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, 50);
        return ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
            timestamp,
            open,
            high,
            low,
            close,
            volume
        }));
    } catch (error) {
        console.error(`抓取 ${symbol} 的數據失敗:`, error);
        return null;
    }
}

function filterByDailyHighLow(currentPrice, dailyData) {
    if (dailyData.length < 2) {
        console.log('日 K 線數據不足，無法進行高低點篩選。');
        return false;
    }
    const [prevDay] = dailyData.slice(-2, -1);
    return currentPrice > prevDay.high || currentPrice < prevDay.low;
}

function calculateIndicators(data) {
    const result = data.map((item, index, arr) => {
        if (index < 14) return { ...item }; // 確保數據足夠計算指標
        const rsi = calculateRSI(arr.slice(index - 14, index + 1));
        return { ...item, rsi };
    });
    return result;
}

function calculateRSI(data) {
    const gains = [];
    const losses = [];
    for (let i = 1; i < data.length; i++) {
        const diff = data[i].close - data[i - 1].close;
        if (diff >= 0) gains.push(diff);
        else losses.push(-diff);
    }
    const avgGain = gains.reduce((sum, g) => sum + g, 0) / gains.length;
    const avgLoss = losses.reduce((sum, l) => sum + l, 0) / losses.length;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}

async function sendToTelegram(message) {
    const TELEGRAM_API_TOKEN = 'YOUR_TELEGRAM_API_TOKEN';
    const TELEGRAM_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID';
    const url = `https://api.telegram.org/bot${TELEGRAM_API_TOKEN}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
        });
        console.log('訊息已成功發送至 Telegram。', await response.json());
    } catch (error) {
        console.error('Telegram 傳送失敗:', error);
    }
}

async function main() {
    const exchange = await initializeBingX();
    if (!exchange) return;

    const symbols = Object.keys(exchange.markets).filter(symbol => symbol.endsWith('/USDT'));

    for (const symbol of symbols) {
        const klineData = await fetchKlineData(exchange, symbol);
        const dailyData = await fetchKlineData(exchange, symbol, '1d');
        if (!klineData || !dailyData) continue;

        const currentPrice = klineData[klineData.length - 1].close;
        if (!filterByDailyHighLow(currentPrice, dailyData)) continue;

        const indicators = calculateIndicators(klineData);
        console.log(`交易對: ${symbol}, RSI: ${indicators[indicators.length - 1].rsi}`);
    }
}

main();
