import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import PhoneFrame, { DeviceType } from '../components/ui/PhoneFrame';
import { setDriverOnlineStatus } from '../store/authSlice';

interface SimulatorLayoutProps {
  children: React.ReactNode;
  themeColor: 'emerald' | 'amber';
}

export default function SimulatorLayout({ children, themeColor }: SimulatorLayoutProps) {
  const dispatch = useDispatch();
  const location = useLocation();

  // Redux states for toolbar sync
  const currentRide = useSelector((state: RootState) => state.rides.currentRide);
  const driverOnline = useSelector((state: RootState) => state.auth.driverOnline);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);

  // Simulator states
  const [deviceType, setDeviceType] = useState<DeviceType>('iphone16');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Dynamic screen state resolution
  const getActiveScreenName = () => {
    if (location.pathname === '/driver') {
      if (!driverOnline) return 'Driver Portal (Offline)';
      if (currentRide) {
        if (currentRide.status === 'requested') return 'Ride Offer Received';
        if (currentRide.status === 'accepted' || currentRide.status === 'arriving') return 'Heading to Pickup';
        if (currentRide.status === 'active') return 'Trip In Progress';
        if (currentRide.status === 'completed') return 'Ride Settlement';
      }
      return 'Driver Map (Duty)';
    }

    // Passenger / Simulator paths
    if (currentRide) {
      if (currentRide.status === 'searching' || currentRide.status === 'pending') return 'Matching Driver';
      if (currentRide.status === 'accepted' || currentRide.status === 'arriving') return 'Driver Arriving';
      if (currentRide.status === 'active') return 'On Trip';
      if (currentRide.status === 'completed') return 'Invoice & Rating';
      if (currentRide.status === 'cancelled') return 'Trip Cancelled';
    }
    return 'Destination Booking';
  };

  const handleToggleOnline = async () => {
    const nextStatus = !driverOnline;
    dispatch(setDriverOnlineStatus(nextStatus));
    
    if (accessToken) {
      try {
        await fetch('/api/v1/users/driver/online', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ isOnline: nextStatus })
        });
      } catch (err) {
        console.error('Failed to sync online status:', err);
      }
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4 bg-slate-950 font-sans">
      
      {/* 🔮 Animated Mesh Gradient & Ambient Soft Lighting */}
      <div className="absolute inset-0 z-0 bg-slate-950" />
      
      {/* Mesh Gradient Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-40 mix-blend-color-dodge pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.12) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(67, 56, 202, 0.08) 0%, transparent 60%)
          `
        }}
      />

      {/* Floating Ambient Light Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/8 blur-[120px] pointer-events-none animate-pulse duration-[10000ms]" />

      {/* CSS Floating Particles injection */}
      <style>{`
        @keyframes floatParticle {
          0% { transform: translateY(100vh) translateX(0) scale(1); opacity: 0; }
          10% { opacity: 0.3; }
          90% { opacity: 0.3; }
          100% { transform: translateY(-10vh) translateX(50px) scale(0.8); opacity: 0; }
        }
        .particle {
          position: absolute;
          bottom: -20px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          pointer-events: none;
        }
      `}</style>

      {/* Dynamic Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(12)].map((_, i) => {
          const size = Math.random() * 8 + 4;
          const left = Math.random() * 100;
          const delay = Math.random() * 15;
          const duration = Math.random() * 20 + 20;
          return (
            <div
              key={i}
              className="particle"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${left}%`,
                animation: `floatParticle ${duration}s linear ${delay}s infinite`
              }}
            />
          );
        })}
      </div>

      {/* 📁 Navigation Breadcrumb Header (Desktop only) */}
      <div className="w-full max-w-[450px] mb-4 flex items-center gap-3 font-mono text-[10px] relative z-10 hidden md:flex select-none">
        <Link to="/" className="text-slate-500 hover:text-emerald-400 font-bold transition">← Home</Link>
        <div className="flex-1" />
        
        {location.pathname !== '/simulator' && (
          <Link to="/simulator" className="bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 px-2.5 py-1 rounded-lg font-bold transition">
            Simulator
          </Link>
        )}
        {location.pathname !== '/driver' && (
          <Link to="/driver" className="bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 text-amber-400 px-2.5 py-1 rounded-lg font-bold transition">
            Driver View
          </Link>
        )}
        <Link to="/admin" className="bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 px-2.5 py-1 rounded-lg font-bold transition">
          Admin console
        </Link>
      </div>

      {/* 📱 Center Device Frame */}
      <div className="relative z-10 w-full flex items-center justify-center">
        <PhoneFrame
          deviceType={deviceType}
          onDeviceChange={setDeviceType}
          currentRoute={location.pathname}
          screenName={getActiveScreenName()}
          onlineStatus={driverOnline}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        >
          {/* Inner Viewport Container supporting Dark Mode mockup filter */}
          <div className={`w-full h-full relative ${isDarkMode ? 'dark bg-slate-950 text-slate-100 filter brightness-90 contrast-105' : 'bg-white text-slate-900'}`}>
            {children}
          </div>
        </PhoneFrame>
      </div>

    </div>
  );
}
