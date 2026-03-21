const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
const nodemailer = require('nodemailer');

// CONFIGURATION
const WATCH_DIR = './src'; // Directory to monitor
const OPENAI_KEY = 'YOUR_OPENAI_API_KEY';
const EMAIL_USER = 'your_gmail_account@gmail.com';
const EMAIL_PASS = 'your_gmail_app_password';
const ALERT_EMAIL = 'receiver_email@gmail.com';

const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

function backupFile(filePath) {
    const backupPath = filePath + '.' + Date.now() + '.bak';
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}

async function fixBug(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const prompt = `
This code file has a bug or error. Analyze and fix it. Return ONLY the corrected code, nothing else.

\`\`\`
${code}
\`\`\`
    `;
    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
    });
    return response.data.choices[0].message.content.trim();
}

async function processFile(filePath) {
    if (!/\.(js|ts|py|sh|go|java|rb|cpp|c)$/i.test(filePath)) return;
    try {
        const original = fs.readFileSync(filePath, 'utf8');
        const fixed = await fixBug(filePath);
        if (original !== fixed && fixed.length > 0) {
            const backupPath = backupFile(filePath);
            fs.writeFileSync(filePath, fixed, 'utf8');
            await transporter.sendMail({
                from: EMAIL_USER,
                to: ALERT_EMAIL,
                subject: `[Pi Supernode] Bug fixed in ${path.basename(filePath)}`,
                text: `A bug was detected and automatically fixed in: ${filePath}\n\nBackup of the original file: ${backupPath}`
            });
            console.log(`Bug fixed and notification sent for ${filePath}`);
        }
    } catch (err) {
        console.error('Auto bug fixer error:', err);
    }
}

if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR);

console.log(`Watching ${WATCH_DIR} for code changes...`);
chokidar.watch(WATCH_DIR, { ignored: /(^|[\/\\])\../, ignoreInitial: true })
    .on('change', processFile)
    .on('add', processFile);
