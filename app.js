import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from "express";
import hotelRoutes from "./routes/hotelRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import authenticationRoutes from "./routes/authenticationRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(bodyParser.json());
app.use("/", authenticationRoutes);
app.use("/", bookingRoutes);
app.use("/", hotelRoutes);
app.use("/", profileRoutes);
app.use("/", reviewRoutes);

app.listen(port, () => {
    console.log("Server listening on port ${port}");
});


