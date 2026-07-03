import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import UserModel from '../models/user';
import DriverModel from '../models/driver';

const User = UserModel as any;
const Driver = DriverModel as any;
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateOTP, getOTPExpiryTime, verifyOTP } from '../utils/otp';

export async function signup(req: Request, res: Response) {
  try {
    const { name, email, phone, password, role, licenseNumber, vehicleModel, vehiclePlate, vehicleColor, vehicleType } = req.body;

    // Check if user already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ status: 'error', message: 'Email is already registered.' });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ status: 'error', message: 'Phone number is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create User
    const newUser = new User({
      name,
      email,
      phone,
      passwordHash,
      role: role || 'rider',
      walletBalance: role === 'driver' ? 4500.00 : 15000.00, // Matching default sandbox values
      isVerified: false
    });

    const savedUser = await newUser.save();

    // If driver, create Driver and Vehicle model
    if (role === 'driver') {
      if (!licenseNumber || !vehicleModel || !vehiclePlate || !vehicleColor) {
        // Rollback user creation
        await User.findByIdAndDelete(savedUser._id);
        return res.status(400).json({ status: 'error', message: 'Driver registration requires license and vehicle details.' });
      }

      const newDriver = new Driver({
        user: savedUser._id,
        isOnline: false,
        licenseNumber,
        coords: { lat: 28.6139, lng: 77.2090 }, // Delhi CP
        vehicle: {
          model: vehicleModel,
          plateNumber: vehiclePlate,
          color: vehicleColor,
          vehicleType: vehicleType || 'economy'
        }
      });
      await newDriver.save();
    }

    // Generate tokens
    const payload = { userId: savedUser._id.toString(), role: savedUser.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token to user
    savedUser.refreshTokens.push(refreshToken);
    await savedUser.save();

    res.status(201).json({
      status: 'success',
      message: 'Registration successful.',
      accessToken,
      refreshToken,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        role: savedUser.role,
        walletBalance: savedUser.walletBalance
      }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ status: 'error', message: 'Invalid email or password.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ status: 'error', message: 'Your account has been suspended.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ status: 'error', message: 'Invalid email or password.' });
    }

    const payload = { userId: user._id.toString(), role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshTokens.push(refreshToken);
    await user.save();

    // Fetch driver details if driver
    let driverDetails = null;
    if (user.role === 'driver') {
      driverDetails = await Driver.findOne({ user: user._id });
    }

    res.json({
      status: 'success',
      message: 'Login successful.',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        walletBalance: user.walletBalance,
        isVerified: user.isVerified,
        driverInfo: driverDetails
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function requestOTP(req: Request, res: Response) {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    const otp = generateOTP();
    user.otpCode = otp;
    user.otpExpiry = getOTPExpiryTime();
    await user.save();

    // In a real system, we would trigger Nodemailer or Twilio SMS here.
    console.log(`[SMS Gateway Simulator] OTP for ${phone}: ${otp}`);

    res.json({
      status: 'success',
      message: 'OTP sent successfully (Simulated).',
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined // Hide OTP in production
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function verifyOTPCode(req: Request, res: Response) {
  try {
    const { phone, otp } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    if (!user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ status: 'error', message: 'No active OTP request found.' });
    }

    const isValid = verifyOTP(otp, user.otpCode, user.otpExpiry);
    if (!isValid) {
      return res.status(400).json({ status: 'error', message: 'Invalid or expired OTP.' });
    }

    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({
      status: 'success',
      message: 'Phone number verified successfully.'
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ status: 'error', message: 'Refresh token is required.' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ status: 'error', message: 'Token is revoked or user not found.' });
    }

    // Rotate token
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    
    const payload = { userId: user._id.toString(), role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({
      status: 'success',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const decoded = verifyRefreshToken(refreshToken);
      if (decoded) {
        const user = await User.findById(decoded.userId);
        if (user) {
          user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
          await user.save();
        }
      }
    }
    res.json({ status: 'success', message: 'Logged out successfully.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}
