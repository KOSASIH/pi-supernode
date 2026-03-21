const record = require('node-record-lpcm16');
const fs = require('fs');
const axios = require('axios');
const wav = require('wav');

// Hugging Face API configuration
const HF_TOKEN = 'your_huggingface_token';
const HF_API_URL = 'https://api-inference.huggingface.co/models/m3hrdadfi/wav2vec2-large-xlsr-53-english-shh';

// Settings
const TMP_WAV = './temp-audio.wav';
const LOG_FILE = './audio-events.log';
const RECORD_SECONDS = 5;

async function detectAudioEvent(audioFile) {
  const audioData = fs.readFileSync(audioFile);
  const response = await axios.post(
    HF_API_URL,
    audioData,
    {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'audio/wav'
      }
    }
  );
  const text = response.data.text || 'Unrecognized';
  const logLine = `[${new Date().toISOString()}] Detected: ${text}\n`;
  fs.appendFileSync(LOG_FILE, logLine);
  console.log(logLine.trim());
}

function recordAndDetect() {
  const fileWriter = new wav.FileWriter(TMP_WAV, { sampleRate: 16000, channels: 1 });
  console.log('Recording audio...');
  record.start({ sampleRateHertz: 16000, threshold: 0, verbose: false })
    .pipe(fileWriter);

  setTimeout(async () => {
    record.stop();
    fileWriter.end();
    await detectAudioEvent(TMP_WAV);
    fs.unlinkSync(TMP_WAV);
    setTimeout(recordAndDetect, 1000); // Wait a bit before next recording
  }, RECORD_SECONDS * 1000);
}

recordAndDetect();
