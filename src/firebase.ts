// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore,} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDJ6r5TUb-CuZtL5LNVRuHn4YlLPrkdMXo",
  authDomain: "dorm-management-system-f8943.firebaseapp.com",
  projectId: "dorm-management-system-f8943",
  storageBucket: "dorm-management-system-f8943.firebasestorage.app",
  messagingSenderId: "709522380231",
  appId: "1:709522380231:web:25d585aba4d5010a0135e2",
  measurementId: "G-075NLS9CF3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
//const analytics = getAnalytics(app);