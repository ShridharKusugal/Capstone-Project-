import { Router } from 'express';
import authRoutes from './auth.routes';
import rideRoutes from './ride.routes';
import userRoutes from './user.routes';

const router = Router();

// Mount all modular endpoints
router.use('/auth', authRoutes);
router.use('/rides', rideRoutes);
router.use('/users', userRoutes);

export default router;
