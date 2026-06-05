import express from 'express';
import { isAuthanticated, register, login, logout, SendVerifyotp, VerifyEmail,SendPasswordResetOtp,ResetPassword } from '../controllers/authController.js';
import userAuth from '../middleware/userAuth.js';


const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/send-verify-otp',userAuth, SendVerifyotp);
authRouter.post('/verify-account',userAuth, VerifyEmail);
authRouter.post('/is-authenticated', userAuth, isAuthanticated);
authRouter.post('/send-password-reset-otp', SendPasswordResetOtp);
authRouter.post('/reset-password', ResetPassword);



export default authRouter;