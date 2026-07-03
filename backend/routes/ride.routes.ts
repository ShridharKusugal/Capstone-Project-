import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  bookRide,
  getActiveRide,
  getRideHistory,
  acceptRide,
  updateRideStatus,
  submitReview,
  getNearbyRides,
  getAdminAllRides,
  clearAllRidesData
} from '../controllers/ride.controller';

const router = Router();

// Passenger actions
router.post('/book', authMiddleware, bookRide);
router.get('/active', authMiddleware, getActiveRide);
router.get('/history', authMiddleware, getRideHistory);
router.post('/:id/review', authMiddleware, submitReview);

// Driver actions
router.get('/nearby', authMiddleware, getNearbyRides);
router.post('/:id/accept', authMiddleware, acceptRide);
router.post('/:id/status', authMiddleware, updateRideStatus);

// Admin actions
router.get('/admin/all', authMiddleware, getAdminAllRides);
router.post('/clear', clearAllRidesData); // Reset sandbox

export default router;
