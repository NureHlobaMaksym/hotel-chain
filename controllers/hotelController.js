import runDBCommand from "../db/connection.js";

export async function getHotels(req, res) {
    const allHotels = await runDBCommand(`SELECT hotel_name, city FROM hotel ORDER BY hotel_name`);
    const cities = await runDBCommand(`
        SELECT DISTINCT city
        FROM hotel
        ORDER BY city
    `);
    const hotelStatistics = (await runDBCommand(`
        WITH room_capacity AS (
            SELECT
                rbt.room_id,
                SUM(bt.capacity * rbt.bed_count) AS total_capacity
            FROM room_bed_type rbt
            JOIN bed_type bt ON rbt.bed_type_id = bt.bed_type_id
            GROUP BY rbt.room_id
        )
        SELECT
            MIN(rt.price_per_night + COALESCE(ra_price.total_room_amenity_price, 0) + COALESCE(hotel_amenities.total_hotel_amenity_price, 0)) AS overall_min_price,
            MAX(rt.price_per_night + COALESCE(ra_price.total_room_amenity_price, 0) + COALESCE(hotel_amenities.total_hotel_amenity_price, 0)) AS overall_max_price,
            MIN(rc.total_capacity) AS overall_min_capacity,
            MAX(rc.total_capacity) AS overall_max_capacity
        FROM room r
            JOIN room_type rt ON r.room_type_id = rt.room_type_id
            LEFT JOIN (
                SELECT rra.room_id, SUM(ra.room_amenity_price) AS total_room_amenity_price
                FROM room_room_amenity rra
                JOIN room_amenity ra ON rra.room_amenity_id = ra.room_amenity_id
                GROUP BY rra.room_id
            ) ra_price ON r.room_id = ra_price.room_id
            JOIN room_capacity rc ON r.room_id = rc.room_id
            JOIN hotel h ON r.hotel_id = h.hotel_id
            LEFT JOIN (
                SELECT hha.hotel_id, SUM(ha.hotel_amenity_price) AS total_hotel_amenity_price
                FROM hotel_hotel_amenity hha
                JOIN hotel_amenity ha ON hha.hotel_amenity_id = ha.hotel_amenity_id
                GROUP BY hha.hotel_id
            ) hotel_amenities ON h.hotel_id = hotel_amenities.hotel_id;
    `))[0];
    const user = (
        await runDBCommand(`SELECT * FROM user WHERE user_id = ?`, [req.user.user_id])
    )[0];
    const hotelAmenities = await runDBCommand(`SELECT * FROM hotel_amenity ORDER BY hotel_amenity_name`)
    const roomAmenities = await runDBCommand(`SELECT * FROM room_amenity ORDER BY room_amenity_name`)
    res.render('hotels', {
        isLoggedIn: true,
        user: user,
        hotelStatistics: hotelStatistics,
        allHotels: allHotels,
        cities: cities.map(cityObj => cityObj.city),
        hotelAmenities: hotelAmenities,
        roomAmenities: roomAmenities,
        searchParams: { hotelName: req.query.hotelName || '', cityName: req.query.cityName || '' }
    });
}


export async function getHotel(req, res) {
    const hotel = (await runDBCommand(`SELECT * FROM hotel WHERE hotel_id = ?`, [+req.params.id]))[0];
    const allRooms = await runDBCommand(`SELECT room_name FROM room WHERE hotel_id = ? ORDER BY room_name`, [+req.params.id]);
    const hotelPhotographs = await runDBCommand(`SELECT * FROM hotel_photograph WHERE hotel_id = ?`, [+req.params.id]);
    const max_capacity_in_hotel = (await runDBCommand(`
        SELECT MAX(max_capacity) AS max_capacity_in_hotel
        FROM (
            SELECT rbt.room_id,
                   SUM(bt.capacity * rbt.bed_count) AS max_capacity
            FROM room_bed_type rbt
                     JOIN bed_type bt ON rbt.bed_type_id = bt.bed_type_id
                     JOIN room r ON rbt.room_id = r.room_id
            WHERE r.hotel_id = ?
            GROUP BY rbt.room_id
        ) AS room_capacities;
    `, [+req.params.id]))[0]
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
    GROUP BY h.hotel_id
    `, [+req.params.id]))[0]
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
         LEFT JOIN hotel_chain.user u on booking.user_id = u.user_id
         JOIN room r on r.room_id = booking.room_id
         WHERE r.hotel_id = ? ORDER BY submission_datetime DESC`, [+req.params.id])

    res.render('hotel', {
        hotel: hotel,
        isLoggedIn: true,
        user: user,
        max_capacity_in_hotel: max_capacity_in_hotel,
        photographs: hotelPhotographs,
        roomPhotographs: roomPhotographs,
        roomBedTypes: roomBedTypes,
        hotelAmenities: hotelAmenities,
        roomAmenities: roomAmenities,
        reviews: reviews,
        allRooms: allRooms,
        hotelRating: hotelRating
    });
}

export async function searchHotels(req, res) {
    const hotelName = req.query.hotelName ? `%${req.query.hotelName}%` : '%';
    const cityName = req.query.cityName ? `%${req.query.cityName}%` : '%';
    const roomAmenities = req.query.roomAmenities ? req.query.roomAmenities.split(',') : [];
    const hotelAmenities = req.query.hotelAmenities ? req.query.hotelAmenities.split(',') : [];
    const priceRangeMin = req.query.priceRangeMin;
    const priceRangeMax = req.query.priceRangeMax;
    const guestCount = req.query.guestCount;
    const allowedSortFields = ['price', 'distance'];
    const allowedOrders = ['asc', 'desc'];
    const sortBy = req.query.sortBy && allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'price';
    const order = req.query.order && allowedOrders.includes(req.query.order) ? req.query.order : 'asc';

    let roomAmenitiesCondition = '';
    let hotelAmenitiesCondition = '';

    if (roomAmenities.length > 0) {
        roomAmenitiesCondition = `
            AND (
                SELECT COUNT(DISTINCT rra.room_amenity_id)
                FROM room_room_amenity rra
                WHERE rra.room_id = r.room_id
                AND rra.room_amenity_id IN (${roomAmenities.map(() => '?').join(',')})
            ) = ${roomAmenities.length}
        `;
    }

    if (hotelAmenities.length > 0) {
        hotelAmenitiesCondition = `
            AND (
                SELECT COUNT(DISTINCT hha.hotel_amenity_id)
                FROM hotel_hotel_amenity hha
                WHERE hha.hotel_id = h.hotel_id
                AND hha.hotel_amenity_id IN (${hotelAmenities.map(() => '?').join(',')})
            ) = ${hotelAmenities.length}
        `;
    }

    const hotels = await runDBCommand(`
        WITH RoomPrices AS (
            SELECT h.hotel_id,
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
            GROUP BY h.hotel_id, rt.price_per_night, hap.total_hotel_amenities_price
        ),
        RoomCapacities AS (
            SELECT r.hotel_id,
                   rbt.room_id,
                   SUM(bt.capacity * rbt.bed_count) AS room_capacity
            FROM room_bed_type rbt
                     JOIN room r ON rbt.room_id = r.room_id
                     JOIN bed_type bt ON rbt.bed_type_id = bt.bed_type_id
            GROUP BY r.hotel_id, rbt.room_id
        ),
        MaxCapacities AS (
            SELECT hotel_id,
                   MAX(room_capacity) AS max_capacity
            FROM RoomCapacities
            GROUP BY hotel_id
        ),
        RoomAmenityPrices AS (
            SELECT rra.room_id, SUM(ra.room_amenity_price) AS total_room_amenity_price
            FROM room_room_amenity rra
            JOIN room_amenity ra ON rra.room_amenity_id = ra.room_amenity_id
            GROUP BY rra.room_id
        ),
        HotelAmenityPrices AS (
            SELECT hha.hotel_id, SUM(ha.hotel_amenity_price) AS total_hotel_amenity_price
            FROM hotel_hotel_amenity hha
            JOIN hotel_amenity ha ON hha.hotel_amenity_id = ha.hotel_amenity_id
            GROUP BY hha.hotel_id
        )
        SELECT h.hotel_id,
               h.hotel_description,
               h.star_rating,
               h.distance_to_city_center_km,
               h.near_subway,
               h.city,
               h.hotel_name,
               MIN(CASE
                       WHEN rp.total_price_per_night BETWEEN ? AND ? THEN rp.total_price_per_night
                       ELSE NULL
                   END) AS min_total_price_per_night,
               mc.max_capacity,
               (SELECT hotel_photograph_url
                FROM hotel_photograph
                WHERE h.hotel_id = hotel_photograph.hotel_id
                LIMIT 1) AS hotel_photograph_url,
               (SELECT COUNT(1)
                FROM review
                         JOIN hotel_chain.booking b ON review.booking_id = b.booking_id
                         JOIN hotel_chain.room r ON r.room_id = b.room_id
                WHERE r.hotel_id = h.hotel_id) AS review_count,
               (SELECT (AVG(staff_rating) + AVG(comfort_rating) + AVG(price_quality_rating) + AVG(cleanliness_rating) +
                        AVG(location_rating)) / 5
                FROM review
                         JOIN hotel_chain.booking b ON b.booking_id = review.booking_id
                         JOIN hotel_chain.room r ON r.room_id = b.room_id
                WHERE r.hotel_id = h.hotel_id
                GROUP BY r.hotel_id) AS average_rating,
               MIN(CASE
                       WHEN rt.price_per_night + COALESCE(ra_price.total_room_amenity_price, 0) + COALESCE(hotel_amenities.total_hotel_amenity_price, 0)
                       BETWEEN ? AND ? THEN rt.price_per_night + COALESCE(ra_price.total_room_amenity_price, 0) + COALESCE(hotel_amenities.total_hotel_amenity_price, 0)
                       ELSE NULL
                   END) AS min_price_with_selected_amenities
        FROM hotel h
                 JOIN RoomPrices rp ON h.hotel_id = rp.hotel_id
                 LEFT JOIN MaxCapacities mc ON h.hotel_id = mc.hotel_id
                 LEFT JOIN room r ON r.hotel_id = h.hotel_id
                 LEFT JOIN room_type rt on rt.room_type_id = r.room_type_id
                 LEFT JOIN RoomAmenityPrices ra_price ON r.room_id = ra_price.room_id
                 LEFT JOIN HotelAmenityPrices hotel_amenities ON h.hotel_id = hotel_amenities.hotel_id
        WHERE h.hotel_name LIKE ?
          AND h.city LIKE ?
          ${roomAmenitiesCondition}
          ${hotelAmenitiesCondition}
        GROUP BY h.hotel_id, h.hotel_name, mc.max_capacity
        HAVING min_total_price_per_night IS NOT NULL
           AND min_total_price_per_night BETWEEN ? AND ?
           AND mc.max_capacity >= ?
        ORDER BY 
            CASE WHEN ? = 'price' THEN MIN(rp.total_price_per_night) END ${order},
            CASE WHEN ? = 'distance' THEN h.distance_to_city_center_km END ${order}
    `, [+priceRangeMin, +priceRangeMax, +priceRangeMin, +priceRangeMax, hotelName, cityName, ...roomAmenities, ...hotelAmenities, +priceRangeMin, +priceRangeMax, +guestCount, sortBy, sortBy]);

    res.json({
        hotels: hotels
    });
}

export async function searchRooms(req, res) {
    const { roomName, guestCount, startDate, endDate, sortBy } = req.query;
    let orderByClause = '';
    switch (sortBy) {
        case 'price_asc':
            orderByClause = 'ORDER BY total_price_per_night ASC';
            break;
        case 'price_desc':
            orderByClause = 'ORDER BY total_price_per_night DESC';
            break;
        case 'type_asc':
            orderByClause = 'ORDER BY rt.room_type_name ASC';
            break;
        default:
            orderByClause = '';
    }

    try {
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
                     JOIN room_type rt ON r.room_type_id = rt.room_type_id
                     LEFT JOIN room_room_amenity rra ON r.room_id = rra.room_id
                     LEFT JOIN room_amenity ra ON rra.room_amenity_id = ra.room_amenity_id
                     LEFT JOIN hotel h ON r.hotel_id = h.hotel_id
                     LEFT JOIN (SELECT h1.hotel_id,
                                       SUM(ha1.hotel_amenity_price) AS total_hotel_amenities_price
                                FROM hotel h1
                                         JOIN hotel_hotel_amenity hha1 ON h1.hotel_id = hha1.hotel_id
                                         JOIN hotel_amenity ha1 ON hha1.hotel_amenity_id = ha1.hotel_amenity_id
                                GROUP BY h1.hotel_id) hap ON h.hotel_id = hap.hotel_id
                     LEFT JOIN (SELECT rbt.room_id,
                                       SUM(bt.capacity * rbt.bed_count) AS max_capacity
                                FROM room_bed_type rbt
                                         JOIN bed_type bt ON rbt.bed_type_id = bt.bed_type_id
                                GROUP BY rbt.room_id) rbc ON r.room_id = rbc.room_id
            WHERE h.hotel_id = ?
              AND r.room_name LIKE ?
              AND COALESCE(rbc.max_capacity, 0) >= ?
              AND (
                    ? IS NULL OR ? IS NULL OR
                    r.room_id NOT IN (
                        SELECT b.room_id
                        FROM booking b
                        WHERE (b.check_in_datetime < ? AND b.check_out_datetime > ?)
                           OR (b.check_in_datetime >= ? AND b.check_in_datetime < ?)
                           OR (b.check_out_datetime > ? AND b.check_out_datetime <= ?)
                    )
              )
            GROUP BY r.room_id, r.room_name, r.smoking_allowed, r.room_description, r.area, rt.room_type_name, rt.price_per_night,
                     hap.total_hotel_amenities_price, rbc.max_capacity
            ${orderByClause};
        `, [
            +req.params.id,
            `%${roomName || ''}%`,
            +guestCount || 1,
            startDate || null,
            endDate || null,
            endDate || new Date().toISOString(),
            startDate || new Date().toISOString(),
            startDate || new Date().toISOString(),
            endDate || new Date().toISOString(),
            startDate || new Date().toISOString(),
            endDate || new Date().toISOString()
        ]);

        res.json({ rooms: rooms });
    } catch (error) {
        console.error("Error searching rooms:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}



