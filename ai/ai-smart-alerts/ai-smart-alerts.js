const si = require('systeminformation');
const nodemailer = require('nodemailer');

// CONFIGURATION
const ALERT_EMAIL = 'your_alert_receiver_email@gmail.com';
const EMAIL_USER = 'your_gmail_account@gmail.com';
const EMAIL_PASS = 'your_gmail_app_password';
const CPU_THRESHOLD = 85;
const RAM_THRESHOLD = 85;
const ALERT_HOURS = [8, 22]; // Only send alerts between 8:00 and 22:00

let lastAlertTime = 0;
const MIN_ALERT_INTERVAL = 60 * 60 * 1000; // 1 hour

// Email setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

async function smartAlert(cpu, ram) {
    const hour = new Date().getHours();
    if (hour < ALERT_HOURS[0] || hour >= ALERT_HOURS[1]) {
        console.log('Alert not sent: outside alert hours');
        return;
    }
    if (Date.now() - lastAlertTime < MIN_ALERT_INTERVAL) {
        console.log('Alert not sent: too soon since last alert');
        return;
    }

    await transporter.sendMail({
        from: EMAIL_USER,
        to: ALERT_EMAIL,
        subject: '[Smart Alert] Node Overload Detected',
        text: `CPU: ${cpu.toFixed(2)}%, RAM: ${ram.toFixed(2)}%`
    });
    lastAlertTime = Date.now();
    console.log('Smart alert sent.');
}

async function monitor() {
    const cpu = (await si.currentLoad()).currentLoad;
    const mem = await si.mem();
    const ram = (mem.used / mem.total) * 100;

    if (cpu > CPU_THRESHOLD || ram > RAM_THRESHOLD) {
        await smartAlert(cpu, ram);
    }
    console.log(`[${new Date().toISOString()}] CPU: ${cpu.toFixed(2)}%, RAM: ${ram.toFixed(2)}%`);
}

setInterval(monitor, 5 * 60 * 1000); // Every 5 minutes
monitor();
