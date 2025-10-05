const Blog = require("../models/Blog");
const mongoose = require("mongoose");

// Enhanced reading time calculation function
const calculateReadingTime = (text) => {
  if (!text) return 1;

  const wordsPerMinute = 200;
  const cleanText = text.replace(/<[^>]*>/g, "");
  const wordCount = cleanText
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return readingTime < 1 ? 1 : readingTime;
};

exports.createBlog = async (req, res) => {
  try {
    const readingTime = calculateReadingTime(req.body.body);

    const blogData = {
      ...req.body,
      author: req.user._id,
      reading_time: readingTime,
    };

    const blog = new Blog(blogData);
    await blog.save();

    await blog.populate("author", "first_name last_name email");

    res.status(201).json({
      status: "success",
      message: "Blog created successfully",
      data: { blog },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: "error",
        message: "Blog title already exists",
      });
    }
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      state,
      search,
      orderBy = "createdAt",
      order = "desc",
    } = req.query;

    let query = {};

    // If user is authenticated and requesting specific state or their blogs
    if (req.user) {
      if (state === "my-blogs") {
        query.author = req.user._id;
      } else if (state) {
        query.state = state;
        query.author = req.user._id;
      } else {
        // Authenticated users see published blogs by default
        query.state = "published";
      }
    } else {
      // Public users only see published blogs
      query.state = "published";
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = {};
    sortOptions[orderBy] = order === "desc" ? -1 : 1;

    console.log("Query:", query);
    console.log("Sort Options:", sortOptions);

    const blogs = await Blog.find(query)
      .populate("author", "first_name last_name email")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(); // Use lean() for better performance, so I heard

    const total = await Blog.countDocuments(query);

    console.log("Found blogs:", blogs.length);

    res.json({
      status: "success",
      data: {
        blogs,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
    });
  } catch (error) {
    console.error("Get blogs error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getBlog = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid blog ID format",
      });
    }

    const blog = await Blog.findById(req.params.id).populate(
      "author",
      "first_name last_name email bio"
    );

    if (!blog) {
      return res.status(404).json({
        status: "error",
        message: "Blog not found",
      });
    }

    // Increment read count
    await blog.incrementReadCount();

    res.json({
      status: "success",
      data: { blog },
    });
  } catch (error) {
    console.error("Get blog error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid blog ID format",
      });
    }

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        status: "error",
        message: "Blog not found",
      });
    }

    // Check if user is the author
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You can only update your own blogs.",
      });
    }

    // If body is being updated, recalculate reading time
    const updateData = { ...req.body };
    if (req.body.body) {
      updateData.reading_time = calculateReadingTime(req.body.body);
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("author", "first_name last_name email");

    res.json({
      status: "success",
      message: "Blog updated successfully",
      data: { blog: updatedBlog },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: "error",
        message: "Blog title already exists",
      });
    }
    console.error("Update blog error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid blog ID format",
      });
    }

    const blog = await Blog.findById(req.params.id);

    console.log("Looking for blog with ID:", req.params.id);
    console.log("Found blog:", blog);

    if (!blog) {
      return res.status(404).json({
        status: "error",
        message: "Blog not found with the provided ID",
      });
    }

    // Check if user is the author
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You can only delete your own blogs.",
      });
    }

    const result = await Blog.deleteOne({ _id: req.params.id });

    console.log("Delete result:", result);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Blog not found or already deleted",
      });
    }

    res.json({
      status: "success",
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Delete blog error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getMyBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      state,
      orderBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = { author: req.user._id };
    if (state && state !== "my-blogs") {
      query.state = state;
    }

    const sortOptions = {};
    sortOptions[orderBy] = order === "desc" ? -1 : 1;

    const blogs = await Blog.find(query)
      .populate("author", "first_name last_name email")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.json({
      status: "success",
      data: {
        blogs,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
    });
  } catch (error) {
    console.error("Get my blogs error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
