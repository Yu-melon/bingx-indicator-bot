const express = require("express");
const axios = require("axios");
const { RSI, EMA, MACD } = require("technicalindicators");

const app = express();

app.get("/", (req, res) => {
    res.send("Hello, this is your trading bot deployed on Vercel!");
});

app.post("/run-signals", async (req, res) => {
    try {
        const symbols = ["BTCUSDT", "ETHUSDT"];
        const results = [];

        for (const symbol of symbols) {
            const response = await axios.get(
                `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=50`
            );
            const ohlcv = response.data;
            const closePrices = ohlcv.map((candle) => parseFloat(candle[4]));

            const rsi = RSI.calculate({ values: closePrices, period: 7 });
            const emaShort = EMA.calculate({ values: closePrices, period: 5 });
            const emaLong = EMA.calculate({ values: closePrices, period: 15 });
            const macd = MACD.calculate({
                values: closePrices,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
            });

            const latestRSI = rsi[rsi.length - 1];
            const latestEMAShort = emaShort[emaShort.length - 1];
            const latestEMALong = emaLong[emaLong.length - 1];
            const latestMACD = macd[macd.length - 1];

            let signal = "觀察";
            if (latestRSI < 50 && latestEMAShort > latestEMALong && latestMACD.MACD > latestMACD.signal) {
                signal = "多方";
            } else if (latestRSI > 50 && latestEMAShort < latestEMALong && latestMACD.MACD < latestMACD.signal) {
                signal = "空方";
            }

            results.push({ symbol, signal });
        }

        res.json({ status: "success", data: results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

module.exports = app;
