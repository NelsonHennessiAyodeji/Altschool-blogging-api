const express = require("express");
const router = express.Router();
const {
  createBlog,
  getBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
  getMyBlogs,
} = require("../controllers/blogController");
const auth = require("../middleware/auth");
const {
  blogValidation,
  validate,
  validateQuery,
} = require("../middleware/validation");

// Public routes
router.get("/", validateQuery(blogValidation.query), getBlogs);
router.get("/:id", getBlog);

// Protected routes (require authentication)
router.post("/", auth, validate(blogValidation.create), createBlog);
router.get(
  "/user/my-blogs",
  auth,
  validateQuery(blogValidation.query),
  getMyBlogs
);
router.put("/:id", auth, validate(blogValidation.update), updateBlog);
router.delete("/:id", auth, deleteBlog);

module.exports = router;
