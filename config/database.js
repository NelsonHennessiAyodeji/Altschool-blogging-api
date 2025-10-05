const mongoose = require("mongoose");

const connectDatabase = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log("Database connected successfully");
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = connectDatabase;
