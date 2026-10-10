/* AzWord · Firebase ulanishi
   Barcha sahifalar SDK funksiyalarini shu fayl orqali oladi —
   versiya bitta joyda boshqariladi. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup,
  updateProfile, sendPasswordResetEmail, connectAuthEmulator
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  connectFirestoreEmulator,
  collection, doc, getDoc, getDocs, getDocFromServer, setDoc, updateDoc, addDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp, increment, arrayUnion,
  writeBatch, runTransaction, Timestamp, documentId, getCountFromServer, deleteField
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyD6XSx__Bwq7UyuP5ZiMqohkvKOC0G1eXI',
  authDomain: 'azword-30a2e.firebaseapp.com',
  projectId: 'azword-30a2e',
  storageBucket: 'azword-30a2e.firebasestorage.app',
  messagingSenderId: '130651034068',
  appId: '1:130651034068:web:dac0a428146aaafcfc0641',
  measurementId: 'G-CCKPT37J2P'
};

/* Lokal test uchun: window.__AZ_EMULATOR__ = { host: '127.0.0.1', auth: 9099, firestore: 8080 } */
const EMU = typeof window !== 'undefined' ? window.__AZ_EMULATOR__ : null;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/* Oflayn kesh: oxirgi ko'rilgan bo'limlar va so'zlar internet bo'lmasa ham ochiladi */
let localCache;
try {
  localCache = EMU ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() });
} catch (e) {
  localCache = memoryLocalCache();
}
export const db = initializeFirestore(app, { localCache });

if (EMU) {
  connectAuthEmulator(auth, `http://${EMU.host}:${EMU.auth}`, { disableWarnings: true });
  connectFirestoreEmulator(db, EMU.host, EMU.firestore);
}

export {
  onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, updateProfile, sendPasswordResetEmail,
  collection, doc, getDoc, getDocs, getDocFromServer, setDoc, updateDoc, addDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp, increment, arrayUnion,
  writeBatch, runTransaction, Timestamp, documentId, getCountFromServer, deleteField
};
