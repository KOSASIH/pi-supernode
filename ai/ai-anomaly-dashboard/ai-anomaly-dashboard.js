const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const si = require('systeminformation');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const ANOMALY_THRESHOLDS = {
  cpu: 85,
  ram: 85,
  disk: 90
};

function detectAnomaly(data) {
  let anomalies = [];
  if (data.cpu > ANOMALY_THRESHOLDS.cpu) anomalies.push('CPU overload');
  if (data.ram > ANOMALY_THRESHOLDS.ram) anomalies.push('RAM usage high');
  if (data.disk > ANOMALY_THRESHOLDS.disk) anomalies.push('Disk usage high');
  if (!data.internet) anomalies.push('Internet disconnected');
  return anomalies;
}

async function getSystemStatus() {
  const cpu = (await si.currentLoad()).currentLoad;
  const mem = await si.mem();
  const ram = (mem.used / mem.total) * 100;
  const disks = await si.fsSize();
  const disk = Math.max(...disks.map(d => d.use));
  let internet = true;
  try {
    await si.inetChecksite('https://google.com');
  } catch {
    internet = false;
  }
  return { cpu, ram, disk, internet };
}

setInterval(async () => {
  const status = await getSystemStatus();
  const anomalies = detectAnomaly(status);
  io.emit('status', { ...status, anomalies });
}, 5000);

app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

server.listen(3050, () => console.log('Anomaly Dashboard running on http://localhost:3050/'));

// ------- Static files for dashboard -------
const fs = require('fs');
const publicDir = `${__dirname}/public`;
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
fs.writeFileSync(publicDir + '/index.html', `
<!doctype html>
<html>
<head>
  <title>AI Anomaly Dashboard</title>
  <style>
    body { font-family: sans-serif; background: #222; color: #eee; }
    .anomaly { color: #ff5555; font-weight: bold; }
    .ok { color: #42f545; }
  </style>
</head>
<body>
  <h2>AI Anomaly Dashboard</h2>
  <div id="status"></div>
  <ul id="anomalies"></ul>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const statusDiv = document.getElementById('status');
    const anomaliesUL = document.getElementById('anomalies');
    const socket = io();
    socket.on('status', data => {
      statusDiv.innerHTML = 
        'CPU: ' + data.cpu.toFixed(2) + '%<br>' +
        'RAM: ' + data.ram.toFixed(2) + '%<br>' +
        'Disk: ' + data.disk.toFixed(2) + '%<br>' +
        'Internet: ' + (data.internet ? '<span class="ok">Online</span>' : '<span class="anomaly">Offline</span>');
      anomaliesUL.innerHTML = '';
      if (data.anomalies.length) {
        data.anomalies.forEach(a => {
          const li = document.createElement('li');
          li.className = 'anomaly';
          li.textContent = a;
          anomaliesUL.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.className = 'ok';
        li.textContent = 'All systems normal';
        anomaliesUL.appendChild(li);
      }
    });
  </script>
</body>
</html>
`);
