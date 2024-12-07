import express from "express";

import {
    authenticateToken
} from "../authentication/authentication.js";

import {getIndex} from "../controllers/indexController.js";

const router = express.Router();

router.get('/', authenticateToken, getIndex)

export default router;