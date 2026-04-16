// ===== COMPLETE TO-DO WEB APP =====
// Save this as "todo-app.js" in your project folder
// Run: node todo-app.js
// Visit: http://localhost:3000

const express = require("express");
const app = express();

// This lets Express understand form data sent from the browser
app.use(express.urlencoded({ extended: true }));

// Our "database" — just an array stored in memory for now
let todos = [
  { id: 1, task: "Learn Node.js", done: false },
  { id: 2, task: "Build my first app", done: false }
];
let nextId = 3;

// ===== HOME PAGE — Shows all todos =====
app.get("/", (req, res) => {
  // Build the HTML for each todo item
  let todoListHTML = "";

  for (let i = 0; i < todos.length; i++) {
    let todo = todos[i];
    let strikethrough = todo.done ? "text-decoration: line-through; color: #888;" : "";

    todoListHTML += `
      <div style="display: flex; align-items: center; gap: 10px; padding: 10px;
                  background: #f9f9f9; margin: 5px 0; border-radius: 8px;">

        <a href="/toggle/${todo.id}"
           style="text-decoration: none; font-size: 20px; cursor: pointer;">
           ${todo.done ? "✅" : "⬜"}
        </a>

        <span style="flex: 1; font-size: 16px; ${strikethrough}">
          ${todo.task}
        </span>

        <a href="/delete/${todo.id}"
           style="color: red; text-decoration: none; font-size: 18px;">
           ❌
        </a>
      </div>
    `;
  }

  // If there are no todos, show a friendly message
  if (todos.length === 0) {
    todoListHTML = `<p style="text-align: center; color: #888;">
                      No tasks yet! Add one above.</p>`;
  }

  // Count completed tasks
  let doneCount = todos.filter(t => t.done).length;

  // Send the full HTML page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>My To-Do App</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 500px;
                 margin: 40px auto; padding: 20px;">

      <h1 style="text-align: center;">📝 My To-Do List</h1>

      <p style="text-align: center; color: #666;">
        ${doneCount} of ${todos.length} tasks completed
      </p>

      <!-- Form to add a new task -->
      <form action="/add" method="POST"
            style="display: flex; gap: 10px; margin-bottom: 20px;">
        <input type="text" name="task" placeholder="Enter a new task..."
               required
               style="flex: 1; padding: 10px; font-size: 16px;
                      border: 2px solid #ddd; border-radius: 8px;" />
        <button type="submit"
                style="padding: 10px 20px; font-size: 16px;
                       background: #4CAF50; color: white; border: none;
                       border-radius: 8px; cursor: pointer;">
          Add
        </button>
      </form>

      <!-- The list of todos -->
      ${todoListHTML}

      <hr style="margin-top: 30px; border: 1px solid #eee;" />
      <p style="text-align: center; font-size: 12px; color: #aaa;">
        Built with Node.js + Express | By Mohan
      </p>
    </body>
    </html>
  `);
});

// ===== ADD a new task =====
app.post("/add", (req, res) => {
  let newTask = req.body.task; // Gets the text from the form input

  if (newTask && newTask.trim() !== "") {
    todos.push({
      id: nextId,
      task: newTask.trim(),
      done: false
    });
    nextId++;
  }

  res.redirect("/"); // Go back to the home page
});

// ===== TOGGLE a task (mark done/undone) =====
app.get("/toggle/:id", (req, res) => {
  let id = parseInt(req.params.id);

  for (let i = 0; i < todos.length; i++) {
    if (todos[i].id === id) {
      todos[i].done = !todos[i].done; // Flip true to false, or false to true
      break;
    }
  }

  res.redirect("/");
});

// ===== DELETE a task =====
app.get("/delete/:id", (req, res) => {
  let id = parseInt(req.params.id);
  todos = todos.filter(t => t.id !== id); // Keep everything except the deleted one
  res.redirect("/");
});

// ===== START the server =====
app.listen(3000, () => {
  console.log("To-Do app running at http://localhost:3000");
});