import { Router } from 'express';
import { signup, login, requestOTP, verifyOTPCode, refresh, logout } from '../controllers/auth.controller';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/otp/request', requestOTP);
router.post('/otp/verify', verifyOTPCode);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
