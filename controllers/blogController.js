const Blog = require("../models/Blog");

exports.createBlog = async (req, res) => {
  try {
    const blogData = {
      ...req.body,
      author: req.user._id,
    };

    const blog = new Blog(blogData);
    await blog.save();

    // Populate author details
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

    const query = { state: "published" }; // Only show published blogs to public

    // Filter by state if user is authenticated and requesting their own blogs
    if (req.user && state) {
      if (state === "my-blogs") {
        query.author = req.user._id;
      } else {
        query.state = state;
        query.author = req.user._id;
      }
    }

    // Search functionality - FIXED VERSION
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const sortOptions = {};
    sortOptions[orderBy] = order === "desc" ? -1 : 1;

    // Build the query for population
    let blogQuery = Blog.find(query)
      .populate("author", "first_name last_name email")
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const blogs = await blogQuery;
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
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getBlog = async (req, res) => {
  try {
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
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.updateBlog = async (req, res) => {
  try {
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

    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("author", "first_name last_name email");

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
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
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
        message: "Access denied. You can only delete your own blogs.",
      });
    }

    await Blog.findByIdAndDelete(req.params.id);

    res.json({
      status: "success",
      message: "Blog deleted successfully",
    });
  } catch (error) {
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
    if (state) query.state = state;

    const sortOptions = {};
    sortOptions[orderBy] = order === "desc" ? -1 : 1;

    const blogs = await Blog.find(query)
      .populate("author", "first_name last_name email")
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

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
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
