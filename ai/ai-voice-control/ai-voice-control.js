const record = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const express = require('express');
const si = require('systeminformation');
const { Configuration, OpenAIApi } = require('openai');

const OPENAI_KEY = 'YOUR_OPENAI_API_KEY';
const GOOGLE_KEYFILE = 'path_to_your_google_cloud_keyfile.json';

const app = express();
const port = 3020;

// Google STT setup
const client = new speech.SpeechClient({ keyFilename: GOOGLE_KEYFILE });
const request = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US'
  },
  interimResults: false
};

// OpenAI setup
const openai = new OpenAIApi(new Configuration({ apiKey: OPENAI_KEY }));

async function aiProcess(text) {
  // Optionally, add custom logic for certain commands
  if (/status|cpu|ram|memory/i.test(text)) {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    return `CPU: ${cpu.currentLoad.toFixed(2)}%, RAM: ${(mem.used / mem.total * 100).toFixed(2)}%`;
  }
  // Otherwise, ask GPT
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: 'user', content: text }]
  });
  return response.data.choices[0].message.content;
}

app.get('/listen', async (_, res) => {
  const recognizeStream = client
    .streamingRecognize(request)
    .on('error', console.error)
    .on('data', async (data) => {
      if (data.results[0] && data.results[0].alternatives[0]) {
        const transcript = data.results[0].alternatives[0].transcript;
        console.log('Recognized:', transcript);
        const reply = await aiProcess(transcript);
        res.json({ transcript, reply });
        recognizeStream.destroy();
      }
    });

  record.start({ sampleRateHertz: 16000, threshold: 0, verbose: false }).pipe(recognizeStream);
});

app.listen(port, () => console.log(`AI voice control running on port ${port}`));