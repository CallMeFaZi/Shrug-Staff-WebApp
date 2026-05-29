// Download face-api.js models to public/models/
const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_DIR = path.join(__dirname, '..', 'public', 'models');
const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';

const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

async function downloadFile(filename) {
  const url = `${BASE_URL}/${filename}`;
  const dest = path.join(MODEL_DIR, filename);

  if (fs.existsSync(dest)) {
    console.log(`  ✅ ${filename} already exists`);
    return;
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`  ✅ ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
  console.log('Downloading face-api.js models...');
  for (const file of files) {
    try {
      await downloadFile(file);
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`);
    }
  }
  console.log('Done!');
}

main();