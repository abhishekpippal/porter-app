import express from "express";
import { createUser, getUserProfile } from "../controllers/userController";

const router = express.Router();

// POST /api/users - Create or update user (for onboarding)
router.post("/", createUser);

// GET /api/users/:id - Get user profile
router.get("/:id", getUserProfile);

export default router;
