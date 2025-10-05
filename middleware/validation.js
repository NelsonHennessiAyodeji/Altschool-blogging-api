const Joi = require("joi");

const authValidation = {
  signup: Joi.object({
    first_name: Joi.string().max(50).required(),
    last_name: Joi.string().max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    bio: Joi.string().max(500).optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

const blogValidation = {
  create: Joi.object({
    title: Joi.string().max(200).required(),
    description: Joi.string().max(500).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    body: Joi.string().required(),
    state: Joi.string().valid("draft", "published").optional(),
  }),

  update: Joi.object({
    title: Joi.string().max(200).optional(),
    description: Joi.string().max(500).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    body: Joi.string().optional(),
    state: Joi.string().valid("draft", "published").optional(),
  }),

  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    state: Joi.string().valid("draft", "published").optional(),
    search: Joi.string().optional(),
    orderBy: Joi.string()
      .valid("read_count", "reading_time", "createdAt")
      .default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: "error",
        message: error.details[0].message,
      });
    }
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        status: "error",
        message: error.details[0].message,
      });
    }
    next();
  };
};

module.exports = {
  authValidation,
  blogValidation,
  validate,
  validateQuery,
};
