import { Server as SocketIOServer, Socket } from 'socket.io';
import RideModel from '../models/ride';
import DriverModel from '../models/driver';

const Ride = RideModel as any;
const Driver = DriverModel as any;

export function initSocketServer(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`⚡ Real-time Socket Client Connected: ${socket.id}`);

    // Join room for custom notifications and tracking
    socket.on('join', (roomName: string) => {
      socket.join(roomName);
      console.log(`👥 Client ${socket.id} joined room: ${roomName}`);
    });

    // Driver reports location coordinates
    socket.on('driver:location_update', async (data: { driverId: string; lat: number; lng: number; rideId?: string }) => {
      const { driverId, lat, lng, rideId } = data;
      
      try {
        // Update driver location in database
        await Driver.findOneAndUpdate({ user: driverId }, { coords: { lat, lng } });

        // If currently in a ride, emit location update to the passenger in the ride room
        if (rideId) {
          io.to(rideId).emit('driver:location_changed', { lat, lng });
        }
        
        // Also broadcast to all clients listening to online driver locations (e.g. Map updates)
        io.emit('driver:global_location_changed', { driverId, lat, lng });
      } catch (err) {
        console.error('Error handling driver location update socket event:', err);
      }
    });

    // Passenger requests ride
    socket.on('ride:request', (rideData: any) => {
      console.log('📢 New Ride Requested on Network:', rideData._id);
      // Broadcast to all online drivers
      socket.broadcast.emit('ride:new_request', rideData);
    });

    // Driver accepts ride
    socket.on('ride:accept', (data: { rideId: string; driverId: string; driverName: string }) => {
      console.log(`✅ Ride ${data.rideId} accepted by driver ${data.driverName}`);
      io.to(data.rideId).emit('ride:accepted', data);
    });

    // General status transitions
    socket.on('ride:status_update', (data: { rideId: string; status: string }) => {
      console.log(`🔄 Ride ${data.rideId} status updated to: ${data.status}`);
      io.to(data.rideId).emit('ride:status_changed', data);
    });

    // Real-Time Chat Message Handler
    socket.on('chat:message', async (data: { rideId: string; senderRole: 'rider' | 'driver'; message: string }) => {
      const { rideId, senderRole, message } = data;
      try {
        // Find ride and push chat message
        const ride = await Ride.findById(rideId);
        if (ride) {
          const chatMsg = {
            senderRole,
            message,
            timestamp: new Date(),
            read: false
          };
          ride.chatHistory.push(chatMsg);
          await ride.save();

          // Emit to room
          io.to(rideId).emit('chat:message_received', chatMsg);
        }
      } catch (err) {
        console.error('Error saving chat message:', err);
      }
    });

    // Chat Typing Indicator
    socket.on('chat:typing', (data: { rideId: string; senderRole: 'rider' | 'driver'; isTyping: boolean }) => {
      socket.to(data.rideId).emit('chat:typing_status', data);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket client disconnected: ${socket.id}`);
    });
  });
}
