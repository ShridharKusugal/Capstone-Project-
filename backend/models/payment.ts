import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  ride: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  gatewayUsed: 'stripe' | 'razorpay' | 'wallet' | 'cash';
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  ride: { type: Schema.Types.ObjectId, ref: 'Ride', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  transactionId: { type: String, unique: true, sparse: true },
  gatewayUsed: { type: String, enum: ['stripe', 'razorpay', 'wallet', 'cash'], required: true }
}, {
  timestamps: true
});

PaymentSchema.index({ ride: 1 });
PaymentSchema.index({ user: 1 });
PaymentSchema.index({ transactionId: 1 });

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
