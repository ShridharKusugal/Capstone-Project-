import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import RideModel from '../models/ride';
import UserModel from '../models/user';
import DriverModel from '../models/driver';

const Ride = RideModel as any;
const User = UserModel as any;
const Driver = DriverModel as any;

export async function bookRide(req: AuthenticatedRequest, res: Response) {
  try {
    const passengerId = req.user?.userId;
    const { pickup, destination, pickupCoords, destinationCoords, vehicleType, paymentMethod, fare, distance, eta } = req.body;

    if (!passengerId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized.' });
    }

    // Check if passenger already has a active ride
    const activeRide = await Ride.findOne({
      passenger: passengerId,
      status: { $in: ['pending', 'searching', 'accepted', 'arriving', 'arrived', 'active'] }
    });

    if (activeRide) {
      return res.status(400).json({ status: 'error', message: 'You already have an active booking.' });
    }

    // Validate wallet balance if choosing wallet
    if (paymentMethod === 'wallet') {
      const user = await User.findById(passengerId);
      if (!user || user.walletBalance < fare) {
        return res.status(400).json({ status: 'error', message: 'Insufficient wallet balance.' });
      }
    }

    const newRide = new Ride({
      passenger: passengerId,
      pickup,
      destination,
      pickupCoords,
      destinationCoords,
      status: 'pending',
      fare,
      distance,
      eta,
      vehicleType,
      paymentMethod,
      paymentStatus: 'pending'
    });

    await newRide.save();

    // Populate passenger info
    const populated = await newRide.populate('passenger', 'name email phone avatar');

    res.status(201).json({
      status: 'success',
      ride: populated
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function getActiveRide(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized.' });
    }

    let query: any = {};
    if (role === 'rider') {
      query = {
        passenger: userId,
        status: { $in: ['pending', 'searching', 'accepted', 'arriving', 'arrived', 'active'] }
      };
    } else if (role === 'driver') {
      query = {
        driver: userId,
        status: { $in: ['accepted', 'arriving', 'arrived', 'active'] }
      };
    } else {
      return res.status(403).json({ status: 'error', message: 'Forbidden.' });
    }

    const ride = await Ride.findOne(query)
      .populate('passenger', 'name email phone avatar walletBalance')
      .populate('driver', 'name email phone avatar');

    res.json({
      status: 'success',
      ride: ride || null
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function getRideHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized.' });
    }

    const query = role === 'rider' ? { passenger: userId } : { driver: userId };
    const rides = await Ride.find(query)
      .populate('passenger', 'name email phone')
      .populate('driver', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      rides
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function acceptRide(req: AuthenticatedRequest, res: Response) {
  try {
    const driverUserId = req.user?.userId;
    const { id: rideId } = req.params;

    if (!driverUserId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized.' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ status: 'error', message: 'Ride booking request not found.' });
    }

    if (ride.status !== 'pending' && ride.status !== 'searching') {
      return res.status(400).json({ status: 'error', message: 'Ride has already been accepted or cancelled.' });
    }

    // Verify driver exists
    const driverProfile = await Driver.findOne({ user: driverUserId });
    if (!driverProfile) {
      return res.status(400).json({ status: 'error', message: 'Driver profile not setup.' });
    }

    // Accept
    ride.driver = driverUserId;
    ride.status = 'accepted';
    await ride.save();

    const populated = await ride.populate([
      { path: 'passenger', select: 'name email phone avatar' },
      { path: 'driver', select: 'name email phone avatar' }
    ]);

    res.json({
      status: 'success',
      ride: populated
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function updateRideStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: rideId } = req.params;
    const { status } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ status: 'error', message: 'Ride booking request not found.' });
    }

    ride.status = status;

    if (status === 'completed') {
      ride.paymentStatus = 'completed';
      
      // Deduct wallet balance from passenger if using wallet
      if (ride.paymentMethod === 'wallet') {
        const passenger = await User.findById(ride.passenger);
        if (passenger) {
          passenger.walletBalance = Math.max(0, passenger.walletBalance - ride.fare);
          await passenger.save();
        }
      }

      // Add split earnings (90%) to driver's user wallet balance
      if (ride.driver) {
        const driverUser = await User.findById(ride.driver);
        if (driverUser) {
          const earning = ride.fare * 0.90;
          driverUser.walletBalance += earning;
          await driverUser.save();
        }
      }
    } else if (status === 'cancelled') {
      // Apply cancellation fee penalty if active trip was cancelled (e.g. 400 INR)
      const passenger = await User.findById(ride.passenger);
      if (passenger) {
        passenger.walletBalance = Math.max(0, passenger.walletBalance - 400);
        await passenger.save();
      }
    }

    await ride.save();
    
    const populated = await ride.populate([
      { path: 'passenger', select: 'name email phone avatar walletBalance' },
      { path: 'driver', select: 'name email phone avatar walletBalance' }
    ]);

    res.json({
      status: 'success',
      ride: populated
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function submitReview(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: rideId } = req.params;
    const { rating, review } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ status: 'error', message: 'Ride booking request not found.' });
    }

    ride.rating = rating;
    ride.review = review;
    await ride.save();

    // Recalculate driver's ratings average
    if (ride.driver) {
      const driverProfile = await Driver.findOne({ user: ride.driver });
      if (driverProfile) {
        const totalRatingsCount = driverProfile.ratingCount + 1;
        const currentTotalSum = (driverProfile.averageRating * driverProfile.ratingCount) + rating;
        driverProfile.averageRating = parseFloat((currentTotalSum / totalRatingsCount).toFixed(2));
        driverProfile.ratingCount = totalRatingsCount;
        await driverProfile.save();
      }
    }

    res.json({
      status: 'success',
      ride
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function getNearbyRides(req: AuthenticatedRequest, res: Response) {
  try {
    // Find all rides that are looking for drivers (pending status)
    const rides = await Ride.find({ status: 'pending' })
      .populate('passenger', 'name email phone avatar')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      rides
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function getAdminAllRides(req: AuthenticatedRequest, res: Response) {
  try {
    const rides = await Ride.find()
      .populate('passenger', 'name email phone walletBalance')
      .populate('driver', 'name email phone walletBalance')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      rides
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function clearAllRidesData(req: Request, res: Response) {
  try {
    await Ride.deleteMany({});
    
    // Reset user wallet balances to baseline
    await User.updateMany({ role: 'rider' }, { walletBalance: 15000.00 });
    await User.updateMany({ role: 'driver' }, { walletBalance: 4500.00 });
    
    // Update driver ratings to default 5.0
    await Driver.updateMany({}, { averageRating: 5.0, ratingCount: 0, isOnline: true });

    res.json({
      status: 'success',
      message: 'Sandbox state reset successfully.'
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}
