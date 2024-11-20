import express from "express";

import {
    authenticateToken
} from "../authentication/authentication.js";

import {
    createReview
} from "../controllers/reviewController.js";

const router = express.Router();
router.post('/review/create', authenticateToken, createReview);

export default router;