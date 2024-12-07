import runDBCommand from "../db/connection.js";

export async function getIndex(req, res) {
    const citiesStatistics = await runDBCommand(`
        WITH RoomPrices AS (
            SELECT 
                r.room_id,
                h.city,
                rt.price_per_night + 
                COALESCE(SUM(ra.room_amenity_price), 0) + 
                COALESCE(hap.total_hotel_amenities_price, 0) AS total_price_per_night
            FROM room r
            JOIN room_type rt ON r.room_type_id = rt.room_type_id
            LEFT JOIN room_room_amenity rra ON r.room_id = rra.room_id
            LEFT JOIN room_amenity ra ON rra.room_amenity_id = ra.room_amenity_id
            LEFT JOIN hotel h ON r.hotel_id = h.hotel_id
            LEFT JOIN (
                SELECT h1.hotel_id, SUM(ha1.hotel_amenity_price) AS total_hotel_amenities_price
                FROM hotel h1
                JOIN hotel_hotel_amenity hha1 ON h1.hotel_id = hha1.hotel_id
                JOIN hotel_amenity ha1 ON hha1.hotel_amenity_id = ha1.hotel_amenity_id
                GROUP BY h1.hotel_id
            ) hap ON h.hotel_id = hap.hotel_id
            GROUP BY r.room_id, h.city, rt.price_per_night, hap.total_hotel_amenities_price
        )
        SELECT 
            rp.city,
            COUNT(b.booking_id) AS total_bookings_in_city,
            COUNT(DISTINCT h.hotel_id) AS total_hotels_in_city,
            MIN(rp.total_price_per_night) AS min_room_price_in_city,
            MAX(rp.total_price_per_night) AS max_room_price_in_city
        FROM RoomPrices rp
        LEFT JOIN room r ON rp.room_id = r.room_id
        LEFT JOIN hotel h ON r.hotel_id = h.hotel_id
        LEFT JOIN booking b ON r.room_id = b.room_id
        GROUP BY rp.city
        ORDER BY total_bookings_in_city DESC  LIMIT 10;
    `);
    const bookingStatistics = (await runDBCommand(`
        SELECT
            COUNT(DISTINCT b.booking_id) AS total_bookings,
            COUNT(DISTINCT h.hotel_id) AS total_hotels,
            COUNT(DISTINCT r.room_id) AS total_rooms,
            COUNT(DISTINCT rv.review_id) AS total_reviews
        FROM hotel h
        LEFT JOIN room r ON h.hotel_id = r.hotel_id
        LEFT JOIN booking b ON r.room_id = b.room_id
        LEFT JOIN review rv ON b.booking_id = rv.booking_id;
    `))[0]
    const hotelStatistics = await runDBCommand(`
           WITH RoomPrices AS (SELECT r.room_id,
                                       h.hotel_id,
                                       rt.price_per_night +
                                       COALESCE(SUM(ra.room_amenity_price), 0) +
                                       COALESCE(hap.total_hotel_amenities_price, 0) AS total_price_per_night
                                FROM room r
                                         JOIN room_type rt ON r.room_type_id = rt.room_type_id
                                         LEFT JOIN room_room_amenity rra ON r.room_id = rra.room_id
                                         LEFT JOIN room_amenity ra ON rra.room_amenity_id = ra.room_amenity_id
                                         LEFT JOIN hotel h ON r.hotel_id = h.hotel_id
                                         LEFT JOIN (SELECT h1.hotel_id, SUM(ha1.hotel_amenity_price) AS total_hotel_amenities_price
                                                    FROM hotel h1
                                                             JOIN hotel_hotel_amenity hha1 ON h1.hotel_id = hha1.hotel_id
                                                             JOIN hotel_amenity ha1 ON hha1.hotel_amenity_id = ha1.hotel_amenity_id
                                                    GROUP BY h1.hotel_id) hap ON h.hotel_id = hap.hotel_id
                                GROUP BY r.room_id, h.hotel_id, rt.price_per_night, hap.total_hotel_amenities_price)
            SELECT h.hotel_name,
                   COUNT(b.booking_id)           AS total_bookings_in_hotel,
                   h.hotel_description,
                   h.star_rating,
                   h.full_addr,
                   h.hotel_id,
                   hotel_rating.average_rating,
                   COUNT(rv.review_id)           AS review_count,
                   MIN(rp.total_price_per_night) AS min_room_price,
                   MAX(rp.total_price_per_night) AS max_room_price,
                   (SELECT hotel_photograph_url
                    FROM hotel_photograph
                    WHERE h.hotel_id = hotel_photograph.hotel_id
                    LIMIT 1)                     AS hotel_photograph_url
            FROM RoomPrices rp
                     LEFT JOIN hotel h ON rp.hotel_id = h.hotel_id
                     LEFT JOIN room r ON rp.room_id = r.room_id
                     LEFT JOIN booking b ON r.room_id = b.room_id
                     LEFT JOIN review rv ON b.booking_id = rv.booking_id
                     LEFT JOIN (SELECT h1.hotel_id,
                                       (AVG(staff_rating) + AVG(comfort_rating) + AVG(price_quality_rating) +
                                        AVG(cleanliness_rating) +
                                        AVG(location_rating)) / 5 AS average_rating
                                FROM review
                                         JOIN hotel_chain.booking b on b.booking_id = review.booking_id
                                         JOIN hotel_chain.room r on r.room_id = b.room_id
                                         RIGHT JOIN hotel_chain.hotel h1 on h1.hotel_id = r.hotel_id
                                GROUP BY h1.hotel_id) hotel_rating ON hotel_rating.hotel_id = h.hotel_id
            GROUP BY h.hotel_id
            ORDER BY total_bookings_in_hotel DESC LIMIT 8;
    `)
    const allHotels = await runDBCommand(`SELECT hotel_name, city FROM hotel ORDER BY hotel_name`);
    const cities = await runDBCommand(`
        SELECT DISTINCT city
        FROM hotel
        ORDER BY city
    `);
    const user = (await runDBCommand(`SELECT * FROM user WHERE user_id = ?`, [req.user.user_id]))[0]
    res.render('index', {
        citiesStatistics: citiesStatistics,
        bookingStatistics: bookingStatistics,
        hotelStatistics: hotelStatistics,
        allHotels: allHotels,
        cities: cities.map(cityObj => cityObj.city),
        isLoggedIn: true,
        user: user
    });
}