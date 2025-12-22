// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyC5yeNfWKxyciT2QrC5-GXLqup3KvRXKP0",
    authDomain: "portfolio-c21cb.firebaseapp.com",
    projectId: "portfolio-c21cb",
    storageBucket: "portfolio-c21cb.firebasestorage.app",
    messagingSenderId: "426604082654",
    appId: "1:426604082654:web:870a60a03d2c19d059594f",
    measurementId: "G-C1RH5J3CJV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
