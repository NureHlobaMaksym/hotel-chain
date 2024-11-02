import express from 'express';
import mysql2 from "mysql2";

const app = express();
app.set('view engine', 'ejs');
const connection = mysql2.createConnection({
    host: 'localhost',
    port: 3306,
    database: 'hotel_chain',
    user: 'root',
    password: ''
});
connection.connect(function (err) {
    if (err) {
        console.log("error occurred while connecting" + err);
    } else {
        console.log("connection created with mysql successfully");
    }
});

app.get('/', (req, res) => {
    res.send('Hello World');
});
app.get('/hotels', async (req, res) => {
    const hotels = await runDBCommand(`
            SELECT *,
                (SELECT hotel_photograph_url FROM hotel_photograph WHERE hotel.hotel_id = hotel_photograph.hotel_id LIMIT 1) as hotel_photograph_url,
                (SELECT hotel_photograph.hotel_photograph_description FROM hotel_photograph WHERE hotel_photograph.hotel_id = hotel.hotel_id LIMIT 1) as hotel_photograph_description
            FROM hotel
        `);
    res.render('hotels', {hotels: hotels});
})

app.get('/hotel/:id', async (req, res) => {
    const hotel = (await runDBCommand(`SELECT * FROM hotel WHERE hotel_id = ${req.params.id}`))[0];
    const photographs = await runDBCommand(`SELECT * FROM hotel_photograph WHERE hotel_id = ${req.params.id}`);
    const rooms = await runDBCommand(`SELECT * FROM room WHERE hotel_id = ${req.params.id}`);
    res.render('hotel', {hotel: hotel, photographs: photographs, rooms: rooms});
})

const port = 3000;

app.listen(port, () => {
    console.log("Server listening on port ${port}");
});

function runDBCommand(sqlQuery) {
    return new Promise((resolve, reject) => {
        connection.query(sqlQuery, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}