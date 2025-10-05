const mongoose = require("mongoose");

const calculateReadingTime = (text) => {
  if (!text) return 1;

  const wordsPerMinute = 200; // Average reading speed
  const cleanText = text.replace(/<[^>]*>/g, "");
  const wordCount = cleanText
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return readingTime < 1 ? 1 : readingTime; // Minimum 1 minute
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
      min: 1,
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
