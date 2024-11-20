import runDBCommand from "../db/connection.js";

export async function getHotels(req, res){
    const hotels = await runDBCommand(`
            SELECT *,
                   (SELECT hotel_photograph_url
                    FROM hotel_photograph
                    WHERE hotel.hotel_id = hotel_photograph.hotel_id
                    LIMIT 1)                           as hotel_photograph_url,
                   (SELECT hotel_photograph.hotel_photograph_description
                    FROM hotel_photograph
                    WHERE hotel_photograph.hotel_id = hotel.hotel_id
                    LIMIT 1)                           as hotel_photograph_description,
                   (SELECT COUNT(1)
                    FROM review
                             JOIN hotel_chain.booking b on review.booking_id = b.booking_id
                             JOIN hotel_chain.room r on r.room_id = b.room_id
                    WHERE r.hotel_id = hotel.hotel_id) AS review_count,
                   (SELECT (AVG(staff_rating) + AVG(comfort_rating) + AVG(price_quality_rating) + AVG(cleanliness_rating) +
                            AVG(location_rating)) / 5
                    FROM review
                             JOIN hotel_chain.booking b on b.booking_id = review.booking_id
                             JOIN hotel_chain.room r on r.room_id = b.room_id
                    WHERE r.hotel_id = hotel.hotel_id
                    GROUP BY r.hotel_id)               AS average_rating
            FROM hotel
        `);
    const user = (await runDBCommand(`SELECT * FROM user WHERE user_id = ?`, [req.user.user_id]))[0]

    res.render('hotels', {
        hotels: hotels,
        isLoggedIn: true,
        user: user
    });
}

export async function getHotel(req, res) {
    const hotel = (await runDBCommand(`SELECT * FROM hotel WHERE hotel_id = ?`, [+req.params.id]))[0];
    const hotelPhotographs = await runDBCommand(`SELECT * FROM hotel_photograph WHERE hotel_id = ?`, [+req.params.id]);
    const rooms = await runDBCommand(`
        SELECT r.room_id,
               r.room_name,
               r.smoking_allowed,
               r.room_description,
               r.area,
               rt.room_type_name,
               (rt.price_per_night + COALESCE(SUM(ra.room_amenity_price), 0) +
                COALESCE(hap.total_hotel_amenities_price, 0)) AS total_price_per_night,
               COALESCE(rbc.max_capacity, 0)                  AS max_capacity
        FROM room r
                 JOIN
             room_type rt ON r.room_type_id = rt.room_type_id
                 LEFT JOIN
             room_room_amenity rra ON r.room_id = rra.room_id
                 LEFT JOIN
             room_amenity ra ON rra.room_amenity_id = ra.room_amenity_id
                 LEFT JOIN
             hotel h ON r.hotel_id = h.hotel_id
                 LEFT JOIN
             (SELECT h1.hotel_id,
                     SUM(ha1.hotel_amenity_price) AS total_hotel_amenities_price
              FROM hotel h1
                       JOIN
                   hotel_hotel_amenity hha1 ON h1.hotel_id = hha1.hotel_id
                       JOIN
                   hotel_amenity ha1 ON hha1.hotel_amenity_id = ha1.hotel_amenity_id
              GROUP BY h1.hotel_id) hap ON h.hotel_id = hap.hotel_id
                 LEFT JOIN
             (SELECT rbt.room_id,
                     SUM(bt.capacity * rbt.bed_count) AS max_capacity
              FROM room_bed_type rbt
                       JOIN
                   bed_type bt ON rbt.bed_type_id = bt.bed_type_id
              GROUP BY rbt.room_id) rbc ON r.room_id = rbc.room_id
        WHERE h.hotel_id = ?
        GROUP BY r.room_id, r.room_name, r.smoking_allowed, r.room_description, r.area, rt.room_type_name, rt.price_per_night,
                 hap.total_hotel_amenities_price, rbc.max_capacity;
    `, [+req.params.id]);
    const roomPhotographs = await runDBCommand(`
        SELECT *
        FROM room_photograph,
             room
        WHERE room.room_id = room_photograph.room_id
          AND room.hotel_id = ?
    `, [+req.params.id]);
    const roomBedTypes = await runDBCommand(`
        SELECT *
        FROM bed_type,
             room_bed_type,
             room
        WHERE room_bed_type.room_id = room.room_id
          AND room.hotel_id = ?
          AND bed_type.bed_type_id = room_bed_type.bed_type_id
    `, [+req.params.id]);
    const hotelAmenities = await runDBCommand(`
        SELECT *
        FROM hotel_amenity,
             hotel_hotel_amenity
        WHERE hotel_id = ?
          AND hotel_amenity.hotel_amenity_id = hotel_hotel_amenity.hotel_amenity_id
        ORDER BY hotel_amenity_price DESC
    `, [+req.params.id]);
    const roomAmenities = await runDBCommand(`
        SELECT *
        FROM room,
             room_amenity,
             room_room_amenity
        WHERE room.hotel_id = ?
          AND room_amenity.room_amenity_id = room_room_amenity.room_amenity_id
          AND room_room_amenity.room_id = room.room_id
        ORDER BY room_amenity_price DESC
    `, [+req.params.id]);
    const user = (await runDBCommand(`SELECT * FROM user WHERE user_id = ?`, [req.user.user_id]))[0]
    const hotelRating = (await runDBCommand(`
    SELECT AVG(staff_rating)          AS average_staff_rating,
           AVG(comfort_rating)        AS average_comfort_rating,
           AVG(price_quality_rating)  AS average_price_quality_rating,
           AVG(cleanliness_rating)    AS average_cleanliness_rating,
           AVG(location_rating)       AS average_location_rating,
           (AVG(staff_rating) + AVG(comfort_rating) + AVG(price_quality_rating) + AVG(cleanliness_rating) +
            AVG(location_rating)) / 5 AS average_rating
    FROM review
             JOIN hotel_chain.booking b on b.booking_id = review.booking_id
             JOIN hotel_chain.room r on r.room_id = b.room_id
             RIGHT JOIN hotel_chain.hotel h on h.hotel_id = r.hotel_id
    WHERE h.hotel_id = ?
    GROUP BY h.hotel_id`, [+req.params.id]))[0]
    const reviews = await runDBCommand(`SELECT review_id,
       title,
       pros_description,
       cons_description,
       submission_datetime,
       u.first_name,
       u.country,
       u.user_id,
       r.room_name,
       booking.check_in_datetime,
       booking.check_out_datetime,
       (staff_rating + comfort_rating + price_quality_rating + cleanliness_rating + location_rating) /
       5 AS average_rating
FROM review
         JOIN booking ON review.booking_id = booking.booking_id
         JOIN hotel_chain.user u on booking.user_id = u.user_id
         JOIN room r on r.room_id = booking.room_id
         WHERE r.hotel_id = ? ORDER BY submission_datetime DESC`, [+req.params.id])

    res.render('hotel', {
        hotel: hotel,
        isLoggedIn: true,
        user: user,
        photographs: hotelPhotographs,
        rooms: rooms,
        roomPhotographs: roomPhotographs,
        roomBedTypes: roomBedTypes,
        hotelAmenities: hotelAmenities,
        roomAmenities: roomAmenities,
        reviews: reviews,
        hotelRating: hotelRating
    });
}