import express from "express";

import {
    authenticateToken
} from "../authentication/authentication.js";

import {
    getBookings,
    getBookingEdit,
    createBooking,
    editBooking,
    deleteBooking,
    getBookingReport,
    getBookingCancellationReport
} from "../controllers/bookingController.js";

const router = express.Router();

router.get('/room/:id/booking', authenticateToken, getBookings);
router.get('/booking/:id/edit', authenticateToken, getBookingEdit);
router.post('/booking/create', authenticateToken, createBooking);
router.put('/booking/:id/edit', authenticateToken, editBooking);
router.delete('/bookings/:id', authenticateToken, deleteBooking);
router.get('/booking/:id/report', authenticateToken, getBookingReport);
router.get('/booking/:id/cancellationReport', authenticateToken, getBookingCancellationReport);

export default router;