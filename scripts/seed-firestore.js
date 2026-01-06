const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

function loadServiceAccount() {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (fromEnv && fs.existsSync(fromEnv)) {
    return require(path.resolve(fromEnv));
  }
  // Фолбэк: serviceAccountKey.json рядом со скриптом (НЕ РЕКОМЕНДУЕТСЯ для репо)
  const local = path.join(__dirname, "serviceAccountKey.json");
  if (fs.existsSync(local)) return require(local);

  throw new Error(
    "Не найден service account key. Укажи переменную окружения FIREBASE_SERVICE_ACCOUNT=/abs/path/to/serviceAccountKey.json"
  );
}

const serviceAccount = loadServiceAccount();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const perfumes = require(path.join(__dirname, "perfumes.json"));

async function seedPerfumes() {
  const col = db.collection("perfumes");
  for (const p of perfumes) {
    const id = p.id;
    const data = { ...p };
    delete data.id;
    await col.doc(id).set(data, { merge: true });
    console.log("Seeded:", id);
  }
  console.log("Done.");
}

seedPerfumes().catch((e) => {
  console.error(e);
  process.exit(1);
});
