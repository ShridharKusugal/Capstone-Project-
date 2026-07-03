import { useState, useEffect } from 'react';
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
import PassengerApp from './components/PassengerApp';
import DriverApp from './components/DriverApp';
import AdminPanel from './components/AdminPanel';
import CodeHub from './components/CodeHub';
import LandingPage from './components/LandingPage';
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

// SimulatorsLayout removed for unified centered mobile phone layout redirection.


export default function App() {
  const dispatch = useDispatch();

  const [phoneClock, setPhoneClock] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const t = setInterval(() => setPhoneClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 15000);
    return () => clearInterval(t);
  }, []);

  // Read state business metrics from Redux
  const currentRide = useSelector((state: RootState) => state.rides.currentRide);
  const ridesList = useSelector((state: RootState) => state.rides.rideHistory);
  const passengerWallet = useSelector((state: RootState) => state.auth.user ? state.auth.user.walletBalance : 15000.00);
  const driverOnline = useSelector((state: RootState) => state.auth.driverOnline);
  const driverWallet = useSelector((state: RootState) => state.auth.user && state.auth.user.role === 'driver' ? state.auth.user.walletBalance : 4500.00);

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
      const resp = await fetch('/api/rides/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        dispatch(setCurrentRide(data.ride));
        syncWithBackendPool();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRideStatus = async (rideId: string, status: Ride['status']) => {
    try {
      const resp = await fetch(`/api/rides/${rideId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await resp.json();
      if (data.status === 'success') {
        const updated = data.ride;
        if (status === 'completed' && currentRide) {
          processTransactionFinances(currentRide);
        }
        dispatch(setCurrentRide(updated));
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
      const resp = await fetch(`/api/rides/${currentRide.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, driverName: name })
      });
      const data = await resp.json();
      console.log('[DEBUG] handleAcceptRide response:', data);
      if (data.status === 'success') {
        dispatch(setCurrentRide(data.ride));
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

  const handleCompleteRating = async (rating: number, review: string) => {
    if (!currentRide) return;
    try {
      await fetch(`/api/rides/${currentRide.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    setDriverOnline: (status: boolean) => dispatch(setDriverOnlineStatus(status)),
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
              <CodeHub />
            </div>
          </div>
        } />

        {/* Unified Passenger App — Clean Mobile Container */}
        <Route path="/simulator" element={
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            {/* Quick Nav Bar */}
            <div className="mb-3 flex items-center gap-2 w-full max-w-[420px] font-mono text-xs">
              <Link to="/" className="text-slate-500 hover:text-emerald-400 text-[10px] font-bold transition">← Home</Link>
              <div className="flex-1" />
              <Link to="/driver" target="_blank" className="bg-amber-500/90 hover:bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg font-bold transition text-[10px]">Driver ➔</Link>
              <Link to="/admin" target="_blank" className="bg-cyan-500/90 hover:bg-cyan-500 text-slate-950 px-2.5 py-1 rounded-lg font-bold transition text-[10px]">Admin ➔</Link>
            </div>

            <div className="w-full max-w-[420px] h-[880px] bg-white rounded-[36px] shadow-2xl shadow-black/50 overflow-hidden relative flex flex-col border border-slate-200/50" id="smartphone-mockup-frame">
              <PassengerApp
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


        {/* Standalone Rider Web App – Clean Mobile Layout */}
        <Route path="/rider" element={
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="mb-3 flex items-center gap-2 w-full max-w-[420px] font-mono text-xs">
              <Link to="/" className="text-slate-500 hover:text-emerald-400 text-[10px] font-bold transition">← Home</Link>
              <div className="flex-1" />
              <Link to="/driver" target="_blank" className="bg-amber-500/90 hover:bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg font-bold transition text-[10px]">Driver ➔</Link>
            </div>
            <div className="w-full max-w-[420px] h-[880px] bg-white rounded-[36px] shadow-2xl shadow-black/50 overflow-hidden relative flex flex-col border border-slate-200/50">
              <PassengerApp
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

        {/* Standalone Driver Web App – Clean Mobile Layout */}
        <Route path="/driver" element={
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="mb-3 flex items-center gap-2 w-full max-w-[420px] font-mono text-xs">
              <Link to="/" className="text-slate-500 hover:text-amber-500 text-[10px] font-bold transition">← Home</Link>
              <div className="flex-1" />
              <Link to="/simulator" target="_blank" className="bg-emerald-500/90 hover:bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-lg font-bold transition text-[10px]">Rider ➔</Link>
            </div>
            <div className="w-full max-w-[420px] h-[880px] bg-white rounded-[36px] shadow-2xl shadow-amber-500/10 overflow-hidden relative flex flex-col border border-slate-200/50">
              <DriverApp
                currentRide={enrichedRide}
                driverOnline={driverOnline}
                onToggleOnline={() => dispatch(setDriverOnlineStatus(!driverOnline))}
                onAcceptRide={handleAcceptRide}
                onRejectRide={() => handleUpdateRideStatus(enrichedRide!.id, 'cancelled')}
                onStartRide={() => handleUpdateRideStatus(enrichedRide!.id, 'active')}
                onCompleteRide={() => handleUpdateRideStatus(enrichedRide!.id, 'completed')}
                driverWalletBalance={driverWallet}
                isDarkMode={isDarkMode}
                socketProps={socketProps}
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
              <AdminPanel
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
