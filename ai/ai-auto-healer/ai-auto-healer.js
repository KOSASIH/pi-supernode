const si = require('systeminformation');
const { exec } = require('child_process');

const SERVICE_NAME = 'your-service-name'; // Replace with the actual service name
const CPU_THRESHOLD = 90; // CPU usage %
const MEM_THRESHOLD = 90; // RAM usage %
const CHECK_INTERVAL = 60 * 1000; // 1 min

let cpuAnomalyCount = 0;
let memAnomalyCount = 0;

async function checkAndHeal() {
    try {
        const cpu = (await si.currentLoad()).currentLoad;
        const mem = (await si.mem());
        const ram = (mem.used / mem.total) * 100;

        if (cpu > CPU_THRESHOLD) cpuAnomalyCount++; else cpuAnomalyCount = 0;
        if (ram > MEM_THRESHOLD) memAnomalyCount++; else memAnomalyCount = 0;

        if (cpuAnomalyCount >= 3 || memAnomalyCount >= 3) { // 3 consecutive intervals
            console.log(`Anomaly detected! Restarting service: ${SERVICE_NAME}`);
            exec(`systemctl restart ${SERVICE_NAME}`, (err, stdout, stderr) => {
                if (err) {
                    console.error('Failed to restart service:', err);
                } else {
                    console.log('Service restarted successfully.');
                    cpuAnomalyCount = 0;
                    memAnomalyCount = 0;
                }
            });
        }

        console.log(`[${new Date().toISOString()}] CPU: ${cpu.toFixed(2)}% | RAM: ${ram.toFixed(2)}%`);
    } catch (err) {
        console.error('Error in auto-healer:', err);
    }
}

setInterval(checkAndHeal, CHECK_INTERVAL);
checkAndHeal();
