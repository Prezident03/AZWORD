import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Offline mode: oxirgi o'qilgan folder/word ma'lumotlari brauzer xotirasida
// keshlanadi, shu sababli internet uzilganda ham oxirgi ko'rilgan
// papkalar/so'zlar ochiladi. Bir nechta tab ochilganda ham ishlaydi.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});