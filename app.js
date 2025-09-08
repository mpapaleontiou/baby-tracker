// app.js

// Import the Firebase app instance from the config file
import { app } from "./firebase-config.js";

// Import the necessary Firestore functions from the modular SDK
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Get a reference to the Firestore service
const db = getFirestore(app);

// Get a reference to the log element
const log = document.getElementById('activityLog');

// Get references to the buttons using their new IDs
const eatBtn = document.getElementById('eat-btn');
const sleepBtn = document.getElementById('sleep-btn');
const wakeBtn = document.getElementById('wake-btn');

// Function to log an activity to Firestore
async function logActivity(type) {
  const now = new Date();
  const timestamp = now.toLocaleString();

  try {
    // Use addDoc and collection for the modular syntax
    await addDoc(collection(db, "activities"), {
      type,
      timestamp,
      createdAt: serverTimestamp() // Use serverTimestamp()
    });
    console.log("Activity logged successfully!");
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

// Function to render the log in the UI
function renderLog() {
  const activitiesQuery = query(
    collection(db, "activities"),
    orderBy("createdAt", "desc")
  );

  // Use onSnapshot to listen for real-time updates
  onSnapshot(activitiesQuery, (snapshot) => {
    log.innerHTML = ""; // Clear existing list

    if (snapshot.empty) {
      log.innerHTML = "<li>No activities logged yet.</li>";
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      const activityText = `${data.type} at ${data.timestamp}`;
      li.textContent = activityText;
      log.appendChild(li);
    });
  }, (error) => {
    console.error("Error loading logs:", error);
    log.innerHTML = "<li>Error loading logs. Check Firestore rules.</li>";
  });
}

// Add event listeners to the buttons
eatBtn.addEventListener('click', () => logActivity('Eat'));
sleepBtn.addEventListener('click', () => logActivity('Sleep'));
wakeBtn.addEventListener('click', () => logActivity('Wake Up'));

// Initial call to render the log
renderLog();
