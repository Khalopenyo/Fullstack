// src/firebase/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDK-JpIhPAaCIhNKgeMuozP4D6_kQoRvy8",
  authDomain: "bakhur-e08f1.firebaseapp.com",
  projectId: "bakhur-e08f1",
  storageBucket: "bakhur-e08f1.firebasestorage.app",
  messagingSenderId: "357097598992",
  appId: "1:357097598992:web:1a21e9d4f1266cc6bb1a95",
  measurementId: "G-HMW8E1025Q"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const storage = getStorage(app);