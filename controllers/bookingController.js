import runDBCommand from "../db/connection.js";

export async function getBookings(req, res) {
    const userQuery = `SELECT * FROM user WHERE user_id = ?`;
    const user = (await runDBCommand(userQuery, [+req.user.user_id]))[0];
    const room = (await runDBCommand(`
        SELECT
            r.room_id,
            r.room_name,
            r.smoking_allowed,
            r.room_description,
            r.area,
            rt.room_type_name,
            rt.price_per_night AS room_type_price_per_night,
            h.hotel_id,
            h.hotel_name,
            h.full_addr,
            h.hotel_phone_number,
            h.hotel_description,
            h.distance_to_city_center_km,
            h.near_subway,
            h.star_rating,
            h.city,
            (rt.price_per_night + COALESCE(SUM(ra.room_amenity_price), 0) + COALESCE(hap.total_hotel_amenities_price, 0)) AS total_price_per_night,
            COALESCE(rbc.max_capacity, 0) AS max_capacity
        FROM
            room r
        JOIN
            room_type rt ON r.room_type_id = rt.room_type_id
        JOIN
            hotel h ON r.hotel_id = h.hotel_id
        LEFT JOIN
            room_room_amenity rra ON r.room_id = rra.room_id
        LEFT JOIN
            room_amenity ra ON rra.room_amenity_id = ra.room_amenity_id
        LEFT JOIN
            (SELECT
                 h1.hotel_id,
                 SUM(ha1.hotel_amenity_price) AS total_hotel_amenities_price
             FROM
                 hotel h1
             JOIN
                 hotel_hotel_amenity hha1 ON h1.hotel_id = hha1.hotel_id
             JOIN
                 hotel_amenity ha1 ON hha1.hotel_amenity_id = ha1.hotel_amenity_id
             GROUP BY
                 h1.hotel_id) hap ON h.hotel_id = hap.hotel_id
        LEFT JOIN
            (SELECT
                 rbt.room_id,
                 SUM(bt.capacity * rbt.bed_count) AS max_capacity
             FROM
                 room_bed_type rbt
             JOIN
                 bed_type bt ON rbt.bed_type_id = bt.bed_type_id
             GROUP BY
                 rbt.room_id) rbc ON r.room_id = rbc.room_id
        WHERE
            r.room_id = ?
        GROUP BY
            r.room_id, r.room_name, r.smoking_allowed, r.room_description, r.area, rt.room_type_name, rt.price_per_night, 
            h.hotel_name, h.full_addr, h.hotel_phone_number, h.hotel_description, h.distance_to_city_center_km, 
            h.near_subway, h.star_rating, h.city, hap.total_hotel_amenities_price, rbc.max_capacity;
    `, [+req.params.id]))[0];
    const roomBedTypes = await runDBCommand(`
        SELECT *
        FROM bed_type,
             room_bed_type,
             room
        WHERE room_bed_type.room_id = room.room_id
          AND room.room_id = ?
          AND bed_type.bed_type_id = room_bed_type.bed_type_id
    `, [+req.params.id]);
    const hotelAmenities = await runDBCommand(`
        SELECT *
        FROM hotel_amenity,
             hotel_hotel_amenity
        WHERE hotel_id = ?
          AND hotel_amenity.hotel_amenity_id = hotel_hotel_amenity.hotel_amenity_id
        ORDER BY hotel_amenity_price DESC
    `, [+room.hotel_id]);
    const roomAmenities = await runDBCommand(`
        SELECT *
        FROM room,
             room_amenity,
             room_room_amenity
        WHERE room.room_id = ?
          AND room_amenity.room_amenity_id = room_room_amenity.room_amenity_id
          AND room_room_amenity.room_id = room.room_id
        ORDER BY room_amenity_price DESC
    `, [+req.params.id]);

    res.render('booking', {
        user: user,
        booking: null,
        room: room,
        hotelAmenities: hotelAmenities,
        roomAmenities: roomAmenities,
        roomBedTypes: roomBedTypes,
        isLoggedIn: true
    });
}

export async function getBookingEdit(req,res){
    const userQuery = `SELECT * FROM user WHERE user_id = ?`;
    const user = (await runDBCommand(userQuery, [+req.user.user_id]))[0];
    const booking = (await runDBCommand(`SELECT * FROM booking WHERE booking_id = ? AND user_id = ?`, [
        +req.params.id,
        +req.user.user_id
    ]))[0];
    const room = (await runDBCommand(`
        SELECT
            r.room_id,
            r.room_name,
            r.smoking_allowed,
            r.room_description,
            r.area,
            rt.room_type_name,
            rt.price_per_night AS room_type_price_per_night,
            h.hotel_id,
            h.hotel_name,
            h.full_addr,
            h.hotel_phone_number,
            h.hotel_description,
            h.distance_to_city_center_km,
            h.near_subway,
            h.star_rating,
            h.city,
            (rt.price_per_night + COALESCE(SUM(ra.room_amenity_price), 0) + COALESCE(hap.total_hotel_amenities_price, 0)) AS total_price_per_night,
            COALESCE(rbc.max_capacity, 0) AS max_capacity
        FROM
            room r
        JOIN
            room_type rt ON r.room_type_id = rt.room_type_id
        JOIN
            hotel h ON r.hotel_id = h.hotel_id
        LEFT JOIN
            room_room_amenity rra ON r.room_id = rra.room_id
        LEFT JOIN
            room_amenity ra ON rra.room_amenity_id = ra.room_amenity_id
        LEFT JOIN
            (SELECT
                 h1.hotel_id,
                 SUM(ha1.hotel_amenity_price) AS total_hotel_amenities_price
             FROM
                 hotel h1
             JOIN
                 hotel_hotel_amenity hha1 ON h1.hotel_id = hha1.hotel_id
             JOIN
                 hotel_amenity ha1 ON hha1.hotel_amenity_id = ha1.hotel_amenity_id
             GROUP BY
                 h1.hotel_id) hap ON h.hotel_id = hap.hotel_id
        LEFT JOIN
            (SELECT
                 rbt.room_id,
                 SUM(bt.capacity * rbt.bed_count) AS max_capacity
             FROM
                 room_bed_type rbt
             JOIN
                 bed_type bt ON rbt.bed_type_id = bt.bed_type_id
             GROUP BY
                 rbt.room_id) rbc ON r.room_id = rbc.room_id
        WHERE
            r.room_id = ?
        GROUP BY
            r.room_id, r.room_name, r.smoking_allowed, r.room_description, r.area, rt.room_type_name, rt.price_per_night, 
            h.hotel_name, h.full_addr, h.hotel_phone_number, h.hotel_description, h.distance_to_city_center_km, 
            h.near_subway, h.star_rating, h.city, hap.total_hotel_amenities_price, rbc.max_capacity;
    `, [+booking.room_id]))[0];
    const roomBedTypes = await runDBCommand(`
        SELECT *
        FROM bed_type,
             room_bed_type,
             room
        WHERE room_bed_type.room_id = room.room_id
          AND room.room_id = ?
          AND bed_type.bed_type_id = room_bed_type.bed_type_id
    `, [+room.room_id]);
    const hotelAmenities = await runDBCommand(`
        SELECT *
        FROM hotel_amenity,
             hotel_hotel_amenity
        WHERE hotel_id = ?
          AND hotel_amenity.hotel_amenity_id = hotel_hotel_amenity.hotel_amenity_id
        ORDER BY hotel_amenity_price DESC
    `, [+room.hotel_id]);
    const roomAmenities = await runDBCommand(`
        SELECT *
        FROM room,
             room_amenity,
             room_room_amenity
        WHERE room.room_id = ?
          AND room_amenity.room_amenity_id = room_room_amenity.room_amenity_id
          AND room_room_amenity.room_id = room.room_id
        ORDER BY room_amenity_price DESC
    `, [+room.room_id]);

    res.render('booking', {
        user: user,
        room: room,
        hotelAmenities: hotelAmenities,
        roomAmenities: roomAmenities,
        roomBedTypes: roomBedTypes,
        isLoggedIn: true,
        booking: booking
    });
}

export async function createBooking(req,res){
    const {
        check_in_datetime,
        check_out_datetime,
        number_of_guests,
        booking_price,
        room_id
    } = req.body;
    const user_id = req.user.user_id;

    try {
        const checkAvailabilityQuery = `
            SELECT * FROM booking
            WHERE room_id = ?
              AND (
                  (check_in_datetime <= ? AND check_out_datetime >= ?)
              )
        `;
        const overlappingBookings = await runDBCommand(checkAvailabilityQuery, [
            +room_id,
            check_in_datetime,
            check_out_datetime
        ]);

        if (overlappingBookings.length > 0) {
            return res.status(400).json({message: 'Номер недоступний на обрані дати.'});
        }

        const createBookingQuery = `
            INSERT INTO booking (
                check_in_datetime, 
                check_out_datetime, 
                number_of_guests, 
                booking_price, 
                room_id, 
                user_id
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        await runDBCommand(createBookingQuery, [
            check_in_datetime,
            check_out_datetime,
            +number_of_guests,
            +booking_price,
            +room_id,
            +user_id
        ]);

        res.status(201).json({message: 'Booking created successfully.'});
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({message: 'Server error. Please try again later.'});
    }
}

export async function editBooking(req,res){
    const {
        check_in_datetime,
        check_out_datetime,
        booking_price
    } = req.body;
    const user_id = req.user.user_id;

    try {
        const checkAvailabilityQuery = `
            SELECT *
            FROM booking
            WHERE room_id = (SELECT room_id FROM booking WHERE booking_id = ?)
              AND (
                (check_in_datetime <= ? AND check_out_datetime >= ?)
                )
              AND booking_id <> ?
        `;
        const overlappingBookings = await runDBCommand(checkAvailabilityQuery, [
            +req.params.id,
            check_out_datetime,
            check_in_datetime,
            +req.params.id
        ]);

        if (overlappingBookings.length > 0) {
            return res.status(400).json({message: 'Номер недоступний на обрані дати.'});
        }

        const updateBookingQuery = `
            UPDATE booking
            SET check_in_datetime  = ?,
                check_out_datetime = ?,
                booking_price = ?
            WHERE user_id = ?
              AND booking_id = ?
              AND check_out_datetime >= NOW()
        `;
        const result = await runDBCommand(updateBookingQuery, [
            check_in_datetime,
            check_out_datetime,
            +booking_price,
            +user_id,
            +req.params.id
        ]);

        if(result.affectedRows === 1) {
            res.status(200).json({message: 'Booking updated successfully.'});
        } else {
            res.status(400).json({message: 'Сталася помилка'});
        }
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({message: 'Server error. Please try again later.'});
    }
}

export async function deleteBooking(req,res){
    try {
        const result = await runDBCommand(`
            DELETE
            FROM booking
            WHERE booking_id = ?
              AND user_id = ?
              AND check_out_datetime >= NOW()
        `, [
            +req.params.id,
            +req.user.user_id
        ]);

        if(result.affectedRows === 1) {
            res.status(200).json({
                message: 'Booking deleted successfully.',
                success: true
            });
        } else {
            res.status(400).json({
                message: 'Сталася помилка',
                success: false
            });
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting booking'
        });
    }
}