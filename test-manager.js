// ===== TEST MANAGEMENT TOOL — PHASE 2 =====
// Save as "test-manager.js" (replaces Phase 1)
// Install: npm install express multer xlsx
// Run: node test-manager.js
// Visit: http://localhost:3000

const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const XLSX = require("xlsx");
const app = express();

app.use(express.urlencoded({ extended: true }));

// File upload config — stores uploaded Excel files temporarily
const upload = multer({ dest: path.join(__dirname, "uploads") });

// Ensure uploads folder exists
if (!fs.existsSync(path.join(__dirname, "uploads"))) {
  fs.mkdirSync(path.join(__dirname, "uploads"));
}

// ===== FILE STORAGE =====
const DATA_FILE = path.join(__dirname, "test-manager-data.json");

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      let d = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      if (!d.testCycles) d.testCycles = [];
      if (!d.history) d.history = [];
      return d;
    }
  } catch (err) { console.log("Error reading data, starting fresh."); }
  return { projects: [], testCases: [], bugs: [], team: [], testCycles: [], history: [], nextId: 1 };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getNextId(data) {
  let id = data.nextId; data.nextId++; saveData(data); return id;
}

function addHistory(data, action, itemType, itemId, itemTitle, user) {
  data.history.unshift({
    id: getNextId(data), action, itemType, itemId, itemTitle,
    user: user || "System",
    timestamp: new Date().toISOString()
  });
  if (data.history.length > 200) data.history = data.history.slice(0, 200);
}

function formatDate(iso) {
  if (!iso) return "-";
  let d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ===== STYLES =====
function getStyles() {
  return `<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#0f0f1a;color:#e0e0e0;min-height:100vh}
a{color:#e94560;text-decoration:none}a:hover{text-decoration:underline}
.topbar{background:#1a1a2e;padding:10px 30px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #2a2a3e}
.topbar .logo{font-size:20px;font-weight:bold;color:#e94560}
.topbar nav{display:flex;gap:6px;flex-wrap:wrap}
.topbar nav a{color:#aaa;font-size:13px;padding:5px 12px;border-radius:6px;transition:all .2s}
.topbar nav a:hover,.topbar nav a.active{color:#fff;background:#e94560;text-decoration:none}
.search-box{display:flex;gap:8px}
.search-box input{padding:6px 12px;background:#0f0f1a;border:1px solid #2a2a3e;border-radius:6px;color:#eee;font-size:13px;width:200px}
.search-box button{padding:6px 14px;background:#e94560;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer}
.container{max-width:1100px;margin:0 auto;padding:25px 20px}
h1{font-size:22px;margin-bottom:18px;color:#eee}
h2{font-size:17px;margin-bottom:14px;color:#ccc}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:25px}
.stat-card{background:#1a1a2e;border-radius:12px;padding:16px;border-left:4px solid #e94560}
.stat-card.teal{border-left-color:#1abc9c}.stat-card.amber{border-left-color:#f39c12}
.stat-card.blue{border-left-color:#3498db}.stat-card.red{border-left-color:#e74c3c}
.stat-card.purple{border-left-color:#9b59b6}.stat-card.green{border-left-color:#2ecc71}
.stat-number{font-size:28px;font-weight:bold;color:#fff}
.stat-label{font-size:12px;color:#888;margin-top:3px}
.card{background:#1a1a2e;border-radius:12px;padding:18px;margin-bottom:14px}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:10px 12px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #2a2a3e}
td{padding:10px 12px;border-bottom:1px solid #1f1f30;font-size:13px}
tr:hover td{background:#16162a}
.badge{display:inline-block;padding:2px 9px;border-radius:12px;font-size:10px;font-weight:bold;text-transform:uppercase}
.badge-pass{background:#0d3b2e;color:#1abc9c}.badge-fail{background:#3b0d0d;color:#e74c3c}
.badge-blocked{background:#3b2e0d;color:#f39c12}.badge-not-run{background:#1f1f30;color:#888}
.badge-open{background:#3b0d0d;color:#e74c3c}.badge-in-progress{background:#0d2a3b;color:#3498db}
.badge-closed{background:#0d3b2e;color:#1abc9c}
.badge-critical{background:#3b0d0d;color:#e74c3c}.badge-high{background:#3b1a0d;color:#e67e22}
.badge-medium{background:#3b2e0d;color:#f39c12}.badge-low{background:#1f1f30;color:#888}
.badge-active{background:#0d3b2e;color:#1abc9c}.badge-planned{background:#1f1f30;color:#888}
.badge-completed{background:#0d2a3b;color:#3498db}
.btn{display:inline-block;padding:7px 16px;border-radius:8px;font-size:13px;font-weight:bold;border:none;cursor:pointer;text-decoration:none;color:#fff;transition:all .2s}
.btn-primary{background:#e94560}.btn-primary:hover{background:#c73652;text-decoration:none}
.btn-small{padding:3px 10px;font-size:11px}
.btn-danger{background:#c0392b}
.form-group{margin-bottom:12px}
.form-group label{display:block;margin-bottom:4px;font-size:12px;color:#aaa;font-weight:bold}
.form-group input,.form-group select,.form-group textarea{width:100%;padding:9px 12px;font-size:13px;background:#0f0f1a;border:1px solid #2a2a3e;border-radius:8px;color:#eee;outline:none;transition:border-color .2s}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:#e94560}
.form-group textarea{min-height:70px;resize:vertical;font-family:inherit}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-row-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.empty-state{text-align:center;padding:30px;color:#555;font-size:14px}
.action-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px}
.delete-link{color:#e74c3c;font-size:11px}
.progress-bar{height:7px;background:#1f1f30;border-radius:4px;overflow:hidden;margin-top:6px}
.progress-fill{height:100%;border-radius:4px}.progress-fill.green{background:#1abc9c}
.bar-chart{display:flex;align-items:flex-end;gap:6px;height:100px;margin-top:10px}
.bar{border-radius:4px 4px 0 0;min-width:30px;flex:1;text-align:center;font-size:10px;color:#fff;display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:4px}
.upload-area{border:2px dashed #2a2a3e;border-radius:12px;padding:20px;text-align:center;margin-bottom:15px;transition:border-color .2s}
.upload-area:hover{border-color:#e94560}
.history-item{padding:8px 0;border-bottom:1px solid #1f1f30;font-size:13px;display:flex;justify-content:space-between}
.history-item .time{color:#555;font-size:11px}
</style>`;
}

// ===== NAVIGATION =====
function getNav(active) {
  let pages = [
    { url: "/", label: "Dashboard" }, { url: "/projects", label: "Projects" },
    { url: "/testcases", label: "Test Cases" }, { url: "/cycles", label: "Test Cycles" },
    { url: "/bugs", label: "Bugs" }, { url: "/team", label: "Team" },
    { url: "/history", label: "History" }
  ];
  let links = pages.map(p =>
    `<a href="${p.url}" class="${active === p.label ? 'active' : ''}">${p.label}</a>`
  ).join("");
  return `<div class="topbar">
    <div class="logo">TestManager</div>
    <nav>${links}</nav>
    <form class="search-box" action="/search" method="GET">
      <input type="text" name="q" placeholder="Search everything..." />
      <button type="submit">Search</button>
    </form>
  </div>`;
}

// ===== DASHBOARD =====
app.get("/", (req, res) => {
  let data = loadData();
  let tc = data.testCases, bugs = data.bugs, projects = data.projects;
  let total = tc.length;
  let pass = tc.filter(t => t.status === "Pass").length;
  let fail = tc.filter(t => t.status === "Fail").length;
  let blocked = tc.filter(t => t.status === "Blocked").length;
  let notRun = tc.filter(t => t.status === "Not Run").length;
  let openBugs = bugs.filter(b => b.status !== "Closed").length;
  let critBugs = bugs.filter(b => b.severity === "Critical" && b.status !== "Closed").length;
  let passRate = total > 0 ? Math.round((pass / total) * 100) : 0;
  let activeCycles = data.testCycles.filter(c => c.status === "Active").length;

  // Per-project breakdown
  let projStatsHTML = "";
  for (let p of projects) {
    let ptc = tc.filter(t => t.projectId === p.id);
    let pPass = ptc.filter(t => t.status === "Pass").length;
    let pFail = ptc.filter(t => t.status === "Fail").length;
    let pBlocked = ptc.filter(t => t.status === "Blocked").length;
    let pNotRun = ptc.filter(t => t.status === "Not Run").length;
    let pBugs = bugs.filter(b => b.projectId === p.id && b.status !== "Closed").length;
    let pRate = ptc.length > 0 ? Math.round((pPass / ptc.length) * 100) : 0;
    projStatsHTML += `<tr>
      <td><strong>${p.name}</strong></td>
      <td>${ptc.length}</td>
      <td style="color:#1abc9c">${pPass}</td>
      <td style="color:#e74c3c">${pFail}</td>
      <td style="color:#f39c12">${pBlocked}</td>
      <td style="color:#888">${pNotRun}</td>
      <td>${pBugs}</td>
      <td><div class="progress-bar" style="width:100px"><div class="progress-fill green" style="width:${pRate}%"></div></div><span style="font-size:11px;color:#888">${pRate}%</span></td>
    </tr>`;
  }

  // Bar chart data
  let barMax = Math.max(pass, fail, blocked, notRun, 1);
  function barH(v) { return Math.max(Math.round((v / barMax) * 80), 4); }

  // Recent history (last 8)
  let recentHistory = data.history.slice(0, 8);
  let histHTML = recentHistory.length === 0
    ? `<div class="empty-state">No activity yet</div>`
    : recentHistory.map(h => `<div class="history-item"><span>${h.action} <strong>${h.itemType}</strong>: ${h.itemTitle}</span><span class="time">${formatDate(h.timestamp)}</span></div>`).join("");

  // Team workload
  let teamLoadHTML = "";
  for (let m of data.team) {
    let mTc = tc.filter(t => t.assignedTo === m.id).length;
    let mBugs = bugs.filter(b => b.assignedTo === m.id && b.status !== "Closed").length;
    teamLoadHTML += `<tr><td>${m.name}</td><td><span class="badge badge-active">${m.role}</span></td><td>${mTc}</td><td>${mBugs}</td></tr>`;
  }

  res.send(`<!DOCTYPE html><html><head><title>Dashboard — TestManager</title>${getStyles()}</head><body>
    ${getNav("Dashboard")}
    <div class="container">
      <h1>Dashboard</h1>
      <div class="stats-grid">
        <div class="stat-card teal"><div class="stat-number">${total}</div><div class="stat-label">Total Test Cases</div>
          <div class="progress-bar"><div class="progress-fill green" style="width:${passRate}%"></div></div>
          <div class="stat-label" style="margin-top:3px">${passRate}% pass rate</div></div>
        <div class="stat-card amber"><div class="stat-number">${openBugs}</div><div class="stat-label">Open Bugs</div></div>
        <div class="stat-card red"><div class="stat-number">${critBugs}</div><div class="stat-label">Critical Bugs (Active)</div></div>
        <div class="stat-card purple"><div class="stat-number">${activeCycles}</div><div class="stat-label">Active Test Cycles</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <div class="card">
          <h2>Test Execution Summary</h2>
          <div class="bar-chart">
            <div class="bar" style="height:${barH(pass)}px;background:#1abc9c;">${pass}<br><span style="font-size:9px">Pass</span></div>
            <div class="bar" style="height:${barH(fail)}px;background:#e74c3c;">${fail}<br><span style="font-size:9px">Fail</span></div>
            <div class="bar" style="height:${barH(blocked)}px;background:#f39c12;">${blocked}<br><span style="font-size:9px">Blocked</span></div>
            <div class="bar" style="height:${barH(notRun)}px;background:#555;">${notRun}<br><span style="font-size:9px">Not Run</span></div>
          </div>
        </div>
        <div class="card"><h2>Recent Activity</h2>${histHTML}</div>
      </div>

      <div class="card">
        <h2>Project-wise Breakdown</h2>
        ${projects.length === 0 ? '<div class="empty-state">No projects yet</div>' :
        `<table><tr><th>Project</th><th>Total</th><th>Pass</th><th>Fail</th><th>Blocked</th><th>Not Run</th><th>Open Bugs</th><th>Pass Rate</th></tr>${projStatsHTML}</table>`}
      </div>

      <div class="card">
        <h2>Team Workload</h2>
        ${data.team.length === 0 ? '<div class="empty-state">No team members yet</div>' :
        `<table><tr><th>Name</th><th>Role</th><th>Test Cases</th><th>Open Bugs</th></tr>${teamLoadHTML}</table>`}
      </div>

      <div style="margin-top:14px;"><a href="/export/report" class="btn btn-primary">Export Full Report</a></div>
    </div></body></html>`);
});

// ===== SEARCH =====
app.get("/search", (req, res) => {
  let q = (req.query.q || "").trim().toLowerCase();
  let data = loadData();
  if (!q) return res.redirect("/");

  let tcResults = data.testCases.filter(t => t.title.toLowerCase().includes(q) || (t.steps || "").toLowerCase().includes(q));
  let bugResults = data.bugs.filter(b => b.title.toLowerCase().includes(q) || (b.stepsToReproduce || "").toLowerCase().includes(q));
  let teamResults = data.team.filter(m => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q));
  let projResults = data.projects.filter(p => p.name.toLowerCase().includes(q));
  let totalResults = tcResults.length + bugResults.length + teamResults.length + projResults.length;

  let resultsHTML = "";

  if (projResults.length > 0) {
    resultsHTML += `<div class="card"><h2>Projects (${projResults.length})</h2><table><tr><th>Name</th><th>Description</th></tr>`;
    for (let p of projResults) resultsHTML += `<tr><td><strong>${p.name}</strong></td><td>${p.description || "-"}</td></tr>`;
    resultsHTML += `</table></div>`;
  }
  if (tcResults.length > 0) {
    resultsHTML += `<div class="card"><h2>Test Cases (${tcResults.length})</h2><table><tr><th>ID</th><th>Title</th><th>Status</th></tr>`;
    for (let t of tcResults) resultsHTML += `<tr><td>TC-${t.id}</td><td><a href="/testcases/${t.id}">${t.title}</a></td><td><span class="badge badge-${t.status.toLowerCase().replace(" ","-")}">${t.status}</span></td></tr>`;
    resultsHTML += `</table></div>`;
  }
  if (bugResults.length > 0) {
    resultsHTML += `<div class="card"><h2>Bugs (${bugResults.length})</h2><table><tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th></tr>`;
    for (let b of bugResults) resultsHTML += `<tr><td>BUG-${b.id}</td><td><a href="/bugs/${b.id}">${b.title}</a></td><td><span class="badge badge-${b.severity.toLowerCase()}">${b.severity}</span></td><td><span class="badge badge-${b.status.toLowerCase().replace(" ","-")}">${b.status}</span></td></tr>`;
    resultsHTML += `</table></div>`;
  }
  if (teamResults.length > 0) {
    resultsHTML += `<div class="card"><h2>Team (${teamResults.length})</h2><table><tr><th>Name</th><th>Role</th></tr>`;
    for (let m of teamResults) resultsHTML += `<tr><td>${m.name}</td><td><span class="badge badge-active">${m.role}</span></td></tr>`;
    resultsHTML += `</table></div>`;
  }
  if (totalResults === 0) resultsHTML = `<div class="card"><div class="empty-state">No results found for "${req.query.q}"</div></div>`;

  res.send(`<!DOCTYPE html><html><head><title>Search — TestManager</title>${getStyles()}</head><body>
    ${getNav("")}
    <div class="container">
      <h1>Search results for "${req.query.q}" (${totalResults} found)</h1>
      ${resultsHTML}
    </div></body></html>`);
});

// ===== PROJECTS =====
app.get("/projects", (req, res) => {
  let data = loadData();
  let projectsHTML = "";
  if (data.projects.length === 0) { projectsHTML = `<div class="empty-state">No projects yet</div>`; }
  else {
    projectsHTML = `<table><tr><th>Name</th><th>Description</th><th>Tests</th><th>Open Bugs</th><th>Actions</th></tr>`;
    for (let p of data.projects) {
      let tcC = data.testCases.filter(t => t.projectId === p.id).length;
      let bugC = data.bugs.filter(b => b.projectId === p.id && b.status !== "Closed").length;
      projectsHTML += `<tr><td><strong>${p.name}</strong></td><td>${p.description || "-"}</td><td>${tcC}</td><td>${bugC}</td>
        <td><a href="/projects/edit/${p.id}" class="btn btn-small" style="background:#3498db;">Edit</a> <a href="/projects/delete/${p.id}" class="delete-link">Delete</a></td></tr>`;
    }
    projectsHTML += `</table>`;
  }
  res.send(`<!DOCTYPE html><html><head><title>Projects — TestManager</title>${getStyles()}</head><body>
    ${getNav("Projects")}
    <div class="container"><h1>Projects</h1>
      <div class="card"><h2>Create New Project</h2>
        <form action="/projects/add" method="POST"><div class="form-row">
          <div class="form-group"><label>Project Name</label><input type="text" name="name" placeholder="e.g. Payment Gateway v2.0" required /></div>
          <div class="form-group"><label>Description</label><input type="text" name="description" placeholder="Brief description..." /></div>
        </div><button type="submit" class="btn btn-primary">Create Project</button></form></div>
      <div class="card"><h2>All Projects</h2>${projectsHTML}</div>
    </div></body></html>`);
});
app.post("/projects/add", (req, res) => { let data = loadData(); if (req.body.name && req.body.name.trim()) { let p = { id: getNextId(data), name: req.body.name.trim(), description: (req.body.description || "").trim(), createdAt: new Date().toISOString() }; data.projects.push(p); addHistory(data, "Created", "Project", p.id, p.name); saveData(data); } res.redirect("/projects"); });
app.get("/projects/delete/:id", (req, res) => { let data = loadData(); let id = parseInt(req.params.id); let p = data.projects.find(x => x.id === id); if (p) addHistory(data, "Deleted", "Project", p.id, p.name); data.projects = data.projects.filter(x => x.id !== id); saveData(data); res.redirect("/projects"); });
app.get("/projects/edit/:id", (req, res) => {
  let data = loadData(); let p = data.projects.find(x => x.id === parseInt(req.params.id));
  if (!p) return res.redirect("/projects");
  res.send(`<!DOCTYPE html><html><head><title>Edit Project — TestManager</title>${getStyles()}</head><body>
    ${getNav("Projects")}
    <div class="container"><a href="/projects">← Back</a><h1>Edit Project: ${p.name}</h1>
      <div class="card"><form action="/projects/update/${p.id}" method="POST"><div class="form-row">
        <div class="form-group"><label>Project Name</label><input type="text" name="name" value="${p.name}" required /></div>
        <div class="form-group"><label>Description</label><input type="text" name="description" value="${p.description || ""}" /></div>
      </div><button type="submit" class="btn btn-primary">Save Changes</button></form></div>
    </div></body></html>`);
});
app.post("/projects/update/:id", (req, res) => { let data = loadData(); let p = data.projects.find(x => x.id === parseInt(req.params.id)); if (p) { p.name = req.body.name.trim(); p.description = (req.body.description || "").trim(); addHistory(data, "Updated", "Project", p.id, p.name); saveData(data); } res.redirect("/projects"); });

// ===== TEAM =====
app.get("/team", (req, res) => {
  let data = loadData();
  let teamHTML = "";
  if (data.team.length === 0) { teamHTML = `<div class="empty-state">No team members yet</div>`; }
  else {
    teamHTML = `<table><tr><th>Name</th><th>Role</th><th>Test Cases</th><th>Open Bugs</th><th>Actions</th></tr>`;
    for (let m of data.team) {
      let tcC = data.testCases.filter(t => t.assignedTo === m.id).length;
      let bugC = data.bugs.filter(b => b.assignedTo === m.id && b.status !== "Closed").length;
      teamHTML += `<tr><td><strong>${m.name}</strong></td><td><span class="badge badge-active">${m.role}</span></td><td>${tcC}</td><td>${bugC}</td>
        <td><a href="/team/edit/${m.id}" class="btn btn-small" style="background:#3498db;">Edit</a> <a href="/team/delete/${m.id}" class="delete-link">Delete</a></td></tr>`;
    }
    teamHTML += `</table>`;
  }
  res.send(`<!DOCTYPE html><html><head><title>Team — TestManager</title>${getStyles()}</head><body>
    ${getNav("Team")}
    <div class="container"><h1>Team Members</h1>
      <div class="card"><h2>Add Team Member</h2>
        <form action="/team/add" method="POST"><div class="form-row">
          <div class="form-group"><label>Name</label><input type="text" name="name" placeholder="e.g. Priya Sharma" required /></div>
          <div class="form-group"><label>Role</label><select name="role"><option>Tester</option><option>Test Lead</option><option>Developer</option><option>QA Manager</option></select></div>
        </div><button type="submit" class="btn btn-primary">Add Member</button></form></div>
      <div class="card"><h2>All Members</h2>${teamHTML}</div>
    </div></body></html>`);
});
app.post("/team/add", (req, res) => { let data = loadData(); if (req.body.name && req.body.name.trim()) { let m = { id: getNextId(data), name: req.body.name.trim(), role: req.body.role || "Tester" }; data.team.push(m); addHistory(data, "Added", "Team Member", m.id, m.name); saveData(data); } res.redirect("/team"); });
app.get("/team/delete/:id", (req, res) => { let data = loadData(); let m = data.team.find(x => x.id === parseInt(req.params.id)); if (m) addHistory(data, "Removed", "Team Member", m.id, m.name); data.team = data.team.filter(x => x.id !== parseInt(req.params.id)); saveData(data); res.redirect("/team"); });
app.get("/team/edit/:id", (req, res) => {
  let data = loadData(); let m = data.team.find(x => x.id === parseInt(req.params.id));
  if (!m) return res.redirect("/team");
  let roles = ["Tester", "Test Lead", "Developer", "QA Manager"];
  let roleOpts = roles.map(r => `<option ${m.role === r ? "selected" : ""}>${r}</option>`).join("");
  res.send(`<!DOCTYPE html><html><head><title>Edit Member — TestManager</title>${getStyles()}</head><body>
    ${getNav("Team")}
    <div class="container"><a href="/team">← Back</a><h1>Edit: ${m.name}</h1>
      <div class="card"><form action="/team/update/${m.id}" method="POST"><div class="form-row">
        <div class="form-group"><label>Name</label><input type="text" name="name" value="${m.name}" required /></div>
        <div class="form-group"><label>Role</label><select name="role">${roleOpts}</select></div>
      </div><button type="submit" class="btn btn-primary">Save</button></form></div>
    </div></body></html>`);
});
app.post("/team/update/:id", (req, res) => { let data = loadData(); let m = data.team.find(x => x.id === parseInt(req.params.id)); if (m) { m.name = req.body.name.trim(); m.role = req.body.role; addHistory(data, "Updated", "Team Member", m.id, m.name); saveData(data); } res.redirect("/team"); });

// ===== TEST CASES =====
app.get("/testcases", (req, res) => {
  let data = loadData();
  let fProj = req.query.project || "", fStatus = req.query.status || "";
  let filtered = data.testCases.slice();
  if (fProj) filtered = filtered.filter(t => t.projectId === parseInt(fProj));
  if (fStatus) filtered = filtered.filter(t => t.status === fStatus);
  let projOpts = data.projects.map(p => `<option value="${p.id}" ${fProj == p.id ? "selected" : ""}>${p.name}</option>`).join("");
  let statusOpts = ["Not Run","Pass","Fail","Blocked"].map(s => `<option ${fStatus === s ? "selected" : ""}>${s}</option>`).join("");
  let teamOpts = data.team.map(m => `<option value="${m.id}">${m.name}</option>`).join("");
  let projFormOpts = data.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join("");

  let tableHTML = "";
  if (filtered.length === 0) { tableHTML = `<div class="empty-state">No test cases found</div>`; }
  else {
    tableHTML = `<table><tr><th>ID</th><th>Title</th><th>Project</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Actions</th></tr>`;
    for (let tc of filtered.slice().reverse()) {
      let proj = data.projects.find(p => p.id === tc.projectId);
      let member = data.team.find(m => m.id === tc.assignedTo);
      tableHTML += `<tr><td>TC-${tc.id}</td><td><a href="/testcases/${tc.id}">${tc.title}</a></td>
        <td>${proj ? proj.name : "-"}</td><td><span class="badge badge-${tc.priority.toLowerCase()}">${tc.priority}</span></td>
        <td><span class="badge badge-${tc.status.toLowerCase().replace(" ","-")}">${tc.status}</span></td>
        <td>${member ? member.name : "-"}</td>
        <td><a href="/testcases/status/${tc.id}/Pass" class="btn btn-small" style="background:#1abc9c">Pass</a>
        <a href="/testcases/status/${tc.id}/Fail" class="btn btn-small" style="background:#e74c3c">Fail</a>
        <a href="/testcases/edit/${tc.id}" class="btn btn-small" style="background:#3498db">Edit</a>
        <a href="/testcases/delete/${tc.id}" class="delete-link" style="margin-left:6px">Del</a></td></tr>`;
    }
    tableHTML += `</table>`;
  }

  res.send(`<!DOCTYPE html><html><head><title>Test Cases — TestManager</title>${getStyles()}</head><body>
    ${getNav("Test Cases")}
    <div class="container"><h1>Test Cases</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="card"><h2>Create New Test Case</h2>
          <form action="/testcases/add" method="POST">
            <div class="form-row"><div class="form-group"><label>Title</label><input type="text" name="title" placeholder="e.g. Verify login with valid credentials" required /></div>
            <div class="form-group"><label>Project</label><select name="projectId" required><option value="">Select</option>${projFormOpts}</select></div></div>
            <div class="form-group"><label>Steps</label><textarea name="steps" placeholder="Step 1: Open login&#10;Step 2: Enter credentials&#10;Step 3: Click Login"></textarea></div>
            <div class="form-group"><label>Expected Result</label><textarea name="expectedResult" placeholder="User redirected to dashboard" style="min-height:50px"></textarea></div>
            <div class="form-row-3"><div class="form-group"><label>Priority</label><select name="priority"><option>High</option><option selected>Medium</option><option>Low</option></select></div>
            <div class="form-group"><label>Assign To</label><select name="assignedTo"><option value="">Unassigned</option>${teamOpts}</select></div>
            <div class="form-group"><label>&nbsp;</label><button type="submit" class="btn btn-primary" style="width:100%">Create</button></div></div>
          </form></div>
        <div class="card"><h2>Upload from Excel</h2>
          <div class="upload-area">
            <form action="/testcases/upload" method="POST" enctype="multipart/form-data">
              <p style="color:#888;margin-bottom:10px;font-size:13px">Upload an Excel file (.xlsx) with columns:</p>
              <p style="color:#e94560;font-size:12px;margin-bottom:14px"><strong>Title | Steps | Expected Result | Priority | Assigned To</strong></p>
              <div class="form-group"><label>Project for imported cases</label><select name="projectId" required><option value="">Select Project</option>${projFormOpts}</select></div>
              <div class="form-group"><input type="file" name="excelFile" accept=".xlsx,.xls" required style="padding:8px" /></div>
              <button type="submit" class="btn btn-primary">Upload &amp; Import</button>
            </form>
          </div>
          <a href="/testcases/template" class="btn btn-small" style="background:#333">Download Template</a>
        </div>
      </div>
      <div class="card">
        <div class="action-bar"><h2>All Test Cases (${filtered.length})</h2>
          <form method="GET" action="/testcases" style="display:flex;gap:8px">
            <select name="project" style="padding:5px 8px;background:#0f0f1a;border:1px solid #2a2a3e;border-radius:6px;color:#eee;font-size:12px"><option value="">All Projects</option>${projOpts}</select>
            <select name="status" style="padding:5px 8px;background:#0f0f1a;border:1px solid #2a2a3e;border-radius:6px;color:#eee;font-size:12px"><option value="">All Statuses</option>${statusOpts}</select>
            <button type="submit" class="btn btn-small btn-primary">Filter</button><a href="/testcases" class="btn btn-small" style="background:#333">Clear</a>
          </form></div>
        ${tableHTML}
      </div>
    </div></body></html>`);
});

// Test case detail
app.get("/testcases/:id", (req, res) => {
  let data = loadData(); let tc = data.testCases.find(t => t.id === parseInt(req.params.id));
  if (!tc) return res.redirect("/testcases");
  let proj = data.projects.find(p => p.id === tc.projectId);
  let member = data.team.find(m => m.id === tc.assignedTo);
  let stepsHTML = (tc.steps || "No steps").replace(/\n/g, "<br>");
  let expectedHTML = (tc.expectedResult || "Not specified").replace(/\n/g, "<br>");
  let execHistory = data.history.filter(h => h.itemType === "Test Case" && h.itemId === tc.id).slice(0, 10);
  let execHTML = execHistory.length === 0 ? `<div class="empty-state">No execution history</div>` :
    execHistory.map(h => `<div class="history-item"><span>${h.action} by <strong>${h.user}</strong></span><span class="time">${formatDate(h.timestamp)}</span></div>`).join("");

  res.send(`<!DOCTYPE html><html><head><title>TC-${tc.id} — TestManager</title>${getStyles()}</head><body>
    ${getNav("Test Cases")}
    <div class="container"><a href="/testcases">← Back to Test Cases</a>
      <div class="card" style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div><span style="color:#888;font-size:12px">TC-${tc.id}</span><h1 style="margin-bottom:3px">${tc.title}</h1></div>
          <span class="badge badge-${tc.status.toLowerCase().replace(" ","-")}" style="font-size:13px;padding:5px 14px">${tc.status}</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:16px">
          <div><span style="color:#888;font-size:11px">PROJECT</span><br><strong>${proj ? proj.name : "-"}</strong></div>
          <div><span style="color:#888;font-size:11px">PRIORITY</span><br><span class="badge badge-${tc.priority.toLowerCase()}">${tc.priority}</span></div>
          <div><span style="color:#888;font-size:11px">ASSIGNED TO</span><br><strong>${member ? member.name : "Unassigned"}</strong></div>
          <div><span style="color:#888;font-size:11px">CREATED</span><br>${formatDate(tc.createdAt)}</div>
        </div>
        <div style="margin-bottom:12px"><span style="color:#888;font-size:11px">STEPS TO EXECUTE</span>
          <div style="background:#0f0f1a;padding:12px;border-radius:8px;margin-top:5px;line-height:1.7;font-size:13px">${stepsHTML}</div></div>
        <div style="margin-bottom:16px"><span style="color:#888;font-size:11px">EXPECTED RESULT</span>
          <div style="background:#0f0f1a;padding:12px;border-radius:8px;margin-top:5px;line-height:1.7;font-size:13px">${expectedHTML}</div></div>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <a href="/testcases/status/${tc.id}/Pass" class="btn" style="background:#1abc9c">Pass</a>
          <a href="/testcases/status/${tc.id}/Fail" class="btn" style="background:#e74c3c">Fail</a>
          <a href="/testcases/status/${tc.id}/Blocked" class="btn" style="background:#f39c12">Blocked</a>
          <a href="/testcases/status/${tc.id}/Not Run" class="btn" style="background:#555">Reset</a>
          <a href="/testcases/edit/${tc.id}" class="btn" style="background:#3498db">Edit</a></div>
      </div>
      <div class="card"><h2>Execution History</h2>${execHTML}</div>
    </div></body></html>`);
});

// Test case add
app.post("/testcases/add", (req, res) => {
  let data = loadData();
  if (req.body.title && req.body.title.trim()) {
    let tc = { id: getNextId(data), title: req.body.title.trim(), projectId: parseInt(req.body.projectId) || 0,
      steps: (req.body.steps || "").trim(), expectedResult: (req.body.expectedResult || "").trim(),
      priority: req.body.priority || "Medium", status: "Not Run",
      assignedTo: req.body.assignedTo ? parseInt(req.body.assignedTo) : null, createdAt: new Date().toISOString() };
    data.testCases.push(tc); addHistory(data, "Created", "Test Case", tc.id, tc.title); saveData(data);
  } res.redirect("/testcases");
});

// Test case edit
app.get("/testcases/edit/:id", (req, res) => {
  let data = loadData(); let tc = data.testCases.find(t => t.id === parseInt(req.params.id));
  if (!tc) return res.redirect("/testcases");
  let projOpts = data.projects.map(p => `<option value="${p.id}" ${tc.projectId === p.id ? "selected" : ""}>${p.name}</option>`).join("");
  let teamOpts = data.team.map(m => `<option value="${m.id}" ${tc.assignedTo === m.id ? "selected" : ""}>${m.name}</option>`).join("");
  let priorities = ["High","Medium","Low"];
  let priOpts = priorities.map(p => `<option ${tc.priority === p ? "selected" : ""}>${p}</option>`).join("");
  res.send(`<!DOCTYPE html><html><head><title>Edit TC-${tc.id} — TestManager</title>${getStyles()}</head><body>
    ${getNav("Test Cases")}
    <div class="container"><a href="/testcases/${tc.id}">← Back</a><h1>Edit: TC-${tc.id} — ${tc.title}</h1>
      <div class="card"><form action="/testcases/update/${tc.id}" method="POST">
        <div class="form-row"><div class="form-group"><label>Title</label><input type="text" name="title" value="${tc.title}" required /></div>
        <div class="form-group"><label>Project</label><select name="projectId"><option value="">Select</option>${projOpts}</select></div></div>
        <div class="form-group"><label>Steps</label><textarea name="steps">${tc.steps || ""}</textarea></div>
        <div class="form-group"><label>Expected Result</label><textarea name="expectedResult" style="min-height:50px">${tc.expectedResult || ""}</textarea></div>
        <div class="form-row-3"><div class="form-group"><label>Priority</label><select name="priority">${priOpts}</select></div>
        <div class="form-group"><label>Assign To</label><select name="assignedTo"><option value="">Unassigned</option>${teamOpts}</select></div>
        <div class="form-group"><label>&nbsp;</label><button type="submit" class="btn btn-primary" style="width:100%">Save Changes</button></div></div>
      </form></div></div></body></html>`);
});
app.post("/testcases/update/:id", (req, res) => {
  let data = loadData(); let tc = data.testCases.find(t => t.id === parseInt(req.params.id));
  if (tc) { tc.title = req.body.title.trim(); tc.projectId = parseInt(req.body.projectId) || 0;
    tc.steps = (req.body.steps || "").trim(); tc.expectedResult = (req.body.expectedResult || "").trim();
    tc.priority = req.body.priority; tc.assignedTo = req.body.assignedTo ? parseInt(req.body.assignedTo) : null;
    addHistory(data, "Updated", "Test Case", tc.id, tc.title); saveData(data); }
  res.redirect("/testcases/" + req.params.id);
});

app.get("/testcases/status/:id/:status", (req, res) => {
  let data = loadData(); let tc = data.testCases.find(t => t.id === parseInt(req.params.id));
  if (tc) { let oldStatus = tc.status; tc.status = req.params.status;
    let member = data.team.find(m => m.id === tc.assignedTo);
    addHistory(data, `Marked ${req.params.status} (was ${oldStatus})`, "Test Case", tc.id, tc.title, member ? member.name : "Unknown");
    saveData(data); }
  let ref = req.headers.referer || "/testcases"; res.redirect(ref);
});
app.get("/testcases/delete/:id", (req, res) => { let data = loadData(); let tc = data.testCases.find(t => t.id === parseInt(req.params.id)); if (tc) addHistory(data, "Deleted", "Test Case", tc.id, tc.title); data.testCases = data.testCases.filter(t => t.id !== parseInt(req.params.id)); saveData(data); res.redirect("/testcases"); });

// ===== EXCEL UPLOAD =====
app.post("/testcases/upload", upload.single("excelFile"), (req, res) => {
  let data = loadData();
  let projectId = parseInt(req.body.projectId) || 0;
  let count = 0;
  try {
    let workbook = XLSX.readFile(req.file.path);
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    let rows = XLSX.utils.sheet_to_json(sheet);
    for (let row of rows) {
      let title = row["Title"] || row["title"] || "";
      if (title.trim() === "") continue;
      let assignedName = row["Assigned To"] || row["assigned to"] || "";
      let member = data.team.find(m => m.name.toLowerCase() === assignedName.toLowerCase().trim());
      data.testCases.push({
        id: getNextId(data), title: title.trim(), projectId,
        steps: (row["Steps"] || row["steps"] || "").trim(),
        expectedResult: (row["Expected Result"] || row["expected result"] || "").trim(),
        priority: row["Priority"] || row["priority"] || "Medium", status: "Not Run",
        assignedTo: member ? member.id : null, createdAt: new Date().toISOString()
      });
      count++;
    }
    addHistory(data, `Imported ${count} test cases from Excel`, "Test Case", 0, `Bulk Upload`);
    saveData(data);
  } catch (err) { console.log("Excel parse error:", err); }
  try { fs.unlinkSync(req.file.path); } catch (e) {}
  res.redirect("/testcases");
});

// Download Excel template
app.get("/testcases/template", (req, res) => {
  let wb = XLSX.utils.book_new();
  let ws = XLSX.utils.aoa_to_sheet([
    ["Title", "Steps", "Expected Result", "Priority", "Assigned To"],
    ["Verify login with valid credentials", "Step 1: Open login page\nStep 2: Enter valid username\nStep 3: Enter valid password\nStep 4: Click Login", "User is redirected to dashboard", "High", ""],
    ["Verify login with invalid password", "Step 1: Open login page\nStep 2: Enter valid username\nStep 3: Enter wrong password\nStep 4: Click Login", "Error message displayed", "High", ""],
  ]);
  ws["!cols"] = [{ wch: 40 }, { wch: 50 }, { wch: 40 }, { wch: 10 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, "Test Cases");
  let buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", "attachment; filename=test-case-template.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
});

// ===== TEST CYCLES =====
app.get("/cycles", (req, res) => {
  let data = loadData();
  let cyclesHTML = "";
  if (data.testCycles.length === 0) { cyclesHTML = `<div class="empty-state">No test cycles yet. Create your first cycle!</div>`; }
  else {
    cyclesHTML = `<table><tr><th>Name</th><th>Project</th><th>Status</th><th>Test Cases</th><th>Progress</th><th>Actions</th></tr>`;
    for (let c of data.testCycles.slice().reverse()) {
      let proj = data.projects.find(p => p.id === c.projectId);
      let tcIds = c.testCaseIds || [];
      let cycleTCs = data.testCases.filter(t => tcIds.includes(t.id));
      let done = cycleTCs.filter(t => t.status === "Pass" || t.status === "Fail").length;
      let pct = tcIds.length > 0 ? Math.round((done / tcIds.length) * 100) : 0;
      cyclesHTML += `<tr><td><a href="/cycles/${c.id}"><strong>${c.name}</strong></a></td>
        <td>${proj ? proj.name : "-"}</td>
        <td><span class="badge badge-${c.status.toLowerCase()}">${c.status}</span></td>
        <td>${tcIds.length}</td>
        <td><div class="progress-bar" style="width:80px"><div class="progress-fill green" style="width:${pct}%"></div></div><span style="font-size:11px;color:#888">${pct}%</span></td>
        <td><a href="/cycles/delete/${c.id}" class="delete-link">Delete</a></td></tr>`;
    }
    cyclesHTML += `</table>`;
  }
  let projOpts = data.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join("");

  res.send(`<!DOCTYPE html><html><head><title>Test Cycles — TestManager</title>${getStyles()}</head><body>
    ${getNav("Test Cycles")}
    <div class="container"><h1>Test Cycles</h1>
      <div class="card"><h2>Create New Cycle</h2>
        <form action="/cycles/add" method="POST">
          <div class="form-row-3">
            <div class="form-group"><label>Cycle Name</label><input type="text" name="name" placeholder="e.g. Regression — Sprint 14" required /></div>
            <div class="form-group"><label>Project</label><select name="projectId" required><option value="">Select</option>${projOpts}</select></div>
            <div class="form-group"><label>&nbsp;</label><button type="submit" class="btn btn-primary" style="width:100%">Create Cycle</button></div>
          </div>
        </form></div>
      <div class="card"><h2>All Cycles</h2>${cyclesHTML}</div>
    </div></body></html>`);
});

app.post("/cycles/add", (req, res) => {
  let data = loadData();
  if (req.body.name && req.body.name.trim()) {
    let projId = parseInt(req.body.projectId) || 0;
    let tcIds = data.testCases.filter(t => t.projectId === projId).map(t => t.id);
    let c = { id: getNextId(data), name: req.body.name.trim(), projectId: projId, status: "Active", testCaseIds: tcIds, createdAt: new Date().toISOString() };
    data.testCycles.push(c); addHistory(data, "Created", "Test Cycle", c.id, c.name + ` (${tcIds.length} cases)`); saveData(data);
  } res.redirect("/cycles");
});

app.get("/cycles/:id", (req, res) => {
  let data = loadData(); let c = data.testCycles.find(x => x.id === parseInt(req.params.id));
  if (!c) return res.redirect("/cycles");
  let proj = data.projects.find(p => p.id === c.projectId);
  let cycleTCs = data.testCases.filter(t => (c.testCaseIds || []).includes(t.id));
  let pass = cycleTCs.filter(t => t.status === "Pass").length;
  let fail = cycleTCs.filter(t => t.status === "Fail").length;
  let blocked = cycleTCs.filter(t => t.status === "Blocked").length;
  let notRun = cycleTCs.filter(t => t.status === "Not Run").length;
  let pct = cycleTCs.length > 0 ? Math.round((pass / cycleTCs.length) * 100) : 0;

  let tcHTML = cycleTCs.length === 0 ? `<div class="empty-state">No test cases in this cycle</div>` :
    `<table><tr><th>ID</th><th>Title</th><th>Status</th><th>Assigned</th><th>Actions</th></tr>` +
    cycleTCs.map(tc => {
      let m = data.team.find(x => x.id === tc.assignedTo);
      return `<tr><td>TC-${tc.id}</td><td><a href="/testcases/${tc.id}">${tc.title}</a></td>
        <td><span class="badge badge-${tc.status.toLowerCase().replace(" ","-")}">${tc.status}</span></td>
        <td>${m ? m.name : "-"}</td>
        <td><a href="/testcases/status/${tc.id}/Pass" class="btn btn-small" style="background:#1abc9c">Pass</a>
        <a href="/testcases/status/${tc.id}/Fail" class="btn btn-small" style="background:#e74c3c">Fail</a>
        <a href="/testcases/status/${tc.id}/Blocked" class="btn btn-small" style="background:#f39c12">Block</a></td></tr>`;
    }).join("") + `</table>`;

  res.send(`<!DOCTYPE html><html><head><title>${c.name} — TestManager</title>${getStyles()}</head><body>
    ${getNav("Test Cycles")}
    <div class="container"><a href="/cycles">← Back to Cycles</a>
      <div class="card" style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;align-items:center"><h1>${c.name}</h1>
          <span class="badge badge-${c.status.toLowerCase()}" style="font-size:13px;padding:5px 14px">${c.status}</span></div>
        <p style="color:#888;margin-bottom:14px">Project: <strong>${proj ? proj.name : "-"}</strong> | Created: ${formatDate(c.createdAt)}</p>
        <div class="stats-grid" style="grid-template-columns:repeat(5,1fr)">
          <div class="stat-card teal"><div class="stat-number">${cycleTCs.length}</div><div class="stat-label">Total</div></div>
          <div class="stat-card green"><div class="stat-number">${pass}</div><div class="stat-label">Pass</div></div>
          <div class="stat-card red"><div class="stat-number">${fail}</div><div class="stat-label">Fail</div></div>
          <div class="stat-card amber"><div class="stat-number">${blocked}</div><div class="stat-label">Blocked</div></div>
          <div class="stat-card blue"><div class="stat-number">${pct}%</div><div class="stat-label">Pass Rate</div></div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <a href="/cycles/status/${c.id}/Active" class="btn btn-small" style="background:#1abc9c">Active</a>
          <a href="/cycles/status/${c.id}/Completed" class="btn btn-small" style="background:#3498db">Complete</a>
          <a href="/cycles/status/${c.id}/Planned" class="btn btn-small" style="background:#555">Planned</a>
        </div>
      </div>
      <div class="card"><h2>Test Cases in this Cycle</h2>${tcHTML}</div>
    </div></body></html>`);
});

app.get("/cycles/status/:id/:status", (req, res) => { let data = loadData(); let c = data.testCycles.find(x => x.id === parseInt(req.params.id)); if (c) { c.status = req.params.status; addHistory(data, `Marked ${req.params.status}`, "Test Cycle", c.id, c.name); saveData(data); } res.redirect("/cycles/" + req.params.id); });
app.get("/cycles/delete/:id", (req, res) => { let data = loadData(); let c = data.testCycles.find(x => x.id === parseInt(req.params.id)); if (c) addHistory(data, "Deleted", "Test Cycle", c.id, c.name); data.testCycles = data.testCycles.filter(x => x.id !== parseInt(req.params.id)); saveData(data); res.redirect("/cycles"); });

// ===== BUGS =====
app.get("/bugs", (req, res) => {
  let data = loadData();
  let fStatus = req.query.status || "", fSev = req.query.severity || "";
  let filtered = data.bugs.slice();
  if (fStatus) filtered = filtered.filter(b => b.status === fStatus);
  if (fSev) filtered = filtered.filter(b => b.severity === fSev);
  let teamOpts = data.team.map(m => `<option value="${m.id}">${m.name}</option>`).join("");
  let projOpts = data.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join("");

  let tableHTML = "";
  if (filtered.length === 0) { tableHTML = `<div class="empty-state">No bugs found</div>`; }
  else {
    tableHTML = `<table><tr><th>ID</th><th>Title</th><th>Project</th><th>Severity</th><th>Status</th><th>Assigned</th><th>Actions</th></tr>`;
    for (let bug of filtered.slice().reverse()) {
      let proj = data.projects.find(p => p.id === bug.projectId);
      let m = data.team.find(x => x.id === bug.assignedTo);
      tableHTML += `<tr><td>BUG-${bug.id}</td><td><a href="/bugs/${bug.id}">${bug.title}</a></td>
        <td>${proj ? proj.name : "-"}</td><td><span class="badge badge-${bug.severity.toLowerCase()}">${bug.severity}</span></td>
        <td><span class="badge badge-${bug.status.toLowerCase().replace(" ","-")}">${bug.status}</span></td>
        <td>${m ? m.name : "-"}</td>
        <td><a href="/bugs/status/${bug.id}/Closed" class="btn btn-small" style="background:#1abc9c">Close</a>
        <a href="/bugs/edit/${bug.id}" class="btn btn-small" style="background:#3498db">Edit</a>
        <a href="/bugs/delete/${bug.id}" class="delete-link" style="margin-left:6px">Del</a></td></tr>`;
    }
    tableHTML += `</table>`;
  }

  res.send(`<!DOCTYPE html><html><head><title>Bugs — TestManager</title>${getStyles()}</head><body>
    ${getNav("Bugs")}
    <div class="container"><h1>Bug Tracker</h1>
      <div class="card"><h2>Report New Bug</h2>
        <form action="/bugs/add" method="POST">
          <div class="form-row"><div class="form-group"><label>Title</label><input type="text" name="title" placeholder="e.g. Login button not responding" required /></div>
          <div class="form-group"><label>Project</label><select name="projectId"><option value="">Select</option>${projOpts}</select></div></div>
          <div class="form-group"><label>Steps to Reproduce</label><textarea name="stepsToReproduce" placeholder="Step 1: Open app&#10;Step 2: Tap login"></textarea></div>
          <div class="form-row-3"><div class="form-group"><label>Severity</label><select name="severity"><option>Critical</option><option>High</option><option selected>Medium</option><option>Low</option></select></div>
          <div class="form-group"><label>Assign To</label><select name="assignedTo"><option value="">Unassigned</option>${teamOpts}</select></div>
          <div class="form-group"><label>&nbsp;</label><button type="submit" class="btn btn-primary" style="width:100%">Report Bug</button></div></div>
        </form></div>
      <div class="card">
        <div class="action-bar"><h2>All Bugs (${filtered.length})</h2>
          <form method="GET" action="/bugs" style="display:flex;gap:8px">
            <select name="severity" style="padding:5px 8px;background:#0f0f1a;border:1px solid #2a2a3e;border-radius:6px;color:#eee;font-size:12px"><option value="">All Severities</option>
              <option ${fSev==="Critical"?"selected":""}>Critical</option><option ${fSev==="High"?"selected":""}>High</option><option ${fSev==="Medium"?"selected":""}>Medium</option><option ${fSev==="Low"?"selected":""}>Low</option></select>
            <select name="status" style="padding:5px 8px;background:#0f0f1a;border:1px solid #2a2a3e;border-radius:6px;color:#eee;font-size:12px"><option value="">All Statuses</option>
              <option ${fStatus==="Open"?"selected":""}>Open</option><option ${fStatus==="In Progress"?"selected":""}>In Progress</option><option ${fStatus==="Closed"?"selected":""}>Closed</option></select>
            <button type="submit" class="btn btn-small btn-primary">Filter</button><a href="/bugs" class="btn btn-small" style="background:#333">Clear</a>
          </form></div>
        ${tableHTML}</div>
    </div></body></html>`);
});

app.get("/bugs/:id", (req, res) => {
  let data = loadData(); let bug = data.bugs.find(b => b.id === parseInt(req.params.id));
  if (!bug) return res.redirect("/bugs");
  let proj = data.projects.find(p => p.id === bug.projectId);
  let m = data.team.find(x => x.id === bug.assignedTo);
  let stepsHTML = (bug.stepsToReproduce || "No steps").replace(/\n/g, "<br>");
  let execHistory = data.history.filter(h => h.itemType === "Bug" && h.itemId === bug.id).slice(0, 10);
  let execHTML = execHistory.length === 0 ? `<div class="empty-state">No history</div>` :
    execHistory.map(h => `<div class="history-item"><span>${h.action} by <strong>${h.user}</strong></span><span class="time">${formatDate(h.timestamp)}</span></div>`).join("");

  res.send(`<!DOCTYPE html><html><head><title>BUG-${bug.id} — TestManager</title>${getStyles()}</head><body>
    ${getNav("Bugs")}
    <div class="container"><a href="/bugs">← Back to Bugs</a>
      <div class="card" style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div><span style="color:#888;font-size:12px">BUG-${bug.id}</span><h1 style="margin-bottom:3px">${bug.title}</h1></div>
          <span class="badge badge-${bug.status.toLowerCase().replace(" ","-")}" style="font-size:13px;padding:5px 14px">${bug.status}</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:16px">
          <div><span style="color:#888;font-size:11px">PROJECT</span><br><strong>${proj ? proj.name : "-"}</strong></div>
          <div><span style="color:#888;font-size:11px">SEVERITY</span><br><span class="badge badge-${bug.severity.toLowerCase()}">${bug.severity}</span></div>
          <div><span style="color:#888;font-size:11px">ASSIGNED TO</span><br><strong>${m ? m.name : "Unassigned"}</strong></div>
          <div><span style="color:#888;font-size:11px">REPORTED</span><br>${formatDate(bug.createdAt)}</div>
        </div>
        <div style="margin-bottom:16px"><span style="color:#888;font-size:11px">STEPS TO REPRODUCE</span>
          <div style="background:#0f0f1a;padding:12px;border-radius:8px;margin-top:5px;line-height:1.7;font-size:13px">${stepsHTML}</div></div>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <a href="/bugs/status/${bug.id}/Open" class="btn" style="background:#e74c3c">Open</a>
          <a href="/bugs/status/${bug.id}/In Progress" class="btn" style="background:#3498db">In Progress</a>
          <a href="/bugs/status/${bug.id}/Closed" class="btn" style="background:#1abc9c">Close</a>
          <a href="/bugs/edit/${bug.id}" class="btn" style="background:#3498db">Edit</a></div>
      </div>
      <div class="card"><h2>Bug History</h2>${execHTML}</div>
    </div></body></html>`);
});

app.post("/bugs/add", (req, res) => { let data = loadData(); if (req.body.title && req.body.title.trim()) { let b = { id: getNextId(data), title: req.body.title.trim(), projectId: parseInt(req.body.projectId) || 0, stepsToReproduce: (req.body.stepsToReproduce || "").trim(), severity: req.body.severity || "Medium", status: "Open", assignedTo: req.body.assignedTo ? parseInt(req.body.assignedTo) : null, createdAt: new Date().toISOString() }; data.bugs.push(b); addHistory(data, "Reported", "Bug", b.id, b.title); saveData(data); } res.redirect("/bugs"); });
app.get("/bugs/status/:id/:status", (req, res) => { let data = loadData(); let b = data.bugs.find(x => x.id === parseInt(req.params.id)); if (b) { b.status = req.params.status; addHistory(data, `Marked ${req.params.status}`, "Bug", b.id, b.title); saveData(data); } let ref = req.headers.referer || "/bugs"; res.redirect(ref); });
app.get("/bugs/delete/:id", (req, res) => { let data = loadData(); let b = data.bugs.find(x => x.id === parseInt(req.params.id)); if (b) addHistory(data, "Deleted", "Bug", b.id, b.title); data.bugs = data.bugs.filter(x => x.id !== parseInt(req.params.id)); saveData(data); res.redirect("/bugs"); });
app.get("/bugs/edit/:id", (req, res) => {
  let data = loadData(); let bug = data.bugs.find(b => b.id === parseInt(req.params.id));
  if (!bug) return res.redirect("/bugs");
  let projOpts = data.projects.map(p => `<option value="${p.id}" ${bug.projectId === p.id ? "selected" : ""}>${p.name}</option>`).join("");
  let teamOpts = data.team.map(m => `<option value="${m.id}" ${bug.assignedTo === m.id ? "selected" : ""}>${m.name}</option>`).join("");
  let sevs = ["Critical","High","Medium","Low"];
  let sevOpts = sevs.map(s => `<option ${bug.severity === s ? "selected" : ""}>${s}</option>`).join("");
  res.send(`<!DOCTYPE html><html><head><title>Edit BUG-${bug.id} — TestManager</title>${getStyles()}</head><body>
    ${getNav("Bugs")}
    <div class="container"><a href="/bugs/${bug.id}">← Back</a><h1>Edit: BUG-${bug.id} — ${bug.title}</h1>
      <div class="card"><form action="/bugs/update/${bug.id}" method="POST">
        <div class="form-row"><div class="form-group"><label>Title</label><input type="text" name="title" value="${bug.title}" required /></div>
        <div class="form-group"><label>Project</label><select name="projectId"><option value="">Select</option>${projOpts}</select></div></div>
        <div class="form-group"><label>Steps to Reproduce</label><textarea name="stepsToReproduce">${bug.stepsToReproduce || ""}</textarea></div>
        <div class="form-row-3"><div class="form-group"><label>Severity</label><select name="severity">${sevOpts}</select></div>
        <div class="form-group"><label>Assign To</label><select name="assignedTo"><option value="">Unassigned</option>${teamOpts}</select></div>
        <div class="form-group"><label>&nbsp;</label><button type="submit" class="btn btn-primary" style="width:100%">Save</button></div></div>
      </form></div></div></body></html>`);
});
app.post("/bugs/update/:id", (req, res) => { let data = loadData(); let b = data.bugs.find(x => x.id === parseInt(req.params.id)); if (b) { b.title = req.body.title.trim(); b.projectId = parseInt(req.body.projectId) || 0; b.stepsToReproduce = (req.body.stepsToReproduce || "").trim(); b.severity = req.body.severity; b.assignedTo = req.body.assignedTo ? parseInt(req.body.assignedTo) : null; addHistory(data, "Updated", "Bug", b.id, b.title); saveData(data); } res.redirect("/bugs/" + req.params.id); });

// ===== HISTORY =====
app.get("/history", (req, res) => {
  let data = loadData();
  let histHTML = data.history.length === 0 ? `<div class="empty-state">No activity yet</div>` :
    `<table><tr><th>Action</th><th>Type</th><th>Item</th><th>User</th><th>Time</th></tr>` +
    data.history.slice(0, 100).map(h => `<tr><td>${h.action}</td><td><span class="badge badge-active">${h.itemType}</span></td><td>${h.itemTitle}</td><td>${h.user}</td><td style="color:#888;font-size:12px">${formatDate(h.timestamp)}</td></tr>`).join("") + `</table>`;
  res.send(`<!DOCTYPE html><html><head><title>History — TestManager</title>${getStyles()}</head><body>
    ${getNav("History")}
    <div class="container"><h1>Activity History</h1><div class="card">${histHTML}</div></div></body></html>`);
});

// ===== EXPORT REPORT =====
app.get("/export/report", (req, res) => {
  let data = loadData();
  let tc = data.testCases, bugs = data.bugs;
  let pass = tc.filter(t => t.status === "Pass").length;
  let fail = tc.filter(t => t.status === "Fail").length;
  let blocked = tc.filter(t => t.status === "Blocked").length;
  let notRun = tc.filter(t => t.status === "Not Run").length;
  let passRate = tc.length > 0 ? Math.round((pass / tc.length) * 100) : 0;

  let tcRows = tc.map(t => {
    let proj = data.projects.find(p => p.id === t.projectId);
    let m = data.team.find(x => x.id === t.assignedTo);
    return `<tr><td>TC-${t.id}</td><td>${t.title}</td><td>${proj ? proj.name : "-"}</td><td>${t.priority}</td><td>${t.status}</td><td>${m ? m.name : "-"}</td></tr>`;
  }).join("");

  let bugRows = bugs.map(b => {
    let proj = data.projects.find(p => p.id === b.projectId);
    let m = data.team.find(x => x.id === b.assignedTo);
    return `<tr><td>BUG-${b.id}</td><td>${b.title}</td><td>${proj ? proj.name : "-"}</td><td>${b.severity}</td><td>${b.status}</td><td>${m ? m.name : "-"}</td></tr>`;
  }).join("");

  let html = `<!DOCTYPE html><html><head><title>Test Report</title>
    <style>body{font-family:Arial,sans-serif;padding:30px;max-width:900px;margin:auto}
    table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px 12px;border:1px solid #ddd;font-size:13px;text-align:left}
    th{background:#f5f5f5}h1{color:#e94560}h2{color:#333;margin-top:24px}.summary{display:flex;gap:20px;margin:16px 0}
    .sum-card{padding:16px;background:#f9f9f9;border-radius:8px;text-align:center;flex:1}
    .sum-card .num{font-size:28px;font-weight:bold}.sum-card .lbl{font-size:12px;color:#888}</style></head>
    <body><h1>Test Execution Report</h1>
    <p>Generated: ${new Date().toLocaleString("en-IN")}</p>
    <div class="summary">
      <div class="sum-card"><div class="num">${tc.length}</div><div class="lbl">Total Tests</div></div>
      <div class="sum-card"><div class="num" style="color:#1abc9c">${pass}</div><div class="lbl">Passed</div></div>
      <div class="sum-card"><div class="num" style="color:#e74c3c">${fail}</div><div class="lbl">Failed</div></div>
      <div class="sum-card"><div class="num" style="color:#f39c12">${blocked}</div><div class="lbl">Blocked</div></div>
      <div class="sum-card"><div class="num">${passRate}%</div><div class="lbl">Pass Rate</div></div>
    </div>
    <h2>Test Cases</h2><table><tr><th>ID</th><th>Title</th><th>Project</th><th>Priority</th><th>Status</th><th>Assigned</th></tr>${tcRows}</table>
    <h2>Bugs (${bugs.length} total, ${bugs.filter(b => b.status !== "Closed").length} open)</h2>
    <table><tr><th>ID</th><th>Title</th><th>Project</th><th>Severity</th><th>Status</th><th>Assigned</th></tr>${bugRows}</table>
    </body></html>`;
  res.setHeader("Content-Disposition", "attachment; filename=test-report.html");
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`TestManager Phase 2 running at http://localhost:${PORT}`); });