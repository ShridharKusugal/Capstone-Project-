import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Compass, ShieldAlert, Award, Star, DollarSign, SwitchCamera, Loader,
  Check, X, Navigation, Eye, User, Briefcase, ChevronRight, LogIn, TrendingUp,
  Key, Cpu, Sparkles, Server, HelpCircle, Layers, Settings, AppWindow,
  Sun, Moon
} from 'lucide-react';
import { Ride, SystemConfig, Complaint, PromoCode, WalletTransaction } from './types';
import CityMap, { PREDEFINED_LOCATIONS } from './components/CityMap';
import RiderAppPage from './pages/RiderAppPage';
import DriverAppPage from './pages/DriverAppPage';
import AdminPanelPage from './pages/AdminPanelPage';
import CodeHubPage from './pages/CodeHubPage';
import LandingPage from './pages/LandingPage';
import { generateCityRoute, getHaversineDistance, lookupLocationCoords } from './utils/geo';
import useSocket from './hooks/useSocket';


// Redux Selectors and Actions
import { RootState } from './store';
import { setCredentials, updateWalletBalance, setDriverOnlineStatus } from './store/authSlice';
import { setCurrentRide, setRideHistory, setNearbyRides, updateCurrentRideStatus } from './store/rideSlice';

// Robust helper to match predefined coordinates
const findPredefinedLocation = (name: string) => {
  const cached = lookupLocationCoords(name);
  if (cached) {
    return { name, lat: cached.lat, lng: cached.lng };
  }
  return { name, lat: 28.6304, lng: 77.2177 }; // Default Delhi coords if lookup fails
};




function App() {
  const dispatch = useDispatch();



  // Read state business metrics from Redux
  const currentRide = useSelector((state: RootState) => state.rides.currentRide);
  const ridesList = useSelector((state: RootState) => state.rides.rideHistory);
  const passengerWallet = useSelector((state: RootState) => state.auth.user ? state.auth.user.walletBalance : 15000.00);
  const driverOnline = useSelector((state: RootState) => state.auth.driverOnline);
  const driverWallet = useSelector((state: RootState) => state.auth.user && state.auth.user.role === 'driver' ? state.auth.user.walletBalance : 4500.00);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);

  // Local Fast Ticking states (telemetry and simulations)
  const isDarkMode = false;
  const [activeTab, setActiveTab] = useState<'simulators' | 'admin' | 'developers'>('simulators');
  const [activeRoute, setActiveRoute] = useState<{ lat: number; lng: number }[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [accumulatedDistance, setAccumulatedDistance] = useState(0);
  const [simulationWarp, setSimulationWarp] = useState(400);
  const [selectedPickup, setSelectedPickup] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');

  const [liveDriverCoords, setLiveDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const isRiderPage = window.location.pathname === '/rider';
  const isDriverPage = window.location.pathname === '/driver';

  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([
    { id: 'TXN-BASE1', type: 'deposit', amount: 15000.00, description: 'Bank Sandbox Initial Deposit', timestamp: '10:15 AM' },
    { id: 'TXN-BASE2', type: 'deposit', amount: 4500.00, description: 'Base Driver Wallet Seed', timestamp: '10:16 AM' }
  ]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([
    { code: 'RIDEX15', discountPercent: 15, description: 'Standard starter coupon code', isActive: true, expiryDate: '2026-12-31' },
    { code: 'FASTDROP50', discountPercent: 50, description: 'Midnight peak incentive discount', isActive: true, expiryDate: '2026-12-31' }
  ]);
  const [complaints, setComplaints] = useState<Complaint[]>([
    { id: 'COMP-72921', rideId: 'RIDE-MOCK91', reporterName: 'Juliana Vance', reporterRole: 'passenger', subject: 'Late pickup buffer', description: 'Driver took an alternative route resulting in minor delays.', status: 'pending', createdAt: '2026-05-27T10:05:00Z' },
    { id: 'COMP-72922', rideId: 'RIDE-MOCK92', reporterName: 'Arthur Dent', reporterRole: 'passenger', subject: 'Dusty seats', description: 'Vehicle interior had light dust layers. Recommend audit.', status: 'pending', createdAt: '2026-05-27T10:12:00Z' }
  ]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    baseFares: { economy: 600.00, comfort: 1000.00, lux: 1720.00 },
    demandMultiplier: 1.25,
    trafficFactor: 'moderate',
    promoCodes: [
      { code: 'RIDEX15', discountPercent: 15, description: 'Standard starter coupon code', isActive: true, expiryDate: '2026-12-31' },
      { code: 'FASTDROP50', discountPercent: 50, description: 'Midnight peak incentive discount', isActive: true, expiryDate: '2026-12-31' }
    ]
  } as any);

  const socketProps = useSocket(currentRide?.id);

  useEffect(() => {
    if (!currentRide) {
      setLiveDriverCoords(null);
    }
  }, [currentRide]);

  useEffect(() => {
    if (!socketProps.socket) return;

    const cleanupMessage = socketProps.onEvent('chat:message_received', (msg: any) => {
      if (currentRide) {
        const updatedChatHistory = [...(currentRide.chatHistory || []), msg];
        dispatch(setCurrentRide({
          ...currentRide,
          chatHistory: updatedChatHistory
        }));
      }
      syncWithBackendPool();
    });

    const cleanupStatus = socketProps.onEvent('ride:status_changed', (data: any) => {
      syncWithBackendPool();
    });

    const cleanupLocation = socketProps.onEvent('driver:location_changed', (coords: { lat: number; lng: number }) => {
      setLiveDriverCoords({ lat: coords.lat, lng: coords.lng });
    });

    const cleanupRequest = socketProps.onEvent('ride:new_request', (rideData: any) => {
      if (driverOnline) {
        const formatted = {
          id: rideData._id || rideData.id,
          passengerId: rideData.passenger?._id || rideData.passenger,
          passengerName: rideData.passenger?.name || 'Alex Carter',
          passengerPhone: rideData.passenger?.phone || '9876543210',
          pickup: rideData.pickup,
          destination: rideData.destination,
          pickupCoords: rideData.pickupCoords,
          destinationCoords: rideData.destinationCoords,
          status: 'requested',
          fare: rideData.fare,
          distance: rideData.distance,
          eta: rideData.eta,
          vehicleType: rideData.vehicleType,
          paymentMethod: rideData.paymentMethod,
          paymentStatus: rideData.paymentStatus,
          createdAt: rideData.createdAt
        };
        dispatch(setCurrentRide(formatted as any));
      }
      syncWithBackendPool();
    });

    return () => {
      cleanupMessage();
      cleanupStatus();
      cleanupRequest();
      cleanupLocation();
    };
  }, [socketProps.socket, currentRide, driverOnline]);

  const syncWithBackendPool = async () => {
    try {
      if (accessToken) {
        // Fetch active ride for the authenticated user
        const activeResp = await fetch('/api/v1/rides/active', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const activeData = await activeResp.json();
        if (activeData.status === 'success') {
          if (activeData.ride) {
            // Map _id from backend to id expected by frontend type
            const formattedRide = {
              ...activeData.ride,
              id: activeData.ride._id || activeData.ride.id
            };
            dispatch(setCurrentRide(formattedRide));
          } else if (currentRide && (currentRide.status === 'completed' || currentRide.status === 'cancelled')) {
            // Keep completed/cancelled active for rating/invoice screens
          } else {
            dispatch(setCurrentRide(null));
          }
        }

        // Fetch user's ride history
        const historyResp = await fetch('/api/v1/rides/history', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const historyData = await historyResp.json();
        if (historyData.status === 'success') {
          const formattedHistory = historyData.rides.map((r: any) => ({
            ...r,
            id: r._id || r.id
          }));
          dispatch(setRideHistory(formattedHistory));
        }
      } else {
        const resp = await fetch('/api/rides');
        const data = await resp.json();
        if (data.status === 'success') {
          dispatch(setRideHistory(data.rides));
          const matchingActive = data.rides.find((r: Ride) => r.status !== 'completed' && r.status !== 'cancelled');
          if (matchingActive) {
            dispatch(setCurrentRide(matchingActive));
          } else if (currentRide && (currentRide.status === 'completed' || currentRide.status === 'cancelled')) {
            // Keep completed active
          } else {
            dispatch(setCurrentRide(null));
          }
        }
      }
    } catch (err) {
      console.warn('Backend DB polling offline. Operating in fallback sandboxed local memory.');
    }
  };

  useEffect(() => {
    syncWithBackendPool();
    const timer = setInterval(syncWithBackendPool, 2500);
    return () => clearInterval(timer);
  }, [currentRide?.status]);

  useEffect(() => {
    if (!currentRide) {
      setAccumulatedDistance(0);
      setCurrentStepIndex(0);
      setActiveRoute([]);
      return;
    }

    const totalDistance = currentRide.distance || 3.5;
    const simulatedCarSpeedKmh = totalDistance <= 15 ? 40 : totalDistance <= 100 ? 65 : 95;

    let route: { lat: number; lng: number }[] = [];
    if (currentRide.status === 'accepted' || currentRide.status === 'active') {
      const pickupNode = currentRide.pickupCoords
        ? { name: currentRide.pickup, lat: currentRide.pickupCoords.lat, lng: currentRide.pickupCoords.lng }
        : findPredefinedLocation(currentRide.pickup);
      const destinationNode = currentRide.destinationCoords
        ? { name: currentRide.destination, lat: currentRide.destinationCoords.lat, lng: currentRide.destinationCoords.lng }
        : findPredefinedLocation(currentRide.destination);

      const startNode = currentRide.status === 'accepted'
        ? (currentRide.pickupCoords
            ? { name: 'Connaught Place, Delhi NCR', lat: 28.6304, lng: 77.2177 }
            : findPredefinedLocation('Connaught Place, Delhi NCR'))
        : pickupNode;
      const targetNode = currentRide.status === 'accepted'
        ? pickupNode
        : destinationNode;

      route = generateCityRoute(startNode, targetNode);
      setActiveRoute(route);
    }

    // Run local ticking coordinate simulation on the unified mobile portal.
    let subTimer: NodeJS.Timeout;
    const tickMs = 1000;

    if (currentRide.status === 'accepted' || currentRide.status === 'active') {
      const runStep = () => {
        setAccumulatedDistance(prev => {
          const realSpeedKms = simulatedCarSpeedKmh / 3600;
          const tickDurationSeconds = tickMs / 1000;
          const progressKm = realSpeedKms * simulationWarp * tickDurationSeconds;
          const nextDist = prev + progressKm;

          // Compute coordinates for nextDist
          const ratio = Math.min(1, nextDist / totalDistance);
          const index = Math.min(route.length - 1, Math.floor(ratio * (route.length - 1)));
          const nextCoord = route[index];

          if (nextCoord && socketProps.socket && currentRide.driverId) {
            socketProps.emitDriverLocation({
              driverId: currentRide.driverId,
              lat: nextCoord.lat,
              lng: nextCoord.lng,
              rideId: currentRide.id
            });
          }

          if (nextDist >= totalDistance) {
            clearInterval(subTimer);
            if (currentRide.status === 'accepted') {
              handleUpdateRideStatus(currentRide.id, 'arriving');
            } else if (currentRide.status === 'active') {
              handleUpdateRideStatus(currentRide.id, 'completed');
            }
            return totalDistance;
          }
          return nextDist;
        });
      };

      subTimer = setInterval(runStep, tickMs);
    }

    return () => clearInterval(subTimer);
  }, [currentRide?.status, simulationWarp, currentRide?.distance, isRiderPage, socketProps.socket, currentRide?.driverId, currentRide?.id]);

  // Automated background ride dispatcher/simulator for unified app layout
  useEffect(() => {
    if (!currentRide) return;

    if (currentRide.status === 'pending' || currentRide.status === 'searching') {
      const t = setTimeout(() => {
        handleAcceptRide('NYC-4821', 'Alex Pro Driver');
      }, 4000);
      return () => clearTimeout(t);
    }

    if (currentRide.status === 'arriving') {
      const t = setTimeout(() => {
        handleUpdateRideStatus(currentRide.id, 'active');
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [currentRide?.status, currentRide?.id]);

  useEffect(() => {
    if (!currentRide || activeRoute.length === 0) return;
    const totalDistance = currentRide.distance || 3.5;
    const ratio = Math.min(1, accumulatedDistance / totalDistance);
    const index = Math.min(activeRoute.length - 1, Math.floor(ratio * (activeRoute.length - 1)));
    setCurrentStepIndex(index);
  }, [accumulatedDistance, activeRoute, currentRide]);


  const handleRequestRide = async (params: any) => {
    const pLoc = findPredefinedLocation(params.pickup);
    const dLoc = findPredefinedLocation(params.destination);

    const pickupCoords = params.pickupCoords || { lat: pLoc.lat, lng: pLoc.lng };
    const destinationCoords = params.destinationCoords || { lat: dLoc.lat, lng: dLoc.lng };

    try {
      const url = accessToken ? '/api/v1/rides/book' : '/api/rides/book';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          pickup: params.pickup,
          destination: params.destination,
          pickupCoords: pickupCoords,
          destinationCoords: destinationCoords,
          vehicleType: params.vehicleType,
          paymentMethod: params.paymentMethod,
          fare: params.fare,
          distance: params.distance,
          eta: params.eta,
          passengerName: 'Alex Carter'
        })
      });
      const data = await resp.json();
      if (data.status === 'success') {
        const formattedRide = {
          ...data.ride,
          id: data.ride._id || data.ride.id
        };
        dispatch(setCurrentRide(formattedRide));
        syncWithBackendPool();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRideStatus = async (rideId: string, status: Ride['status']) => {
    try {
      const url = accessToken ? `/api/v1/rides/${rideId}/status` : `/api/rides/${rideId}/status`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ status })
      });
      const data = await resp.json();
      if (data.status === 'success') {
        const formattedRide = {
          ...data.ride,
          id: data.ride._id || data.ride.id
        };
        if (status === 'completed' && currentRide) {
          processTransactionFinances(currentRide);
        }
        dispatch(setCurrentRide(formattedRide));
        syncWithBackendPool();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptRide = async (driverId: string, name: string) => {
    console.log('[DEBUG] handleAcceptRide called with driverId:', driverId, 'name:', name, 'currentRide:', currentRide);
    if (!currentRide) {
      console.warn('[DEBUG] handleAcceptRide abort: no currentRide in state');
      return;
    }
    try {
      const url = accessToken ? `/api/v1/rides/${currentRide.id}/accept` : `/api/rides/${currentRide.id}/accept`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ driverId, driverName: name })
      });
      const data = await resp.json();
      console.log('[DEBUG] handleAcceptRide response:', data);
      if (data.status === 'success') {
        const formattedRide = {
          ...data.ride,
          id: data.ride._id || data.ride.id
        };
        dispatch(setCurrentRide(formattedRide));
        syncWithBackendPool();
      } else {
        alert(`Failed to accept ride: ${data.message || 'Unknown backend error'}`);
      }
    } catch (err: any) {
      console.error('[DEBUG] handleAcceptRide error:', err);
      alert(`Network error accepting ride: ${err.message || err}`);
    }
  };


  const handleCancelRide = () => {
    if (!currentRide) return;
    handleUpdateRideStatus(currentRide.id, 'cancelled');
    
    // Deduct passenger balance in Redux
    dispatch(updateWalletBalance(Math.max(0, passengerWallet - 400)));

    const txn: WalletTransaction = {
      id: `TXN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      type: 'payment',
      amount: 400,
      description: 'Ride cancellation contract penalty fee',
      timestamp: new Date().toLocaleTimeString()
    };
    setWalletTransactions(t => [txn, ...t]);
    dispatch(setCurrentRide(null));
  };

  const handleSetDriverOnline = async (status: boolean) => {
    dispatch(setDriverOnlineStatus(status));
    
    if (accessToken) {
      try {
        await fetch('/api/v1/users/driver/online', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ isOnline: status })
        });
      } catch (err) {
        console.error('Failed to update online status on backend:', err);
      }
    }
  };

  const handleToggleDriverOnline = async () => {
    await handleSetDriverOnline(!driverOnline);
  };

  const handleCompleteRating = async (rating: number, review: string) => {
    if (!currentRide) return;
    try {
      const url = accessToken ? `/api/v1/rides/${currentRide.id}/review` : `/api/rides/${currentRide.id}/review`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ rating, review })
      });
    } catch (err) {}
    
    syncWithBackendPool();
    dispatch(setCurrentRide(null));
    setActiveRoute([]);
    setCurrentStepIndex(0);
    // Feedback recorded – no browser alert
  };

  const processTransactionFinances = (ride: Ride) => {
    // If passenger using wallet, deduct balance in Redux
    if (ride.paymentMethod === 'wallet') {
      dispatch(updateWalletBalance(Math.max(0, passengerWallet - ride.fare)));
    }

    const passengerTxn: WalletTransaction = {
      id: `TXN-P-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      type: 'payment',
      amount: ride.fare,
      description: `Taxi journey to ${ride.destination}`,
      timestamp: new Date().toLocaleTimeString()
    };

    const driverTxn: WalletTransaction = {
      id: `TXN-D-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      type: 'earning',
      amount: ride.fare * 0.90,
      description: `Earned 90% split for drop at ${ride.destination}`,
      timestamp: new Date().toLocaleTimeString()
    };

    setWalletTransactions(prev => [passengerTxn, driverTxn, ...prev]);
  };

  const clearDatabaseState = async () => {
    try {
      await fetch('/api/rides/clear', { method: 'POST' });
    } catch (err) {}
    dispatch(setCurrentRide(null));
    dispatch(setRideHistory([]));
    setActiveRoute([]);
    setCurrentStepIndex(0);
    // DB cleared silently
  };

  const enrichedRide = currentRide ? {
    ...currentRide,
    currentStepIndex: currentStepIndex,
    routeCoordinates: activeRoute,
    accumulatedDistance: accumulatedDistance,
    simulationWarp: simulationWarp,
    simulatedSpeed: currentRide.distance <= 15 ? 40 : currentRide.distance <= 100 ? 65 : 95
  } : null;

  const simProps = {
    isDarkMode,
    activeTab,
    setActiveTab,
    enrichedRide,
    handleRequestRide,
    handleCancelRide,
    setWalletTransactions,
    passengerWallet,
    setPassengerWallet: (amt: number) => dispatch(updateWalletBalance(passengerWallet + amt)),
    walletTransactions,
    handleCompleteRating,
    selectedPickup,
    selectedDestination,
    setSelectedPickup,
    setSelectedDestination,
    systemConfig,
    driverOnline,
    setDriverOnline: handleSetDriverOnline,
    activeRoute,
    currentStepIndex,
    setAccumulatedDistance,
    simulationWarp,
    setSimulationWarp,
    handleAcceptRide,
    handleUpdateRideStatus,
    driverWallet,
    ridesList,
    clearDatabaseState,
    complaints,
    setComplaints,
    promoCodes,
    setPromoCodes: (updater: any) => {
      setPromoCodes(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        setSystemConfig((cfg: any) => ({ ...cfg, promoCodes: next }));
        return next;
      });
    },
    setSystemConfig,
    socketProps
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={
          <LandingPage />
        } />

        {/* Developer Reference Docs */}
        <Route path="/developers" element={
          <div className={`min-h-screen p-6 transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
          }`}>
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center font-mono">
                <Link to="/" className="text-slate-400 hover:text-slate-200 text-xs">◀ Back to Home</Link>
              </div>
              <CodeHubPage />
            </div>
          </div>
        } />

        {/* Unified Passenger App */}
        <Route path="/simulator" element={
          <div className="w-full h-screen bg-slate-950 overflow-hidden relative">
            {/* Quick Nav Header (Only visible on large screens or as an overlay) */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-full max-w-[440px] px-4 font-mono text-[10px] md:opacity-50 hover:opacity-100 transition-opacity">
              <Link to="/" className="bg-slate-900/80 backdrop-blur text-slate-300 hover:text-emerald-400 font-bold px-3 py-1.5 rounded-full border border-slate-800 transition shadow-lg">← Home</Link>
              <div className="flex-1" />
              <Link to="/driver" className="bg-amber-500/90 hover:bg-amber-500 text-slate-950 px-2.5 py-1.5 rounded-full font-bold transition shadow-lg">Driver ➔</Link>
              <Link to="/admin" className="bg-cyan-500/90 hover:bg-cyan-500 text-slate-950 px-2.5 py-1.5 rounded-full font-bold transition shadow-lg">Admin ➔</Link>
            </div>

            <div className="w-full h-full">
              <RiderAppPage
                currentRide={enrichedRide}
                onRequestRide={handleRequestRide}
                onCancelRide={handleCancelRide}
                onAddTransaction={(t: any) => setWalletTransactions((prev: any) => [t, ...prev])}
                walletBalance={passengerWallet}
                onUpdateWallet={(amt: any) => dispatch(updateWalletBalance(passengerWallet + amt))}
                transactions={walletTransactions}
                onCompleteRating={handleCompleteRating}
                isDarkMode={isDarkMode}
                selectedPickup={selectedPickup}
                selectedDestination={selectedDestination}
                onPickupChange={setSelectedPickup}
                onDestinationChange={setSelectedDestination}
                systemConfig={systemConfig}
                socketProps={socketProps}
                ridesList={ridesList}
                liveDriverCoords={liveDriverCoords}
                activeRoute={activeRoute}
                currentStepIndex={currentStepIndex}
              />
            </div>
          </div>
        } />


        {/* Standalone Rider Web App */}
        <Route path="/rider" element={
          <div className="w-full h-screen bg-slate-950 overflow-hidden relative">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-full max-w-[440px] px-4 font-mono text-[10px] md:opacity-50 hover:opacity-100 transition-opacity">
              <Link to="/" className="bg-slate-900/80 backdrop-blur text-slate-300 hover:text-emerald-400 font-bold px-3 py-1.5 rounded-full border border-slate-800 transition shadow-lg">← Home</Link>
            </div>
            
            <div className="w-full h-full">
              <RiderAppPage
                currentRide={enrichedRide}
                onRequestRide={handleRequestRide}
                onCancelRide={handleCancelRide}
                onAddTransaction={(t: any) => setWalletTransactions((prev: any) => [t, ...prev])}
                walletBalance={passengerWallet}
                onUpdateWallet={(amt: any) => dispatch(updateWalletBalance(passengerWallet + amt))}
                transactions={walletTransactions}
                onCompleteRating={handleCompleteRating}
                isDarkMode={isDarkMode}
                selectedPickup={selectedPickup}
                selectedDestination={selectedDestination}
                onPickupChange={setSelectedPickup}
                onDestinationChange={setSelectedDestination}
                systemConfig={systemConfig}
                socketProps={socketProps}
                ridesList={ridesList}
              />
            </div>
          </div>
        } />

        {/* Standalone Driver Web App */}
        <Route path="/driver" element={
          <div className="w-full h-screen bg-slate-950 overflow-hidden relative">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 w-full max-w-[440px] px-4 font-mono text-[10px] md:opacity-50 hover:opacity-100 transition-opacity">
              <Link to="/" className="bg-slate-900/80 backdrop-blur text-slate-300 hover:text-amber-500 font-bold px-3 py-1.5 rounded-full border border-slate-800 transition shadow-lg">← Home</Link>
              <div className="flex-1" />
              <Link to="/simulator" className="bg-emerald-500/90 hover:bg-emerald-500 text-slate-950 px-2.5 py-1.5 rounded-full font-bold transition shadow-lg">Rider ➔</Link>
            </div>
            
            <div className="w-full h-full">
              <DriverAppPage
                currentRide={enrichedRide}
                driverOnline={driverOnline}
                onToggleOnline={handleToggleDriverOnline}
                onAcceptRide={handleAcceptRide}
                onRejectRide={() => handleUpdateRideStatus(enrichedRide!.id, 'cancelled')}
                onStartRide={() => handleUpdateRideStatus(enrichedRide!.id, 'active')}
                onCompleteRide={() => handleUpdateRideStatus(enrichedRide!.id, 'completed')}
                driverWalletBalance={driverWallet}
                isDarkMode={isDarkMode}
                socketProps={socketProps}
                driverCoords={liveDriverCoords}
                activeRoute={activeRoute}
              />
            </div>
          </div>
        } />

        {/* Standalone Admin Dashboard */}
        <Route path="/admin" element={
          <div className={`min-h-screen p-6 transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
          }`}>
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex justify-between items-center font-mono">
                <Link to="/" className="text-slate-400 hover:text-slate-200 text-xs">◀ Back to Simulators</Link>
                <div className="flex items-center gap-3">
                  <button
                    onClick={clearDatabaseState}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1.5 rounded font-mono"
                  >
                    🗑️ Clear DB Pools
                  </button>
                </div>
              </div>
              <AdminPanelPage
                ridesList={ridesList}
                systemConfig={systemConfig}
                onUpdateConfig={(cfg: any) => setSystemConfig(cfg)}
                complaints={complaints}
                onResolveComplaint={(id: any) => setComplaints((prev: any) => prev.map((c: any) => c.id === id ? { ...c, status: 'resolved' as const } : c))}
                promoCodes={promoCodes}
                onAddPromo={(prom: any) => setPromoCodes((prev: any) => [prom, ...prev])}
                onDeletePromo={(code: any) => setPromoCodes((prev: any) => prev.filter((p: any) => p.code !== code))}
                driverOnline={driverOnline}
                passengerWallet={passengerWallet}
                isDarkMode={isDarkMode}
                currentRide={enrichedRide}
                activeRoute={activeRoute}
              />
            </div>
          </div>
        } />

        {/* Legacy redirect */}

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;

