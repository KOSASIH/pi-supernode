const faceapi = require('@vladmandic/face-api');
const tf = require('@tensorflow/tfjs-node');
const { Canvas, Image, ImageData } = require('canvas');
const NodeWebcam = require('node-webcam');
const fs = require('fs');

// Patch face-api with canvas methods
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const webcamOpts = { width: 640, height: 480, quality: 100, saveShots: false, output: "jpeg", device: false, callbackReturn: "location", verbose: false };
const Webcam = NodeWebcam.create(webcamOpts);

const knownDescriptors = []; // Array of {label, descriptor} for known faces

async function loadModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
  await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
  await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
}

async function registerKnownFace(imagePath, label) {
  const img = await canvasLoad(imagePath);
  const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
  if (detection && detection.descriptor) {
    knownDescriptors.push({ label, descriptor: detection.descriptor });
    console.log(`Registered face for label: ${label}`);
  }
}

async function canvasLoad(imagePath) {
  const img = new Image();
  img.src = fs.readFileSync(imagePath);
  return img;
}

async function recognizeFromSnapshot(snapshotPath) {
  const img = await canvasLoad(snapshotPath);
  const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
  if (!detection) {
    console.log('No face detected.');
    return;
  }
  let bestMatch = { label: 'unknown', distance: 1.0 };
  for (const known of knownDescriptors) {
    const dist = faceapi.euclideanDistance(d(`Recognized: ${bestMatch.label} (distance: ${bestMatch.distance})`);
    // Trigger your automation here (e.g., unlock, log, notify, etc.)
  } else {
    console.log('Face detected but not recognized.');
  }
}

async function main() {
  await loadModels();
  // Register faces from images (add your own images here)
  await registerKnownFace('./known_faces/alice.jpg', 'Alice');
  await registerKnownFace('./known_faces/bob.jpg', 'Bob');

  setInterval(() => {
    Webcam.capture("snapshot", async (err) => {
      if (!err) await recognizeFromSnapshot("snapshot.jpg");
    });
  }, 15000); // Every 15 seconds
}

main();
