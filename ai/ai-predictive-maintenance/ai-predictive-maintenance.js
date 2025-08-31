const si = require('systeminformation');
const tf = require('@tensorflow/tfjs-node');
const nodemailer = require('nodemailer');

// CONFIG
const POLL_INTERVAL = 5 * 60 * 1000;
const EMAIL = 'your_email@gmail.com';
const PASSWORD = 'your_app_password';
const ALERT_RECEIVER = 'receiver_email@gmail.com';

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL, pass: PASSWORD }
});

let cpuHistory = [];
let memHistory = [];

// Dummy ML: Predict failure if 3 of last 5 CPU/RAM > 85%
function predictFailure(history) {
  if (history.length < 5) return false;
  const lastFive = history.slice(-5);
  return lastFive.filter(v => v > 85).length >= 3;
}

async function sendAlert(cpu, mem) {
  await transporter.sendMail({
    from: EMAIL,
    to: ALERT_RECEIVER,
    subject: 'Predictive Maintenance Alert',
    text: `High risk detected. CPU: ${cpu}%, RAM: ${mem}%`
  });
}

async function monitor() {
  const cpu = (await si.currentLoad()).currentLoad;
  const mem = (await si.mem());
  const ram = (mem.used / mem.total) * 100;
  cpuHistory.push(cpu);
  memHistory.push(ram);
  if (cpuHistory.length > 20) cpuHistory.shift();
  if (memHistory.length > 20) memHistory.shift();

  if (predictFailure(cpuHistory) || predictFailure(memHistory)) {
    await sendAlert(cpu.toFixed(2), ram.toFixed(2));
    console.log('Predictive maintenance alert sent!');
  }
  console.log(`[${new Date().toISOString()}] CPU: ${cpu.toFixed(2)}%, RAM: ${ram.toFixed(2)}%`);
}

setInterval(monitor, POLL_INTERVAL);
monitor();
