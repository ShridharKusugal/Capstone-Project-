import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  title: string;
  message: string;
  isRead: boolean;
  type: 'ride_update' | 'payment_update' | 'system_alert' | 'chat_message';
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  type: { type: String, enum: ['ride_update', 'payment_update', 'system_alert', 'chat_message'], default: 'system_alert' }
}, {
  timestamps: true
});

NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({ isRead: 1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
