// app.js

import { app } from "./firebase-config.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc, // Import doc
  deleteDoc // Import deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const db = getFirestore(app);

const log = document.getElementById('activityLog');

const eatBtn = document.getElementById('eat-btn');
const sleepBtn = document.getElementById('sleep-btn');
const wakeBtn = document.getElementById('wake-btn');

async function logActivity(type) {
  const now = new Date();
  const timestamp = now.toLocaleString();

  try {
    await addDoc(collection(db, "activities"), {
      type,
      timestamp,
      createdAt: serverTimestamp()
    });
    console.log("Activity logged successfully!");
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

// ✅ New function to delete an activity
async function deleteActivity(docId) {
  try {
    await deleteDoc(doc(db, "activities", docId));
    console.log("Activity deleted successfully!");
  } catch (e) {
    console.error("Error deleting document: ", e);
  }
}

function renderLog() {
  const activitiesQuery = query(
    collection(db, "activities"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(activitiesQuery, (snapshot) => {
    log.innerHTML = "";

    if (snapshot.empty) {
      log.innerHTML = "<li>No activities logged yet.</li>";
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement("li");
      const deleteBtn = document.createElement("button"); // ✅ Create a delete button
      
      li.textContent = `${data.type} at ${data.timestamp}`;

      deleteBtn.textContent = "🗑️ Delete";
      deleteBtn.style.marginLeft = "10px";
      deleteBtn.style.background = "#ffad99";
      deleteBtn.style.border = "none";
      deleteBtn.style.cursor = "pointer";

      // ✅ Add a click event listener to the delete button
      deleteBtn.addEventListener('click', () => {
        deleteActivity(doc.id); // Pass the document ID to the delete function
      });
      
      li.appendChild(deleteBtn);
      log.appendChild(li);
    });
  }, (error) => {
    console.error("Error loading logs:", error);
    log.innerHTML = "<li>Error loading logs. Check Firestore rules.</li>";
  });
}

eatBtn.addEventListener('click', () => logActivity('Eat'));
sleepBtn.addEventListener('click', () => logActivity('Sleep'));
wakeBtn.addEventListener('click', () => logActivity('Wake Up'));

renderLog();
