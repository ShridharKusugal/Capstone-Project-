import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(roomName?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to the express server running on current host
    const socketUrl = window.location.origin;
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🔌 Connected to Socket.io Server');
      if (roomName) {
        socket.emit('join', roomName);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Disconnected from Socket.io Server');
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [roomName]);

  // Socket event emitter methods
  const emitJoinRoom = (room: string) => {
    socketRef.current?.emit('join', room);
  };

  const emitDriverLocation = (data: { driverId: string; lat: number; lng: number; rideId?: string }) => {
    socketRef.current?.emit('driver:location_update', data);
  };

  const emitRideRequest = (rideData: any) => {
    socketRef.current?.emit('ride:request', rideData);
  };

  const emitRideAccept = (data: { rideId: string; driverId: string; driverName: string }) => {
    socketRef.current?.emit('ride:accept', data);
  };

  const emitRideStatusUpdate = (data: { rideId: string; status: string }) => {
    socketRef.current?.emit('ride:status_update', data);
  };

  const emitChatMessage = (data: { rideId: string; senderRole: 'rider' | 'driver'; message: string }) => {
    socketRef.current?.emit('chat:message', data);
  };

  const emitTypingStatus = (data: { rideId: string; senderRole: 'rider' | 'driver'; isTyping: boolean }) => {
    socketRef.current?.emit('chat:typing', data);
  };

  // Socket event listeners helper
  const onEvent = (event: string, callback: (...args: any[]) => void) => {
    const socket = socketRef.current;
    if (socket) {
      socket.on(event, callback);
    }
    return () => {
      socket?.off(event, callback);
    };
  };

  return {
    isConnected,
    socket: socketRef.current,
    emitJoinRoom,
    emitDriverLocation,
    emitRideRequest,
    emitRideAccept,
    emitRideStatusUpdate,
    emitChatMessage,
    emitTypingStatus,
    onEvent
  };
}
export default useSocket;
