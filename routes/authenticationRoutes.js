import express from "express";

import {
    authenticateToken
} from "../authentication/authentication.js";

import {
    getRegistration,
    register,
    getLogin,
    login,
    logout
} from "../controllers/authenticationController.js";

const router = express.Router();

router.get('/register', getRegistration);
router.post('/register', register);
router.get('/login', getLogin);
router.post('/login', login);
router.get('/logout', authenticateToken, logout);

export default router;