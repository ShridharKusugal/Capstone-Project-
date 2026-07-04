import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, Award, Star, Loader,
  Check, X, Navigation, User,
  Send, MessageCircle, Phone, Menu, Sliders,
  ArrowRight, LogOut
} from 'lucide-react';
import { Ride } from '../types';
import CityMap from '../components/CityMap';

interface DriverToast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface DriverAppProps {
  currentRide: Ride | null;
  driverOnline: boolean;
  onToggleOnline: () => void;
  onAcceptRide: (driverId: string, name: string) => void;
  onRejectRide: () => void;
  onStartRide: () => void;
  onCompleteRide: () => void;
  driverWalletBalance: number;
  isDarkMode?: boolean;
  socketProps?: any;
  driverCoords?: { lat: number; lng: number } | null;
  activeRoute?: { lat: number; lng: number }[];
}

export default function DriverApp({
  currentRide,
  driverOnline,
  onToggleOnline,
  onAcceptRide,
  onRejectRide,
  onStartRide,
  onCompleteRide,
  driverWalletBalance,
  isDarkMode = false,
  socketProps,
  driverCoords = null,
  activeRoute = []
}: DriverAppProps) {
  const [step, setStep] = useState<'auth' | 'app'>('auth');

  // Bottom sheet state: 'collapsed' | 'expanded'
  const [sheetState, setSheetState] = useState<'collapsed' | 'expanded'>('collapsed');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Toast notification system
  const [toasts, setToasts] = useState<DriverToast[]>([]);
  const addToast = (toast: Omit<DriverToast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  // Unread chat badge
  const [unreadCount, setUnreadCount] = useState(0);
  const prevStatusRef = useRef<string | null>(null);

  // Watch ride status for toast triggers
  useEffect(() => {
    const status = currentRide?.status;
    const prev = prevStatusRef.current;
    if (status && status !== prev) {
      if (status === 'requested') {
        addToast({ type: 'info', title: '📣 New Ride Request!', message: `Pickup: ${currentRide?.pickup.split(',')[0]}` });
        setSheetState('expanded'); // Auto-expand request card
      }
      if (status === 'active') addToast({ type: 'success', title: '🛣️ Trip Started', message: `Driving to ${currentRide?.destination.split(',')[0]}` });
      if (status === 'completed') {
        addToast({ type: 'success', title: '🏁 Trip Completed!', message: `Earned ₹${((currentRide?.fare || 0) * 0.9).toFixed(0)} this trip.` });
        setSheetState('collapsed');
      }
      if (status === 'cancelled') {
        addToast({ type: 'error', title: '❌ Ride Cancelled', message: 'The passenger cancelled this booking.' });
        setSheetState('collapsed');
      }
      prevStatusRef.current = status;
    }
    if (!status) prevStatusRef.current = null;
  }, [currentRide?.status]);

  // Chat States
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [passengerTyping, setPassengerTyping] = useState(false);

  useEffect(() => {
    if (!socketProps?.socket) return;
    
    const cleanupTyping = socketProps.onEvent('chat:typing_status', (data: any) => {
      if (data.senderRole === 'rider') {
        setPassengerTyping(data.isTyping);
      }
    });

    const cleanupMsg = socketProps.onEvent('chat:message_received', (msg: any) => {
      if (msg.senderRole === 'rider' && !showChat) {
        setUnreadCount(c => c + 1);
        addToast({ type: 'info', title: '💬 Message from Rider', message: msg.message });
      }
    });

    return () => {
      cleanupTyping();
      cleanupMsg();
    };
  }, [socketProps?.socket, showChat]);

  const handleTyping = (text: string) => {
    setChatMessage(text);
    if (!socketProps?.socket || !currentRide) return;
    socketProps.emitTypingStatus({
      rideId: currentRide.id,
      senderRole: 'driver',
      isTyping: text.length > 0
    });
  };

  const sendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !socketProps?.socket || !currentRide) return;
    socketProps.emitChatMessage({
      rideId: currentRide.id,
      senderRole: 'driver',
      message: chatMessage.trim()
    });
    setChatMessage('');
    socketProps.emitTypingStatus({
      rideId: currentRide.id,
      senderRole: 'driver',
      isTyping: false
    });
  };
  
  // Driver Account Info
  const [driverName, setDriverName] = useState('Alex Pro Driver');
  const [carModel, setCarModel] = useState('Tesla Model Y');
  const [carPlate, setCarPlate] = useState('NYC-4821');
  const [driverEmail, setDriverEmail] = useState('alex.driver@rideconnect.com');
  const [driverPhone, setDriverPhone] = useState('+91 99999 88888');
  // Duplicate showProfile state removed (kept declaration at line 51)
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const getNavInstruction = () => {
    if (!currentRide) return '';
    if (!activeRoute || activeRoute.length === 0 || !driverCoords) {
      if (currentRide.status === 'accepted' || currentRide.status === 'arriving') {
        return `Navigate to pickup: ${currentRide.pickup.split(',')[0]}`;
      }
      if (currentRide.status === 'active') {
        return `Navigate to destination: ${currentRide.destination.split(',')[0]}`;
      }
      return '';
    }
    
    let minIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < activeRoute.length; i++) {
      const d = Math.hypot(activeRoute[i].lat - driverCoords.lat, activeRoute[i].lng - driverCoords.lng);
      if (d < minDistance) {
        minDistance = d;
        minIndex = i;
      }
    }
    
    const progressPercent = (minIndex / (activeRoute.length - 1)) * 100;
    const isHeadingToPickup = currentRide.status === 'accepted' || currentRide.status === 'arriving';
    const targetPlace = isHeadingToPickup ? currentRide.pickup.split(',')[0] : currentRide.destination.split(',')[0];
    
    if (progressPercent < 15) {
      return `Head north toward ${targetPlace}`;
    } else if (progressPercent < 45) {
      return `In 200m, turn right onto Main Avenue`;
    } else if (progressPercent < 75) {
      return `Merge left and continue straight for 800m`;
    } else if (progressPercent < 95) {
      return `Approaching your destination: ${targetPlace}`;
    } else {
      return `Arrived at ${targetPlace}`;
    }
  };

  const [offerTimer, setOfferTimer] = useState(15);

  useEffect(() => {
    if (currentRide && currentRide.status === 'requested') {
      setOfferTimer(15);
      const timerId = setInterval(() => {
        setOfferTimer(t => {
          if (t <= 1) {
            clearInterval(timerId);
            onRejectRide();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [currentRide?.status]);

  const performLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setTimeout(() => {
      setIsLoggingIn(false);
      setStep('app');
    }, 1200);
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-slate-50 text-slate-900 overflow-hidden" id="driver-mobile-app-root">

      {/* ═══════════ AUTH SCREEN ═══════════ */}
      {step === 'auth' && (
        <div className="flex-1 flex flex-col justify-between p-6 relative overflow-hidden">
          {/* Background image overlay */}
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-30"
            style={{ backgroundImage: 'url("/driver_auth_bg.png")' }}
          />
          {/* Backdrop blur & gradient overlay */}
          <div className="absolute inset-0 bg-slate-50/75 backdrop-blur-xs z-0" />

          <div className="pt-8 text-center space-y-4 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-3xl font-black text-slate-950">D</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">RideConnect Driver</h2>
              <p className="text-xs text-slate-500">Accept, navigate, and earn.</p>
            </div>
          </div>

          <form onSubmit={performLogin} className="space-y-3 relative z-10">
            <div className="space-y-1">
              <label className="text-[10px] font-mono tracking-wider uppercase text-slate-600">Driver License Registry Name</label>
              <input
                type="text"
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:border-amber-500"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono tracking-wider uppercase text-slate-600">Vehicle Model Class</label>
              <input
                type="text"
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:border-amber-500"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono tracking-wider uppercase text-slate-600">License Plate Number</label>
              <input
                type="text"
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl py-2.5 px-4 text-xs focus:outline-none"
                value={carPlate}
                onChange={(e) => setCarPlate(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 font-bold text-slate-900 py-3.5 rounded-xl hover:bg-amber-400 transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 uppercase tracking-wider text-xs mt-4"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader className="animate-spin" size={14} />
                  <span>Verifying Documents...</span>
                </>
              ) : (
                <span>Activate Driver Account</span>
              )}
            </button>
          </form>

          <button
            onClick={() => setStep('app')}
            className="w-full bg-white border border-slate-300 text-slate-500 py-2.5 rounded-xl hover:bg-slate-100 text-[10px] font-mono font-bold uppercase tracking-wider transition relative z-10"
          >
            ⏩ Skip Direct to App Mode
          </button>
        </div>
      )}

      {/* ═══════════ MAIN APP ═══════════ */}
      {step === 'app' && (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* ── FULL-SCREEN MAP BACKGROUND ── */}
          <div className="absolute inset-0 z-0">
             <CityMap 
               pickup={currentRide?.pickup || ''}
               destination={currentRide?.destination || ''}
               onSelectPickup={() => {}}
               onSelectDestination={() => {}}
               rideStatus={currentRide?.status}
               driverCoords={driverCoords || undefined}
               activeRoute={activeRoute}
               isDarkMode={false} // Drivers typically use dark mode for nav
               hideControls={true}
             />
          </div>

          {/* ── Toast Notifications ── */}
          <div className="absolute top-20 inset-x-3 z-50 space-y-2 pointer-events-none">
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

          {/* ── Top Floating Header (Offline/Online Toggle) ── */}
          <div className="absolute top-4 inset-x-4 z-20 flex justify-between items-center">
            {/* Menu Button */}
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm shadow-lg flex items-center justify-center border border-white/20 text-slate-800"
            >
              <Menu size={18} />
            </button>

            {/* Status Pill */}
            {!currentRide && (
              <div 
                onClick={onToggleOnline}
                className={`cursor-pointer px-5 py-2.5 rounded-full font-black text-xs tracking-wider shadow-lg backdrop-blur-md border transition-all ${
                  driverOnline 
                    ? 'bg-emerald-500/90 border-emerald-400 text-white' 
                    : 'bg-white/90 border-white/20 text-slate-800'
                }`}
              >
                {driverOnline ? 'YOU\'RE ONLINE' : 'OFFLINE'}
              </div>
            )}
            
            {/* Active Ride Pill */}
            {currentRide && (
              <div className="px-5 py-2.5 rounded-full bg-white/95 border border-slate-200 text-slate-800 font-black text-xs tracking-wider shadow-lg backdrop-blur-md flex items-center gap-2">
                <Navigation size={12} className="text-amber-500 animate-pulse" />
                <span>
                  {currentRide.status === 'requested' ? 'REQUEST' :
                   currentRide.status === 'accepted' || currentRide.status === 'arriving' ? 'EN ROUTE TO PICKUP' :
                   currentRide.status === 'arrived' ? 'WAITING FOR RIDER' :
                   currentRide.status === 'active' ? 'DROP OFF RIDER' : 'ONLINE'}
                </span>
              </div>
            )}

            {/* Today's Earnings Quick Look */}
            <div className="px-3 py-2 rounded-full bg-white/95 backdrop-blur-sm shadow-lg border border-white/20 text-slate-800 font-bold text-xs flex items-center gap-1">
               <span>₹{driverWalletBalance.toFixed(0)}</span>
            </div>
          </div>

          {/* ── Turn-by-Turn Navigation Bar ── */}
          {currentRide && ['accepted', 'arriving', 'active'].includes(currentRide.status) && (
            <div className="absolute top-16 inset-x-3 z-20 bg-emerald-600/95 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-lg border border-emerald-500/30 flex items-center gap-3 animate-in slide-in-from-top duration-300">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Navigation size={16} className="rotate-45 text-white fill-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[9px] font-black tracking-widest text-emerald-100 uppercase block">Navigation Guidance</span>
                <span className="text-xs font-bold truncate block mt-0.5">{getNavInstruction()}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-black block">{currentRide.eta || '3'} min</span>
                <span className="text-[8px] text-emerald-100 uppercase font-mono block">Remaining</span>
              </div>
            </div>
          )}

          {/* ── Center GO Button (When Offline) ── */}
          {!driverOnline && !currentRide && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/30 backdrop-blur-[2px]">
              <button 
                onClick={onToggleOnline}
                className="w-32 h-32 rounded-full bg-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.5)] border-4 border-white/20 flex flex-col items-center justify-center transition-transform active:scale-95 text-slate-900"
              >
                <span className="text-4xl font-black tracking-tighter">GO</span>
              </button>
              <div className="mt-6 bg-white/95 px-4 py-2 rounded-full shadow-lg text-slate-800 text-xs font-bold border border-white/20">
                You're offline. Tap GO to earn.
              </div>
            </div>
          )}

          {/* ── Radar / Searching Effect (When Online & No Ride) ── */}
          {driverOnline && !currentRide && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
              <div className="relative flex items-center justify-center">
                <div className="w-4 h-4 bg-emerald-500 rounded-full z-20 shadow-lg"></div>
                <div className="absolute w-32 h-32 bg-emerald-500/20 rounded-full animate-ping z-10"></div>
                <div className="absolute w-64 h-64 bg-emerald-500/10 rounded-full animate-pulse z-0 delay-150"></div>
              </div>
              <div className="absolute top-[60%] bg-white/80 backdrop-blur px-4 py-2 rounded-full text-emerald-400 text-xs font-mono font-bold tracking-widest border border-slate-700 shadow-xl">
                FINDING TRIPS...
              </div>
            </div>
          )}

          {/* ── Menu Overlay ── */}
          {menuOpen && (
            <div className="absolute inset-0 z-50 bg-slate-50/98 flex flex-col animate-in fade-in duration-200">
               <div className="p-6 flex-1 flex flex-col">
                 <div className="flex justify-between items-center mb-8">
                   <div className="flex items-center gap-3">
                     <img 
                       src="/driver_avatar.png" 
                       alt="Driver Profile" 
                       className="w-12 h-12 rounded-full object-cover shadow-lg border border-amber-500/20" 
                     />
                     <div>
                       <h3 className="font-bold text-slate-900 text-lg">{driverName}</h3>
                       <p className="text-amber-500 text-xs font-mono">★ 4.92 Rating</p>
                     </div>
                   </div>
                   <button onClick={() => setMenuOpen(false)} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white">
                     <X size={20} />
                   </button>
                 </div>

                 <div className="space-y-2">
                   {[
                     { icon: <Award size={20} />, label: 'Earnings', val: `₹${driverWalletBalance.toFixed(0)}`, action: undefined },
                     { icon: <User size={20} />, label: 'Profile Settings', val: carPlate, action: () => { setShowProfile(true); setMenuOpen(false); } },
                     { icon: <Sliders size={20} />, label: 'Preferences', val: 'All trips', action: undefined }
                   ].map((item, i) => (
                     <div 
                       key={i} 
                       onClick={item.action}
                       className={`flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-300 ${item.action ? 'cursor-pointer hover:bg-slate-100 transition' : ''}`}
                     >
                       <div className="flex items-center gap-3 text-slate-700">
                         {item.icon}
                         <span className="font-semibold text-sm">{item.label}</span>
                       </div>
                       <span className="text-xs text-slate-500 font-mono">{item.val}</span>
                     </div>
                   ))}
                 </div>

                 <div className="mt-auto">
                   <button
                     onClick={() => {
                        setDriverName('Alex Pro Driver');
                        setStep('auth');
                        setMenuOpen(false);
                     }}
                     className="w-full p-4 text-red-400 font-bold text-sm bg-red-950/30 rounded-2xl border border-red-900/50"
                   >
                     Sign Out
                   </button>
                 </div>
               </div>
            </div>
          )}
{showProfile && (
  <div className="absolute inset-0 z-30 bg-white overflow-y-auto pb-20" style={{animation:'fadeIn 0.2s ease-out'}}>
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => setShowProfile(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
          <ArrowRight size={14} className="text-slate-600 rotate-180" />
        </button>
        <h2 className="text-base font-black text-slate-900">Driver Profile</h2>
      </div>
      <div className="text-center py-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 relative overflow-hidden flex flex-col items-center">
        <div className="relative">
          <img src="/driver_avatar.png" alt="Driver Profile" className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-emerald-500/30" />
          <span className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-1 border border-white text-[8px] font-black uppercase tracking-wider px-1.5 shadow-sm">Active</span>
        </div>
        <h4 className="text-base font-black mt-3 text-slate-900">{driverName}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{driverEmail}</p>
        <div className="mt-2.5 flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold py-1 px-3 rounded-full border border-emerald-100 uppercase tracking-wider">
          <span>🚗 Driver</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
          <span className="text-[9px] font-mono text-slate-500 uppercase block">Earnings</span>
          <span className="text-xs font-black text-slate-800 block mt-0.5">₹{driverWalletBalance.toFixed(0)}</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
          <span className="text-[9px] font-mono text-slate-500 uppercase block">Car</span>
          <span className="text-xs font-black text-slate-800 block mt-0.5">{carModel}</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
          <span className="text-[9px] font-mono text-slate-500 uppercase block">Plate</span>
          <span className="text-xs font-black text-slate-800 block mt-0.5">{carPlate}</span>
        </div>
      </div>
      <button onClick={() => setShowProfile(false)} className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5">
        <LogOut size={12} />
        <span>Close Profile</span>
      </button>
    </div>
  </div>
)}

          {/* ── Bottom Sheet (Incoming Request & Active Trip) ── */}
          {currentRide && (
            <div 
              className={`absolute bottom-0 inset-x-0 z-30 transition-all duration-300 ease-out bg-white text-slate-900 shadow-[0_-8px_40px_rgba(0,0,0,0.2)] rounded-t-3xl`}
              style={{
                transform: `translateY(${sheetState === 'collapsed' ? 'calc(100% - 100px)' : '0'})`
              }}
            >
              {/* Drag Handle Area */}
              <div 
                className="w-full flex flex-col items-center pt-3 pb-2 cursor-grab bg-slate-50 rounded-t-3xl border-b border-slate-100"
                onClick={() => setSheetState(sheetState === 'collapsed' ? 'expanded' : 'collapsed')}
              >
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mb-2" />
                
                {/* Collapsed Header Info */}
                {sheetState === 'collapsed' && (
                   <div className="w-full px-4 flex justify-between items-center">
                     <span className="font-black text-slate-900 tracking-tight text-sm">
                       {currentRide.status === 'requested' ? 'New Request!' : 'Active Trip'}
                     </span>
                     <span className="font-black text-amber-600 text-sm">₹{((currentRide.fare || 0) * 0.9).toFixed(0)}</span>
                   </div>
                )}
              </div>

              {/* Expanded Content */}
              <div className="p-5 pb-8 space-y-4 max-h-[400px] overflow-y-auto">
                
                {/* ── 1. INCOMING REQUEST ── */}
                {currentRide.status === 'requested' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter">₹{((currentRide.fare || 0) * 0.9).toFixed(0)}</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estimated Earnings</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-amber-600">{currentRide.eta} min</div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Away</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center gap-3">
                         <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                         <span className="text-xs font-bold text-slate-700 truncate">{currentRide.pickup}</span>
                      </div>
                      <div className="w-0.5 h-4 bg-slate-300 ml-1" />
                      <div className="flex items-center gap-3">
                         <div className="w-2.5 h-2.5 rounded-sm bg-red-500 shrink-0" />
                         <span className="text-xs font-medium text-slate-500 truncate">{currentRide.destination}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => onRejectRide()}
                        className="w-14 h-14 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold border border-slate-200 hover:bg-slate-200 transition"
                      >
                        <X size={20} />
                      </button>
                      <button 
                        onClick={() => {
                          onAcceptRide(driverName, driverName);
                          setSheetState('collapsed'); // Auto-collapse to show map after accepting
                        }}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-full font-black text-lg tracking-wider flex items-center justify-between px-6 transition shadow-lg relative overflow-hidden"
                      >
                        <span>ACCEPT</span>
                        <div className="flex items-center gap-1">
                           <span className="text-xs font-mono opacity-80">{offerTimer}s</span>
                           <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                              <Navigation size={12} className="rotate-45" />
                           </div>
                        </div>
                        {/* Progress bar background */}
                        <div 
                          className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-1000 ease-linear"
                          style={{ width: `${(offerTimer / 15) * 100}%` }}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── 2. ACTIVE TRIP CONTROLS ── */}
                {['accepted', 'arriving', 'arrived', 'active'].includes(currentRide.status) && (
                  <div className="space-y-4">
                    
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-black text-lg">
                           <User size={20} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">Passenger</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                             <Star size={10} className="text-amber-500 fill-amber-500" /> 4.90
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                           <Phone size={16} />
                        </button>
                        <button 
                          onClick={() => { setShowChat(true); setUnreadCount(0); }} 
                          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 relative"
                        >
                           <MessageCircle size={16} />
                           {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold border-2 border-white">{unreadCount}</span>}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                         {currentRide.status === 'active' ? 'Dropoff' : 'Pickup'}
                      </span>
                      <p className="text-sm font-bold text-slate-800">
                         {currentRide.status === 'active' ? currentRide.destination : currentRide.pickup}
                      </p>
                    </div>

                    {/* Action Buttons based on status */}
                    <div className="pt-2">
                      {currentRide.status === 'accepted' && (
                        <button 
                          className="w-full py-4 rounded-full bg-slate-900 text-white font-black text-sm tracking-widest flex items-center justify-center transition hover:bg-slate-800 shadow-md"
                          onClick={() => {}} 
                        >
                          NAVIGATE
                        </button>
                      )}
                      
                      {currentRide.status === 'arriving' && (
                        <button 
                          className="w-full py-4 rounded-full bg-slate-900 text-white font-black text-sm tracking-widest flex items-center justify-center transition hover:bg-slate-800 shadow-md"
                        >
                          ARRIVING NOW
                        </button>
                      )}

                      {currentRide.status === 'arrived' && (
                        <button 
                          onClick={onStartRide}
                          className="w-full py-4 rounded-full bg-emerald-500 text-white font-black text-sm tracking-widest flex items-center justify-center transition hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
                        >
                          START TRIP
                        </button>
                      )}

                      {currentRide.status === 'active' && (
                        <button 
                          onClick={onCompleteRide}
                          className="w-full py-4 rounded-full bg-amber-500 text-slate-900 font-black text-sm tracking-widest flex items-center justify-center transition hover:bg-amber-600 shadow-md shadow-amber-500/20"
                        >
                          COMPLETE DROP-OFF
                        </button>
                      )}
                    </div>
                    
                    {currentRide.status !== 'requested' && (
                      <button 
                        onClick={() => {
                          onRejectRide(); // Using reject to cancel as well
                          setSheetState('collapsed');
                        }}
                        className="w-full py-2 text-xs font-bold text-red-500 uppercase tracking-widest text-center opacity-70 hover:opacity-100"
                      >
                        Cancel Issue
                      </button>
                    )}

                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Chat Drawer Overlay ── */}
          {showChat && currentRide && (
            <div className="absolute inset-0 bg-black/60 z-[60] flex flex-col justify-end transition-all duration-300">
              <div className="bg-white rounded-t-[28px] h-[500px] flex flex-col overflow-hidden shadow-2xl text-slate-900">

                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs">
                      P
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-xs text-slate-800 block">Passenger Chat</span>
                      <span className="text-[9px] text-slate-400">
                        {passengerTyping ? (
                          <span className="text-amber-500 font-bold animate-pulse">Typing...</span>
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
                          senderRole: 'driver',
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
                        Ask the passenger for specific pickup details here.
                      </div>
                    ) : (
                      (currentRide.chatHistory || []).map((msg: any, idx: number) => {
                        const isSelf = msg.senderRole === 'driver';
                        return (
                          <div
                            key={idx}
                            className={`flex flex-col max-w-[75%] ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}
                          >
                            <div
                              className={`rounded-2xl px-3 py-2 text-xs leading-snug font-medium break-words ${
                                isSelf ? 'bg-amber-500 text-slate-900 rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
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
                    placeholder="Message passenger..."
                    value={chatMessage}
                    onChange={(e) => handleTyping(e.target.value)}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 p-2.5 rounded-full text-slate-900 transition duration-150 cursor-pointer shadow-sm flex items-center justify-center"
                  >
                    <Send size={12} className="rotate-45" />
                  </button>
                </form>

              </div>
            </div>
          )}

          {/* ── DRIVER PROFILE SETTINGS SCREEN ── */}
          {showProfile && (
            <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-250 text-slate-900 overflow-y-auto pb-8">
              <div className="p-5 space-y-4">
                
                {/* Header */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowProfile(false)} 
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"
                  >
                    <X size={16} className="text-slate-600" />
                  </button>
                  <h2 className="text-base font-black text-slate-900">Driver Profile</h2>
                </div>

                {/* Profile Avatar Card */}
                <div className="text-center py-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 flex flex-col items-center">
                  <div className="relative">
                    <img 
                      src="/driver_avatar.png" 
                      alt="Driver Profile" 
                      className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-amber-500/30" 
                    />
                    <span className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-1 border border-white text-[8px] font-black uppercase tracking-wider px-1.5 shadow-sm">
                      Online
                    </span>
                  </div>
                  <h4 className="text-base font-black mt-3 text-slate-900">{driverName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{driverEmail}</p>
                  <div className="mt-2.5 flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold py-1 px-3 rounded-full border border-amber-100 uppercase tracking-wider">
                    <span>⭐ 4.92 Rating</span>
                  </div>
                </div>

                {/* Driver Stats Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Wallet</span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">₹{driverWalletBalance.toFixed(0)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Trips</span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">1,280</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Acceptance</span>
                    <span className="text-xs font-black text-slate-800 block mt-0.5">96%</span>
                  </div>
                </div>

                {/* Form */}
                <div className="rounded-2xl p-4 border border-slate-200 bg-slate-50 space-y-4">
                  <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider border-b border-slate-200 pb-1.5">Driver Account Details</span>
                  
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">Driver Name</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 w-full focus:outline-none focus:border-amber-500 bg-white text-slate-800 text-xs font-medium shadow-sm"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">Email Address</span>
                      <input
                        type="email"
                        className="border border-slate-200 rounded-xl p-2.5 w-full focus:outline-none focus:border-amber-500 bg-white text-slate-800 text-xs font-medium shadow-sm"
                        value={driverEmail}
                        onChange={(e) => setDriverEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">Mobile Number</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 w-full focus:outline-none focus:border-amber-500 bg-white text-slate-800 text-xs font-medium shadow-sm"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider border-b border-slate-200 pb-1.5 pt-2">Vehicle Details</span>
                  
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">Vehicle Model Class</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 w-full focus:outline-none focus:border-amber-500 bg-white text-slate-800 text-xs font-medium shadow-sm"
                        value={carModel}
                        onChange={(e) => setCarModel(e.target.value)}
                      />
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">License Plate Number</span>
                      <input
                        type="text"
                        className="border border-slate-200 rounded-xl p-2.5 w-full focus:outline-none focus:border-amber-500 bg-white text-slate-800 text-xs font-medium shadow-sm"
                        value={carPlate}
                        onChange={(e) => setCarPlate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowProfile(false)}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center shadow-md shadow-amber-500/10 uppercase tracking-wider"
                >
                  Save Profile Details
                </button>

              </div>
            </div>
          )}

        </div>
      )}

      {/* Inline styles for animations */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
