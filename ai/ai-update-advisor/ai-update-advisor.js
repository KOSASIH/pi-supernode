const fs = require('fs');
const { exec } = require('child_process');
const { Configuration, OpenAIApi } = require('openai');
const nodemailer = require('nodemailer');

const OPENAI_KEY = 'YOUR_OPENAI_API_KEY';
const EMAIL_USER = 'your_gmail_account@gmail.com';
const EMAIL_PASS = 'your_gmail_app_password';
const ALERT_EMAIL = 'receiver_email@gmail.com';

const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

async function getOutdatedDeps() {
    return new Promise((resolve, reject) => {
        exec('npm outdated --json', (err, stdout) => {
            if (err && !stdout) return reject(err);
            try {
                const data = JSON.parse(stdout || '{}');
                resolve(data);
            } catch (e) {
                resolve({});
            }
        });
    });
}

async function getAIAdvice(outdated) {
    const depList = Object.keys(outdated).map(dep => {
        const d = outdated[dep];
        return `${dep}: current=${d.current}, wanted=${d.wanted}, latest=${d.latest}`;
    }).join('\n');
    const prompt = `
Below is a list of outdated npm dependencies with their current, wanted, and latest versions.
Give a summary of which packages are safe to upgrade, which might cause breaking changes, and which are critically important for security or stability.
Advise the user in clear language.

${depList}
    `;
    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
    });
    return response.data.choices[0].message.content.trim();
}

async function checkUpdatesAndAdvise() {
    try {
        const outdated = await getOutdatedDeps();
        if (Object.keys(outdated).length === 0) {
            console.log('All dependencies are up-to-date.');
            return;
        }
        const advice = await getAIAdvice(outdated);
        await transporter.sendMail({
            from: EMAIL_USER,
            to: ALERT_EMAIL,
            subject: '[Pi Supernode] Dependency Update Advisory',
            text: advice
        });
        console.log('Update advisory sent.');
    } catch (err) {
        console.error('Update advisor error:', err);
    }
}

// Run once a day (or as you wish)
setInterval(checkUpdatesAndAdvise, 24 * 60 * 60 * 1000);
checkUpdatesAndAdvise();
