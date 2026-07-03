import React, { useState, useEffect, useRef } from 'react';
import {
  Users, ShieldAlert, Award, TrendingUp, IndianRupee, Map as MapIcon,
  Check, X, Sliders, Play, Plus, Trash2, Edit, RefreshCw, Activity, Car, Shield, 
  MapPin, Bell, Search, Menu, Filter, ArrowUpRight, Zap
} from 'lucide-react';
import { Ride, SystemConfig, Complaint, PromoCode } from '../types';
import CityMap from './CityMap';

interface AdminPanelProps {
  ridesList: Ride[];
  systemConfig: SystemConfig;
  onUpdateConfig: (config: SystemConfig) => void;
  complaints: Complaint[];
  onResolveComplaint: (id: string) => void;
  promoCodes: PromoCode[];
  onAddPromo: (promo: PromoCode) => void;
  onDeletePromo: (code: string) => void;
  driverOnline: boolean;
  passengerWallet: number;
  isDarkMode?: boolean;
  currentRide?: Ride | null;
  activeRoute?: { lat: number; lng: number }[];
}

export default function AdminPanel({
  ridesList,
  systemConfig,
  onUpdateConfig,
  complaints,
  onResolveComplaint,
  promoCodes,
  onAddPromo,
  onDeletePromo,
  driverOnline,
  passengerWallet,
  isDarkMode = false,
  currentRide,
  activeRoute
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'live_map' | 'kpis' | 'rides' | 'pricing' | 'promos' | 'complaints'>('live_map');
  
  // Custom states for new promo code
  const [newPromo, setNewPromo] = useState('');
  const [newDisc, setNewDisc] = useState('15');
  const [newDesc, setNewDesc] = useState('New ride discount promo');

  // Multiplier controls
  const [demandVal, setDemandVal] = useState(systemConfig.demandMultiplier);
  const [trafficVal, setTrafficVal] = useState(systemConfig.trafficFactor);

  // Stats calculation
  const totalRides = ridesList.length;
  const completedRides = ridesList.filter(r => r.status === 'completed');
  const totalRevenue = completedRides.reduce((sum, r) => sum + r.fare, 0);
  const appEarnings = totalRevenue * 0.10; // 10% commission

  const applySurgeChanges = () => {
    onUpdateConfig({
      baseFares: systemConfig.baseFares,
      demandMultiplier: parseFloat(demandVal.toFixed(2)),
      trafficFactor: trafficVal
    });
    alert('Dynamic Pricing & Surge multipliers adjusted successfully across the network!');
  };

  const createPromoCode = () => {
    if (!newPromo) return;
    onAddPromo({
      code: newPromo.toUpperCase().trim(),
      discountPercent: parseInt(newDisc) || 15,
      description: newDesc,
      isActive: true,
      expiryDate: '2026-12-31'
    });
    setNewPromo('');
  };

  // Live activity feed
  interface FeedEvent { id: string; icon: string; label: string; meta: string; time: string; type: 'ride' | 'payment' | 'alert' | 'system'; }
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([
    { id: '1', icon: '🚗', label: 'New ride requested', meta: 'Connaught Place → Bandra West', time: 'Just now', type: 'ride' },
    { id: '2', icon: '💳', label: 'Payment processed', meta: '₹1,240 via Stripe', time: '1m ago', type: 'payment' },
    { id: '3', icon: '⭐', label: 'Driver rated 5 stars', meta: 'Passenger: Alex Carter', time: '3m ago', type: 'system' },
    { id: '4', icon: '🚀', label: 'Surge multiplier active', meta: '1.25x demand factor applied', time: '5m ago', type: 'alert' },
  ]);

  // Auto-generate feed events to make dashboard look alive
  useEffect(() => {
    const events = [
      { icon: '🚗', label: 'New ride request', meta: 'Nearby passenger booking', type: 'ride' as const },
      { icon: '💳', label: 'Wallet recharge', meta: 'Passenger topped up ₹500', type: 'payment' as const },
      { icon: '📍', label: 'Driver location synced', meta: 'GPS broadcast 28.6°N 77.2°E', type: 'system' as const },
      { icon: '🏁', label: 'Trip completed', meta: `Fare ₹${(Math.random() * 1000 + 500).toFixed(0)} settled`, type: 'payment' as const },
    ];
    const interval = setInterval(() => {
      const ev = events[Math.floor(Math.random() * events.length)];
      const newEvent: FeedEvent = { ...ev, id: Math.random().toString(36).substr(2,9), time: 'Just now' };
      setFeedEvents(prev => [newEvent, ...prev.slice(0, 19)]);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const tabList = [
    { id: 'live_map', label: 'Live God Map', icon: <MapIcon size={16} /> },
    { id: 'kpis', label: 'Business KPIs', icon: <TrendingUp size={16} /> },
    { id: 'rides', label: 'Fleet & Rides', icon: <Car size={16} /> },
    { id: 'pricing', label: 'Surge & Pricing', icon: <Activity size={16} /> },
    { id: 'promos', label: 'Marketing Promos', icon: <Award size={16} /> },
    { id: 'complaints', label: 'Support Queue', icon: <ShieldAlert size={16} /> },
  ];

  return (
    <div className={`w-full min-h-[85vh] rounded-[32px] border overflow-hidden shadow-2xl flex font-sans transition-colors duration-500 ${
      isDarkMode ? 'bg-slate-50 border-slate-300 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
    }`}>
      
      {/* ── Sidebar Navigation ── */}
      <div className={`w-64 border-r flex flex-col ${isDarkMode ? 'bg-white/50 border-slate-300' : 'bg-white border-slate-200'}`}>
        <div className="p-6 border-b border-inherit">
           <div className="flex items-center gap-3 text-emerald-500">
             <Shield size={28} className="fill-emerald-500/20" />
             <h2 className="text-xl font-black tracking-tight text-white">RideConnect<span className="text-emerald-500 text-xs font-bold block leading-none">Admin Console</span></h2>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
           {tabList.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                 activeTab === tab.id 
                   ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                   : (isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
               }`}
             >
               {tab.icon}
               <span>{tab.label}</span>
               {tab.id === 'complaints' && complaints.filter(c => c.status === 'pending').length > 0 && (
                 <span className="ml-auto bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                   {complaints.filter(c => c.status === 'pending').length}
                 </span>
               )}
             </button>
           ))}
        </div>

        {/* Global Live Stat Mini */}
        <div className="p-4 border-t border-inherit">
           <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
             <div className="flex items-center gap-2 mb-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-xs font-bold uppercase tracking-wider text-slate-500">System Status</span>
             </div>
             <p className="text-[10px] font-mono opacity-70">Drivers Online: {driverOnline ? '1' : '0'}</p>
             <p className="text-[10px] font-mono opacity-70">Surge Level: {systemConfig.demandMultiplier}x</p>
           </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Top Header */}
        <div className={`h-16 border-b flex items-center justify-between px-8 z-20 ${isDarkMode ? 'bg-white/50 border-slate-300' : 'bg-white border-slate-200'} backdrop-blur-md`}>
           <h3 className="text-lg font-black">{tabList.find(t => t.id === activeTab)?.label}</h3>
           
           <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
               isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700'
             }`}>
               <Search size={14} />
               <input type="text" placeholder="Search ID, Driver, User..." className="bg-transparent border-none outline-none w-48 font-mono text-[10px]" />
             </div>
             <button className="relative w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition">
                <Bell size={16} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-900" />
             </button>
           </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto relative bg-slate-50/20">
          
          {/* ═════════ LIVE GOD MAP ═════════ */}
          {activeTab === 'live_map' && (
             <div className="absolute inset-0 z-0 bg-black">
                {/* Embedded CityMap acting as the God Map */}
                <CityMap 
                   pickup={currentRide?.pickup || ''}
                   destination={currentRide?.destination || ''}
                   rideStatus={currentRide?.status}
                   activeRoute={activeRoute}
                   onSelectPickup={() => {}}
                   onSelectDestination={() => {}}
                   isDarkMode={false}
                   hideControls={true}
                />
                
                {/* Floating Map Overlays */}
                <div className="absolute top-6 left-6 w-80 space-y-4">
                  {/* Global Stats Widget */}
                  <div className="bg-white/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-5 shadow-2xl text-white">
                     <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                       <Activity size={14} className="text-emerald-400" /> Live Metrics
                     </h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-2xl font-black">{totalRides + 142}</div>
                          <div className="text-[10px] text-slate-500 uppercase">Active Rides</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black">{driverOnline ? '34' : '33'}</div>
                          <div className="text-[10px] text-slate-500 uppercase">Available Drivers</div>
                        </div>
                        <div>
                          <div className="text-xl font-black text-amber-400">{systemConfig.demandMultiplier}x</div>
                          <div className="text-[10px] text-slate-500 uppercase">Current Surge</div>
                        </div>
                        <div>
                          <div className="text-xl font-black text-emerald-400">₹{totalRevenue.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-500 uppercase">Daily Volume</div>
                        </div>
                     </div>
                  </div>

                  {/* Live Feed Widget */}
                  <div className="bg-white/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl h-[320px] flex flex-col">
                     <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                       <Zap size={14} className="text-amber-400" /> Activity Feed
                     </h4>
                     <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {feedEvents.map(ev => (
                           <div key={ev.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition animate-in slide-in-from-left-2 fade-in duration-300">
                             <span className="text-lg mt-0.5">{ev.icon}</span>
                             <div>
                               <div className="text-xs font-bold text-slate-200">{ev.label}</div>
                               <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{ev.meta}</div>
                             </div>
                             <div className="ml-auto text-[9px] text-slate-500 font-mono pt-1">{ev.time}</div>
                           </div>
                        ))}
                     </div>
                  </div>
                </div>

                {/* Simulated active nodes on map (visual flair) */}
                <div className="absolute top-20 right-6 bg-white/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl">
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-2">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Central Zone Active
                   </div>
                   <div className="text-[10px] text-slate-400 max-w-[200px]">
                     High demand detected in South Mumbai and Connaught Place. Algorithm routing idle drivers.
                   </div>
                </div>
             </div>
          )}

          {/* ═════════ BUSINESS KPIS ═════════ */}
          {activeTab === 'kpis' && (
            <div className="p-8 space-y-6 animate-in fade-in duration-300">
               {/* 4-Grid Cards */}
               <div className="grid grid-cols-4 gap-6">
                  {[
                    { label: 'Platform Revenue (10%)', val: `₹${appEarnings.toFixed(2)}`, icon: <IndianRupee size={20} className="text-emerald-500" />, trend: '+14.2%', color: 'emerald' },
                    { label: 'Total Rides', val: totalRides.toString(), icon: <Car size={20} className="text-blue-500" />, trend: '+5.4%', color: 'blue' },
                    { label: 'Avg Passenger Wallet', val: `₹${passengerWallet.toFixed(0)}`, icon: <TrendingUp size={20} className="text-amber-500" />, trend: '+2.1%', color: 'amber' },
                    { label: 'Active Promos', val: promoCodes.length.toString(), icon: <Award size={20} className="text-purple-500" />, trend: 'Stable', color: 'purple' },
                  ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-2xl border bg-white/50 backdrop-blur-md shadow-lg border-slate-300 relative overflow-hidden group`}>
                      <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${stat.color}-500/10 rounded-full blur-2xl group-hover:bg-${stat.color}-500/20 transition duration-500`} />
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl bg-slate-800`}>{stat.icon}</div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          {stat.trend}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">{stat.label}</div>
                      <div className="text-3xl font-black text-white">{stat.val}</div>
                    </div>
                  ))}
               </div>

               {/* Chart Area */}
               <div className="bg-white/50 backdrop-blur-md border border-slate-300 rounded-2xl p-6 shadow-lg">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-slate-900 text-sm uppercase tracking-widest">7-Day Revenue Trend (Platform 10% Cut)</h4>
                    <select className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 outline-none">
                      <option>Last 7 Days</option>
                      <option>This Month</option>
                    </select>
                  </div>
                  <div className="h-64 flex items-end justify-between px-2 pb-2 relative border-b border-slate-700 border-l">
                    {/* SVG Chart Background */}
                    <div className="absolute inset-0">
                      <svg viewBox="0 0 1000 250" preserveAspectRatio="none" className="w-full h-full opacity-50">
                        <path d="M0,200 L150,180 L300,120 L450,150 L600,80 L750,110 L900,40 L1000,20 L1000,250 L0,250 Z" fill="url(#gradient)" className="transition-all duration-1000" />
                        <path d="M0,200 L150,180 L300,120 L450,150 L600,80 L750,110 L900,40 L1000,20" fill="none" stroke="#10b981" strokeWidth="4" />
                        <defs>
                          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    {/* Fake labels */}
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                      <div key={day} className="text-[10px] font-mono text-slate-500 absolute" style={{ bottom: '-20px', left: `${(i / 6) * 95 + 2}%` }}>
                        {day}
                      </div>
                    ))}
                    {[0, 50, 100, 150, 200].map((val, i) => (
                      <div key={val} className="text-[10px] font-mono text-slate-600 absolute" style={{ left: '-35px', bottom: `${(i / 4) * 95}%` }}>
                        ₹{val}k
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {/* ═════════ RIDES & FLEET ═════════ */}
          {activeTab === 'rides' && (
            <div className="p-8 animate-in fade-in duration-300">
               <div className="bg-white/50 backdrop-blur-md border border-slate-300 rounded-2xl shadow-lg overflow-hidden">
                 <div className="p-5 border-b border-slate-300 flex justify-between items-center bg-white/80">
                   <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest">Network Ride History</h3>
                   <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">
                     <Filter size={14} /> Filter
                   </button>
                 </div>
                 <table className="w-full text-left text-sm">
                   <thead className="bg-white/90 text-slate-400 text-xs font-mono uppercase tracking-wider">
                     <tr>
                       <th className="px-6 py-4 font-semibold">Ride ID</th>
                       <th className="px-6 py-4 font-semibold">Pickup → Drop</th>
                       <th className="px-6 py-4 font-semibold">Fare</th>
                       <th className="px-6 py-4 font-semibold">Status</th>
                       <th className="px-6 py-4 font-semibold">Class</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/50">
                     {ridesList.length === 0 ? (
                       <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-xs">No rides processed yet.</td></tr>
                     ) : ridesList.map(ride => (
                       <tr key={ride.id} className="hover:bg-slate-800/30 transition">
                         <td className="px-6 py-4 font-mono text-xs text-slate-700">{ride.id.substring(0, 12)}...</td>
                         <td className="px-6 py-4">
                           <div className="text-xs font-bold text-slate-200 truncate max-w-[200px]">{ride.pickup}</div>
                           <div className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">{ride.destination}</div>
                         </td>
                         <td className="px-6 py-4 text-xs font-mono font-bold text-emerald-400">₹{ride.fare.toFixed(2)}</td>
                         <td className="px-6 py-4">
                           <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                             ride.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                             ride.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                             'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                           }`}>{ride.status}</span>
                         </td>
                         <td className="px-6 py-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">{ride.vehicleType}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {/* ═════════ PRICING & SURGE ═════════ */}
          {activeTab === 'pricing' && (
            <div className="p-8 max-w-4xl space-y-6 animate-in fade-in duration-300">
              <div className="bg-white/50 backdrop-blur-md border border-slate-300 rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity size={16} className="text-amber-500" /> Dynamic Pricing Controls
                </h3>
                
                <div className="grid grid-cols-2 gap-8">
                  {/* Demand Multiplier */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Network Surge Multiplier</label>
                      <p className="text-[10px] text-slate-500">Increases base fares across the entire city layout.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" min="1.0" max="3.5" step="0.05" 
                        value={demandVal} onChange={e => setDemandVal(parseFloat(e.target.value))}
                        className="flex-1 accent-amber-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" 
                      />
                      <span className="text-xl font-black text-amber-500 w-16 text-right">{demandVal.toFixed(2)}x</span>
                    </div>
                  </div>

                  {/* Traffic Factor */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Simulated Traffic Delay</label>
                      <p className="text-[10px] text-slate-500">Affects ETA predictions for drivers and riders.</p>
                    </div>
                    <select 
                      value={trafficVal} onChange={e => setTrafficVal(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-amber-500 transition"
                    >
                      <option value="light">Light (Fast routes)</option>
                      <option value="moderate">Moderate (Standard routes)</option>
                      <option value="heavy">Heavy (Slow, adds 5-10m)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-300 flex justify-end">
                  <button 
                    onClick={applySurgeChanges}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-2.5 rounded-xl text-sm transition shadow-lg flex items-center gap-2"
                  >
                    <Check size={16} /> Deploy Pricing Algorithm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ PROMOS ═════════ */}
          {activeTab === 'promos' && (
            <div className="p-8 space-y-6 animate-in fade-in duration-300">
              
              <div className="grid grid-cols-3 gap-6">
                {/* Create Promo Card */}
                <div className="col-span-1 bg-white/50 backdrop-blur-md border border-slate-300 rounded-2xl shadow-lg p-6">
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest mb-6">Mint New Promo</h3>
                  <div className="space-y-4 text-xs font-bold text-slate-400">
                    <div className="space-y-1.5">
                      <label className="uppercase tracking-wider">Promo Code String</label>
                      <input type="text" value={newPromo} onChange={e => setNewPromo(e.target.value)} placeholder="e.g. MEGA50" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 uppercase font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="uppercase tracking-wider">Discount Percentage</label>
                      <div className="relative">
                        <input type="number" value={newDisc} onChange={e => setNewDisc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-4 pr-10 py-3 outline-none focus:border-emerald-500 font-mono" />
                        <span className="absolute right-4 top-3 text-slate-500">%</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="uppercase tracking-wider">Description</label>
                      <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                    </div>
                    <button onClick={createPromoCode} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black tracking-widest py-3 rounded-xl mt-2 transition flex items-center justify-center gap-2">
                      <Plus size={16} /> MINT PROMO
                    </button>
                  </div>
                </div>

                {/* Active Promos List */}
                <div className="col-span-2 bg-white/50 backdrop-blur-md border border-slate-300 rounded-2xl shadow-lg p-6">
                   <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest mb-6">Active Marketing Campaigns</h3>
                   <div className="grid grid-cols-2 gap-4">
                     {promoCodes.map(p => (
                       <div key={p.code} className="bg-slate-800 border border-slate-700 rounded-xl p-4 relative group">
                         <button onClick={() => onDeletePromo(p.code)} className="absolute top-3 right-3 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
                         <div className="text-xl font-black text-emerald-400 font-mono tracking-wider">{p.code}</div>
                         <div className="text-sm font-bold text-slate-900 mt-1">{p.discountPercent}% OFF</div>
                         <div className="text-[10px] text-slate-400 mt-2">{p.description}</div>
                         <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Active
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ COMPLAINTS ═════════ */}
          {activeTab === 'complaints' && (
            <div className="p-8 max-w-4xl animate-in fade-in duration-300">
              <div className="bg-white/50 backdrop-blur-md border border-slate-300 rounded-2xl shadow-lg overflow-hidden">
                 <div className="p-5 border-b border-slate-300 bg-white/80">
                   <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest flex items-center gap-2">
                     <ShieldAlert size={16} className="text-rose-500" /> Support Queue
                   </h3>
                 </div>
                 
                 <div className="divide-y divide-slate-800/50">
                   {complaints.length === 0 ? (
                     <div className="p-8 text-center text-slate-500 text-sm">No complaints logged in system.</div>
                   ) : complaints.map(c => (
                     <div key={c.id} className="p-6 hover:bg-slate-800/30 transition flex gap-4">
                       <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                         {c.reporterRole === 'driver' ? '🚕' : '👤'}
                       </div>
                       <div className="flex-1">
                         <div className="flex justify-between items-start">
                           <div>
                             <h4 className="font-bold text-slate-900">{c.subject}</h4>
                             <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                               <span className="font-bold">{c.reporterName}</span>
                               <span className="bg-slate-800 px-1.5 py-0.5 rounded uppercase text-[9px] font-mono">{c.reporterRole}</span>
                               <span className="text-[10px] font-mono">{c.rideId}</span>
                             </div>
                           </div>
                           <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                             c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                           }`}>{c.status}</span>
                         </div>
                         <p className="text-sm text-slate-700 mt-3 bg-slate-50/50 p-3 rounded-lg border border-slate-300/50">{c.description}</p>
                         
                         {c.status === 'pending' && (
                           <button onClick={() => onResolveComplaint(c.id)} className="mt-4 bg-slate-800 hover:bg-emerald-900 hover:text-emerald-400 hover:border-emerald-800 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg border border-slate-700 transition flex items-center gap-2">
                             <Check size={14} /> Resolve Ticket
                           </button>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
