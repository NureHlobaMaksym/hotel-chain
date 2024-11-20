import express from "express";

import {
    authenticateToken
} from "../authentication/authentication.js";

import {
    getBookings,
    getBookingEdit,
    createBooking,
    editBooking,
    deleteBooking
} from "../controllers/bookingController.js";

const router = express.Router();

router.get('/room/:id/booking', authenticateToken, getBookings);
router.get('/booking/:id/edit', authenticateToken, getBookingEdit);
router.post('/booking/create', authenticateToken, createBooking);
router.post('/booking/:id/edit', authenticateToken, editBooking);
router.delete('/bookings/:id', authenticateToken, deleteBooking);

export default router;