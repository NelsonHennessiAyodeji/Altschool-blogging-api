const express = require("express");
const router = express.Router();
const { signup, login } = require("../controllers/authController");
const { authValidation, validate } = require("../middleware/validation");

router.post("/signup", validate(authValidation.signup), signup);
router.post("/login", validate(authValidation.login), login);

module.exports = router;
