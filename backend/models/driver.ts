import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicle {
  model: string;
  plateNumber: string;
  color: string;
  vehicleType: 'economy' | 'comfort' | 'lux';
}

export interface IDriver extends Document {
  user: mongoose.Types.ObjectId;
  isOnline: boolean;
  licenseNumber: string;
  backgroundCheckStatus: 'pending' | 'approved' | 'rejected';
  averageRating: number;
  ratingCount: number;
  coords: {
    lat: number;
    lng: number;
  };
  vehicle: IVehicle;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>({
  model: { type: String, required: true },
  plateNumber: { type: String, required: true, unique: true },
  color: { type: String, required: true },
  vehicleType: { type: String, enum: ['economy', 'comfort', 'lux'], default: 'economy' }
});

const DriverSchema = new Schema<IDriver>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  isOnline: { type: Boolean, default: false },
  licenseNumber: { type: String, required: true, unique: true },
  backgroundCheckStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  averageRating: { type: Number, default: 5.0 },
  ratingCount: { type: Number, default: 0 },
  coords: {
    lat: { type: Number, default: 28.6139 }, // Delhi CP default
    lng: { type: Number, default: 77.2090 }
  },
  vehicle: { type: VehicleSchema, required: true }
}, {
  timestamps: true
});

// Geo Index and Lookup indexes
DriverSchema.index({ 'coords.lat': 1, 'coords.lng': 1 });
DriverSchema.index({ isOnline: 1 });

export default mongoose.models.Driver || mongoose.model<IDriver>('Driver', DriverSchema);
