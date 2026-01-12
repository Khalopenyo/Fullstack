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
    "Не найден service account key. Укажи переменную окружения FIREBASE_SERVICE_ACCOUNT=/abs/path/to/serviceAccountKey.json"
  );
}

const serviceAccount = loadServiceAccount();
const bucketName =
  process.env.FIREBASE_STORAGE_BUCKET ||
  serviceAccount.storageBucket ||
  `${serviceAccount.project_id}.appspot.com`;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: bucketName,
});

const bucket = admin.storage().bucket();

const prefix = process.env.STORAGE_PREFIX || "perfumes/";
const cacheControl = process.env.CACHE_CONTROL || "public,max-age=31536000,immutable";

async function run() {
  const [files] = await bucket.getFiles({ prefix });
  if (!files.length) {
    console.log("No files found for prefix:", prefix);
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const current = file.metadata && file.metadata.cacheControl;
    if (current === cacheControl) {
      skipped += 1;
      continue;
    }
    await file.setMetadata({ cacheControl });
    updated += 1;
    console.log("Updated:", file.name);
  }

  console.log(`Done. Updated: ${updated}, skipped: ${skipped}, total: ${files.length}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
