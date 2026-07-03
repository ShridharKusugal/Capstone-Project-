import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Shield, Star, ArrowRight, Users, Car, TrendingUp, Clock,
  MapPin, Cpu, Code2, Sun, Moon, IndianRupee, Activity, ChevronRight
} from 'lucide-react';

interface LiveStats {
  totalRides: number;
  totalRevenue: number;
  commission: number;
}

interface LandingPageProps {
}

export default function LandingPage({}: LandingPageProps = {}) {
  const [stats, setStats] = useState<LiveStats>({ totalRides: 0, totalRevenue: 0, commission: 0 });
  const [tick, setTick] = useState(0);

  // Fetch live stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const resp = await fetch('/api/rides');
        const data = await resp.json();
        if (data.status === 'success') {
          const rides = data.rides || [];
          const completed = rides.filter((r: any) => r.status === 'completed');
          const revenue = completed.reduce((s: number, r: any) => s + (r.fare || 0), 0);
          setStats({
            totalRides: rides.length,
            totalRevenue: revenue,
            commission: revenue * 0.1,
          });
        }
      } catch {}
    };
    fetchStats();
    const t = setInterval(fetchStats, 5000);
    return () => clearInterval(t);
  }, []);

  // Animated counter
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 80);
    return () => clearInterval(t);
  }, []);

  const isDarkMode = false;

  const bg = isDarkMode
    ? 'bg-zinc-950 text-white'
    : 'bg-slate-50 text-slate-900';

  const cardBg = isDarkMode
    ? 'bg-zinc-900 border-zinc-800'
    : 'bg-white border-slate-200';

  const mutedText = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${bg} font-display transition-colors duration-300 relative overflow-x-hidden`}>

      {/* Animated Gradient Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
            animation: 'pulse 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)',
            animation: 'pulse 8s ease-in-out infinite 2s',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-5"
          style={{
            background: 'radial-gradient(ellipse, #6366f1 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Navbar */}
      <nav className={`relative z-20 flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm ${isDarkMode ? 'border-zinc-800/60 bg-zinc-950/80' : 'border-slate-200 bg-white/80'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-emerald-400 to-yellow-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-lg font-black text-slate-950">R</span>
          </div>
          <div>
            <span className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>RideX</span>
            <span className={`ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-widest ${isDarkMode ? 'text-slate-500 border-zinc-800' : 'text-slate-400 border-slate-200'}`}>v2.0</span>
          </div>
        </div>

        <div className="flex items-center gap-3">

          <Link
            to="/admin"
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition ${isDarkMode ? 'border-zinc-800 text-slate-400 hover:text-white hover:border-zinc-700' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}
          >
            Admin Console
          </Link>

          <Link
            to="/simulator"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            <Zap size={12} />
            Try Demo
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-widest mb-8 ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-emerald-300 bg-emerald-50 text-emerald-600'}`}>
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span>Production-grade · Live Sandbox · Gemini AI</span>
        </div>

        <h1 className={`text-6xl sm:text-8xl font-black tracking-tighter leading-none mb-6 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
          The Future of
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-yellow-400 to-amber-400 bg-clip-text text-transparent">
            Urban Mobility
          </span>
        </h1>

        <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${mutedText}`}>
          A production-ready, full-stack ride-hailing platform featuring real-time Socket.io tracking,
          Gemini AI fare intelligence, MongoDB persistence, and live simulated city routing.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/simulator"
            className="flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/25 text-sm"
          >
            <Car size={16} />
            Ride as Passenger
            <ArrowRight size={14} />
          </Link>

          <Link
            to="/driver"
            className="flex items-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl transition-all shadow-xl shadow-amber-500/25 text-sm"
          >
            <MapPin size={16} />
            Drive & Earn
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Live Stats Banner */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 mb-16">
        <div className={`rounded-2xl border p-5 flex flex-wrap items-center justify-around gap-6 ${cardBg} shadow-lg`}>
          <div className="flex items-center gap-3 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Activity size={18} className="text-emerald-400" />
            </div>
            <div className="text-left">
              <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                {stats.totalRides}
              </div>
              <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedText}`}>Total Rides</div>
            </div>
          </div>

          <div className={`w-px h-10 ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'}`} />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <IndianRupee size={18} className="text-amber-400" />
            </div>
            <div className="text-left">
              <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                ₹{stats.totalRevenue.toFixed(0)}
              </div>
              <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedText}`}>Platform Volume</div>
            </div>
          </div>

          <div className={`w-px h-10 ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'}`} />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-cyan-400" />
            </div>
            <div className="text-left">
              <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                ₹{stats.commission.toFixed(0)}
              </div>
              <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedText}`}>App Commission (10%)</div>
            </div>
          </div>

          <div className={`w-px h-10 ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'}`} />

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className={`text-xs font-mono font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Live · Refreshes every 5s
            </span>
          </div>
        </div>
      </section>

      {/* Portal Cards */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 mb-20">
        <h2 className={`text-2xl font-black tracking-tight text-center mb-2 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
          Three Portals, One Platform
        </h2>
        <p className={`text-sm text-center mb-10 ${mutedText}`}>Each portal is a self-contained PWA-style application sharing real-time data.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Rider */}
          <Link to="/simulator" className={`group relative p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${isDarkMode ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 hover:border-emerald-500/40 hover:shadow-emerald-500/10' : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-emerald-100'}`}>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Car size={22} className="text-emerald-400" />
            </div>
            <h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>Rider Portal</h3>
            <p className={`text-xs leading-relaxed mb-5 ${mutedText}`}>
              Book rides with AI fare estimation, track drivers in real-time, manage your wallet, and chat with your driver.
            </p>
            <div className={`flex flex-wrap gap-1.5 mb-5`}>
              {['AI Fares', 'Live Tracking', 'Wallet', 'Chat', 'SOS'].map(f => (
                <span key={f} className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-emerald-300 bg-emerald-50 text-emerald-600'}`}>{f}</span>
              ))}
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              Open Rider App <ChevronRight size={14} />
            </div>
          </Link>

          {/* Driver */}
          <Link to="/driver" className={`group relative p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${isDarkMode ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 hover:border-amber-500/40 hover:shadow-amber-500/10' : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-amber-100'}`}>
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <MapPin size={22} className="text-amber-400" />
            </div>
            <h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>Driver Portal</h3>
            <p className={`text-xs leading-relaxed mb-5 ${mutedText}`}>
              Go online, accept ride requests, navigate with live route updates, track earnings, and chat with passengers.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {['Ride Requests', 'Navigation', 'Earnings', 'Chat', 'Analytics'].map(f => (
                <span key={f} className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-amber-300 bg-amber-50 text-amber-600'}`}>{f}</span>
              ))}
            </div>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
              Open Driver App <ChevronRight size={14} />
            </div>
          </Link>

          {/* Admin */}
          <Link to="/admin" className={`group relative p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${isDarkMode ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 hover:border-cyan-500/40 hover:shadow-cyan-500/10' : 'bg-white border-slate-200 hover:border-cyan-300 hover:shadow-cyan-100'}`}>
            <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Shield size={22} className="text-cyan-400" />
            </div>
            <h3 className={`text-lg font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>Admin Console</h3>
            <p className={`text-xs leading-relaxed mb-5 ${mutedText}`}>
              Monitor all rides, manage surge pricing, resolve complaints, control promo codes, and view live activity feed.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {['Analytics', 'Surge Control', 'Drivers', 'Complaints', 'Promos'].map(f => (
                <span key={f} className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${isDarkMode ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-cyan-300 bg-cyan-50 text-cyan-600'}`}>{f}</span>
              ))}
            </div>
            <div className="flex items-center gap-1 text-cyan-400 text-xs font-bold">
              Open Admin Panel <ChevronRight size={14} />
            </div>
          </Link>
        </div>
      </section>



      {/* Features Grid */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 mb-20">
        <h2 className={`text-2xl font-black tracking-tight text-center mb-2 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
          Why Choose RideX?
        </h2>
        <p className={`text-sm text-center mb-10 ${mutedText}`}>Experience the next generation of urban mobility.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Zap, title: 'Lightning Fast Pickups', desc: 'Our advanced routing algorithm matches you with the nearest driver in seconds.', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { icon: Shield, title: 'Verified Safety', desc: 'Every driver is background-checked, and all rides are tracked in real-time with SOS support.', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { icon: IndianRupee, title: 'Transparent Pricing', desc: 'No hidden fees. See your fare upfront before you book, powered by our intelligent pricing engine.', color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { icon: Clock, title: '24/7 Availability', desc: 'Whether it is a midnight flight or an early morning commute, RideX is always ready.', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { icon: Star, title: 'Premium Fleet', desc: 'Choose from Economy, Comfort, or Luxury vehicles to suit your style and budget.', color: 'text-pink-400', bg: 'bg-pink-500/10' },
            { icon: Users, title: 'Drive on Your Terms', desc: 'Become a RideX driver and earn money on your own schedule with daily instant payouts.', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className={`p-5 rounded-2xl border ${cardBg} hover:border-zinc-700 transition`}>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon size={18} className={color} />
              </div>
              <h3 className={`text-sm font-extrabold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
              <p className={`text-[11px] leading-relaxed ${mutedText}`}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={`relative z-10 border-t px-6 py-8 text-center ${isDarkMode ? 'border-zinc-900' : 'border-slate-200'}`}>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-7 h-7 bg-gradient-to-tr from-emerald-400 to-yellow-400 rounded-lg flex items-center justify-center">
            <span className="text-sm font-black text-slate-950">R</span>
          </div>
          <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>RideX Platform</span>
        </div>
        <p className={`text-[10px] font-mono ${mutedText}`}>
          Full-stack · React + Express + MongoDB + Socket.io · Gemini AI · Docker-ready
        </p>
        <div className="flex items-center justify-center gap-6 mt-4 text-[10px] font-mono">
          {[
            { label: 'Rider Demo', to: '/simulator' },
            { label: 'Driver Portal', to: '/driver' },
            { label: 'Admin Console', to: '/admin' },
            { label: 'Developer Docs', to: '/developers' },
          ].map(l => (
            <Link key={l.to} to={l.to} className={`hover:text-emerald-400 transition ${mutedText}`}>
              {l.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
