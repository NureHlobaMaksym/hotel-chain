import jwt from "jsonwebtoken";

const JWT_SECRET_KEY = 'test_key';
export function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }

    jwt.verify(token, JWT_SECRET_KEY, (err, user) => {
        if (err) {
            return res.redirect('/login');
        }
        req.user = user;
        next();
    });
}

export function setJWTToken(user, res) {
    const token = jwt.sign(
        {user_id: user.user_id, email: user.email},
        JWT_SECRET_KEY,
        {expiresIn: '24h'}
    );

    res.cookie('token', token, {httpOnly: true, maxAge: 86400000});
}