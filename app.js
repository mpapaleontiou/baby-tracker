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

// Activity configuration
const ACTIVITY_CONFIG = {
  "Eat": { icon: "milk", label: "Feed" },
  "Sleep": { icon: "moon", label: "Sleep" },
  "Wake Up": { icon: "sun", label: "Wake" }
};

// Utility Functions
const formatElapsedTime = (date) => {
  if (!date) return "—";
  
  const totalMinutes = Math.floor((Date.now() - date) / 60000);
  if (totalMinutes < 1) return "Just now";
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) return `${minutes}m`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return mins === 0 ? `${hours}h` : `${hours}h${mins}m`;
};

const formatTime = (date) => {
  return date.toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

const formatDate = (date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const parseCreatedAt = (data) => {
  return data.createdAt && typeof data.createdAt.toDate === "function"
    ? data.createdAt.toDate()
    : null;
};

// Create activity item element
const createActivityElement = (doc, allActivitiesSorted) => {
  const data = doc.data();
  const entryDate = parseCreatedAt(data);
  const config = ACTIVITY_CONFIG[data.type] || { icon: "circle", label: data.type };
  
  const activityItem = document.createElement("div");
  activityItem.className = "activity-item";
  
  // Icon
  const iconEl = document.createElement("i");
  iconEl.setAttribute("data-lucide", config.icon);
  iconEl.className = "activity-icon";
  
  // Content (type + optional duration)
  const contentEl = document.createElement("div");
  contentEl.className = "activity-content";
  
  const typeEl = document.createElement("span");
  typeEl.className = "activity-type";
  typeEl.textContent = config.label;
  contentEl.appendChild(typeEl);
  
  // Add sleep duration if applicable
  if (data.type === "Sleep" && entryDate) {
    const currentIndex = allActivitiesSorted.findIndex(a => a.id === doc.id);
    const nextActivity = allActivitiesSorted[currentIndex + 1];
    
    if (nextActivity?.type === "Wake Up" && nextActivity.parsedDate) {
      const durationMinutes = Math.round((nextActivity.parsedDate - entryDate) / 60000);
      const durationEl = document.createElement("span");
      durationEl.className = "activity-duration";
      durationEl.textContent = formatDuration(durationMinutes);
      contentEl.appendChild(durationEl);
    }
  }
  
  // Time
  const timeEl = document.createElement("span");
  timeEl.className = "activity-time";
  timeEl.textContent = entryDate ? formatTime(entryDate) : (data.timestamp || "Unknown");
  
  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "activity-delete";
  deleteBtn.innerHTML = '<i data-lucide="x"></i>';
  deleteBtn.addEventListener("click", () => deleteActivity(doc.id));
  
  activityItem.append(iconEl, contentEl, timeEl, deleteBtn);
  
  return { element: activityItem, date: entryDate, formattedDate: entryDate ? formatDate(entryDate) : null };
};

// Main App
document.addEventListener("DOMContentLoaded", () => {
  const db = getFirestore(app);
  
  // DOM Elements
  const log = document.getElementById("activityLog");
  const lastFeedTimeEl = document.getElementById("lastFeedTime");
  const lastWakeUpTimeEl = document.getElementById("lastWakeUpTime");
  const manualEntryModal = document.getElementById("manualEntryModal");
  const manualEntryForm = document.getElementById("manualEntryForm");
  
  // State
  let elapsedTimeInterval = null;
  let latestEat = null;
  let latestWakeUp = null;
  
  // Update elapsed time displays
  const updateElapsedTime = () => {
    lastFeedTimeEl.textContent = formatElapsedTime(latestEat);
    lastWakeUpTimeEl.textContent = formatElapsedTime(latestWakeUp);
  };
  
  // Database operations
  const logActivity = async (type, manualTimestamp = null) => {
    const createdAt = manualTimestamp ? new Date(manualTimestamp) : serverTimestamp();
    
    try {
      await addDoc(collection(db, "activities"), {
        type,
        timestamp: manualTimestamp ? new Date(manualTimestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
        createdAt,
      });
    } catch (e) {
      console.error("Error adding document:", e);
    }
  };
  
  const deleteActivity = async (docId) => {
    try {
      await deleteDoc(doc(db, "activities", docId));
    } catch (e) {
      console.error("Error deleting document:", e);
    }
  };
  
  // Render activity log
  const renderLog = () => {
    const activitiesQuery = query(
      collection(db, "activities"),
      orderBy("createdAt", "desc")
    );
    
    onSnapshot(
      activitiesQuery,
      (snapshot) => {
        log.innerHTML = "";
        
        if (snapshot.empty) {
          log.innerHTML = '<div class="empty-state">No activities logged yet</div>';
          return;
        }
        
        // Build sorted activities array once
        const allActivities = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const parsedDate = parseCreatedAt(data);
          allActivities.push({ id: doc.id, ...data, parsedDate });
        });
        
        // Sort chronologically (oldest first) for duration calculation
        const allActivitiesSorted = [...allActivities].sort((a, b) => {
          if (!a.parsedDate || !b.parsedDate) return 0;
          return a.parsedDate - b.parsedDate;
        });
        
        // Track latest activities
        latestEat = null;
        latestWakeUp = null;
        
        // Render activities (in reverse chrono order from snapshot)
        let lastDateHeader = null;
        
        snapshot.forEach((doc) => {
          const { element, date, formattedDate } = createActivityElement(doc, allActivitiesSorted);
          
          // Add date divider if needed
          if (formattedDate && formattedDate !== lastDateHeader) {
            const dateHeading = document.createElement("div");
            dateHeading.className = "date-divider";
            dateHeading.textContent = formattedDate;
            log.appendChild(dateHeading);
            lastDateHeader = formattedDate;
          }
          
          // Track latest Eat and Wake Up
          const data = doc.data();
          if (date) {
            if (data.type === "Eat" && !latestEat) latestEat = date;
            if (data.type === "Wake Up" && !latestWakeUp) latestWakeUp = date;
          }
          
          log.appendChild(element);
        });
        
        // Reinitialize Lucide icons
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
        
        // Update elapsed time immediately
        updateElapsedTime();
        
        // Clear existing interval and create new one
        if (elapsedTimeInterval) {
          clearInterval(elapsedTimeInterval);
        }
        elapsedTimeInterval = setInterval(updateElapsedTime, 60000);
      },
      (error) => {
        console.error("Error loading logs:", error);
        log.innerHTML = '<div class="empty-state">Error loading activities</div>';
      }
    );
  };
  
  // Modal controls
  const openModal = () => manualEntryModal.classList.add("active");
  const closeModal = () => {
    manualEntryModal.classList.remove("active");
    manualEntryForm.reset();
  };
  
  // Event listeners
  document.getElementById("eat-btn").addEventListener("click", () => logActivity("Eat"));
  document.getElementById("sleep-btn").addEventListener("click", () => logActivity("Sleep"));
  document.getElementById("wake-btn").addEventListener("click", () => logActivity("Wake Up"));
  document.getElementById("manual-entry-btn").addEventListener("click", openModal);
  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  document.getElementById("cancelBtn").addEventListener("click", closeModal);
  
  manualEntryModal.addEventListener("click", (e) => {
    if (e.target === manualEntryModal) closeModal();
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
  
  // Initialize Lucide icons and start rendering
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  renderLog();
});
