const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');
const nodemailer = require('nodemailer');

// CONFIGURATION
const LOG_FILE = '/var/log/syslog'; // Change to your log file path
const OPENAI_KEY = 'YOUR_OPENAI_API_KEY'; // Replace with your OpenAI API key
const EMAIL_USER = 'your_gmail_account@gmail.com';
const EMAIL_PASS = 'your_gmail_app_password';
const ALERT_EMAIL = 'your_alert_receiver_email@gmail.com';

// OpenAI setup
const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));

// Email setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

// Summarize logs using GPT
async function summarizeLogs(logText) {
    const prompt = `
Summarize the following system logs. Highlight any errors, warnings, or abnormal activity. Suggest possible actions if needed.

Logs:
${logText}
    `;
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
    });
    return completion.data.choices[0].message.content;
}

async function processLogsAndSendEmail() {
    try {
        const logs = fs.readFileSync(LOG_FILE, 'utf8');
        const last1000 = logs.split('\n').slice(-1000).join('\n'); // Only last 1000 lines
        const summary = await summarizeLogs(last1000);

        await transporter.sendMail({
            from: EMAIL_USER,
            to: ALERT_EMAIL,
            subject: 'Daily Log Summary - Pi Supernode',
            text: summary
        });
        console.log('Daily log summary sent!');
    } catch (err) {
        console.error('Error processing logs or sending email:', err);
    }
}

// Run every day at 8am (or adjust as needed)
const now = new Date();
const millisTill8 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0) - now;
setTimeout(function() {
    processLogsAndSendEmail();
    setInterval(processLogsAndSendEmail, 24 * 60 * 60 * 1000);
}, millisTill8 > 0 ? millisTill8 : millisTill8 + 24 * 60 * 60 * 1000);