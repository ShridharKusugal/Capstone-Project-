import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage, Ride } from '../types';

export interface RideState {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  pickup: string;
  destination: string;
  pickupCoords: { lat: number; lng: number };
  destinationCoords: { lat: number; lng: number };
  status: Ride['status'];
  fare: number;
  distance: number;
  eta: number;
  vehicleType: 'economy' | 'comfort' | 'lux';
  driverId?: string;
  driverName?: string;
  paymentMethod: 'cash' | 'stripe' | 'wallet';
  paymentStatus: 'pending' | 'completed' | 'failed';
  rating?: number;
  review?: string;
  chatHistory?: ChatMessage[];
  createdAt: string;
}

interface RidesSliceState {
  currentRide: RideState | null;
  rideHistory: RideState[];
  nearbyRides: RideState[];
}

const initialState: RidesSliceState = {
  currentRide: null,
  rideHistory: [],
  nearbyRides: []
};

const rideSlice = createSlice({
  name: 'rides',
  initialState,
  reducers: {
    setCurrentRide(state, action: PayloadAction<RideState | null>) {
      state.currentRide = action.payload;
    },
    updateCurrentRideStatus(state, action: PayloadAction<RideState['status']>) {
      if (state.currentRide) {
        state.currentRide.status = action.payload;
      }
    },
    setRideHistory(state, action: PayloadAction<RideState[]>) {
      state.rideHistory = action.payload;
    },
    setNearbyRides(state, action: PayloadAction<RideState[]>) {
      state.nearbyRides = action.payload;
    },
    setPaymentStatus(state, action: PayloadAction<'pending' | 'completed' | 'failed'>) {
      if (state.currentRide) {
        state.currentRide.paymentStatus = action.payload;
        // sync ride status with payment phase
        if (action.payload === 'pending') state.currentRide.status = 'payment_pending';
        if (action.payload === 'completed') state.currentRide.status = 'payment_success';
        if (action.payload === 'failed') state.currentRide.status = 'failed';
      }
    },
    setRating(state, action: PayloadAction<{ rating: number; review?: string }>) {
      if (state.currentRide) {
        state.currentRide.rating = action.payload.rating;
        if (action.payload.review) state.currentRide.review = action.payload.review;
        state.currentRide.status = 'rating_pending';
      }
    },
    clearRidesState(state) {
      state.currentRide = null;
      state.rideHistory = [];
      state.nearbyRides = [];
    }
  }
});

export const { setCurrentRide, updateCurrentRideStatus, setRideHistory, setNearbyRides, clearRidesState } = rideSlice.actions;
export default rideSlice.reducer;
