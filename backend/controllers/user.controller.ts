import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import UserModel from '../models/user';
import DriverModel from '../models/driver';

const User = UserModel as any;
const Driver = DriverModel as any;

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    let driverInfo = null;
    if (user.role === 'driver') {
      driverInfo = await Driver.findOne({ user: userId });
    }

    res.json({
      status: 'success',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        walletBalance: user.walletBalance,
        isVerified: user.isVerified,
        savedPlaces: user.savedPlaces,
        driverInfo
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function rechargeWallet(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid recharge amount.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    user.walletBalance += amount;
    await user.save();

    res.json({
      status: 'success',
      message: 'Wallet recharged successfully.',
      walletBalance: user.walletBalance
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function toggleDriverOnline(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { isOnline } = req.body;

    const driver = await Driver.findOne({ user: userId });
    if (!driver) {
      return res.status(404).json({ status: 'error', message: 'Driver profile not found.' });
    }

    driver.isOnline = isOnline;
    await driver.save();

    res.json({
      status: 'success',
      isOnline: driver.isOnline
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function updateDriverLocation(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ status: 'error', message: 'Coordinates are required.' });
    }

    const driver = await Driver.findOne({ user: userId });
    if (!driver) {
      return res.status(404).json({ status: 'error', message: 'Driver profile not found.' });
    }

    driver.coords = { lat, lng };
    await driver.save();

    res.json({
      status: 'success',
      coords: driver.coords
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function getOnlineDrivers(req: AuthenticatedRequest, res: Response) {
  try {
    const drivers = await Driver.find({ isOnline: true })
      .populate('user', 'name phone email avatar')
      .select('coords vehicle averageRating ratingCount');

    res.json({
      status: 'success',
      drivers
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function getAdminUsersList(req: AuthenticatedRequest, res: Response) {
  try {
    const users = await User.find().select('-passwordHash');
    res.json({
      status: 'success',
      users
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}
