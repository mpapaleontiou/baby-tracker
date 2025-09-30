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
  const cancelBtn = document.getElementById("cancelBtn");

  const lastFeedTimeEl = document.getElementById("lastFeedTime");
  const lastWakeUpTimeEl = document.getElementById("lastWakeUpTime");

  const activityConfig = {
    "Eat": { icon: "milk", label: "Feed" },
    "Sleep": { icon: "moon", label: "Sleep" },
    "Wake Up": { icon: "sun", label: "Wake" }
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
      if (!date) return "—";
      const totalMinutes = Math.floor((now - date) / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours === 0 && minutes === 0) return "Just now";
      
      let result = "";
      if (hours > 0) result += `${hours}h `;
      if (minutes > 0 || hours === 0) result += `${minutes}m`;
      return result.trim();
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
          log.innerHTML = '<div class="empty-state">No activities logged yet</div>';
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
              const dateHeading = document.createElement("div");
              dateHeading.className = "date-divider";
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

          const activityItem = document.createElement("div");
          activityItem.className = "activity-item";

          const config = activityConfig[data.type] || { icon: "circle", label: data.type };

          // Icon
          const iconEl = document.createElement("i");
          iconEl.setAttribute("data-lucide", config.icon);
          iconEl.className = "activity-icon";

          // Content
          const contentEl = document.createElement("div");
          contentEl.className = "activity-content";

          const typeEl = document.createElement("span");
          typeEl.className = "activity-type";
          typeEl.textContent = config.label;

          // Calculate sleep duration if this is a Sleep event followed by Wake Up
          if (data.type === "Sleep") {
            const allActivities = [];
            snapshot.forEach((d) => {
              const actData = d.data();
              let actDate = null;
              if (actData.createdAt && typeof actData.createdAt.toDate === "function") {
                actDate = actData.createdAt.toDate();
              }
              allActivities.push({ id: d.id, ...actData, parsedDate: actDate });
            });

            allActivities.sort((a, b) => {
              if (!a.parsedDate || !b.parsedDate) return 0;
              return a.parsedDate - b.parsedDate;
            });

            const currentIndex = allActivities.findIndex(a => a.id === doc.id);
            if (currentIndex !== -1 && currentIndex < allActivities.length - 1) {
              const nextActivity = allActivities[currentIndex + 1];
              if (nextActivity.type === "Wake Up" && entryDate && nextActivity.parsedDate) {
                const durationMinutes = Math.round((nextActivity.parsedDate - entryDate) / (1000 * 60));
                const durationEl = document.createElement("span");
                durationEl.className = "activity-duration";
                durationEl.textContent = `${durationMinutes}m`;
                contentEl.appendChild(typeEl);
                contentEl.appendChild(durationEl);
              } else {
                contentEl.appendChild(typeEl);
              }
            } else {
              contentEl.appendChild(typeEl);
            }
          } else {
            contentEl.appendChild(typeEl);
          }

          // Time
          const timeEl = document.createElement("span");
          timeEl.className = "activity-time";
          if (entryDate) {
            timeEl.textContent = entryDate.toLocaleTimeString([], { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });
          } else {
            timeEl.textContent = data.timestamp || "Unknown";
          }

          // Delete button
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "activity-delete";
          deleteBtn.innerHTML = '<i data-lucide="x"></i>';
          deleteBtn.addEventListener("click", () => {
            deleteActivity(doc.id);
          });

          activityItem.appendChild(iconEl);
          activityItem.appendChild(contentEl);
          activityItem.appendChild(timeEl);
          activityItem.appendChild(deleteBtn);
          log.appendChild(activityItem);
        });

        // Reinitialize Lucide icons for dynamically added elements
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }

        // Update elapsed time
        updateElapsedTime(latestEat, latestWakeUp);

        // Keep updating every minute
        setInterval(() => updateElapsedTime(latestEat, latestWakeUp), 60000);
      },
      (error) => {
        console.error("Error loading logs:", error);
        log.innerHTML = '<div class="empty-state">Error loading activities</div>';
      }
    );
  }

  // Modal controls
  function openModal() {
    manualEntryModal.classList.add("active");
  }

  function closeModal() {
    manualEntryModal.classList.remove("active");
    manualEntryForm.reset();
  }

  manualEntryBtn.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  // Close modal when clicking overlay
  manualEntryModal.addEventListener("click", (e) => {
    if (e.target === manualEntryModal) {
      closeModal();
    }
  });

  manualEntryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const activityType = document.getElementById("activityType").value;
    const activityDate = document.getElementById("activityDate").value;
    const activityTime = document.getElementById("activityTime").value;

    const combinedTimestamp = `${activityDate}T${activityTime}:00`;

    await logActivity(activityType, combinedTimestamp);

    closeModal();
  });

  eatBtn.addEventListener("click", () => logActivity("Eat"));
  sleepBtn.addEventListener("click", () => logActivity("Sleep"));
  wakeBtn.addEventListener("click", () => logActivity("Wake Up"));

  renderLog();
});
