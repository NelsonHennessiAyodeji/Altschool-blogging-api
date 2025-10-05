require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/database");

const app = express();

// Connect to database
connectDB(process.env.MONGODB_URI);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/blogs", require("./routes/blogs"));

// // Main route
app.get("/", (req, res) => {
  res.status(200).send(`Server is running healthy, you can use this API: 
    
   API Endpoints: 

   
Authentication
POST /api/auth/signup - User registration

POST /api/auth/login - User login

Blogs
GET /api/blogs - Get all published blogs (public)

GET /api/blogs/:id - Get single blog (public)

POST /api/blogs - Create blog (prtected)

PUT /api/blogs/:id - Update blog (protected, owner only)

DELETE /api/blogs/:id - Delete blog (protected, oner only)

GET /api/blogs/user/my-blogs - Get user's blogs (protected`);
});

// Handle undefined routes
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    message: "Something went wrong!",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
