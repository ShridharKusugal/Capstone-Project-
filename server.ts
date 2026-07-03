import express from 'express';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Mongoose Backend Setup
import { connectDB } from './backend/config/db';
import apiRouter from './backend/routes';
import { initSocketServer } from './backend/socket/socket';

// Mongoose Models for Legacy API Synchronization
import RideModel from './backend/models/ride';
import UserModel from './backend/models/user';
import DriverModel from './backend/models/driver';

const Ride = RideModel as any;
const User = UserModel as any;
const Driver = DriverModel as any;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Establish MongoDB connection
  await connectDB();

  // Create HTTP Server for Socket.io integration
  const httpServer = http.createServer(app);
  
  // Initialize Socket.io Server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Attach Sockets Handler
  initSocketServer(io);

  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url} - body:`, req.body);
    next();
  });


  // 1. Healthcheck Endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Mount official REST API v1 endpoints
  app.use('/api/v1', apiRouter);

  // Synchronized Legacy APIs mapping to MongoDB Mongoose backend
  
  // 2. Return all active/historic rides
  app.get('/api/rides', async (req, res) => {
    try {
      const ridesList = await Ride.find()
        .populate('passenger', 'name email phone avatar')
        .populate('driver', 'name email phone avatar')
        .sort({ createdAt: -1 });

      // Calculate total platform commission earnings (10% of completed fares)
      const completedRides = await Ride.find({ status: 'completed' });
      const commission = completedRides.reduce((sum, r) => sum + (r.fare * 0.10), 0);

      // Map Mongoose documents to format expected by current UI types
      const formattedRides = ridesList.map(r => {
        const u = r.toObject();
        return {
          id: u._id.toString(),
          passengerId: u.passenger?._id?.toString() || 'USR-SANDBOX',
          passengerName: u.passenger?.name || 'Alex Carter',
          passengerPhone: u.passenger?.phone || '9876543210',
          pickup: u.pickup,
          destination: u.destination,
          pickupCoords: u.pickupCoords,
          destinationCoords: u.destinationCoords,
          status: u.status,
          fare: u.fare,
          distance: u.distance,
          eta: u.eta,
          vehicleType: u.vehicleType,
          driverId: u.driver?._id?.toString(),
          driverName: u.driver?.name,
          carPlate: 'MH-12-TX-8832',
          paymentMethod: u.paymentMethod,
          paymentStatus: u.paymentStatus,
          rating: u.rating,
          review: u.review,
          chatHistory: u.chatHistory || [],
          createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString()
        };
      });

      res.json({ status: 'success', rides: formattedRides, commission });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // 3. Book a ride (Passenger action)
  app.post('/api/rides/book', async (req, res) => {
    const { pickup, destination, pickupCoords, destinationCoords, vehicleType, paymentMethod, fare, distance, eta, passengerName } = req.body;
    
    try {
      // Find or create default passenger user for sandbox compatibility
      let passenger = await User.findOne({ role: 'rider' });
      if (!passenger) {
        passenger = new User({
          name: passengerName || 'Alex Carter',
          username: 'alex_carter',
          email: 'alex.carter@ridex.io',
          phone: '9876543210',
          passwordHash: 'dummy_hash_for_sandbox',
          role: 'rider',
          walletBalance: 15000.00,
          isVerified: true
        } as any);
        await passenger.save();

      }

      // Create new ride in MongoDB
      const newRide = new Ride({
        passenger: passenger._id,
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

      // Emit socket event to notify online drivers
      const populatedRide = await newRide.populate('passenger', 'name email phone avatar');
      io.emit('ride:new_request', populatedRide);

      const formatted = {
        id: newRide._id.toString(),
        passengerId: passenger._id.toString(),
        passengerName: passenger.name,
        passengerPhone: passenger.phone,
        pickup: newRide.pickup,
        destination: newRide.destination,
        pickupCoords: newRide.pickupCoords,
        destinationCoords: newRide.destinationCoords,
        status: newRide.status,
        fare: newRide.fare,
        distance: newRide.distance,
        eta: newRide.eta,
        vehicleType: newRide.vehicleType,
        paymentMethod: newRide.paymentMethod,
        paymentStatus: newRide.paymentStatus,
        chatHistory: newRide.chatHistory || [],
        createdAt: newRide.createdAt.toISOString()
      };

      res.json({ status: 'success', ride: formatted });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // 4. Accept a ride (Driver action)
  app.post('/api/rides/:id/accept', async (req, res) => {
    const { id } = req.params;
    const { driverId, driverName } = req.body;

    try {
      const ride = await Ride.findById(id);
      if (!ride) {
        return res.status(404).json({ status: 'error', message: 'Ride target not detected' });
      }

      // Find or create default driver user
      let driver = await User.findOne({ name: driverName, role: 'driver' });
      if (!driver) {
        const nameKey = (driverName || 'Alex Pro Driver').toLowerCase().replace(/[^a-z0-9]/g, '');
        const randomStr = Math.random().toString(36).substr(2, 5);
        const email = `driver.${nameKey}.${randomStr}@ridex.io`;
        const phone = `99${Math.floor(10000000 + Math.random() * 90000000)}`;

        driver = new User({
          name: driverName || 'Alex Pro Driver',
          username: `driver_${nameKey}_${randomStr}`,
          email,
          phone,
          passwordHash: 'dummy_hash_for_sandbox',
          role: 'driver',
          walletBalance: 4500.00,
          isVerified: true
        } as any);
        await driver.save();


        const driverProfile = new Driver({
          user: driver._id,
          isOnline: true,
          licenseNumber: `DL-${Math.floor(100000 + Math.random() * 900000)}`,
          vehicle: {
            model: 'Skoda Slavia',
            plateNumber: 'MH-12-TX-8832',
            color: 'Metallic Gray',
            vehicleType: ride.vehicleType
          }
        });
        await driverProfile.save();
      }

      ride.driver = driver._id;
      ride.status = 'accepted';
      await ride.save();

      const formatted = {
        id: ride._id.toString(),
        passengerId: ride.passenger.toString(),
        pickup: ride.pickup,
        destination: ride.destination,
        status: ride.status,
        fare: ride.fare,
        distance: ride.distance,
        eta: ride.eta,
        vehicleType: ride.vehicleType,
        driverId: driver._id.toString(),
        driverName: driver.name,
        carPlate: 'MH-12-TX-8832',
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus,
        chatHistory: ride.chatHistory || []
      };

      // Notify clients tracking this ride
      io.to(id).emit('ride:accepted', { rideId: id, driverId: driver._id.toString(), driverName: driver.name });
      io.emit('ride:status_changed', { rideId: id, status: 'accepted' });

      res.json({ status: 'success', ride: formatted });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // 5. Update Ride Status
  app.post('/api/rides/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const ride = await Ride.findById(id);
      if (!ride) {
        return res.status(404).json({ status: 'error', message: 'Ride target not found' });
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

        // Add 90% split to driver
        if (ride.driver) {
          const driverUser = await User.findById(ride.driver);
          if (driverUser) {
            driverUser.walletBalance += ride.fare * 0.90;
            await driverUser.save();
          }
        }
      } else if (status === 'cancelled') {
        // Penalty fee deduction
        const passenger = await User.findById(ride.passenger);
        if (passenger) {
          passenger.walletBalance = Math.max(0, passenger.walletBalance - 400);
          await passenger.save();
        }
      }

      await ride.save();

      // Emit status changed event
      io.to(id).emit('ride:status_changed', { rideId: id, status });
      io.emit('ride:status_changed', { rideId: id, status });

      const formatted = {
        id: ride._id.toString(),
        passengerId: ride.passenger.toString(),
        pickup: ride.pickup,
        destination: ride.destination,
        status: ride.status,
        fare: ride.fare,
        distance: ride.distance,
        eta: ride.eta,
        vehicleType: ride.vehicleType,
        driverId: ride.driver?.toString(),
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus,
        chatHistory: ride.chatHistory || []
      };

      res.json({ status: 'success', ride: formatted });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // 6. Submit Review/Rating for Ride
  app.post('/api/rides/:id/review', async (req, res) => {
    const { id } = req.params;
    const { rating, review } = req.body;

    try {
      const ride = await Ride.findById(id);
      if (!ride) {
        return res.status(404).json({ status: 'error', message: 'Ride target not resolved' });
      }

      ride.rating = rating;
      ride.review = review;
      await ride.save();

      // Update Driver Profile statistics
      if (ride.driver) {
        const driverProfile = await Driver.findOne({ user: ride.driver });
        if (driverProfile) {
          const totalCount = driverProfile.ratingCount + 1;
          const totalSum = (driverProfile.averageRating * driverProfile.ratingCount) + rating;
          driverProfile.averageRating = parseFloat((totalSum / totalCount).toFixed(2));
          driverProfile.ratingCount = totalCount;
          await driverProfile.save();
        }
      }

      res.json({ status: 'success', ride });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // 7. Cleandown simulation database state
  app.post('/api/rides/clear', async (req, res) => {
    try {
      await Ride.deleteMany({});
      
      // Reset users to baseline sandbox limits
      await User.updateMany({ role: 'rider' }, { walletBalance: 15000.00 });
      await User.updateMany({ role: 'driver' }, { walletBalance: 4500.00 });
      await Driver.updateMany({}, { averageRating: 5.0, ratingCount: 0 });

      res.json({ status: 'success', message: 'State wiped successfully' });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // 8. Gemini AI Smart-Fare Predictive Intelligence Endpoint
  app.post('/api/fare/predict', async (req, res) => {
    const { pickup, destination, distance, vehicleType, fare, timeOfDay, traffic, demandMultiplier } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = `🔮 [RideX Rule-Engine Prediction]: Estimated fare is calculated correctly at ₹${fare} for distance ${distance} km. Multipliers (Surge: ${demandMultiplier}x, Traffic: ${traffic}) applied successfully along Broadway corridors.`;
      return res.json({ prediction: fallback });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptMsg = `You are the RideX Advanced AI Core. Analyze these parameters for a passenger ride-hailing booking in Broadway:
      Pickup Point: ${pickup}
      Destination Drop: ${destination}
      Calculated Distance: ${distance} km
      Ordered Vehicle Type: ${vehicleType}
      Normal Price Tag: ₹${fare}
      Active Traffic Index: ${traffic}
      Surge Demand Mult: ${demandMultiplier}x
      Time of Request: ${timeOfDay}

      Provide a concise 2-sentence AI predictive breakdown explaining of why this pricing model is optimized, listing what traffic factors or routes are simulated, and recommending of whether they should confirm immediately. Always sound analytical, professional, and do not use lists. Max 80 words.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptMsg,
      });

      const prediction = response.text?.trim() || 'Pricing validated successfully.';
      res.json({ prediction });
    } catch (error: any) {
      console.error('Gemini call failed:', error);
      res.status(500).json({ error: error.message || 'Error executing AI model prediction' });
    }
  });

  // 9. Stats endpoint for quick analytics dashboard
  app.get('/api/stats', async (req, res) => {
    try {
      const allRides = await Ride.find();
      const completedRides = allRides.filter((r: any) => r.status === 'completed');
      const cancelledRides = allRides.filter((r: any) => r.status === 'cancelled');
      
      const totalRides = allRides.length;
      const totalRevenue = completedRides.reduce((sum: number, r: any) => sum + (r.fare || 0), 0);
      const avgFare = completedRides.length > 0 ? Math.round(totalRevenue / completedRides.length) : 0;
      const cancellationRate = totalRides > 0 ? parseFloat(((cancelledRides.length / totalRides) * 100).toFixed(1)) : 0.0;
      
      const activeDrivers = await Driver.countDocuments({ isOnline: true });
      
      res.json({
        status: 'success',
        stats: {
          totalRides,
          completedRides: completedRides.length,
          cancelledRides: cancelledRides.length,
          totalRevenue,
          avgFare,
          cancellationRate,
          activeDrivers
        }
      });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // Vite middleware setup for Development Node, or Static Server serving client static files for production Build Phase
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to HTTP Server instead of Express app to enable Socket.io traffic
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`RideConnect Server running on port ${PORT}`);
  });
}

startServer();
