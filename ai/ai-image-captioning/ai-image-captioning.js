const chokidar = require('chokidar');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Hugging Face API configuration
const HF_TOKEN = 'your_huggingface_token'; // Get from https://huggingface.co/settings/tokens
const HF_API_URL = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base';

const watchDir = './caption-images';
const captionOutput = './image-captions.json';

if (!fs.existsSync(watchDir)) fs.mkdirSync(watchDir);
if (!fs.existsSync(captionOutput)) fs.writeFileSync(captionOutput, '{}', 'utf8');

let captionData = JSON.parse(fs.readFileSync(captionOutput, 'utf8'));

async function captionImage(imagePath) {
  const imageData = fs.readFileSync(imagePath);
  const response = await axios.post(
    HF_API_URL,
    imageData,
    {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/octet-stream'
      }
    }
  );
  const caption = response.data[0]?.generated_text || 'No caption';
  captionData[imagePath] = caption;
  fs.writeFileSync(captionOutput, JSON.stringify(captionData, null, 2));
  console.log(`Captioned ${path.basename(imagePath)}: "${caption}"`);
}

console.log(`Watching ${watchDir} for new images to caption...`);
chokidar.watch(watchDir, { ignored: /(^|[\/\\])\../ }).```

---

# 2. ai/ai-audio-event-detector/ai-audio-event-detector.js  
**Purpose:** Monitors microphone input for specific audio events (e.g., glass breaking, dog barking) using a pre-trained model from Hugging Face’s API. Logs the detected events with timestamps.

## Dependencies:
```bash
npm install node-record-lpcm16 wav axios
