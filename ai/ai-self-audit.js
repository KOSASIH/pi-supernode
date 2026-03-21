const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configuration
const MONITOR_PATHS = ['./src', './config.json']; // Important folders/files
const BACKUP_FOLDER = './backups'; // Folder for file/folder backups
const HASH_FILE = './.audit-hash.json';

const EMAIL_USER = 'your_gmail_account@gmail.com';
const EMAIL_PASS = 'your_gmail_app_password';
const ALERT_EMAIL = 'your_alert_receiver_email@gmail.com';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

// Helper to hash file
function hashFile(filepath) {
    const data = fs.readFileSync(filepath);
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Backup function
function backupFileOrFolder(src, dest) {
    if (fs.lstatSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(file =>
            backupFileOrFolder(
                path.join(src, file),
                path.join(dest, file)
            )
        );
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Restore function
function restoreFileOrFolder(backup, target) {
    backupFileOrFolder(backup, target);
}

function scanAndHash(paths) {
    let hashes = {};
    for (const p of paths) {
        if (fs.existsSync(p)) {
            if (fs.lstatSync(p).isDirectory()) {
                fs.readdirSync(p).forEach(file =>
                    Object.assign(hashes, scanAndHash([path.join(p, file)]))
                );
            } else {
                hashes[p] = hashFile(p);
            }
        }
    }
    return hashes;
}

function loadHashes() {
    if (!fs.existsSync(HASH_FILE)) return {};
    return JSON.parse(fs.readFileSync(HASH_FILE, 'utf8'));
}

function saveHashes(hashes) {
    fs.writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2));
}

async function sendAlert(subject, text) {
    await transporter.sendMail({
        from: EMAIL_USER,
        to: ALERT_EMAIL,
        subject,
        text
    });
}

async function selfAudit() {
    if (!fs.existsSync(BACKUP_FOLDER)) fs.mkdirSync(BACKUP_FOLDER);
    const hashesOld = loadHashes();
    const hashesNew = scanAndHash(MONITOR_PATHS);
    let changes = [];
    let needRestore = false;

    // Detect changes
    for (const file in hashesNew) {
        if (!hashesOld[file]) {
            changes.push('NEW file: ' + file);
            // Backup new file
            backupFileOrFolder(file, path.join(BACKUP_FOLDER, file));
        } else if (hashesOld[file] !== hashesNew[file]) {
            changes.push('MODIFIED: ' + file);
            // Restore from backup and overwrite file
            const backupPath = path.join(BACKUP_FOLDER, file);
            if (fs.existsSync(backupPath)) {
                restoreFileOrFolder(backupPath, file);
                changes.push('Restored from backup: ' + file);
                needRestore = true;
            }
        }
    }
    for (const file in hashesOld) {
        if (!hashesNew[file]) {
            changes.push('REMOVED: ' + file);
            // Restore from backup
            const backupPath = path.join(BACKUP_FOLDER, file);
            if (fs.existsSync(backupPath)) {
                restoreFileOrFolder(backupPath, file);
                changes.push('Restored missing file: ' + file);
                needRestore = true;
            }
        }
    }

    if (changes.length) {
        await sendAlert('[Pi Supernode] Self-Audit Alert', changes.join('\n'));
        console.log('Self-audit actions:\n' + changes.join('\n'));
    } else {
        console.log('File integrity OK.');
    }
    saveHashes(hashesNew);
}

// Run audit every 10 minutes
setInterval(selfAudit, 10 * 60 * 1000);
selfAudit();
