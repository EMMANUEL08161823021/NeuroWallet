const express = require("express");
const { celebrate, Joi, Segments } = require("celebrate");
const { requireAuth } = require("../middleware/auth");
const { setPIN, loginWithPIN } = require("../controllers/pin.controller");

const router = express.Router();

router.post(
  "/set",
  requireAuth,
  celebrate({ [Segments.BODY]: Joi.object({ pin: Joi.string().pattern(/^\d{4,6}$/).required() }) }),
  setPIN
);

router.post(
  "/login",
  celebrate({ [Segments.BODY]: Joi.object({ email: Joi.string().email().required(), pin: Joi.string().required() }) }),
  loginWithPIN
);

module.exports = router;
