const { expect } = require("chai");
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../models/User");
const Blog = require("../models/Blog");

describe("Blog API Comprehensive Tests", function () {
  this.timeout(15000);

  let authToken;
  let userId;
  let blogId;
  let secondBlogId;

  before(async () => {
    // Clear existing data
    await User.deleteMany({});
    await Blog.deleteMany({});
  });

  after(async () => {
    await mongoose.connection.close();
  });

  describe("Authentication and Blog CRUD", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/api/auth/signup").send({
        first_name: "Test",
        last_name: "User",
        email: "test@example.com",
        password: "password123",
      });

      expect(res.status).to.equal(201);
      expect(res.body.data).to.have.property("token");
      authToken = res.body.data.token;
      userId = res.body.data.user._id;
    });

    it("should create multiple blogs", async () => {
      // Create first blog
      const blog1 = await request(app)
        .post("/api/blogs")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "First Test Blog",
          description: "First blog description",
          tags: ["test", "first"],
          body: "This is the body of the first test blog. It should be long enough to calculate reading time properly.",
          state: "published",
        });

      expect(blog1.status).to.equal(201);
      blogId = blog1.body.data.blog._id;

      // Create second blog
      const blog2 = await request(app)
        .post("/api/blogs")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Second Test Blog",
          description: "Second blog description",
          tags: ["test", "second"],
          body: "This is the body of the second test blog. It should also be long enough to calculate reading time properly.",
          state: "published",
        });

      expect(blog2.status).to.equal(201);
      secondBlogId = blog2.body.data.blog._id;
    });

    it("should get all published blogs", async () => {
      const res = await request(app)
        .get("/api/blogs")
        .query({ page: 1, limit: 10 });

      console.log("Get all blogs response:", res.body);

      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal("success");
      expect(res.body.data.blogs).to.be.an("array");
      expect(res.body.data.blogs.length).to.be.at.least(2);
      expect(res.body.data.total).to.be.at.least(2);
    });

    it("should get a single blog by ID", async () => {
      const res = await request(app).get(`/api/blogs/${blogId}`);

      expect(res.status).to.equal(200);
      expect(res.body.data.blog._id).to.equal(blogId);
      expect(res.body.data.blog.read_count).to.equal(1); // Should be incremented
    });

    it("should get user blogs specifically", async () => {
      const res = await request(app)
        .get("/api/blogs/user/my-blogs")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(res.status).to.equal(200);
      expect(res.body.data.blogs).to.be.an("array");
      expect(res.body.data.total).to.equal(2);
    });

    it("should successfully delete a blog", async () => {
      console.log("Attempting to delete blog with ID:", blogId);
      const res = await request(app)
        .delete(`/api/blogs/${blogId}`)
        .set("Authorization", `Bearer ${authToken}`);

      console.log("Delete response:", res.body);

      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal("success");
      expect(res.body.message).to.equal("Blog deleted successfully");
    });

    it("should return 404 when trying to get deleted blog", async () => {
      const res = await request(app).get(`/api/blogs/${blogId}`);

      expect(res.status).to.equal(404);
    });

    it("should return 404 when trying to delete non-existent blog", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/blogs/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).to.equal(404);
    });

    it("should return 400 when trying to delete with invalid ID format", async () => {
      const res = await request(app)
        .delete("/api/blogs/invalid-id-format")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).to.equal(400);
    });
  });

  describe("Edge Cases", () => {
    it("should handle search functionality", async () => {
      const res = await request(app)
        .get("/api/blogs")
        .query({ search: "Second", page: 1, limit: 10 });

      expect(res.status).to.equal(200);
      expect(res.body.data.blogs).to.be.an("array");
      // Should find the second blog
      expect(res.body.data.blogs[0].title).to.include("Second");
    });

    it("should handle pagination correctly", async () => {
      const res = await request(app)
        .get("/api/blogs")
        .query({ page: 1, limit: 1 });

      expect(res.status).to.equal(200);
      expect(res.body.data.blogs.length).to.equal(1);
      expect(res.body.data.totalPages).to.be.at.least(1);
    });
  });
});
