import express from "express";
import { register, login, verifyToken, getCurrentUser } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify", verifyToken);
router.get("/me", getCurrentUser);

export default router;
