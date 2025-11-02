// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // ✅ เพิ่ม Storage เผื่อใช้เก็บรูปภาพห้อง/ใบเสร็จในอนาคต

// ✅ ใช้ environment variables จาก .env (ไฟล์ต้องอยู่ที่ root ของโปรเจกต์)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ✅ เริ่มต้น Firebase App
const app = initializeApp(firebaseConfig);

// ✅ Export service ต่าง ๆ ที่จะใช้ในระบบ
export const auth = getAuth(app);       // ใช้สำหรับระบบ Login/Register
export const db = getFirestore(app);    // ใช้สำหรับ Firestore Database
export const storage = getStorage(app); // ใช้เก็บรูป (ถ้ามี)
export default app;
