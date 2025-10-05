const mongoose = require("mongoose");

const calculateReadingTime = (text) => {
  const wordsPerMinute = 200; // Average reading speed
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      unique: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    state: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    read_count: {
      type: Number,
      default: 0,
    },
    reading_time: {
      type: Number,
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    body: {
      type: String,
      required: [true, "Blog body is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Calculate reading time before saving
blogSchema.pre("save", function (next) {
  if (this.isModified("body")) {
    this.reading_time = calculateReadingTime(this.body);
  }
  next();
});

// Increment read count when blog is fetched
blogSchema.methods.incrementReadCount = function () {
  this.read_count += 1;
  return this.save();
};

module.exports = mongoose.model("Blog", blogSchema);
