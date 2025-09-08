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
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const db = getFirestore(app);

const log = document.getElementById('activityLog');

const eatBtn = document.getElementById('eat-btn');
const sleepBtn = document.getElementById('sleep-btn');
const wakeBtn = document.getElementById('wake-btn');

const manualEntryBtn = document.getElementById('manual-entry-btn');
const manualEntryModal = document.getElementById('manualEntryModal');
const manualEntryForm = document.getElementById('manualEntryForm');
const closeModalBtn = document.getElementById('closeModalBtn');

async function logActivity(type, manualTimestamp = null) {
  const now = new Date();
  const displayTimestamp = manualTimestamp ? new Date(manualTimestamp).toLocaleString() : now.toLocaleString();
  const createdAt = manualTimestamp ? new Date(manualTimestamp) : serverTimestamp();

  try {
    await addDoc(collection(db, "activities"), {
      type,
      timestamp: displayTimestamp,
      createdAt: createdAt
    });
    console.log("Activity logged successfully!");
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

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
    let lastDate = null;

    if (snapshot.empty) {
      log.innerHTML = "<li>No activities logged yet.</li>";
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        const entryDate = data.createdAt.toDate();
        const formattedDate = entryDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        if (formattedDate !== lastDate) {
          const dateHeading = document.createElement("h3");
          dateHeading.textContent = formattedDate;
          log.appendChild(dateHeading);
          lastDate = formattedDate;
        }
      }

      const li = document.createElement("li");
      const deleteBtn = document.createElement("button");
      const textSpan = document.createElement("span");
      
      textSpan.textContent = `${data.type} at ${data.timestamp}`;
      
      deleteBtn.innerHTML = `&times;`;
      deleteBtn.className = "delete-btn";

      deleteBtn.addEventListener('click', () => {
        deleteActivity(doc.id);
      });
      
      li.appendChild(textSpan);
      li.appendChild(deleteBtn);
      log.appendChild(li);
    });
  }, (error) => {
    console.error("Error loading logs:", error);
    log.innerHTML = "<li>Error loading logs. Check Firestore rules.</li>";
  });
}

manualEntryBtn.addEventListener('click', () => {
  manualEntryModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
  manualEntryModal.style.display = 'none';
});

manualEntryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const activityType = document.getElementById('activityType').value;
  const activityDate = document.getElementById('activityDate').value;
  const activityTime = document.getElementById('activityTime').value;

  const combinedTimestamp = `${activityDate}T${activityTime}:00`;

  await logActivity(activityType, combinedTimestamp);

  manualEntryModal.style.display = 'none';
  manualEntryForm.reset();
});

eatBtn.addEventListener('click', () => logActivity('Eat'));
sleepBtn.addEventListener('click', () => logActivity('Sleep'));
wakeBtn.addEventListener('click', () => logActivity('Wake Up'));

renderLog();
