const { expect } = require("chai");
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../models/User");
const Blog = require("../models/Blog");

describe("Blog API Tests", function () {
  this.timeout(10000);

  let authToken;
  let userId;
  let blogId;

  before(async () => {
    // Clear existing data
    await User.deleteMany({});
    await Blog.deleteMany({});
  });

  after(async () => {
    await mongoose.connection.close();
  });

  describe("Authentication", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/api/auth/signup").send({
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        password: "password123",
        bio: "Software developer and blogger",
      });

      expect(res.status).to.equal(201);
      expect(res.body.status).to.equal("success");
      expect(res.body.data.user).to.have.property(
        "email",
        "john.doe@example.com"
      );
      expect(res.body.data).to.have.property("token");

      authToken = res.body.data.token;
      userId = res.body.data.user._id;
    });

    it("should login existing user", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "john.doe@example.com",
        password: "password123",
      });

      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal("success");
      expect(res.body.data).to.have.property("token");
    });
  });

  describe("Blog Operations", () => {
    it("should create a new blog", async () => {
      const blogData = {
        title: "Test Blog Post",
        description: "This is a test blog post",
        tags: ["test", "programming"],
        body: "This is the body of the test blog post. It contains enough text to calculate reading time properly. This should be at least 200 words to test the reading time calculation accurately. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        state: "draft",
      };

      const res = await request(app)
        .post("/api/blogs")
        .set("Authorization", `Bearer ${authToken}`)
        .send(blogData);

      expect(res.status).to.equal(201);
      expect(res.body.status).to.equal("success");
      expect(res.body.data.blog).to.have.property("title", blogData.title);
      expect(res.body.data.blog.state).to.equal("draft");

      blogId = res.body.data.blog._id;
    });

    it("should get all published blogs", async () => {
      const res = await request(app)
        .get("/api/blogs")
        .query({ page: 1, limit: 10 });

      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal("success");
      expect(res.body.data).to.have.property("blogs");
      expect(res.body.data).to.have.property("totalPages");
    });

    it("should get a single blog and increment read count", async () => {
      // First, publish the blog
      await Blog.findByIdAndUpdate(blogId, { state: "published" });

      const res = await request(app).get(`/api/blogs/${blogId}`);

      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal("success");
      expect(res.body.data.blog).to.have.property("read_count", 1);
      expect(res.body.data.blog.author).to.have.property("first_name", "John");
    });

    it("should update a blog", async () => {
      const res = await request(app)
        .put(`/api/blogs/${blogId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated Test Blog Post",
          state: "published",
        });

      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal("success");
      expect(res.body.data.blog).to.have.property(
        "title",
        "Updated Test Blog Post"
      );
      expect(res.body.data.blog.state).to.equal("published");
    });

    it("should get user blogs", async () => {
      const res = await request(app)
        .get("/api/blogs/user/my-blogs")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ state: "published" });

      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal("success");
      expect(res.body.data.blogs).to.be.an("array");
    });

    it("should delete a blog", async () => {
      const res = await request(app)
        .delete(`/api/blogs/${blogId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal("success");
    });
  });

  describe("Validation Tests", () => {
    it("should reject invalid email during signup", async () => {
      const res = await request(app).post("/api/auth/signup").send({
        first_name: "Jane",
        last_name: "Doe",
        email: "invalid-email",
        password: "password123",
      });

      expect(res.status).to.equal(400);
    });

    it("should reject blog creation without title", async () => {
      const res = await request(app)
        .post("/api/blogs")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          body: "Blog body without title",
        });

      expect(res.status).to.equal(400);
    });
  });
});
