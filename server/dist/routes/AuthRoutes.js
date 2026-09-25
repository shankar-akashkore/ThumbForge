import express from 'express';
import { registerUser, loginUser, verfiyUser, logoutUser } from '../controllers/AuthControllers.js';
import protect from '../middlewares/auth.js';
import { rateLimit } from 'express-rate-limit';
const AuthRoutes = express.Router();
// Slows password brute-forcing and mass sign-ups (per IP)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: { message: 'Too many attempts. Please try again in 15 minutes.' },
});
AuthRoutes.post('/register', authLimiter, registerUser);
AuthRoutes.post('/login', authLimiter, loginUser);
AuthRoutes.get('/verify', protect, verfiyUser);
AuthRoutes.post('/logout', protect, logoutUser);
export default AuthRoutes;
