const tf = require('@tensorflow/tfjs-node');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const NodeWebcam = require('node-webcam');
const fs = require('fs');

const webcamOpts = { width: 640, height: 480, quality: 100, saveShots: false, output: "jpeg", device: false, callbackReturn: "location", verbose: false };
const Webcam = NodeWebcam.create(webcamOpts);

async function detectObjects(imagePath) {
  const img = fs.readFileSync(imagePath);
  const tensor = tf.node.decodeImage(img);
  const model = await cocoSsd.load();
  const predictions = await model.detect(tensor);
  console.log("Detected objects:", predictions.map(p => `${p.class} (${(p.score * 100).toFixed(1)}%)`).join(', '));
  if (predictions.some(p => p.class === "person" && p.score > 0.5)) {
    console.log("ALERT: Person detected!");
  }
}

function captureAndDetect() {
  Webcam.capture("snapshot", async (err, data) => {
    if (!err) await detectObjects("snapshot.jpg");
    else console.error("Webcam capture error:", err);
  });
}

setInterval(captureAndDetect, 15000); // Every 15 seconds
console.log("AI Object Detection is running...");