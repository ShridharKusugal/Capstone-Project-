export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'passenger' | 'driver' | 'admin';
  phone: string;
  avatar: string;
  rating: number;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  status: 'online' | 'offline';
  isVerified: boolean;
  documents?: {
    license?: string;
    insurance?: string;
    backgroundCheck?: string;
    profilePhoto?: DocumentMeta;
    aadhaarFront?: DocumentMeta;
    aadhaarBack?: DocumentMeta;
    drivingLicenseFront?: DocumentMeta;
    drivingLicenseBack?: DocumentMeta;
    vehicleRC?: DocumentMeta;
    vehicleInsurance?: DocumentMeta;
    vehiclePUC?: DocumentMeta;
    selfieVerification?: DocumentMeta;
  };
  vehicle?: VehicleInfo | {
    model: string;
    plate: string;
    color: string;
    type: 'economy' | 'comfort' | 'lux';
  };
  rating: number;
  tripsCount: number;
  walletBalance: number;
  verificationStatus?: VerificationStatus;
}

export interface Point {
  name: string;
  lat: number;
  lng: number;
}

export interface Ride {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  pickup: string;
  destination: string;
  pickupCoords: { lat: number; lng: number };
  destinationCoords: { lat: number; lng: number };
  status: 'pending' | 'searching' | 'accepted' | 'arriving' | 'arrived' | 'active' | 'completed' | 'payment_pending' | 'payment_success' | 'rating_pending' | 'cancelled' | 'failed' | 'idle' | 'requested';
  fare: number;
  distance: number; // in km
  eta: number; // in mins
  vehicleType: 'economy' | 'comfort' | 'lux';
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverAvatar?: string;
  carPlate?: string;
  driverCoords?: { lat: number; lng: number };
  paymentMethod: 'cash' | 'stripe' | 'wallet';
  paymentStatus: 'pending' | 'completed' | 'failed';
  rating?: number;
  review?: string;
  createdAt: string;
  routeCoordinates?: { lat: number; lng: number }[];
  currentStepIndex?: number;
  accumulatedDistance?: number;
  simulatedSpeed?: number;
  aiFareExplanation?: string;
  chatHistory?: ChatMessage[];
}

export interface ChatMessage {
  senderRole: 'rider' | 'driver';
  message: string;
  timestamp: string;
  read: boolean;
}


export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'payment' | 'earning' | 'payout';
  amount: number;
  description: string;
  timestamp: string;
}

export interface AdminLog {
  id: string;
  adminName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Complaint {
  id: string;
  rideId: string;
  reporterName: string;
  reporterRole: 'passenger' | 'driver';
  subject: string;
  description: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface PromoCode {
  code: string;
  discountPercent: number;
  description: string;
  isActive: boolean;
  expiryDate: string;
}

export interface SystemConfig {
  baseFares: {
    economy: number;
    comfort: number;
    lux: number;
  };
  demandMultiplier: number; // Dynamic Pricing Control: 1.0 - 2.5
  trafficFactor: 'light' | 'moderate' | 'heavy' | 'gridlock';
} 

// Driver onboarding related types
export interface DocumentMeta {
  url: string; // stored file URL or path
  fileName: string;
  mimeType: string;
  uploadedAt: string; // ISO date string
}

export interface VehicleInfo {
  type: 'Bike' | 'Auto' | 'Car' | 'SUV' | 'Mini Van';
  brand: string;
  model: string;
  color: string;
  manufacturingYear: number;
  registrationNumber: string;
  seatingCapacity: number;
}

export type VerificationStatus = 'Pending' | 'Under Review' | 'Approved' | 'Rejected';

export interface AuthResponse {
  token: string;
  driver: Driver;
}

// Driver interface is unified at the top of types.ts

