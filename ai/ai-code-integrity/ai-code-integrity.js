const fs = require('fs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');

const WATCH_DIR = './src'; // Ganti ke root project Anda
const HASH_FILE = './.code-hashes.json';

const EMAIL_USER = 'your_gmail_account@gmail.com';
const EMAIL_PASS = 'your_gmail_app_password';
const ALERT_EMAIL = 'your_alert_receiver_email@gmail.com';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

function hashFile(filepath) {
    const data = fs.readFileSync(filepath);
    return crypto.createHash('sha256').update(data).digest('hex');
}

function scanDir(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.lstatSync(filepath).isDirectory()) {
            files = files.concat(scanDir(filepath));
        } else if (/\.(js|json|ts|py|sh)$/.test(file)) {
            files.push(filepath);
        }
    });
    return files;
}

function checkDependencies() {
    if (!fs.existsSync('./package.json')) return 'NO package.json FOUND';
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const nodeModules = fs.existsSync('./node_modules');
    let result = [];
    if (!nodeModules) result.push('node_modules MISSING!');
    // Check for mismatch (simple)
    const missing = [];
    if (pkg.dependencies) {
        for (const dep in pkg.dependencies) {
            if (!fs.existsSync(`./node_modules/${dep}`)) missing.push(dep);
        }
    }
    if (missing.length) result.push('Missing dependencies: ' + missing.join(', '));
    return result.length ? result.join('; ') : 'Dependencies OK';
}

function loadHashes() {
    if (!fs.existsSync(HASH_FILE)) return {};
    return JSON.parse(fs.readFileSync(HASH_FILE, 'utf8'));
}

function saveHashes(hashes) {
    fs.writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2));
}

async function checkIntegrity() {
    const hashesOld = loadHashes();
    const files = scanDir(WATCH_DIR);
    let report = [];
    let hashesNew = {};
    let changed = false;

    files.forEach(f => {
        const hash = hashFile(f);
        hashesNew[f] = hash;
        if (!hashesOld[f]) {
            report.push('NEW FILE: ' + f);
            changed = true;
        } else if (hashesOld[f] !== hash) {
            report.push('MODIFIED: ' + f);
            changed = true;
        }
    });
    for (const oldFile in hashesOld) {
        if (!hashesNew[oldFile]) {
            report.push('REMOVED: ' + oldFile);
            changed = true;
        }
    }
    // Check dependencies
    const depReport = checkDependencies();
    if (depReport !== 'Dependencies OK') {
        report.push(depReport);
        changed = true;
    }
    // Notify if any
    if (changed) {
        await transporter.sendMail({
            from: EMAIL_USER,
            to: ALERT_EMAIL,
            subject: '[Pi Supernode] Code Integrity Alert',
            text: report.join('\n')
        });
        console.log('Integrity alert sent:\n' + report.join('\n'));
    } else {
        console.log('Code integrity: OK');
    }
    saveHashes(hashesNew);
}
checkIntegrity();
