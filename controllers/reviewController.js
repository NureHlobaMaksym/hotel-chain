import runDBCommand from "../db/connection.js";

export async function createReview(req, res) {
    const {
        title,
        pros_description,
        cons_description,
        staff_rating,
        comfort_rating,
        price_quality_rating,
        cleanliness_rating,
        location_rating,
        booking_id
    } = req.body;
    const user_id = req.user.user_id;

    try {
        const checkBookingQuery = `SELECT * FROM booking WHERE booking_id = ? AND user_id = ?`;
        const booking = await runDBCommand(checkBookingQuery, [
            +booking_id,
            +user_id
        ]);

        if (booking.length === 0) {
            return res.status(400).json({ message: 'Booking not found or does not belong to this user.' });
        }

        const createReviewQuery = `
            INSERT INTO review (
                title, 
                pros_description, 
                cons_description, 
                staff_rating, 
                comfort_rating, 
                price_quality_rating,
                cleanliness_rating, 
                location_rating, 
                booking_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await runDBCommand(createReviewQuery, [
            title,
            pros_description,
            cons_description,
            +staff_rating,
            +comfort_rating,
            +price_quality_rating,
            +cleanliness_rating,
            +location_rating,
            +booking_id
        ]);

        res.status(201).json({ message: 'Review created successfully.' });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
}