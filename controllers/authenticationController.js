import runDBCommand from "../db/connection.js";
import bcrypt from "bcrypt";
import {setJWTToken} from "../authentication/authentication.js";

export function getRegistration(req,res){
    res.render('register', {errorMessage: null});
}

export async function register(req,res){
    const {
        first_name,
        last_name,
        email,
        country,
        user_phone_number,
        password} = req.body;
    const data = {
        first_name,
        last_name,
        email,
        country,
        user_phone_number
    }
    const phoneRegex = /^[+\d]?(?:[\d-.\s()]*)$/;

    if (!phoneRegex.test(user_phone_number)) {
        return res.render('register', {
            errorMessage: 'Неправильний формат номера телефону.',
            data
        });
    }

    if (password.length < 4) {
        return res.render('register', {
            errorMessage: 'Пароль має містити щонайменше 4 символи.',
            data
        });
    }

    try {
        const existingUserQuery = `SELECT * FROM user WHERE email = ?`;
        const existingUsers = await runDBCommand(existingUserQuery, [email]);

        if (existingUsers.length > 0) {
            return res.render('register', {errorMessage: 'Ця електронна пошта вже використовується.', data});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertUserQuery = `
            INSERT INTO user (
                first_name, 
                last_name, 
                email, 
                country, 
                user_phone_number, 
                password)
            VALUES (?, ?, ?, ?, ?, ?);
            SELECT LAST_INSERT_ID() AS id
        `;
        const userId = (await runDBCommand(insertUserQuery, [
            first_name,
            last_name,
            email,
            country,
            user_phone_number,
            hashedPassword
        ]))[1][0].id;
        const user = {
            user_id: userId,
            email: email
        };

        setJWTToken(user, res);

        res.redirect('/');
    } catch (error) {
        console.error('Помилка при реєстрації користувача:', error);
        res.status(500).render('register', {
            errorMessage: 'Помилка сервера. Спробуйте пізніше.',
            data
        });
    }
}

export function getLogin(req,res){
    res.render('login', {errorMessage: null});
}

export async function login(req,res){
    const {
        email,
        password
    } = req.body;

    try {
        const userQuery = `SELECT * FROM user WHERE email = ?`;
        const users = await runDBCommand(userQuery, [email]);

        if (users.length === 0) {
            return res.render('login', {
                errorMessage: 'Неправильний email або пароль.',
                data: {email: email}
            });
        }

        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.render('login', {
                errorMessage: 'Неправильний email або пароль.',
                data: {email: email}
            });
        }

        setJWTToken(user, res);

        res.redirect('/');
    } catch (error) {
        console.error('Помилка при вході:', error);
        res.status(500).render('login', {errorMessage: 'Помилка сервера. Спробуйте пізніше.'});
    }
}

export function logout(req,res){
    res.clearCookie('token');
    res.redirect('/login');
}