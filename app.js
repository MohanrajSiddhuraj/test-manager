const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Welcome to my Express app!");
});

app.get("/about", (req, res) => {
  res.send("This is the About page. I built this with Node.js and Express!");
});

app.get("/hello/:name", (req, res) => {
  res.send("Hello, " + req.params.name + "! Nice to meet you!");
});

app.listen(3000, () => {
  console.log("Express server running at http://localhost:3000");
});