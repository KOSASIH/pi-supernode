const si = require('systeminformation');
const tf = require('@tensorflow/tfjs-node');

const HISTORY_LENGTH = 60; // past 60 mins
const POLL_INTERVAL = 60 * 1000; // 1 minute

let cpuHistory = [];
let ramHistory = [];

// Dummy LSTM model for illustration; in production, train a real model!
async function predictNext(values) {
    // Very naive "prediction": average of last 5
    const last5 = values.slice(-5);
    return last5.reduce((a, b) => a + b, 0) / last5.length;
}

async function monitorAndForecast() {
    const cpu = (await si.currentLoad()).currentLoad;
    const mem = await si.mem();
    const ram = (mem.used / mem.total) * 100;

    cpuHistory.push(cpu);
    ramHistory.push(ram);
    if (cpuHistory.length > HISTORY_LENGTH) cpuHistory.shift();
    if (ramHistory.length > HISTORY_LENGTH) ramHistory.shift();

    if (cpuHistory.length >= 5 && ramHistory.length >= 5) {
        const cpuForecast = await predictNext(cpuHistory);
        const ramForecast = await predictNext(ramHistory);

        console.log(`[${new Date().toISOString()}] CPU: ${cpu.toFixed(2)}% (Forecast: ${cpuForecast.toFixed(2)}%), RAM: ${ram.toFixed(2)}% (Forecast: ${ramForecast.toFixed(2)}%)`);
    } else {
        console.log(`[${new Date().toISOString()}] CPU: ${cpu.toFixed(2)}%, RAM: ${ram.toFixed(2)}% (collecting history...)`);
    }
}

setInterval(monitorAndForecast, POLL_INTERVAL);
monitorAndForecast();