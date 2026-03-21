const chokidar = require('chokidar');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');

const WATCH_DIR = './src'; // Folder yang dipantau
const TEST_CMD = 'npm test'; // Atur sesuai perintah test di project Anda
const OPENAI_KEY = 'YOUR_OPENAI_API_KEY';
const EMAIL_USER = 'your_gmail_account@gmail.com';
const EMAIL_PASS = 'your_gmail_app_password';
const ALERT_EMAIL = 'your_alert_receiver_email@gmail.com';

const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

let lastResult = '';

async function analyzeWithAI(output) {
  const prompt = `Berikut hasil test otomatis:\n\n${output}\n\nTolong rangkum kegagalan, anomali, dan sarankan solusi perbaikan.`;
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }]
  });
  return response.data.choices[0].message.content;
}

function runTestAndNotify() {
  exec(TEST_CMD, async (error, stdout, stderr) => {
    const output = stdout + stderr;
    if (output !== lastResult) {
      lastResult = output;
      if (/fail|error|exception/i.test(output)) {
        const analysis = await analyzeWithAI(output);
        await transporter.sendMail({
          from: EMAIL_USER,
          to: ALERT_EMAIL,
          subject: '[Pi Supernode] Test Failure Detected',
          text: analysis
        });
        console.log('Test failure analyzed & sent to email.');
      } else {
        console.log('Tests passed.');
      }
    }
  });
}

if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR);

chokidar.watch(WATCH_DIR, { ignored: /(^|[\/\\])\../, ignoreInitial: true })
  .on('all', (event, path) => {
    console.log(`Detected ${event} on ${path}, running tests...`);
    runTestAndNotify();
  });

console.log(`Watching ${WATCH_DIR} for code changes...`);
runTestAndNotify(); // Initial run
