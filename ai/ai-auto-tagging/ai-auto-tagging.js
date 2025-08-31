const tf = require('@tensorflow/tfjs-node');
const mobilenet = require('@tensorflow-models/mobilenet');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

const watchDir = './watched-images';
const tagOutput = './image-tags.json';

if (!fs.existsSync(watchDir)) fs.mkdirSync(watchDir);
if (!fs.existsSync(tagOutput)) fs.writeFileSync(tagOutput, '{}', 'utf8');

let tagData = JSON.parse(fs.readFileSync(tagOutput, 'utf8'));

async function tagImage(imagePath) {
  const image = fs.readFileSync(imagePath);
  const tensor = tf.node.decodeImage(image);
  const model = await mobilenet.load();
  const predictions = await model.classify(tensor);
  tagData[imagePath] = predictions.map(p => p.className);
  fs.writeFileSync(tagOutput, JSON.stringify(tagData, null, 2));
  console.log(`Image ${path.basename(imagePath)} tagged:`, tagData[imagePath]);
}

console.log(`Watching ${watchDir} for new images...`);
chokidar.watch(watchDir, { ignored: /(^|[\/\\])\../ }).on('add', tagImage);
