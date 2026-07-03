import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getProfile,
  rechargeWallet,
  toggleDriverOnline,
  updateDriverLocation,
  getOnlineDrivers,
  getAdminUsersList
} from '../controllers/user.controller';

const router = Router();

// Profile operations
router.get('/profile', authMiddleware, getProfile);

// Passenger operations
router.post('/recharge', authMiddleware, rechargeWallet);
router.get('/online-drivers', authMiddleware, getOnlineDrivers);

// Driver operations
router.post('/driver/online', authMiddleware, toggleDriverOnline);
router.post('/driver/location', authMiddleware, updateDriverLocation);

// Admin operations
router.get('/admin/users', authMiddleware, getAdminUsersList);

export default router;
