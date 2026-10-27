import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBAU9-zJ98493q6BiSdnoJi2raBEemENSs",
  authDomain: "main-backend-for-mvp.firebaseapp.com",
  projectId: "main-backend-for-mvp",
  storageBucket: "main-backend-for-mvp.firebasestorage.app",
  messagingSenderId: "356535367563",
  appId: "1:356535367563:web:dc991f08345b8fee80218e",
  measurementId: "G-YZNSMG6QDJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
