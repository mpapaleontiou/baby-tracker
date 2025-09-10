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

document.addEventListener("DOMContentLoaded", () => {
  const db = getFirestore(app);

  const log = document.getElementById("activityLog");

  const eatBtn = document.getElementById("eat-btn");
  const sleepBtn = document.getElementById("sleep-btn");
  const wakeBtn = document.getElementById("wake-btn");

  const manualEntryBtn = document.getElementById("manual-entry-btn");
  const manualEntryModal = document.getElementById("manualEntryModal");
  const manualEntryForm = document.getElementById("manualEntryForm");
  const closeModalBtn = document.getElementById("closeModalBtn");

  const lastFeedTimeEl = document.getElementById("lastFeedTime");
  const lastWakeUpTimeEl = document.getElementById("lastWakeUpTime");

  const activityIcons = {
    "Eat": "🍼",
    "Sleep": "😴",
    "Wake Up": "🌞",
  };

  async function logActivity(type, manualTimestamp = null) {
    const now = new Date();
    const displayTimestamp = manualTimestamp
      ? new Date(manualTimestamp).toLocaleTimeString()
      : now.toLocaleTimeString();

    const createdAt = manualTimestamp ? new Date(manualTimestamp) : serverTimestamp();

    try {
      await addDoc(collection(db, "activities"), {
        type,
        timestamp: displayTimestamp,
        createdAt,
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

  function updateElapsedTime(latestEat, latestWakeUp) {
    const now = new Date();

    function formatElapsedTime(date) {
      if (!date) return "N/A";
      const totalMinutes = Math.floor((now - date) / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      let result = "";
      if (hours > 0) result += `${hours} hour${hours > 1 ? "s" : ""} `;
      result += `${minutes} minute${minutes !== 1 ? "s" : ""}`;
      return result;
    }

    lastFeedTimeEl.textContent = formatElapsedTime(latestEat);
    lastWakeUpTimeEl.textContent = formatElapsedTime(latestWakeUp);
  }

  function renderLog() {
    const activitiesQuery = query(
      collection(db, "activities"),
      orderBy("createdAt", "desc")
    );

    onSnapshot(
      activitiesQuery,
      (snapshot) => {
        log.innerHTML = "";
        let lastDate = null;

        let latestEat = null;
        let latestWakeUp = null;

        if (snapshot.empty) {
          log.innerHTML = "<li>No activities logged yet.</li>";
          return;
        }

        snapshot.forEach((doc) => {
          const data = doc.data();

          // Resolve timestamp
          let entryDate = null;
          if (data.createdAt && typeof data.createdAt.toDate === "function") {
            entryDate = data.createdAt.toDate();
          }

          if (entryDate) {
            const formattedDate = entryDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            if (formattedDate !== lastDate) {
              const dateHeading = document.createElement("h3");
              dateHeading.textContent = formattedDate;
              log.appendChild(dateHeading);
              lastDate = formattedDate;
            }

            // Track latest Eat and Wake Up
            if (data.type === "Eat" && !latestEat) {
              latestEat = entryDate;
            }
            if (data.type === "Wake Up" && !latestWakeUp) {
              latestWakeUp = entryDate;
            }
          }

          const li = document.createElement("li");
          const deleteBtn = document.createElement("button");

          const icon = activityIcons[data.type] || "";

          const mainTextSpan = document.createElement("span");
          mainTextSpan.innerHTML = `${icon} <strong>${data.type}</strong>`;

          const timeSpan = document.createElement("span");
          timeSpan.className = "activity-time";
          if (entryDate) {
            timeSpan.textContent = entryDate.toLocaleTimeString();
          } else {
            timeSpan.textContent = data.timestamp || "Unknown time";
          }

          deleteBtn.innerHTML = `&times;`;
          deleteBtn.className = "delete-btn";

          deleteBtn.addEventListener("click", () => {
            deleteActivity(doc.id);
          });

          li.appendChild(mainTextSpan);
          li.appendChild(timeSpan);
          li.appendChild(deleteBtn);
          log.appendChild(li);
        });

        // Immediately update elapsed time
        updateElapsedTime(latestEat, latestWakeUp);

        // Keep updating every minute
        setInterval(() => updateElapsedTime(latestEat, latestWakeUp), 60000);
      },
      (error) => {
        console.error("Error loading logs:", error);
        log.innerHTML = "<li>Error loading logs. Check Firestore rules.</li>";
      }
    );
  }

  // Manual entry modal controls
  manualEntryBtn.addEventListener("click", () => {
    manualEntryModal.style.display = "flex";
  });

  closeModalBtn.addEventListener("click", () => {
    manualEntryModal.style.display = "none";
  });

  manualEntryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const activityType = document.getElementById("activityType").value;
    const activityDate = document.getElementById("activityDate").value;
    const activityTime = document.getElementById("activityTime").value;

    const combinedTimestamp = `${activityDate}T${activityTime}:00`;

    await logActivity(activityType, combinedTimestamp);

    manualEntryModal.style.display = "none";
    manualEntryForm.reset();
  });

  eatBtn.addEventListener("click", () => logActivity("Eat"));
  sleepBtn.addEventListener("click", () => logActivity("Sleep"));
  wakeBtn.addEventListener("click", () => logActivity("Wake Up"));

  renderLog();
});
