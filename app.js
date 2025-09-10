// app.js

import { app } from "./firebase-config.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', (event) => {
    const db = getFirestore(app);

    const log = document.getElementById('activityLog');

    const eatBtn = document.getElementById('eat-btn');
    const sleepBtn = document.getElementById('sleep-btn');
    const wakeBtn = document.getElementById('wake-btn');

    const manualEntryBtn = document.getElementById('manual-entry-btn');
    const manualEntryModal = document.getElementById('manualEntryModal');
    const manualEntryForm = document.getElementById('manualEntryForm');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // ✅ Get references to the new timer elements
    const lastFeedTimeEl = document.getElementById('lastFeedTime');
    const lastWakeUpTimeEl = document.getElementById('lastWakeUpTime');

    const activityIcons = {
        'Eat': '🍼',
        'Sleep': '😴',
        'Wake Up': '🌞'
    };

    async function logActivity(type, manualTimestamp = null) {
      const now = new Date();
      const displayTimestamp = manualTimestamp ? new Date(manualTimestamp).toLocaleTimeString() : now.toLocaleTimeString();
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
    
    // ✅ New function to update the timers
    async function updateTimers() {
      // Query for the latest 'Eat' event
      const eatQuery = query(
        collection(db, "activities"),
        where("type", "==", "Eat"),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      // Query for the latest 'Wake Up' event
      const wakeUpQuery = query(
        collection(db, "activities"),
        where("type", "==", "Wake Up"),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      // Update last feed time
      onSnapshot(eatQuery, (snapshot) => {
        if (!snapshot.empty) {
          const latestEat = snapshot.docs[0].data();
          const latestEatTime = latestEat.createdAt.toDate();
          const minutesElapsed = Math.floor((new Date() - latestEatTime) / (1000 * 60));
          lastFeedTimeEl.textContent = `${minutesElapsed} minutes`;
        } else {
          lastFeedTimeEl.textContent = "N/A";
        }
      });

      // Update last wake up time
      onSnapshot(wakeUpQuery, (snapshot) => {
        if (!snapshot.empty) {
          const latestWakeUp = snapshot.docs[0].data();
          const latestWakeUpTime = latestWakeUp.createdAt.toDate();
          const minutesElapsed = Math.floor((new Date() - latestWakeUpTime) / (1000 * 60));
          lastWakeUpTimeEl.textContent = `${minutesElapsed} minutes`;
        } else {
          lastWakeUpTimeEl.textContent = "N/A";
        }
      });
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
          
          const icon = activityIcons[data.type] || '';
          
          const mainTextSpan = document.createElement("span");
          mainTextSpan.innerHTML = `${icon} <strong>${data.type}</strong>`;
          
          const timeSpan = document.createElement("span");
          timeSpan.className = 'activity-time';
          timeSpan.textContent = data.timestamp;
          
          deleteBtn.innerHTML = `&times;`;
          deleteBtn.className = "delete-btn";

          deleteBtn.addEventListener('click', () => {
            deleteActivity(doc.id);
          });
          
          li.appendChild(mainTextSpan);
          li.appendChild(timeSpan);
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
    // ✅ Call the new function to update the timers on page load
    updateTimers(); 
    // ✅ Update the timers every minute
    setInterval(updateTimers, 60000); 
});
