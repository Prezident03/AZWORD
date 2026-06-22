import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6XSx__Bwq7UyuP5ZiMqohkvKOC0G1eXI",
  authDomain: "azword-30a2e.firebaseapp.com",
  projectId: "azword-30a2e",
  storageBucket: "azword-30a2e.firebasestorage.app",
  messagingSenderId: "130651034068",
  appId: "1:130651034068:web:dac0a428146aaafcfc0641",
  measurementId: "G-CCKPT37J2P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
