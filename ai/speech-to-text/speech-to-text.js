const record = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const fs = require('fs');

const outputFile = './transcripts.txt';
const client = new speech.SpeechClient();

const request = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US'
  },
  interimResults: false
};

console.log('Speech-to-text service started. Speak into your microphone...');

const recognizeStream = client
  .streamingRecognize(request)
  .on('error', (err) => console.error('Speech recognition error:', err))
  .on('data', (data) => {
    if (data.results[0] && data.results[0].alternatives[0]) {
      const transcript = data.results[0].alternatives[0].transcript;
      fs.appendFileSync(outputFile, transcript + '\n');
      console.log(`Transcription: ${transcript}`);
    }
  });

record
  .start({ sampleRateHertz: 16000, threshold: 0, verbose: false, recordProgram: 'arecord', silence: '1.0' })
  .pipe(recognizeStream);
