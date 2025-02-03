import runDBCommand from "../db/connection.js";

export async function getProfile(req,res){
    const userQuery = `SELECT * FROM user WHERE user_id = ?`;
    const user = (await runDBCommand(userQuery, [+req.user.user_id]))[0];
    const itemsPerPage = 4;
    const currentPage = parseInt(req.query.page) || 1;
    const offset = (currentPage - 1) * itemsPerPage;
    const countQuery = `SELECT COUNT(*) AS total FROM booking WHERE user_id = ?`;
    const totalItems = (await runDBCommand(countQuery, [+req.user.user_id]))[0].total;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const bookingsQuery = `
        SELECT check_in_datetime,
               check_out_datetime,
               booking_price,
               city,
               booking.room_id,
               room_name,
               hotel_name,
               hotel.hotel_id,
               booking.booking_id,
               (SELECT EXISTS(SELECT * FROM review WHERE review.booking_id = booking.booking_id)) AS review_exists,
               (SELECT room_photograph_url
                FROM room_photograph
                WHERE room.room_id = room_photograph.room_id
                LIMIT 1)                                                                          AS room_photograph_url,
               IF(check_out_datetime <= NOW(), 'Завершено', 'Активне')                            AS status
        FROM booking
                 JOIN room ON booking.room_id = room.room_id
                 JOIN hotel ON room.hotel_id = hotel.hotel_id
        WHERE user_id = ?
        ORDER BY creation_datetime DESC
        LIMIT ? OFFSET ?
    `;
    const bookings = await runDBCommand(bookingsQuery, [
        +req.user.user_id,
        +itemsPerPage,
        +offset
    ]);

    if (req.xhr) {
        return res.json({
            bookings,
            currentPage,
            totalPages
        });
    } else {
        res.render('profile', {
            user: user,
            bookings: bookings,
            currentPage: currentPage,
            totalPages: totalPages
        });
    }
}

export async function updateProfile(req,res){
    const {
        first_name,
        last_name,
        email,
        country,
        user_phone_number
    } = req.body;

    try {
        const emailCheckQuery = `SELECT * FROM user WHERE email = ? AND user_id != ?`;
        const existingUser = await runDBCommand(emailCheckQuery, [
            email,
            +req.user.user_id
        ]);

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ця електронна пошта вже використовується іншим користувачем.'
            });
        }

        const updateUserQuery = `
            UPDATE user
            SET first_name        = ?,
                last_name         = ?,
                email             = ?,
                country           = ?,
                user_phone_number = ?
            WHERE user_id = ?;
            SELECT * FROM user WHERE user_id = ?;
        `;
        const user = (await runDBCommand(updateUserQuery, [
            first_name,
            last_name,
            email,
            country,
            user_phone_number,
            +req.user.user_id,
            +req.user.user_id
        ]))[0];

        res.status(200).json({
            success: true,
            user: user
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка сервера'
        });
    }
}

export async function deleteProfile(req,res){
    const userId = req.user.user_id;

    try {
        const deleteUserQuery = `DELETE FROM user WHERE user_id = ?`;

        await runDBCommand(deleteUserQuery, [+userId]);
        res.clearCookie('token');
        res.status(200).json({"success": true});
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({"success": false});
    }
}

export async function getProfileStatistics(req,res) {
    const statistics = (await runDBCommand(`
        SELECT IFNULL(COUNT(1), 0)                           AS booking_count,
               (SELECT IFNULL(SUM(booking_price), 0)
                FROM booking
                WHERE booking.check_out_datetime < NOW()
                  AND user_id = ?)                           AS total_booking_price,
               IFNULL(COUNT(review_id), 0)                   AS review_count
        FROM booking
                 LEFT JOIN review ON booking.booking_id = review.booking_id
        WHERE user_id = ?
    `, [+req.user.user_id, +req.user.user_id]))[0];

    res.status(200).json({
        "success": true,
        statistics: statistics
    });
}