import mongoose, { Schema, Document } from 'mongoose';

export interface ISavedPlace {
  label: string;
  address: string;
  coords?: {
    lat: number;
    lng: number;
  };
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'rider' | 'driver' | 'admin';
  avatar?: string;
  walletBalance: number;
  isVerified: boolean;
  isBanned: boolean;
  otpCode?: string;
  otpExpiry?: Date;
  refreshTokens: string[];
  savedPlaces: ISavedPlace[];
  createdAt: Date;
  updatedAt: Date;
}

const SavedPlaceSchema = new Schema<ISavedPlace>({
  label: { type: String, required: true },
  address: { type: String, required: true },
  coords: {
    lat: { type: Number },
    lng: { type: Number }
  }
});

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  phone: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['rider', 'driver', 'admin'], default: 'rider' },
  avatar: { type: String },
  walletBalance: { type: Number, default: 15000.00 },
  isVerified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  otpCode: { type: String },
  otpExpiry: { type: Date },
  refreshTokens: [{ type: String }],
  savedPlaces: [SavedPlaceSchema]
}, {
  timestamps: true
});

// Indices for performance automatically created by unique: true on fields

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
