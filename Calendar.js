// ===== CALENDAR NOTES APP =====
// Save this as "calendar-app.js" in your project folder
// Run: npm install express
// Then: node calendar-app.js
// Visit: http://localhost:3000

const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.urlencoded({ extended: true }));

// ===== FILE-BASED STORAGE =====
// Notes are saved to a JSON file so they survive server restarts
const DATA_FILE = path.join(__dirname, "notes-data.json");

// Load notes from file (or start empty)
function loadNotes() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      let raw = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.log("Error reading notes file, starting fresh.");
  }
  return {};
}

// Save notes to file
function saveNotes(notes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2));
}

// ===== HELPER FUNCTIONS =====

// Get number of days in a month (month is 0-indexed: 0 = Jan, 11 = Dec)
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Get the day of the week the month starts on (0 = Sunday, 6 = Saturday)
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// Month names for display
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Day names for calendar header
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ===== COMMON STYLES =====
function getStyles() {
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        background: #1a1a2e;
        color: #e0e0e0;
        min-height: 100vh;
      }
      .container {
        max-width: 900px;
        margin: 0 auto;
        padding: 30px 20px;
      }
      h1 {
        text-align: center;
        font-size: 28px;
        margin-bottom: 5px;
        color: #e94560;
      }
      .subtitle {
        text-align: center;
        color: #888;
        margin-bottom: 25px;
        font-size: 14px;
      }

      /* Navigation */
      .nav {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        margin-bottom: 25px;
      }
      .nav a {
        text-decoration: none;
        background: #16213e;
        color: #e94560;
        padding: 8px 18px;
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        transition: background 0.2s;
      }
      .nav a:hover { background: #0f3460; }
      .nav .month-label {
        font-size: 22px;
        font-weight: bold;
        color: #eee;
        min-width: 200px;
        text-align: center;
      }

      /* Calendar Grid */
      .calendar {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 6px;
      }
      .day-header {
        text-align: center;
        font-weight: bold;
        padding: 10px;
        color: #e94560;
        font-size: 14px;
      }
      .day-cell {
        background: #16213e;
        border-radius: 10px;
        min-height: 90px;
        padding: 8px;
        position: relative;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .day-cell:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(233, 69, 96, 0.2);
      }
      .day-cell a {
        text-decoration: none;
        color: inherit;
        display: block;
        height: 100%;
      }
      .day-number {
        font-size: 18px;
        font-weight: bold;
        color: #eee;
      }
      .day-empty {
        background: transparent;
      }
      .day-today {
        border: 2px solid #e94560;
        background: #1a1a3e;
      }
      .day-today .day-number {
        color: #e94560;
      }
      .has-notes {
        background: #0f3460;
      }
      .note-indicator {
        font-size: 11px;
        color: #aaa;
        margin-top: 6px;
        line-height: 1.3;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .note-count {
        position: absolute;
        top: 8px;
        right: 10px;
        background: #e94560;
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: bold;
      }

      /* Notes Page */
      .back-link {
        display: inline-block;
        text-decoration: none;
        color: #e94560;
        margin-bottom: 20px;
        font-size: 16px;
      }
      .back-link:hover { text-decoration: underline; }
      .date-title {
        font-size: 24px;
        margin-bottom: 20px;
        color: #eee;
      }
      .note-form {
        display: flex;
        gap: 10px;
        margin-bottom: 25px;
      }
      .note-form input {
        flex: 1;
        padding: 12px 16px;
        font-size: 16px;
        border: 2px solid #16213e;
        border-radius: 10px;
        background: #16213e;
        color: #eee;
        outline: none;
        transition: border-color 0.2s;
      }
      .note-form input:focus {
        border-color: #e94560;
      }
      .note-form input::placeholder { color: #666; }
      .note-form button {
        padding: 12px 24px;
        font-size: 16px;
        background: #e94560;
        color: white;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-weight: bold;
        transition: background 0.2s;
      }
      .note-form button:hover { background: #c73652; }
      .notes-list { list-style: none; }
      .note-item {
        background: #16213e;
        padding: 14px 18px;
        margin-bottom: 8px;
        border-radius: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 16px;
      }
      .note-item .note-text { flex: 1; }
      .note-item .note-time {
        color: #666;
        font-size: 12px;
        margin-left: 15px;
        white-space: nowrap;
      }
      .note-item .delete-btn {
        text-decoration: none;
        color: #e94560;
        font-size: 18px;
        margin-left: 15px;
        opacity: 0.6;
        transition: opacity 0.2s;
      }
      .note-item .delete-btn:hover { opacity: 1; }
      .empty-message {
        text-align: center;
        color: #555;
        padding: 40px;
        font-size: 16px;
      }
    </style>
  `;
}

// ===== ROUTE: CALENDAR PAGE =====
app.get("/", (req, res) => {
  let today = new Date();
  let year = parseInt(req.query.year) || today.getFullYear();
  let month = parseInt(req.query.month);

  // If month is not provided or invalid, use current month
  if (isNaN(month) || month < 0 || month > 11) {
    month = today.getMonth();
  }

  // Handle previous/next month navigation
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 0) { prevMonth = 11; prevYear--; }

  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 11) { nextMonth = 0; nextYear++; }

  let daysInMonth = getDaysInMonth(year, month);
  let firstDay = getFirstDayOfMonth(year, month);

  let notes = loadNotes();

  // Build day headers (Sun, Mon, Tue, ...)
  let dayHeadersHTML = dayNames.map(d =>
    `<div class="day-header">${d}</div>`
  ).join("");

  // Build empty cells for days before the 1st
  let emptyCellsHTML = "";
  for (let i = 0; i < firstDay; i++) {
    emptyCellsHTML += `<div class="day-cell day-empty"></div>`;
  }

  // Build day cells
  let dayCellsHTML = "";
  for (let day = 1; day <= daysInMonth; day++) {
    let dateKey = `${year}-${month}-${day}`;
    let dayNotes = notes[dateKey] || [];
    let noteCount = dayNotes.length;

    // Check if this is today
    let isToday = (day === today.getDate() &&
                   month === today.getMonth() &&
                   year === today.getFullYear());

    let cellClass = "day-cell";
    if (isToday) cellClass += " day-today";
    if (noteCount > 0) cellClass += " has-notes";

    // Show a preview of the latest note
    let previewHTML = "";
    if (noteCount > 0) {
      let latestNote = dayNotes[dayNotes.length - 1].text;
      let preview = latestNote.length > 30
        ? latestNote.substring(0, 30) + "..."
        : latestNote;
      previewHTML = `<div class="note-indicator">${preview}</div>`;
    }

    let countBadge = noteCount > 0
      ? `<span class="note-count">${noteCount}</span>`
      : "";

    dayCellsHTML += `
      <div class="${cellClass}">
        <a href="/day?year=${year}&month=${month}&day=${day}">
          <div class="day-number">${day}</div>
          ${countBadge}
          ${previewHTML}
        </a>
      </div>
    `;
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mohan's Calendar Notes — ${monthNames[month]} ${year}</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <h1>📅 Calendar Notes</h1>
        <p class="subtitle">Click on any day to add notes</p>

        <div class="nav">
          <a href="/?year=${prevYear}&month=${prevMonth}">◀</a>
          <div class="month-label">${monthNames[month]} ${year}</div>
          <a href="/?year=${nextYear}&month=${nextMonth}">▶</a>
        </div>

        <div class="calendar">
          ${dayHeadersHTML}
          ${emptyCellsHTML}
          ${dayCellsHTML}
        </div>
      </div>
    </body>
    </html>
  `);
});

// ===== ROUTE: INDIVIDUAL DAY / NOTE PAGE =====
app.get("/day", (req, res) => {
  let year = parseInt(req.query.year);
  let month = parseInt(req.query.month);
  let day = parseInt(req.query.day);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return res.redirect("/");
  }

  let dateKey = `${year}-${month}-${day}`;
  let notes = loadNotes();
  let dayNotes = notes[dateKey] || [];

  // Format the date nicely
  let dateObj = new Date(year, month, day);
  let options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  let formattedDate = dateObj.toLocaleDateString("en-IN", options);

  // Build notes list
  let notesHTML = "";
  if (dayNotes.length === 0) {
    notesHTML = `<div class="empty-message">No notes yet for this day.<br>Add one above!</div>`;
  } else {
    notesHTML = `<ul class="notes-list">`;
    for (let i = 0; i < dayNotes.length; i++) {
      let note = dayNotes[i];
      notesHTML += `
        <li class="note-item">
          <span class="note-text">${note.text}</span>
          <span class="note-time">${note.time}</span>
          <a href="/delete?year=${year}&month=${month}&day=${day}&index=${i}"
             class="delete-btn" title="Delete this note">✕</a>
        </li>
      `;
    }
    notesHTML += `</ul>`;
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Notes — ${formattedDate}</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container">
        <a href="/?year=${year}&month=${month}" class="back-link">← Back to Calendar</a>
        <div class="date-title">📝 ${formattedDate}</div>

        <form class="note-form" action="/add" method="POST">
          <input type="hidden" name="year" value="${year}" />
          <input type="hidden" name="month" value="${month}" />
          <input type="hidden" name="day" value="${day}" />
          <input type="text" name="note" placeholder="Write a note..."
                 required autocomplete="off" />
          <button type="submit">Add Note</button>
        </form>

        ${notesHTML}
      </div>
    </body>
    </html>
  `);
});

// ===== ROUTE: ADD A NOTE =====
app.post("/add", (req, res) => {
  let year = parseInt(req.body.year);
  let month = parseInt(req.body.month);
  let day = parseInt(req.body.day);
  let noteText = req.body.note;

  if (noteText && noteText.trim() !== "") {
    let dateKey = `${year}-${month}-${day}`;
    let notes = loadNotes();

    if (!notes[dateKey]) {
      notes[dateKey] = [];
    }

    // Get current time for the timestamp
    let now = new Date();
    let timeStr = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    notes[dateKey].push({
      text: noteText.trim(),
      time: timeStr
    });

    saveNotes(notes);
  }

  res.redirect(`/day?year=${year}&month=${month}&day=${day}`);
});

// ===== ROUTE: DELETE A NOTE =====
app.get("/delete", (req, res) => {
  let year = parseInt(req.query.year);
  let month = parseInt(req.query.month);
  let day = parseInt(req.query.day);
  let index = parseInt(req.query.index);

  let dateKey = `${year}-${month}-${day}`;
  let notes = loadNotes();

  if (notes[dateKey] && index >= 0 && index < notes[dateKey].length) {
    notes[dateKey].splice(index, 1); // Remove the note at this position

    // If no notes left for this day, remove the key entirely
    if (notes[dateKey].length === 0) {
      delete notes[dateKey];
    }

    saveNotes(notes);
  }

  res.redirect(`/day?year=${year}&month=${month}&day=${day}`);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Calendar Notes app running at http://localhost:" + PORT);
});