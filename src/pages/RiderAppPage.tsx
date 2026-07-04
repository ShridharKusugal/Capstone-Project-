import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapPin, Phone, CreditCard, ShieldAlert, Sparkles, History, User, Wallet,
  LogOut, Bell, Send, Check, Loader, Star, X, Compass, AlertCircle, RefreshCw,
  MessageCircle, Navigation, Award, Plus, ArrowRight, Home as HomeIcon, Briefcase,
  ChevronDown, ChevronUp, Search, Clock, Zap, Shield, Car
} from 'lucide-react';
import CityMap from '../components/CityMap';
import { Ride, WalletTransaction, SystemConfig } from '../types';
import { getHaversineDistance, lookupLocationCoords, generateCityRoute } from '../utils/geo';
import LocationAutocomplete from '../components/LocationAutocomplete';
import { getRoute } from '../services/osrmService';
import { reverseGeocode } from '../services/nominatimService';
import RideProgress from '../components/RideProgress';
import PaymentScreen from '../components/PaymentScreen';
import RatingScreen from '../components/RatingScreen';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface PassengerAppProps {
  currentRide: Ride | null;
  onRequestRide: (params: {
    pickup: string;
    destination: string;
    pickupCoords: { lat: number; lng: number };
    destinationCoords: { lat: number; lng: number };
    vehicleType: 'economy' | 'comfort' | 'lux';
    paymentMethod: 'cash' | 'stripe' | 'wallet';
    fare: number;
    distance: number;
    eta: number;
    aiExplanation?: string;
  }) => void;
  onCancelRide: () => void;
  onAddTransaction: (txn: WalletTransaction) => void;
  walletBalance: number;
  onUpdateWallet: (amount: number) => void;
  transactions: WalletTransaction[];
  onCompleteRating: (rating: number, review: string) => void;
  isDarkMode?: boolean;
  selectedPickup?: string;
  selectedDestination?: string;
  onPickupChange?: (name: string) => void;
  onDestinationChange?: (name: string) => void;
  systemConfig?: SystemConfig;
  socketProps?: any;
  ridesList?: Ride[];
  liveDriverCoords?: { lat: number; lng: number } | null;
  activeRoute?: { lat: number; lng: number }[];
  currentStepIndex?: number;
}

function PrefToggle({ label, emoji, defaultOn }: { label: string; emoji: string; defaultOn: boolean; isDarkMode?: boolean }) {
  const [on, setOn] = React.useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className="flex items-center justify-between w-full py-2.5 px-0 text-xs transition"
    >
      <span className="flex items-center gap-2 text-slate-700">
        <span>{emoji}</span>
        <span className="font-sans font-semibold">{label}</span>
      </span>
      <div className={`w-8 h-4 rounded-full relative transition-colors ${on ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${on ? 'left-4' : 'left-0.5'}`} />
      </div>
    </button>
  );
}

export default function PassengerApp({
  currentRide,
  onRequestRide,
  onCancelRide,
  onAddTransaction,
  walletBalance,
  onUpdateWallet,
  transactions,
  onCompleteRating,
  isDarkMode = false,
  selectedPickup,
  selectedDestination,
  onPickupChange,
  onDestinationChange,
  systemConfig,
  socketProps,
  ridesList = [],
  liveDriverCoords = null,
  activeRoute = [],
  currentStepIndex = 0
}: PassengerAppProps) {
  // View mode: 'map' (default uber-style), 'trips', 'wallet', 'profile'
  const [activeView, setActiveView] = useState<'map' | 'trips' | 'wallet' | 'profile'>('map');
  const [step, setStep] = useState<'auth' | 'otp' | 'app'>('auth');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Bottom sheet state: 'collapsed' | 'expanded' | 'full'
  const [sheetState, setSheetState] = useState<'collapsed' | 'expanded' | 'full'>('collapsed');
  const [showSearchExpanded, setShowSearchExpanded] = useState(false);

  // Chat Drawer
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [driverTyping, setDriverTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevRideStatusRef = useRef<string | null>(null);

  // Auth Info
  const [phoneNumber, setPhoneNumber] = useState('9876543210');
  const [otpCode, setOtpCode] = useState('4821');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [userName, setUserName] = useState('Shridhar');
  const [userEmail, setUserEmail] = useState('shridhar.user@rideconnect.com');
  const [userPhone, setUserPhone] = useState('+91 98765 43210');
  const [homeAddress, setHomeAddress] = useState('Connaught Place, Delhi NCR');
  const [workAddress, setWorkAddress] = useState('Cyber City, Gurugram');
  const [memberSince] = useState('July 2024');
  const [totalTrips] = useState(42);

  // Booking details
  const [pickupLocation, setPickupLocation] = useState<any>({
    placeId: 'PID-PENDING',
    address: 'Detecting Location...',
    latitude: 28.6304,
    longitude: 77.2177
  });

  // Autodetect GPS Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const geocodeResult = await reverseGeocode(lat, lng);
            if (geocodeResult) {
              const name = geocodeResult.address.road || geocodeResult.address.suburb || geocodeResult.address.city || geocodeResult.display_name.split(',')[0];
              setPickupLocation({
                placeId: geocodeResult.place_id.toString(),
                address: name,
                latitude: lat,
                longitude: lng
              });
            } else {
              setPickupLocation({
                placeId: `GPS-${Date.now()}`,
                address: 'Current Location',
                latitude: lat,
                longitude: lng
              });
            }
          } catch (e) {
            console.error("Geocoding failed", e);
            setPickupLocation({
              placeId: `GPS-${Date.now()}`,
              address: 'GPS Location',
              latitude: lat,
              longitude: lng
            });
          }
        },
        (error) => {
          console.error("GPS Error:", error);
          // Fallback to Delhi if user denies GPS
          setPickupLocation({
            placeId: 'PID-DELHI',
            address: '',
            latitude: 28.6304,
            longitude: 77.2177
          });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, []);

  const [destinationLocation, setDestinationLocation] = useState<any>(null);

  const [vehicleType, setVehicleType] = useState<'economy' | 'comfort' | 'lux'>('economy');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'stripe' | 'wallet'>('wallet');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  // Ride lifecycle state
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Directions routing estimation
  const [directionsData, setDirectionsData] = useState<{
    distance: number;
    duration: number;
    routeCoordinates: { lat: number; lng: number }[];
  } | null>(null);

  // Recharge & SOS
  const [rechargeAmt, setRechargeAmt] = useState('500');
  const [isRecharging, setIsRecharging] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);

  // Feedback
  const [userRating, setUserRating] = useState(5);
  const [feedback, setFeedback] = useState('Great ride, arrived on time!');
  // duplicate ratingSubmitted removed
  const [paymentStep, setPaymentStep] = useState<'pending' | 'completed'>('pending');

  // AI Fare Predictor
  const [aiPredicting, setAiPredicting] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Reset rating/payment modals when ride goes away
  useEffect(() => {
    if (!currentRide) {
      setRatingSubmitted(false);
      setPaymentStep('pending');
    }
  }, [currentRide]);

  // Toast status announcements
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  useEffect(() => {
    const status = currentRide?.status;
    const prev = prevRideStatusRef.current;
    if (status && status !== prev) {
      if (status === 'accepted') {
        addToast({ type: 'success', title: '🚖 Driver Assigned!', message: `${currentRide.driverName || 'Alex'} accepted. Arriving shortly.` });
        setSheetState('expanded');
      }
      if (status === 'arriving') addToast({ type: 'info', title: '📍 Driver Nearby', message: 'Your driver is entering your block.' });
      if (status === 'arrived') addToast({ type: 'info', title: '✅ Arrived at Pickup', message: 'Driver has parked. Please look for plate ' + (currentRide.carPlate || 'NYC-4821') });
      if (status === 'active') addToast({ type: 'success', title: '🛣️ Ride In Progress', message: 'Journey started. Estimated destination arrival: ' + (currentRide.eta || '10') + ' min.' });
      if (status === 'completed') addToast({ type: 'success', title: '🏁 Safe Arrival!', message: 'Trip completed. Please rate your driver.' });
      if (status === 'cancelled') addToast({ type: 'error', title: '❌ Trip Cancelled', message: 'Your active booking has been cancelled.' });
      prevRideStatusRef.current = status;
    }
    if (!status) prevRideStatusRef.current = null;
  }, [currentRide?.status]);

  // Sync WebSocket chat
  useEffect(() => {
    if (!socketProps?.socket) return;
    const cleanupTyping = socketProps.onEvent('chat:typing_status', (data: any) => {
      if (data.senderRole === 'driver') setDriverTyping(data.isTyping);
    });
    const cleanupMsg = socketProps.onEvent('chat:message_received', (msg: any) => {
      if (msg.senderRole === 'driver' && !showChat) {
        setUnreadCount(c => c + 1);
        addToast({ type: 'info', title: '💬 Message from Driver', message: msg.message });
      }
    });
    return () => {
      cleanupTyping();
      cleanupMsg();
    };
  }, [socketProps?.socket, showChat]);

  // Compute directions route
  useEffect(() => {
    const fetchRoute = async () => {
      if (!pickupLocation || !destinationLocation) return;
      
      const route = await getRoute(
        { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
        { lat: destinationLocation.latitude, lng: destinationLocation.longitude }
      );
      
      if (route && route.geometry && route.geometry.coordinates) {
        const pts = route.geometry.coordinates.map((c: any) => ({ lat: c[1], lng: c[0] }));
        setDirectionsData({
          distance: route.distance / 1000, // meters to km
          duration: Math.round(route.duration / 60), // seconds to minutes
          routeCoordinates: pts
        });
      } else {
        // Safe graceful fallback if OSRM is down
        const dist = getHaversineDistance(
          { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
          { lat: destinationLocation.latitude, lng: destinationLocation.longitude }
        );
        const pts = generateCityRoute(
          { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
          { lat: destinationLocation.latitude, lng: destinationLocation.longitude }
        );
        const eta = Math.round(dist <= 15 ? (dist / 40) * 60 + 2 : (15 / 40) * 60 + ((dist - 15) / 95) * 60 + 3);
        setDirectionsData({
          distance: dist || 1.2,
          duration: eta || 4,
          routeCoordinates: pts
        });
      }
    };
    fetchRoute();
  }, [pickupLocation?.latitude, pickupLocation?.longitude, destinationLocation?.latitude, destinationLocation?.longitude]);

  // Pricing calculations
  const calculatedDistance = directionsData?.distance ?? 3.5;
  const calculatedEta = directionsData?.duration ?? 6;
  const surgeMultiplier = systemConfig?.demandMultiplier ?? 1.25;

  const getFareForType = (type: 'economy' | 'comfort' | 'lux') => {
    const rate = type === 'economy' ? 14 : type === 'comfort' ? 22 : 36;
    const base = systemConfig?.baseFares[type] ?? (type === 'economy' ? 600 : type === 'comfort' ? 1000 : 1720);
    const rawFare = Math.round((base + rate * calculatedDistance) * surgeMultiplier);
    if (appliedPromo) {
      return Math.round(rawFare * (1 - appliedPromo.discountPercent / 100));
    }
    return rawFare;
  };

  const calculatedFare = getFareForType(vehicleType);

  // Extended ride categories for Uber-like horizontal scroll
  const rideCategories = useMemo(() => [
    { id: 'bike', type: 'economy' as const, icon: '🏍️', name: 'Bike', fare: Math.round(getFareForType('economy') * 0.45), eta: Math.max(2, calculatedEta - 4), seats: '1', desc: 'Affordable, fast' },
    { id: 'auto', type: 'economy' as const, icon: '🛺', name: 'Auto', fare: Math.round(getFareForType('economy') * 0.7), eta: Math.max(3, calculatedEta - 2), seats: '3', desc: 'No bargaining' },
    { id: 'mini', type: 'economy' as const, icon: '🚗', name: 'Mini', fare: getFareForType('economy'), eta: calculatedEta, seats: '4', desc: 'Everyday rides' },
    { id: 'sedan', type: 'comfort' as const, icon: '🚘', name: 'Sedan', fare: getFareForType('comfort'), eta: calculatedEta + 1, seats: '4', desc: 'Comfy sedans' },
    { id: 'suv', type: 'lux' as const, icon: '🚙', name: 'SUV', fare: Math.round(getFareForType('lux') * 0.9), eta: calculatedEta + 2, seats: '6', desc: 'Spacious rides' },
    { id: 'luxury', type: 'lux' as const, icon: '✨', name: 'Luxury', fare: getFareForType('lux'), eta: calculatedEta + 3, seats: '4', desc: 'Premium comfort' },
  ], [calculatedDistance, calculatedEta, surgeMultiplier, appliedPromo]);

  const [selectedCategory, setSelectedCategory] = useState('mini');

  // Promo operations
  const applyPromoCode = () => {
    const code = promoCode.toUpperCase().trim();
    if (!code) return;
    const found = systemConfig && (systemConfig as any).promoCodes?.find((p: any) => p.code === code && p.isActive);
    if (found) {
      setAppliedPromo({ code: found.code, discountPercent: found.discountPercent });
      setPromoError('');
      addToast({ type: 'success', title: '🎉 Promo Applied!', message: `${found.discountPercent}% discount applied to your ride.` });
    } else {
      setPromoError('Invalid or expired promo code.');
      setAppliedPromo(null);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
  };

  // Auth Actions
  const startLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingOtp(true);
    setTimeout(() => {
      setIsSendingOtp(false);
      setStep('otp');
    }, 1200);
  };

  const startOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingOtp(true);
    setTimeout(() => {
      setIsVerifyingOtp(false);
      setStep('app');
    }, 1000);
  };

  // SOS Activation
  const triggerSOS = () => {
    setSosActivated(true);
    onAddTransaction({
      id: `SOS-${Math.random().toString(36).substr(2, 9)}`,
      type: 'payment',
      amount: 0,
      description: `⚠️ SOS Emergency Alert Sent: Shared coordinate tracking.`,
      timestamp: new Date().toLocaleTimeString()
    });
    setTimeout(() => setSosActivated(false), 5000);
  };

  // Balance top up
  const triggerRecharge = () => {
    const amt = parseFloat(rechargeAmt);
    if (isNaN(amt) || amt <= 0) return;
    setIsRecharging(true);
    setTimeout(() => {
      onUpdateWallet(amt);
      onAddTransaction({
        id: `TXN-${Math.random().toString(36).substr(2, 9)}`,
        type: 'deposit',
        amount: amt,
        description: `Wallet top-up via Stripe Sandboxed Gateway`,
        timestamp: new Date().toLocaleTimeString()
      });
      setIsRecharging(false);
      setRechargeAmt('500');
      addToast({ type: 'success', title: '💳 Top-up Complete', message: `₹${amt.toFixed(2)} added securely to your wallet.` });
    }, 1200);
  };

  // Review Submissions
  const submitReview = () => {
    onCompleteRating(userRating, feedback);
    setRatingSubmitted(true);
    addToast({ type: 'success', title: '⭐ Review Submitted', message: 'Thank you for your valuable feedback!' });
  };

  // Book Request Dispatch
  const executeBookRequest = () => {
    if (!pickupLocation || !destinationLocation) {
      alert("Please select both pickup origin and destination.");
      return;
    }
    const cat = rideCategories.find(c => c.id === selectedCategory) || rideCategories[2];
    onRequestRide({
      pickup: pickupLocation.address,
      destination: destinationLocation.address,
      pickupCoords: { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
      destinationCoords: { lat: destinationLocation.latitude, lng: destinationLocation.longitude },
      vehicleType: cat.type,
      paymentMethod,
      fare: cat.fare,
      distance: calculatedDistance,
      eta: cat.eta,
      aiExplanation: aiExplanation || undefined
    });
  };

  // Typing Chat logic
  const handleTyping = (text: string) => {
    setChatMessage(text);
    if (!socketProps?.socket || !currentRide) return;
    socketProps.emitTypingStatus({
      rideId: currentRide.id,
      senderRole: 'rider',
      isTyping: text.length > 0
    });
  };

  const sendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !socketProps?.socket || !currentRide) return;
    socketProps.emitChatMessage({
      rideId: currentRide.id,
      senderRole: 'rider',
      message: chatMessage.trim()
    });
    setChatMessage('');
    socketProps.emitTypingStatus({
      rideId: currentRide.id,
      senderRole: 'rider',
      isTyping: false
    });
  };

  // Quick helper: Set destination coordinates & book
  const selectQuickPlace = (address: string, lat: number, lng: number) => {
    setDestinationLocation({
      placeId: 'PID-QUICK-' + Date.now(),
      address,
      latitude: lat,
      longitude: lng
    });
    setShowSearchExpanded(false);
    setSheetState('expanded');
    // Request a new ride with default parameters
    onRequestRide({
      pickup: pickupLocation.address,
      destination: destinationLocation.address,
      pickupCoords: { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
      destinationCoords: { lat: destinationLocation.latitude, lng: destinationLocation.longitude },
      vehicleType: 'economy',
      paymentMethod: 'cash',
      fare: 0,
      distance: 0,
      eta: 0,
    });
    addToast({ type: 'info', title: '📍 Destination Selected', message: `Drop set to ${address.split(',')[0]}.` });
  };

  // Trigger Gemini fare explanation
  const handleAIFarePrediction = async () => {
    setAiPredicting(true);
    setAiExplanation(null);
    try {
      const resp = await fetch('/api/fare/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: pickupLocation.address,
          destination: destinationLocation.address,
          distance: calculatedDistance,
          vehicleType,
          fare: calculatedFare,
          timeOfDay: new Date().toLocaleTimeString(),
          traffic: 'moderate',
          demandMultiplier: surgeMultiplier
        })
      });
      const data = await resp.json();
      if (data.prediction) {
        setAiExplanation(data.prediction);
      } else {
        setAiExplanation(`Based on real-time traffic index and current demand of ${surgeMultiplier}x, pricing to your destination is optimized at ₹${calculatedFare}.`);
      }
    } catch (err) {
      setAiExplanation(`🔮 AI Fare Analysis: High availability detected for ${vehicleType} category. Fare remains steady at ₹${calculatedFare}.`);
    } finally {
      setAiPredicting(false);
    }
  };

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────

  return (
    <div className="w-full h-full flex flex-col relative bg-slate-50 text-slate-900 overflow-hidden" id="passenger-mobile-app-root">

      {/* ═══════════ AUTH SCREEN ═══════════ */}
      {/* ═══════════ AUTH SCREEN ═══════════ */}
      {step === 'auth' && (
        <div className="flex-1 flex flex-col justify-between p-6 relative overflow-hidden">
          {/* Background image overlay */}
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-30"
            style={{ backgroundImage: 'url("/rider_auth_bg.png")' }}
          />
          {/* Backdrop blur & gradient overlay */}
          <div className="absolute inset-0 bg-slate-50/75 backdrop-blur-xs z-0" />

          <div className="pt-8 text-center space-y-4 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-yellow-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-3xl font-black text-slate-950">R</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-1.5">
                <span>RideConnect</span>
              </h2>
              <p className="text-xs text-slate-500">Production-Grade Hailing Gateway</p>
            </div>
          </div>

          <form onSubmit={startLoginSubmit} className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-wider uppercase text-slate-600 block text-left">Passenger Name</label>
              <input
                type="text"
                placeholder="Shridhar"
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-emerald-500 font-sans"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-wider uppercase text-slate-600 text-left block">Mobile Number (Sandbox)</label>
              <div className="flex bg-white rounded-xl border border-slate-300 items-center overflow-hidden">
                <span className="px-3 border-r border-slate-200 text-xs text-slate-500 font-semibold font-mono">+91</span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  className="w-full bg-transparent text-slate-900 border-none py-3 px-3 text-xs focus:outline-none font-mono"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 font-black text-slate-950 py-3.5 rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-xs uppercase tracking-wider"
              disabled={isSendingOtp}
            >
              {isSendingOtp ? (
                <>
                  <Loader className="animate-spin" size={14} />
                  <span>Requesting OTP...</span>
                </>
              ) : (
                <span>Request OTP Sandbox</span>
              )}
            </button>
          </form>

          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-center gap-2">
              <div className="h-[1px] bg-slate-300 flex-1" />
              <span className="text-[9px] uppercase font-mono tracking-wide text-slate-500">Fast Demo Pass</span>
              <div className="h-[1px] bg-slate-300 flex-1" />
            </div>
            <button
              onClick={() => setStep('app')}
              className="w-full bg-white border border-slate-300 text-slate-500 py-2.5 rounded-xl hover:bg-slate-100 text-[10px] font-mono font-bold uppercase tracking-wider transition"
            >
              ⏩ Skip Direct to App Mode
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ OTP SCREEN ═══════════ */}
      {step === 'otp' && (
        <div className="flex-1 flex flex-col justify-between p-6 relative overflow-hidden">
          {/* Background image overlay */}
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-30"
            style={{ backgroundImage: 'url("/rider_auth_bg.png")' }}
          />
          {/* Backdrop blur & gradient overlay */}
          <div className="absolute inset-0 bg-slate-50/75 backdrop-blur-xs z-0" />

          <div className="pt-8 text-center space-y-2 relative z-10">
            <h2 className="text-xl font-black tracking-tight text-slate-900">Enter OTP Verification</h2>
            <p className="text-xs text-slate-500 font-medium">Sandboxed token dispatched to +91 {phoneNumber}</p>
          </div>

          <form onSubmit={startOtpVerify} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="4821"
                maxLength={4}
                className="w-1/2 mx-auto tracking-[0.8em] text-center font-mono font-black text-2xl bg-white border border-slate-300 text-emerald-600 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
              />
              <p className="text-[10px] font-mono text-slate-500 text-center">Type default test bypass key: <b className="text-slate-600">4821</b></p>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 font-black text-slate-950 py-3.5 rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-md text-xs uppercase tracking-wider"
              disabled={isVerifyingOtp}
            >
              {isVerifyingOtp ? (
                <>
                  <Loader className="animate-spin" size={14} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Confirm Verification</span>
              )}
            </button>
          </form>

          <button
            onClick={() => setStep('auth')}
            className="text-slate-500 text-[10px] hover:text-slate-700 font-mono uppercase font-bold relative z-10"
          >
            Go Back & Edit Phone
          </button>
        </div>
      )}

      {/* ═══════════ MAIN APP ═══════════ */}
      {step === 'app' && (
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {/* ── FULL-SCREEN MAP BACKGROUND (always visible) ── */}
          <div className="absolute inset-0 z-0">
            <CityMap
              pickup={pickupLocation?.address || ''}
              destination={destinationLocation?.address || ''}
              onSelectPickup={(name, lat, lng) => setPickupLocation({ placeId: 'PID-'+Date.now(), address: name, latitude: lat, longitude: lng })}
              onSelectDestination={(name, lat, lng) => setDestinationLocation({ placeId: 'DID-'+Date.now(), address: name, latitude: lat, longitude: lng })}
              driverCoords={liveDriverCoords || undefined}
              rideStatus={currentRide?.status}
              activeRoute={currentRide ? activeRoute : directionsData?.routeCoordinates}
              currentStepIndex={currentStepIndex}
              isDarkMode={isDarkMode}
              hideControls={true}
            />
          </div>

          {/* ── SOS Overlay ── */}
          {sosActivated && (
            <div className="absolute inset-x-0 top-0 bg-red-600 text-white p-3 z-50 text-center animate-pulse flex items-center justify-center gap-2 shadow-lg">
              <ShieldAlert size={16} />
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider">
                ⚠️ [SOS PANIC MODE SIGNALLED] COORDINATES SHARED WITH DISPATCH.
              </div>
            </div>
          )}

          {/* ── Toast Notifications ── */}
          <div className="absolute top-4 inset-x-3 z-50 space-y-2 pointer-events-none">
            {toasts.map(toast => (
              <div
                key={toast.id}
                className={`flex items-start gap-2.5 p-3 rounded-2xl shadow-xl border text-xs font-medium backdrop-blur-md pointer-events-auto animate-in slide-in-from-top-2 duration-300 ${
                  toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-700/50 text-emerald-100' :
                  toast.type === 'error'   ? 'bg-red-950/90 border-red-700/50 text-red-100' :
                  toast.type === 'warning' ? 'bg-amber-950/90 border-amber-700/50 text-amber-100' :
                                            'bg-white/90 border-slate-700/50 text-slate-100'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-black text-[10px] uppercase tracking-wide">{toast.title}</div>
                  <div className="text-[9px] font-mono opacity-80 mt-0.5 leading-tight">{toast.message}</div>
                </div>
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="opacity-50 hover:opacity-100 transition-opacity shrink-0"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>

          {/* ── MAP VIEW (default Uber-style) ── */}
          {activeView === 'map' && (
            <>
              {/* ── Top Floating Header Bar ── */}
              <div className="absolute top-3 inset-x-3 z-20 flex items-center gap-2">
                {/* Profile avatar */}
                <button
                  onClick={() => setActiveView('profile')}
                  className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm shadow-lg flex items-center justify-center border border-white/20 overflow-hidden"
                >
                  <img src="/rider_avatar.png" alt="Rider Profile" className="w-8 h-8 rounded-full object-cover" />
                </button>

                {/* Search Bar (tappable) */}
                {!currentRide && !showSearchExpanded && (
                  <button
                    onClick={() => setShowSearchExpanded(true)}
                    className="flex-1 bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-4 py-3 flex items-center gap-2.5 border border-white/20"
                  >
                    <Search size={16} className="text-slate-400" />
                    <span className="text-slate-500 text-sm font-medium truncate">Where to?</span>
                  </button>
                )}
                {currentRide && (
                  <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-4 py-3 flex items-center gap-2.5 border border-white/20">
                    <Navigation size={14} className="text-emerald-500 animate-pulse" />
                    <span className="text-slate-700 text-xs font-bold truncate">
                      {currentRide.status === 'accepted' ? 'Driver en route' :
                       currentRide.status === 'arriving' ? 'Driver arriving' :
                       currentRide.status === 'arrived'  ? 'Driver arrived' :
                       currentRide.status === 'active'   ? 'Trip in progress' :
                       currentRide.status === 'completed' ? 'Trip completed' : 'Searching...'}
                    </span>
                  </div>
                )}

                {/* SOS Button */}
                {currentRide && ['accepted', 'arriving', 'arrived', 'active'].includes(currentRide.status) && (
                  <button
                    onClick={triggerSOS}
                    className="w-10 h-10 rounded-full bg-red-600 shadow-lg flex items-center justify-center"
                  >
                    <ShieldAlert size={16} className="text-white" />
                  </button>
                )}
              </div>

              {/* ── Expanded Search Overlay ── */}
              {showSearchExpanded && !currentRide && (
                <div className="absolute inset-0 z-30 bg-slate-50/98 flex flex-col" style={{animation: 'fadeIn 0.2s ease-out'}}>
                  {/* Search Header */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowSearchExpanded(false)}
                        className="w-9 h-9 rounded-full bg-white flex items-center justify-center"
                      >
                        <ArrowRight size={14} className="text-slate-900 rotate-180" />
                      </button>
                      <span className="text-sm font-bold text-slate-900">Plan your ride</span>
                    </div>

                    {/* Pickup & Destination inputs */}
                    <div className="bg-white/80 rounded-2xl p-3 space-y-2 border border-slate-200">
                      <div className="relative pl-7 space-y-2">
                        <div className="absolute left-2.5 top-[14px] bottom-[14px] w-[2px] bg-zinc-700 flex flex-col justify-between items-center">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 -mt-1 -ml-[3px]" />
                          <div className="w-2 h-2 bg-rose-500 -mb-1 -ml-[3px] rounded-sm" />
                        </div>
                        <LocationAutocomplete
                          label="Pickup"
                          placeholder="Enter pickup point..."
                          initialValue={pickupLocation?.address || ''}
                          onSelect={(details) => setPickupLocation(details)}
                          isDarkMode={false}
                        />
                        <LocationAutocomplete
                          label="Destination"
                          placeholder="Where are you going?"
                          initialValue={destinationLocation?.address || ''}
                          onSelect={(details) => {
                            setDestinationLocation(details);
                            setShowSearchExpanded(false);
                            setSheetState('expanded');
                          }}
                          isDarkMode={false}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSearchExpanded(false);
                          setSheetState('expanded');
                        }}
                        className="w-full mt-3 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl uppercase tracking-widest text-[10px] transition shadow-md flex items-center justify-center gap-2"
                      >
                        Go <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Quick Places */}
                  <div className="flex-1 overflow-y-auto px-4 pb-4">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider mb-2">Suggested Places</span>
                    <div className="space-y-0.5">
                      {[
                        { icon: '🏛️', name: 'Gateway of India', sub: 'South Mumbai, India', lat: 18.9220, lng: 72.8347 },
                        { icon: '🏢', name: 'Cyber City, Gurugram', sub: 'Corporate hub, NCR', lat: 28.4952, lng: 77.0878 },
                        { icon: '🌿', name: 'Indiranagar 100ft Rd', sub: 'Bengaluru, India', lat: 12.9718, lng: 77.6412 },
                        { icon: '💻', name: 'HITEC City', sub: 'Hyderabad, India', lat: 17.4435, lng: 78.3813 },
                        { icon: '🏖️', name: 'Panaji Coast, Goa', sub: 'Portuguese heritage', lat: 15.4909, lng: 73.8278 },
                        { icon: '🕌', name: 'Charminar', sub: 'Old city, Hyderabad', lat: 17.3616, lng: 78.4747 },
                      ].map(place => (
                        <button
                          key={place.name}
                          onClick={() => selectQuickPlace(`${place.name}, ${place.sub}`, place.lat, place.lng)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white transition text-left"
                        >
                          <span className="text-lg">{place.icon}</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-900 block truncate">{place.name}</span>
                            <span className="text-[9px] text-slate-500 block truncate">{place.sub}</span>
                          </div>
                          <ArrowRight size={12} className="text-slate-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Bottom Sheet ── */}
              <div
                className={`absolute bottom-[56px] inset-x-0 z-20 transition-all duration-300 ease-out ${
                  sheetState === 'full' ? 'top-16' :
                  sheetState === 'expanded' ? 'max-h-[65%]' :
                  'max-h-[180px]'
                }`}
                style={{
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.97), rgba(255,255,255,0.99))',
                  borderTopLeftRadius: '24px',
                  borderTopRightRadius: '24px',
                  boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
                }}
              >
                {/* Drag Handle */}
                <div
                  className="flex justify-center py-3 cursor-grab"
                  onClick={() => {
                    if (sheetState === 'collapsed') setSheetState('expanded');
                    else if (sheetState === 'expanded') setSheetState('collapsed');
                    else setSheetState('expanded');
                  }}
                >
                  <div className="w-10 h-1 bg-slate-300 rounded-full" />
                </div>

                <div className="overflow-y-auto px-4 pb-6" style={{ maxHeight: sheetState === 'full' ? 'calc(100vh - 120px)' : sheetState === 'expanded' ? '380px' : '130px' }}>

                  {/* ── No Active Ride: Booking UI ── */}
                  {!currentRide && (
                    <>
                      {/* Collapsed: Show compact "Where to?" + quick actions */}
                      {sheetState === 'collapsed' && (
                        <div className="space-y-3">
                          <button
                            onClick={() => setShowSearchExpanded(true)}
                            className="w-full bg-slate-100 rounded-2xl px-4 py-3.5 flex items-center gap-3 active:bg-slate-200 transition"
                          >
                            <Search size={18} className="text-slate-400" />
                            <span className="text-slate-600 text-sm font-medium">Where to?</span>
                            <div className="ml-auto flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1 border border-slate-200">
                              <Clock size={10} className="text-slate-400" />
                              <span className="text-[10px] text-slate-500 font-semibold">Now</span>
                              <ChevronDown size={10} className="text-slate-400" />
                            </div>
                          </button>
                          {/* Quick destination chips */}
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {[
                              { icon: '🏠', label: 'Home', lat: 28.6304, lng: 77.2177, addr: 'Connaught Place, Delhi NCR' },
                              { icon: '💼', label: 'Work', lat: 28.4952, lng: 77.0878, addr: 'Cyber City, Gurugram' },
                              { icon: '✈️', label: 'Airport', lat: 28.5562, lng: 77.1000, addr: 'IGI Airport, Delhi' },
                            ].map(q => (
                              <button
                                key={q.label}
                                onClick={() => selectQuickPlace(q.addr, q.lat, q.lng)}
                                className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-2 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-50 transition shadow-sm"
                              >
                                <span>{q.icon}</span>
                                <span>{q.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expanded: Ride categories & booking */}
                      {(sheetState === 'expanded' || sheetState === 'full') && (
                        <div className="space-y-4">
                          {/* Route summary */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <div className="w-[2px] h-3 bg-slate-300" />
                                <div className="w-2 h-2 rounded-sm bg-red-500" />
                              </div>
                              <div className="text-left min-w-0">
                                <p className="text-[11px] font-semibold text-slate-800 truncate max-w-[180px]">{pickupLocation?.address?.split(',')[0]}</p>
                                <p className="text-[11px] font-semibold text-slate-800 truncate max-w-[180px]">{destinationLocation?.address?.split(',')[0]}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-mono text-slate-500">{calculatedDistance.toFixed(1)} km</p>
                              <p className="text-[10px] font-mono text-slate-400">{calculatedEta} min</p>
                            </div>
                          </div>

                          {/* ── Horizontal Ride Categories ── */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Choose a ride</span>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                              {rideCategories.map(cat => (
                                <button
                                  key={cat.id}
                                  onClick={() => {
                                    setSelectedCategory(cat.id);
                                    setVehicleType(cat.type);
                                  }}
                                  className={`flex-shrink-0 w-[100px] p-3 rounded-2xl border-2 text-center transition-all duration-200 ${
                                    selectedCategory === cat.id
                                      ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10'
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  <span className="text-2xl block">{cat.icon}</span>
                                  <span className={`text-[11px] font-bold block mt-1 ${selectedCategory === cat.id ? 'text-slate-900' : 'text-slate-700'}`}>{cat.name}</span>
                                  <span className={`text-xs font-black block mt-0.5 ${selectedCategory === cat.id ? 'text-emerald-600' : 'text-slate-500'}`}>₹{cat.fare}</span>
                                  <span className="text-[8px] text-slate-400 font-medium block mt-0.5">{cat.eta} min • {cat.seats}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Payment + Promo row */}
                          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200">
                            <div className="flex items-center gap-2">
                              <Wallet size={14} className="text-emerald-600" />
                              <div>
                                <button
                                  onClick={() => setPaymentMethod(paymentMethod === 'wallet' ? 'stripe' : 'wallet')}
                                  className="text-xs font-bold text-slate-800"
                                >
                                  {paymentMethod === 'wallet' ? `Balance • ₹${walletBalance.toFixed(0)}` : '💳 Card Payment'}
                                </button>
                              </div>
                            </div>
                            {appliedPromo ? (
                              <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 text-[9px] font-bold">
                                <span>-{appliedPromo.discountPercent}%</span>
                                <button onClick={removePromo} className="text-red-500 ml-0.5">✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full overflow-hidden">
                                <input
                                  type="text"
                                  placeholder="Promo"
                                  value={promoCode}
                                  onChange={(e) => setPromoCode(e.target.value)}
                                  className="w-14 bg-transparent py-1 px-2 text-[9px] focus:outline-none uppercase font-mono text-slate-600"
                                />
                                <button
                                  onClick={applyPromoCode}
                                  className="bg-emerald-500 text-white px-2 py-1 text-[8px] font-bold uppercase"
                                >
                                  Apply
                                </button>
                              </div>
                            )}
                          </div>
                          {promoError && <span className="text-[8px] text-red-500 block font-mono leading-none">{promoError}</span>}

                          {/* Book Button */}
                          <button
                            onClick={executeBookRequest}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-2"
                          >
                            <span>Confirm {rideCategories.find(c => c.id === selectedCategory)?.name}</span>
                            <span className="text-emerald-400 font-black">
                              • ₹{rideCategories.find(c => c.id === selectedCategory)?.fare}
                            </span>
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Searching / Dispatch Pending ── */}
                  {currentRide && ['requested', 'pending', 'searching'].includes(currentRide.status) && (
                    <div className="py-6 text-center space-y-4">
                      <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
                        <span className="text-xl">🚖</span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Finding your driver</h3>
                        <p className="text-[10px] text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                          Matching with nearest available driver. Average match time: 4 seconds.
                        </p>
                      </div>
                      <button
                        onClick={onCancelRide}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] px-6 py-2 rounded-full uppercase tracking-wide transition mx-auto block border border-red-200"
                      >
                        Cancel Search
                      </button>
                    </div>
                  )}

                  {/* ── Active Booking / Tracking ── */}
                  {currentRide && ['accepted', 'arriving', 'arrived', 'active'].includes(currentRide.status) && (
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[8px] font-mono text-emerald-600 block font-bold uppercase tracking-wider leading-none">
                            {currentRide.status === 'accepted' ? 'DRIVER EN-ROUTE' :
                             currentRide.status === 'arriving' ? 'ARRIVING AT PICKUP' :
                             currentRide.status === 'arrived'  ? 'ARRIVED AT PICKUP' : 'TRIP IN PROGRESS'}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 mt-1 leading-tight flex items-center gap-1.5">
                            <span>{currentRide.vehicleType.toUpperCase()} CLASS</span>
                            <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.5 rounded font-bold">OTP: 4821</span>
                          </h4>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono font-black text-emerald-600 leading-none block">₹{currentRide.fare.toFixed(0)}</span>
                          <span className="text-[9px] font-mono text-slate-400 mt-1 block">via {currentRide.paymentMethod}</span>
                        </div>
                      </div>

                      {/* Driver details card */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-orange-400 rounded-full flex items-center justify-center font-black text-white text-sm shadow-sm">
                          {currentRide.driverName ? currentRide.driverName.charAt(0) : 'D'}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-800 truncate">{currentRide.driverName || 'Alex Pro Driver'}</span>
                            <span className="text-[9px] font-mono font-bold text-amber-600 bg-amber-100 px-1 py-0.5 rounded flex items-center gap-0.5">
                              ★ 4.8
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-500 mt-0.5">Tesla Model Y • {currentRide.carPlate || 'NYC-4821'}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <a href="tel:9912931823" className="bg-white hover:bg-slate-100 p-2.5 rounded-xl text-slate-600 border border-slate-200 shadow-sm">
                            <Phone size={12} />
                          </a>
                          <button onClick={() => { setShowChat(true); setUnreadCount(0); }} className="bg-white hover:bg-slate-100 p-2.5 rounded-xl text-slate-600 border border-slate-200 shadow-sm relative">
                            <MessageCircle size={12} />
                            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full text-[6px] text-white flex items-center justify-center font-bold">{unreadCount}</span>}
                          </button>
                        </div>
                      </div>

                      {/* GPS progress bar */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-medium">{calculatedDistance.toFixed(1)} km</span>
                        <span className="flex items-center gap-1 text-emerald-600 font-bold">
                          <Navigation size={10} className="rotate-45" />
                          <span>Live tracking</span>
                        </span>
                      </div>

                      <button
                        onClick={onCancelRide}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs py-3 rounded-2xl uppercase tracking-wider transition text-center"
                      >
                        Cancel Ride
                      </button>
                    </div>
                  )}

                  {/* ── Completed Trip Rating ── */}
                  {currentRide?.status === 'payment_success' && !ratingSubmitted && (
                    <div className="space-y-4">
                      <div className="text-center space-y-1">
                        <span className="text-3xl">🏁</span>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">How was your ride?</h3>
                        <p className="text-[10px] text-slate-500">Rate your trip with {currentRide.driverName || 'Alex Pro Driver'}</p>
                      </div>

                      <div className="flex justify-center gap-2 py-1">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setUserRating(val)}
                            className="transition transform active:scale-95 duration-100"
                          >
                            <Star
                              size={30}
                              className={val <= userRating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}
                            />
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Driver was clean, punctual..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full bg-slate-100 border border-slate-200 text-slate-800 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-emerald-500"
                      />

                      <button
                        onClick={submitReview}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-2xl uppercase tracking-wider transition shadow-lg"
                      >
                        Submit Rating
                      </button>
                    </div>
                  )}

                  {/* ── Rated Complete ── */}
                  {currentRide?.status === 'completed' && ratingSubmitted && (
                    <div className="py-8 text-center space-y-4">
                      <div className="w-14 h-14 bg-emerald-100 rounded-full mx-auto flex items-center justify-center text-emerald-600">
                        <Check size={24} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">All Done!</h3>
                        <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                          Rating recorded securely. Your wallet transaction summary is updated.
                        </p>
                      </div>
                      <button
                        onClick={onCancelRide}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-6 py-2.5 rounded-full uppercase tracking-wide transition mx-auto block shadow-md"
                      >
                        Confirm & Close
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}

          {/* ── TRIPS VIEW ── */}
          {activeView === 'trips' && (() => {
            const completedRides = ridesList.filter(r => r.status === 'completed' || r.status === 'cancelled');
            const totalSpent = completedRides.filter(r => r.status === 'completed').reduce((s, r) => s + r.fare, 0);
            const totalTrips = completedRides.filter(r => r.status === 'completed').length;
            return (
              <div className="absolute inset-0 z-30 bg-white overflow-y-auto" style={{animation: 'fadeIn 0.2s ease-out'}}>
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setActiveView('map')} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <ArrowRight size={14} className="text-slate-600 rotate-180" />
                    </button>
                    <h2 className="text-base font-black text-slate-900">Your Trips</h2>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Rides', value: totalTrips, color: 'text-emerald-600 bg-emerald-50' },
                      { label: 'Total Spent', value: `₹${totalSpent.toFixed(0)}`, color: 'text-amber-600 bg-amber-50' },
                      { label: 'Saved', value: `₹${Math.floor(totalSpent * 0.08)}`, color: 'text-blue-600 bg-blue-50' }
                    ].map(s => (
                      <div key={s.label} className={`p-3 rounded-2xl text-center border border-slate-200 ${s.color}`}>
                        <div className="text-sm font-black">{s.value}</div>
                        <div className="text-[8px] font-mono text-slate-500 uppercase mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {completedRides.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border border-slate-200 bg-slate-50">
                      <History size={28} className="mx-auto text-slate-700 mb-2" />
                      <p className="text-xs text-slate-400">No trips yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {completedRides.map(ride => (
                        <div key={ride.id} className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                ride.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                              }`}>{ride.status}</span>
                              <span className="text-[8px] text-slate-400 font-mono ml-1">
                                {new Date(ride.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                            <span className={`font-black text-xs ${ride.status === 'completed' ? 'text-slate-800' : 'text-red-400'}`}>
                              {ride.status === 'completed' ? `₹${ride.fare.toFixed(0)}` : 'Cancelled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <div className="w-[1px] h-2 bg-slate-300" />
                              <div className="w-1.5 h-1.5 rounded-sm bg-red-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-slate-700 font-medium truncate">{ride.pickup.split(',')[0]}</p>
                              <p className="text-slate-500 truncate">{ride.destination.split(',')[0]}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} size={8} className={s <= (ride.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── WALLET VIEW ── */}
          {activeView === 'wallet' && (
            <div className="absolute inset-0 z-30 bg-white overflow-y-auto" style={{animation: 'fadeIn 0.2s ease-out'}}>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => setActiveView('map')} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <ArrowRight size={14} className="text-slate-600 rotate-180" />
                  </button>
                  <h2 className="text-base font-black text-slate-900">Wallet</h2>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                  <span className="text-[9px] font-mono text-slate-400 block uppercase tracking-wider">RideConnect Balance</span>
                  <div className="text-3xl font-black mt-1">₹{walletBalance.toFixed(2)}</div>
                  <div className="text-[9px] font-mono mt-1.5 text-slate-500">Verified secure gateway ID: RX-{userName.toUpperCase()}</div>
                </div>

                {/* Recharge */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">Quick Recharge</span>
                  <div className="flex gap-2">
                    <div className="flex border border-slate-200 rounded-xl overflow-hidden flex-1 items-center px-3 bg-white">
                      <span className="text-slate-400 font-mono text-xs">₹</span>
                      <input
                        type="number"
                        placeholder="500"
                        className="w-full bg-transparent text-slate-800 border-none py-2.5 px-1 text-xs focus:outline-none font-mono"
                        value={rechargeAmt}
                        onChange={(e) => setRechargeAmt(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={triggerRecharge}
                      className="bg-emerald-600 hover:bg-emerald-500 font-bold text-slate-900 text-xs px-5 rounded-xl flex items-center justify-center transition shadow-sm"
                      disabled={isRecharging}
                    >
                      {isRecharging ? <Loader className="animate-spin" size={12} /> : 'Add'}
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    {['250', '500', '1000'].map(val => (
                      <button
                        key={val}
                        onClick={() => setRechargeAmt(val)}
                        className="border border-slate-200 font-mono text-[9px] px-3 py-1.5 rounded-full transition bg-white text-slate-600 hover:bg-slate-100"
                      >
                        +₹{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transaction list */}
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">Recent Transactions</span>
                  {transactions.length === 0 ? (
                    <div className="text-slate-400 text-[10px] py-6 text-center">No transactions yet.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {transactions.map(t => (
                        <div key={t.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs bg-white">
                          <div className="text-left min-w-0">
                            <span className="font-semibold text-slate-800 block truncate max-w-[200px]">{t.description}</span>
                            <span className="text-[9px] text-slate-400">{t.timestamp}</span>
                          </div>
                          <span className={`font-mono font-black shrink-0 ${t.type === 'deposit' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {t.type === 'deposit' ? '+' : '-'}₹{t.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILE VIEW ── */}
          {activeView === 'profile' && (
            <div className="absolute inset-0 z-30 bg-white overflow-y-auto pb-20" style={{animation: 'fadeIn 0.2s ease-out'}}>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => setActiveView('map')} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <ArrowRight size={14} className="text-slate-600 rotate-180" />
                  </button>
                  <h2 className="text-base font-black text-slate-900">Profile</h2>
                </div>

                {/* Avatar Card */}
                <div className="text-center py-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 relative overflow-hidden flex flex-col items-center">
                  <div className="relative">
                    <img 
                      src="/rider_avatar.png" 
                      alt="Rider Profile" 
                      className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-emerald-500/30" 
                    />
                    <span className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-1 border border-white text-[8px] font-black uppercase tracking-wider px-1.5 shadow-sm">
                      Active
                    </span>
                  </div>
                  <h4 className="text-base font-black mt-3 text-slate-900">{userName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{userEmail}</p>
                  <div className="mt-2.5 flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold py-1 px-3 rounded-full border border-emerald-100 uppercase tracking-wider">
                    <span>✨ Gold Member</span>
                  </div>
                </div>

                {/* Rider Stats Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Wallet</span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">₹{walletBalance.toFixed(0)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Trips</span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">{totalTrips} Rides</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Since</span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">{memberSince}</span>
                  </div>
                </div>

                {/* Settings Form */}
                <div className="rounded-2xl p-4 border border-slate-200 bg-slate-50 space-y-4">
                  <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider border-b border-slate-200 pb-1.5">User details</span>
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">Display Name</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 w-full focus:outline-none focus:border-emerald-500 bg-white text-slate-800 text-xs font-medium shadow-sm"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">Email Address</span>
                      <input
                        type="email"
                        className="border border-slate-200 rounded-xl p-2.5 w-full focus:outline-none focus:border-emerald-500 bg-white text-slate-800 text-xs font-medium shadow-sm"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">Mobile Number</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 w-full focus:outline-none focus:border-emerald-500 bg-white text-slate-800 text-xs font-medium shadow-sm"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider border-b border-slate-200 pb-1.5 pt-2">Saved Addresses</span>
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">🏠 Home Address</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 w-full focus:outline-none focus:border-emerald-500 bg-white text-slate-800 text-xs font-medium shadow-sm"
                        value={homeAddress}
                        onChange={(e) => setHomeAddress(e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">💼 Work Address</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 w-full focus:outline-none focus:border-emerald-500 bg-white text-slate-800 text-xs font-medium shadow-sm"
                        value={workAddress}
                        onChange={(e) => setWorkAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-slate-200">
                    <span className="text-[9px] text-slate-500 uppercase block font-bold mb-1">Preferences</span>
                    <PrefToggle label="Push Notifications" emoji="🔔" defaultOn={true} />
                    <PrefToggle label="Email Receipts" emoji="📧" defaultOn={true} />
                  </div>
                </div>

                <button
                  onClick={() => setStep('auth')}
                  className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <LogOut size={12} />
                  <span>Logout Account</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Bottom Navigation Bar ── */}
          <div className="absolute bottom-0 inset-x-0 z-40 bg-white/98 backdrop-blur-sm border-t border-slate-200 flex justify-around py-2.5 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            {[
              { id: 'map' as const, label: 'Home', icon: <HomeIcon size={20} /> },
              { id: 'trips' as const, label: 'Activity', icon: <History size={20} /> },
              { id: 'wallet' as const, label: 'Wallet', icon: <Wallet size={20} /> },
              { id: 'profile' as const, label: 'Account', icon: <User size={20} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex flex-col items-center gap-0.5 transition-colors min-w-[50px] ${
                  activeView === tab.id
                    ? 'text-slate-900'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.icon}
                <span className={`text-[9px] tracking-wide font-semibold leading-none ${
                  activeView === tab.id ? 'font-bold' : ''
                }`}>{tab.label}</span>
              </button>
            ))}
          </div>

        </div>
      )}

      {/* ═══════════ Chat Drawer Overlay ═══════════ */}
      {showChat && currentRide && (
        <div className="absolute inset-0 bg-black/60 z-[60] flex flex-col justify-end transition-all duration-300">
          <div className="bg-white rounded-t-[28px] h-[500px] flex flex-col overflow-hidden shadow-2xl">

            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white flex items-center justify-center font-black text-xs">
                  D
                </div>
                <div className="text-left">
                  <span className="font-bold text-xs text-slate-800 block">Chat with Driver</span>
                  <span className="text-[9px] text-slate-400">
                    {driverTyping ? (
                      <span className="text-emerald-600 font-bold animate-pulse">Driver is typing...</span>
                    ) : (
                      "Online"
                    )}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowChat(false);
                  if (socketProps?.socket) {
                    socketProps.emitTypingStatus({
                      rideId: currentRide.id,
                      senderRole: 'rider',
                      isTyping: false
                    });
                  }
                }}
                className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col-reverse bg-slate-50">
              <div className="space-y-3 flex flex-col">
                {(currentRide.chatHistory || []).length === 0 ? (
                  <div className="text-center py-10 text-[10px] text-slate-400">
                    No messages yet. Coordinate your pickup here!
                  </div>
                ) : (
                  (currentRide.chatHistory || []).map((msg: any, idx: number) => {
                    const isSelf = msg.senderRole === 'rider';
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[75%] ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}
                      >
                        <div
                          className={`rounded-2xl px-3 py-2 text-xs leading-snug font-medium break-words ${
                            isSelf ? 'bg-emerald-500 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
                          }`}
                        >
                          {msg.message}
                        </div>
                        <span className="text-[8px] text-slate-400 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={sendMsg} className="p-3 border-t border-slate-100 bg-white flex gap-2 items-center">
              <input
                type="text"
                placeholder="Type message..."
                value={chatMessage}
                onChange={(e) => handleTyping(e.target.value)}
                className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 p-2.5 rounded-full text-white transition duration-150 cursor-pointer shadow-sm flex items-center justify-center"
              >
                <Send size={12} className="rotate-45" />
              </button>
            </form>

          </div>
        </div>
      )}

      {/* ── Payment Overlay ── */}
      {currentRide?.status === 'completed' && paymentStep === 'pending' && (
        <PaymentScreen
          amount={currentRide.fare}
          onSuccess={() => {
            setPaymentStep('completed');
            // Deduct passenger balance if using wallet
            if (currentRide.paymentMethod === 'wallet') {
              onUpdateWallet(-currentRide.fare);
              onAddTransaction({
                id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                type: 'payment',
                amount: currentRide.fare,
                description: `Fare payment for ride ${currentRide.id}`,
                timestamp: new Date().toLocaleTimeString()
              });
            }
            addToast({ type: 'success', title: '💳 Payment Successful', message: `₹${currentRide.fare} paid successfully.` });
          }}
          onFailure={() => {
            addToast({ type: 'error', title: '❌ Payment Failed', message: 'Payment processing encountered an error.' });
          }}
          onCancel={onCancelRide}
        />
      )}

      {/* ── Rating Overlay ── */}
      {currentRide?.status === 'completed' && paymentStep === 'completed' && !ratingSubmitted && (
        <RatingScreen
          rideId={currentRide.id}
          onFinish={(rating, review) => {
            onCompleteRating(rating, review);
            setRatingSubmitted(true);
            addToast({ type: 'success', title: '⭐ Review Submitted', message: 'Thank you for your valuable feedback!' });
          }}
          onCancel={() => {
            onCompleteRating(5, 'Great ride!');
          }}
        />
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

    </div>
  );
}
