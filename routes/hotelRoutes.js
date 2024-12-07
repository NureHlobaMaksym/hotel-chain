import express from "express";

import {
    authenticateToken
} from "../authentication/authentication.js";

import {
    getHotels,
    getHotel,
    searchHotels,
    searchRooms
} from "../controllers/hotelController.js";

const router = express.Router();

router.get('/hotels', authenticateToken, getHotels)
router.get('/hotel/:id', authenticateToken, getHotel)
router.get('/hotelSearch', authenticateToken, searchHotels)
router.get('/hotel/:id/rooms', authenticateToken, searchRooms)

export default router;