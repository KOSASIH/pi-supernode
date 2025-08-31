const si = require('systeminformation');
const tf = require('@tensorflow/tfjs-node');
const nodemailer = require('nodemailer');

// --- CONFIGURATION ---
const POLL_INTERVAL_MS = 60 * 1000; // 1 minute
const ALERT_EMAIL = 'your_alert_receiver_email@gmail.com'; // Your email here
const EMAIL_USER = 'your_gmail_account@gmail.com'; // Your sender email
const EMAIL_PASS = 'your_gmail_app_password'; // Use App Password, not your main password

// --- EMAIL SETUP ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

// --- ANOMALY DETECTION MODEL (SIMPLE, CAN BE EXTENDED) ---
function isAnomaly(cpu, mem) {
    // Here, anomaly if CPU > 85% or RAM > 85%
    return cpu > 85 || mem > 85;
}

// --- ALERT FUNCTION ---
async function sendAlert(cpu, mem) {
    const mailOptions = {
        from: `"Pi Supernode Alert" <${EMAIL_USER}>`,
        to: ALERT_EMAIL,
        subject: '🚨 PI Supernode Anomaly Detected!',
        text: `Node anomaly detected!\nCPU usage: ${cpu.toFixed(2)}%\nRAM usage: ${mem.toFixed(2)}%`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Alert email sent.');
    } catch (error) {
        console.error('Failed to send alert email:', error);
    }
}

// --- MONITOR AND DETECT LOOP ---
async function monitorLoop() {
    try {
        const load = await si.currentLoad();
        const mem = await si.mem();
        const cpuUsage = load.currentLoad;
        const ramUsage = (mem.active / mem.total) * 100;

        console.log(`[${new Date().toISOString()}] CPU: ${cpuUsage.toFixed(2)}% | RAM: ${ramUsage.toFixed(2)}%`);

        if (isAnomaly(cpuUsage, ramUsage)) {
            await sendAlert(cpuUsage, ramUsage);
        }
    } catch (err) {
        console.error('Monitoring error:', err);
    }
}

// --- START SERVICE ---
console.log('Starting AI anomaly detection service...');
setInterval(monitorLoop, POLL_INTERVAL_MS);
monitorLoop(); // Run immediately on start