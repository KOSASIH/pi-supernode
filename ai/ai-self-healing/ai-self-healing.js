const si = require('systeminformation');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Configuration
const SERVICE_NAME = 'your-service-name'; // Change to your service name
const BACKUP_CONFIG = './config.bak'; // Path to backup config file
const TARGET_CONFIG = './config.json'; // Path to the config file to monitor
const CPU_THRESHOLD = 90; // In percent
const MEM_THRESHOLD = 90; // In percent
const CHECK_INTERVAL = 60 * 1000; // 1 minute

const EMAIL_USER = 'your_gmail_account@gmail.com';
const EMAIL_PASS = 'your_gmail_app_password';
const ALERT_EMAIL = 'your_alert_receiver_email@gmail.com';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

async function sendAlert(subject, text) {
    await transporter.sendMail({
        from: EMAIL_USER,
        to: ALERT_EMAIL,
        subject,
        text
    });
}

async function selfHeal() {
    try {
        const cpu = (await si.currentLoad()).currentLoad;
        const mem = await si.mem();
        const ram = (mem.used / mem.total) * 100;
        let anomaly = false;
        let actions = [];

        if (cpu > CPU_THRESHOLD) {
            anomaly = true;
            actions.push('CPU overload detected');
        }
        if (ram > MEM_THRESHOLD) {
            anomaly = true;
            actions.push('RAM overload detected');
        }

        // Service check
        exec(`systemctl is-active ${SERVICE_NAME}`, (err, stdout) => {
            if (stdout.trim() !== 'active') {
                anomaly = true;
                actions.push(`Service ${SERVICE_NAME} is not active. Restarting...`);
                exec(`systemctl restart ${SERVICE_NAME}`, (err2) => {
                    if (!err2) actions.push(`${SERVICE_NAME} restarted.`);
                    else actions.push(`Failed to restart ${SERVICE_NAME}: ${err2}`);
                });
            }
        });

        // Check config. If broken/invalid, roll back from backup
        if (fs.existsSync(TARGET_CONFIG) && fs.existsSync(BACKUP_CONFIG)) {
            try {
                JSON.parse(fs.readFileSync(TARGET_CONFIG, 'utf8'));
            } catch {
                anomaly = true;
                actions.push('Config corrupt, rolling back...');
                fs.copyFileSync(BACKUP_CONFIG, TARGET_CONFIG);
                actions.push('Config restored from backup.');
                exec(`systemctl restart ${SERVICE_NAME}`);
            }
        }

        // Send notification if anomaly
        if (anomaly) {
            await sendAlert('[Pi Supernode] Self-Healing Action', actions.join('\n'));
            console.log('Self-healing actions taken:\n' + actions.join('\n'));
        } else {
            console.log('System normal');
        }
    } catch (err) {
        await sendAlert('[Pi Supernode] Self-Healing Error', String(err));
        console.error('Self-healing error:', err);
    }
}

setInterval(selfHeal, CHECK_INTERVAL);
selfHeal();
