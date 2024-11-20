import express from "express";

import {
    authenticateToken
} from "../authentication/authentication.js";

import {
    getProfile,
    updateProfile,
    deleteProfile,
    getProfileStatistics
} from "../controllers/profileController.js";

const router = express.Router();
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.delete('/profile', authenticateToken, deleteProfile);
router.get("/profile/statistics", authenticateToken, getProfileStatistics);

export default router;