const express = require("express");
const session = require("express-session");
const pgPromise = require("pg-promise");
const dbPassword = process.env.DATABASE_PASSWORD;

// Database connection configuration
const pgp = pgPromise();
const dbConfig = {
  host: "localhost",
  port: 5432,
  database: "template1", // Replace with your PostgreSQL database name
  user: "", // Replace with your PostgreSQL username
  password: dbPassword, // Replace with your PostgreSQL password
};
const db = pgp(dbConfig);

// Create the users table if it doesn't exist
db.none(
  `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT,
    password TEXT
  )
`
)
  .then(() => console.log("PostgreSQL table created"))
  .catch((err) => console.log(err));

// Create an Express application
const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(
  session({
    secret: "somesecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

// Route to display the login form
app.get("/login", (req, res) => {
  res.render("login");
});

// Route to handle the login form submission
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Search for the user in the database
    const user = await db.oneOrNone(
      "SELECT * FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );

    // If the user is not found, return an error
    if (!user) {
      return res.render("login", {
        error: "Неверное имя пользователя или пароль",
      });
    }

    // Save user information in the session
    req.session.user = user;

    // Redirect to the protected page
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error while logging in:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to display the protected dashboard page
app.get("/dashboard", (req, res) => {
  // Check if user information exists in the session
  if (!req.session.user) {
    return res.redirect("/login");
  }

  res.render("dashboard", {
    user: req.session.user,
  });
});

// Route to log out and destroy the session
app.get("/logout", (req, res) => {
  // Clear user information from the session
  req.session.destroy();

  res.redirect("/login");
});

// Start the server
app.listen(3000, () => {
  console.log("Сервер запущен на порту 3000");
});
