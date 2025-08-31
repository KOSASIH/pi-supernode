const si = require('systeminformation');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');

const EMAIL_USER = 'your_gmail_account@gmail.com';
const EMAIL_PASS = 'your_gmail_app_password';
const ALERT_EMAIL = 'your_alert_receiver_email@gmail.com';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

async function checkServices(services) {
    let results = [];
    for (const service of services) {
        await new Promise(resolve => {
            exec(`systemctl is-active ${service}`, (err, stdout) => {
                results.push(`${service}: ${stdout.trim()}`);
                resolve();
            });
        });
    }
    return results;
}

async function runSelfTest() {
    let report = [];
    // CPU & RAM
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    report.push(`CPU Load: ${cpu.currentLoad.toFixed(2)}%`);
    report.push(`RAM Usage: ${(mem.used / mem.total * 100).toFixed(2)}%`);
    // Storage
    const disks = await si.fsSize();
    disks.forEach(d => {
        report.push(`Disk ${d.mount}: ${d.use}% used`);
    });
    // Network
    const net = await si.inetChecksite('https://google.com');
    report.push(`Internet connectivity: ${net.ok ? 'OK' : 'FAILED'}`);
    // Service check
    const services = ['ssh', 'cron', 'your-app-service']; // Tambah sesuai kebutuhan
    const serviceStatus = await checkServices(services);
    report = report.concat(serviceStatus);
    // Send to email
    await transporter.sendMail({
        from: EMAIL_USER,
        to: ALERT_EMAIL,
        subject: '[Pi Supernode] Daily System Self-Test Report',
        text: report.join('\n')
    });
    console.log('Self-test report sent.\n' + report.join('\n'));
}
runSelfTest();
