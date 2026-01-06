const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

function loadServiceAccount() {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (fromEnv && fs.existsSync(fromEnv)) {
    return require(path.resolve(fromEnv));
  }
  const local = path.join(__dirname, "serviceAccountKey.json");
  if (fs.existsSync(local)) return require(local);

  throw new Error(
    "Не найден service account key. Укажи FIREBASE_SERVICE_ACCOUNT=/abs/path/to/serviceAccountKey.json"
  );
}

const serviceAccount = loadServiceAccount();

// ВАЖНО: bucket должен совпадать со storageBucket из firebaseConfig (src/firebase/firebase.js)
const bucketName = process.env.FIREBASE_STORAGE_BUCKET;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: bucketName,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const IMAGES_DIR = path.join(__dirname, "images");

function listImageFiles() {
  if (!fs.existsSync(IMAGES_DIR)) return [];
  return fs
    .readdirSync(IMAGES_DIR)
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .map((f) => ({ file: f, id: path.parse(f).name, ext: path.extname(f) }));
}

async function uploadOne({ file, id, ext }) {
  const localPath = path.join(IMAGES_DIR, file);
  const destPath = `perfumes/${id}${ext.toLowerCase()}`;

  await bucket.upload(localPath, {
    destination: destPath,
    metadata: { cacheControl: "public,max-age=31536000" },
  });

  const f = bucket.file(destPath);
  const [url] = await f.getSignedUrl({
    action: "read",
    expires: "03-01-2500",
  });

  await db.collection("perfumes").doc(id).set(
    {
      image: url,
      imagePath: destPath,
      imageUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log("Uploaded:", id, "->", destPath);
}

async function run() {
  if (!bucketName) {
    console.warn("⚠️ FIREBASE_STORAGE_BUCKET не задан. Скрипт всё равно попробует работать, но лучше указать.");
  }

  const files = listImageFiles();
  if (!files.length) {
    console.log("Нет картинок в scripts/images. Положи файлы типа p-01.jpg, p-02.png ...");
    return;
  }

  for (const f of files) {
    await uploadOne(f);
  }

  console.log("Done.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
