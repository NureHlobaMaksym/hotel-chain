import express from "express";

import {
    authenticateToken
} from "../authentication/authentication.js";

import {
    getHotels,
    getHotel
} from "../controllers/hotelController.js";

const router = express.Router();

router.get('/hotels', authenticateToken, getHotels)
router.get('/hotel/:id', authenticateToken, getHotel)

export default router;