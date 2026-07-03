import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage {
  senderRole: 'rider' | 'driver';
  message: string;
  timestamp: Date;
  read: boolean;
  image?: string;
}

export interface IRide extends Document {
  passenger: mongoose.Types.ObjectId; // User ref
  driver?: mongoose.Types.ObjectId;    // User ref (driver's user object)
  pickup: string;
  destination: string;
  pickupCoords: {
    lat: number;
    lng: number;
  };
  destinationCoords: {
    lat: number;
    lng: number;
  };
  status: 'pending' | 'searching' | 'accepted' | 'arriving' | 'arrived' | 'active' | 'completed' | 'cancelled' | 'failed';
  fare: number;
  distance: number;
  eta: number;
  vehicleType: 'economy' | 'comfort' | 'lux';
  paymentMethod: 'cash' | 'stripe' | 'wallet';
  paymentStatus: 'pending' | 'completed' | 'failed';
  rating?: number;
  review?: string;
  chatHistory: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  senderRole: { type: String, enum: ['rider', 'driver'], required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  image: { type: String }
});

const RideSchema = new Schema<IRide>({
  passenger: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: Schema.Types.ObjectId, ref: 'User' },
  pickup: { type: String, required: true },
  destination: { type: String, required: true },
  pickupCoords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  destinationCoords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['pending', 'searching', 'accepted', 'arriving', 'arrived', 'active', 'completed', 'cancelled', 'failed'],
    default: 'pending'
  },
  fare: { type: Number, required: true },
  distance: { type: Number, required: true },
  eta: { type: Number, required: true },
  vehicleType: { type: String, enum: ['economy', 'comfort', 'lux'], required: true },
  paymentMethod: { type: String, enum: ['cash', 'stripe', 'wallet'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  rating: { type: Number },
  review: { type: String },
  chatHistory: [ChatMessageSchema]
}, {
  timestamps: true
});

RideSchema.index({ passenger: 1 });
RideSchema.index({ driver: 1 });
RideSchema.index({ status: 1 });

export default mongoose.models.Ride || mongoose.model<IRide>('Ride', RideSchema);
