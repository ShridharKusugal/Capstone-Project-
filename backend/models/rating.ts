import mongoose, { Schema, Document } from 'mongoose';

export interface IRating extends Document {
  ride: mongoose.Types.ObjectId;
  from: mongoose.Types.ObjectId; // User ref
  to: mongoose.Types.ObjectId;   // User ref
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema = new Schema<IRating>({
  ride: { type: Schema.Types.ObjectId, ref: 'Ride', required: true },
  from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true }
}, {
  timestamps: true
});

RatingSchema.index({ ride: 1 });
RatingSchema.index({ to: 1 });

export default mongoose.models.Rating || mongoose.model<IRating>('Rating', RatingSchema);
