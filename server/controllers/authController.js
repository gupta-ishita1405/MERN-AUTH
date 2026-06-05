import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import userModel from "../models/userModel.js"
import nodemailer from "nodemailer"
import transporter from "../config/nodemailer.js"




export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.json({success: false, message: "Please fill all the fields"})
        }

        const existingUser = await userModel.findOne({email})

        if(existingUser){
            return res.json({success: false, message: "User already exists"})
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = new userModel({
            name,
            email,
            password: hashedPassword
        })
        await user.save()

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: "7d"})

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to:user.email,
            subject: 'Welcome to our app',
            text: `Hello ${user.name},\n\nThank you for registering on our app! We're excited to have you on board.\n\nBest regards,\nThe Team`
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch(emailError) {
            console.log("Email sending error:", emailError.message);
        }
        
        return res.json({success: true, message: "User registered successfully", user, token})
    }
    catch(error){
        console.log("Registration error:", error.message);
        console.log(error.stack);
        return res.json({success: false, message: "Error in registering user"})
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.json({success: false, message: "Please fill all the fields"})
        }   

        const user = await userModel.findOne({email})
        if (!user) {
            return res.json({success: false, message: "User does not exist"})
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.json({success: false, message: "Invalid credentials"})
        }
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: "7d"})
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        return res.json({success: true, message: "User logged in successfully", user, token})
    }
    catch(error){
        console.log(error)
        return res.json({success: false, message: "Error in logging in user"})
    }
    }


export const logout = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : 'strict',
        })
        return res.json({success: true, message: "User logged out successfully"})
    }
    catch(error){
        console.log(error)
        return res.json({success: false, message: "Error in logging out user"})
    }
}

//Send OTP for password reset
export const SendVerifyotp = async (req, res) => {
    try {
        const  userId  = req.userId;

        const user = await userModel.findById(userId)
        if (!user) {
            return res.json({ success: false, message: "User not found" })}
        if (user.isAccountVerified) {
            return res.json({ success: false, message: "Account already verified" })}

        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const otpExpireAt = Date.now() +24 * 60 * 60 * 1000

        user.verifyotp = otp
        user.verifyotpExpireAt = otpExpireAt
        await user.save()

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to:user.email,
            subject: 'Your OTP for account verification',
            text: `Hello ${user.name},\n\nYour OTP is ${otp}\n\nThis OTP is valid for 24 hours.`
        };

            await transporter.sendMail(mailOptions);
            return res.json({ success: true, message: "OTP sent successfully", otp })
        
 
    } catch (error) {
        console.log("SendVerifyotp error:", error);
        res.json({ success: false, message: "Error in sending OTP", error: error.message })
    }
}
//Verify OTP and verify email
export const VerifyEmail = async (req, res) => {
    const {  otp } = req.body;
        const userId = req.userId;
    if (!userId || !otp) {
        return res.json({ success: false, message: "Please provide both User ID and OTP" })
    }
    try {
        const user = await userModel.findById(userId)   
        if (!user) {
            return res.json({ success: false, message: "User not found" })
        }
        if (user.verifyotp === '' || user.verifyotp !== otp) {
            return res.json({ success: false, message: "Invalid OTP" })
        }
        if (user.verifyotpExpireAt < Date.now()) {
            return res.json({ success: false, message: "OTP expired" })
        }
        user.isAccountVerified = true;
        user.verifyotp = '';
        user.verifyotpExpireAt = 0;
        await user.save();
        return res.json({ success: true, message: "Email verified successfully" })
    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: "Error in verifying email" })
    }
}

//Check if user is authenticated or not
export const isAuthanticated = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.json({ success: false, message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return res.json({ success: true, message: "User is authenticated" });
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: "Invalid token" });
    }
};

//Send password reset otp
export const SendPasswordResetOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.json({ success: false, message: "Please provide email" })
    }
    try {
        const user = await userModel.findOne({ email }) 
        if (!user) {
            return res.json({ success: false, message: "User not found" })
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.resetotp = otp;
        user.resetotpExpireAt = Date.now() + 15 * 60 * 1000;
        await user.save();
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Your OTP for password reset',
            text: `Hello ${user.name},\n\nYour OTP for password reset is ${otp}\n\nThis OTP is valid for 15 minutes.`
        };
        await transporter.sendMail(mailOptions);

        return res.json({ success: true, message: "Password reset OTP sent successfully" })
    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: "Error in sending password reset OTP" })
    }
}


//Reset User password
export const ResetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        return res.json({ success: false, message: "Please provide email, OTP and new password" })
    }  
    try {
        const user = await userModel.findOne({ email })
        if (!user) {
            return res.json({ success: false, message: "User not found" })
        }
        if (user.resetotp === '' || user.resetotp !== otp) {
            return res.json({ success: false, message: "Invalid OTP" })
        }
        if (user.resetotpExpireAt < Date.now()) {
            return res.json({ success: false, message: "OTP expired" })
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetotp = '';
        user.resetotpExpireAt = 0;
        await user.save();
        return res.json({ success: true, message: "Password reset successfully" })
    }catch (error) {
        console.log(error)
        return res.json({ success: false, message: "Error in resetting password" })
    }
}