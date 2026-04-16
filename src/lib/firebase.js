import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyC7L404EeLxPcqS_gC2y1x7EAort1eS2bo",
    authDomain: "proteccioncivil-system.firebaseapp.com",
    projectId: "proteccioncivil-system",
    storageBucket: "proteccioncivil-system.firebasestorage.app",
    messagingSenderId: "1052210588116",
    appId: "1:1052210588116:web:79ae745c41741b2f98ce41",
    measurementId: "G-YZYL2VHS0G"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
import { getFunctions } from 'firebase/functions';
export const functions = getFunctions(app);
