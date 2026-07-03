import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rideconnect';

export async function connectDB() {
  try {
    // Set Mongoose options
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected Successfully to:', MONGODB_URI);

    try {
      const db = mongoose.connection.db;
      if (db) {
        const collections = await db.listCollections({ name: 'users' }).toArray();
        if (collections.length > 0) {
          const userCol = db.collection('users');
          const indexes = await userCol.indexes();
          const hasUsernameIndex = indexes.some(idx => idx.name === 'username_1');
          if (hasUsernameIndex) {
            await userCol.dropIndex('username_1');
            console.log('🧹 Dropped legacy unique index username_1 successfully!');
          }
        }
      }
    } catch (e: any) {
      console.warn('⚠️ Could not drop legacy username index:', e.message);
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.warn('⚠️ Server will run with database fallbacks. Ensure MongoDB is running locally or set MONGODB_URI.');
  }
}

