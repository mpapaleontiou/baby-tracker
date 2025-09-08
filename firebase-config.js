// firebase-config.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBq21B...",
    authDomain: "baby-tracker-f0454.firebaseapp.com",
    projectId: "baby-tracker-f0454",
    storageBucket: "baby-tracker-f0454.appspot.com",
    messagingSenderId: "669338540494",
    appId: "1:669338540494:web:cb35ece4659dafc205f39f",
    measurementId: "G-YE7K6EYXRS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the app instance
export { app };
