const chokidar = require('chokidar');
const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');
const nodemailer = require('nodemailer');

// CONFIGURATION
const WATCH_DIR = './watched-code';
const OPENAI_KEY = 'YOUR_OPENAI_API_KEY';
const EMAIL_USER = 'your_gmail_account@gmail.com';
const EMAIL_PASS = 'your_gmail_app_password';
const ALERT_EMAIL = 'receiver_email@gmail.com';

// Set up OpenAI and email
const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

async function reviewCode(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const prompt = `
Review the following code for bugs, security issues, and best practices. Suggest concrete improvements and highlight any problems.

\`\`\`
${code}
\`\`\`
  `;
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }]
  });
  return response.data.choices[0].message.content;
}

async function processFile(path) {
  if (!/\.(js|py|ts|go|java|cpp|c|rb|sh)$/i.test(path)) return;
  const review = await reviewCode(path);
  await transporter.sendMail({
    from: EMAIL_USER,
    to: ALERT_EMAIL,
    subject: `Code Review for ${path}`,
    text: review
  });
  console.log(`Code review sent for ${path}`);
}

if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR);

console.log(`Watching ${WATCH_DIR} for code changes...`);
chokidar.watch(WATCH_DIR, { ignored: /(^|[\/\\])\../ }).on('add', processFile).on('change', processFile);
