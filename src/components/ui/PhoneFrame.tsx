import React, { useState, useEffect } from 'react';
import { Shield, Battery, Wifi, Signal, RefreshCw } from 'lucide-react';

export type DeviceType = 'se' | 'iphone14' | 'iphone16' | 'pixel9' | 's25';

interface PhoneFrameProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  deviceType: DeviceType;
  showStatusBar?: boolean;
  showDynamicIsland?: boolean;
  showHomeIndicator?: boolean;
  currentRoute?: string;
  screenName?: string;
  onlineStatus?: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onDeviceChange?: (device: DeviceType) => void;
}

export default function PhoneFrame({
  children,
  width: customWidth,
  height: customHeight,
  deviceType = 'iphone16',
  showStatusBar = true,
  showDynamicIsland = true,
  showHomeIndicator = true,
  currentRoute = '/simulator',
  screenName = 'Home',
  onlineStatus = true,
  isDarkMode = false,
  onToggleDarkMode,
  onDeviceChange
}: PhoneFrameProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [windowHeight, setWindowHeight] = useState(800);
  const [phoneClock, setPhoneClock] = useState('09:41');
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);

  // Device Specifications
  const getDeviceSpecs = (type: DeviceType) => {
    switch (type) {
      case 'se':
        return { name: 'iPhone SE', width: 375, height: 667, radius: 'rounded-[16px]', bezel: 'border-[16px] border-slate-900', style: 'se' };
      case 'iphone14':
        return { name: 'iPhone 14', width: 390, height: 844, radius: 'rounded-[44px]', bezel: 'border-[12px] border-slate-900', style: 'iphone' };
      case 'iphone16':
      default:
        return { name: 'iPhone 16 Pro', width: 393, height: 852, radius: 'rounded-[50px]', bezel: 'border-[8px] border-slate-900 outline outline-[1px] outline-slate-800', style: 'iphone-pro' };
      case 'pixel9':
        return { name: 'Google Pixel 9', width: 412, height: 892, radius: 'rounded-[40px]', bezel: 'border-[10px] border-slate-900', style: 'pixel' };
      case 's25':
        return { name: 'Samsung S25 Ultra', width: 412, height: 914, radius: 'rounded-[20px]', bezel: 'border-[8px] border-slate-900', style: 'galaxy' };
    }
  };

  const specs = getDeviceSpecs(deviceType);
  const finalWidth = customWidth || specs.width;
  const finalHeight = customHeight || specs.height;

  // Real Mobile screen detection & window resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setWindowHeight(window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Live Phone Clock update
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setPhoneClock(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute CSS scaling factor to fit 72% of the viewport height on desktop screens
  const desktopTargetHeight = windowHeight * 0.72;
  const scaleFactor = Math.min(1, desktopTargetHeight / finalHeight);

  // Render direct app view without simulator if opened on actual mobile screen
  if (isMobile) {
    return (
      <div className="w-full h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col relative select-none">
        <div className="flex-1 w-full h-full relative overflow-y-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] w-full py-4 gap-6 select-none animate-in fade-in zoom-in-95 duration-500">
      
      {/* 📱 Real Mock Bezel & Scale Wrapper */}
      <div 
        className="relative transition-all duration-300 ease-out"
        style={{
          width: `${finalWidth}px`,
          height: `${finalHeight}px`,
          transform: `scale(${scaleFactor})`,
          margin: `${-finalHeight * (1 - scaleFactor) / 2}px ${-finalWidth * (1 - scaleFactor) / 2}px`
        }}
      >
        {/* Bezel frame styling */}
        <div 
          className={`w-full h-full ${specs.bezel} ${specs.radius} bg-black shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col relative overflow-hidden`}
        >
          
          {/* 1. Status Bar Simulator */}
          {showStatusBar && (
            <div className="absolute top-0 inset-x-0 h-10 px-6 flex items-center justify-between text-[11px] font-sans font-semibold text-slate-800 z-50 pointer-events-none select-none">
              <span>{phoneClock}</span>
              
              <div className="flex items-center gap-1.5">
                <Signal size={12} className="opacity-90" />
                <Wifi size={12} className="opacity-90" />
                <div className="flex items-center gap-0.5">
                  <span className="text-[9px]">100%</span>
                  <Battery size={13} className="opacity-90 fill-current" />
                </div>
              </div>
            </div>
          )}

          {/* 2. Top Cutout Notch / Dynamic Island */}
          {showDynamicIsland && (
            <>
              {specs.style === 'iphone-pro' && (
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-full z-[60] flex items-center justify-between px-3.5 shadow-inner border border-white/5 pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 transition-all">
                  <div className="w-3.5 h-3.5 bg-zinc-900 rounded-full border border-blue-900/30 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-blue-950 rounded-full opacity-60" />
                  </div>
                  <div className="w-1 h-1 bg-zinc-800 rounded-full opacity-40 mr-1" />
                </div>
              )}

              {specs.style === 'iphone' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140px] h-[28px] bg-black rounded-b-[18px] z-[60] flex items-center justify-center shadow-inner" />
              )}

              {(specs.style === 'pixel' || specs.style === 'galaxy') && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900 rounded-full z-[60] border border-slate-900 shadow-inner flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-blue-950 rounded-full opacity-50" />
                </div>
              )}
            </>
          )}

          {/* 3. Outer viewport screen wrapper */}
          <div className="flex-1 w-full h-full relative overflow-hidden bg-white">
            {children}
          </div>

          {/* 4. Bottom home indicator or gesture bars */}
          {showHomeIndicator && (
            <>
              {specs.style === 'se' ? (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-950 shadow-inner cursor-pointer" />
              ) : (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[130px] h-[4px] bg-slate-800 rounded-full z-[60] opacity-80" />
              )}
            </>
          )}

        </div>
      </div>

      {/* 🛠️ Developer Control Toolbar */}
      <div 
        className="w-full max-w-[450px] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs font-mono text-slate-300 transition-all duration-300 relative z-30"
      >
        {/* Toolbar Header (Collapsible) */}
        <div 
          onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
          className="px-4 py-3 bg-slate-950 flex items-center justify-between cursor-pointer border-b border-slate-800 select-none hover:bg-slate-900 transition"
        >
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-emerald-500" />
            <span className="font-bold text-white uppercase tracking-wider text-[10px]">Dev Simulator Hub</span>
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase">
            {isToolbarCollapsed ? '▼ Expand Controls' : '▲ Collapse'}
          </div>
        </div>

        {/* Toolbar Panel Content */}
        {!isToolbarCollapsed && (
          <div className="p-4 space-y-3.5">
            {/* Device Switcher Presets */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Simulator Device Type</label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['se', 'iphone14', 'iphone16', 'pixel9', 's25'] as DeviceType[]).map((dev) => (
                  <button
                    key={dev}
                    onClick={() => onDeviceChange && onDeviceChange(dev)}
                    className={`py-1.5 px-1 rounded-lg text-[9px] font-bold text-center border uppercase transition-all ${
                      deviceType === dev
                        ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {dev === 'se' ? 'iPhone SE' : dev === 'iphone14' ? 'iPhone 14' : dev === 'iphone16' ? '16 Pro' : dev === 'pixel9' ? 'Pixel 9' : dev === 's25' ? 'S25 Ultra' : dev}
                  </button>
                ))}
              </div>
            </div>

            {/* Diagnostic stats */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-800/80 pt-3">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Viewport Size</span>
                <span className="text-white font-bold">{finalWidth} × {finalHeight} px</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Active Screen</span>
                <span className="text-white font-bold">{screenName}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">App Route</span>
                <span className="text-white font-bold truncate block max-w-[180px]">{currentRoute}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Zoom Scale</span>
                <span className="text-white font-bold">{(scaleFactor * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Dark mode mock switch */}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-3.5">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Preview Dark Mode</span>
                <span className="text-[10px] text-slate-400">Toggle dark-matter theme filters</span>
              </div>
              
              <button 
                onClick={onToggleDarkMode}
                className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                  isDarkMode ? 'bg-emerald-600' : 'bg-slate-950 border border-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  isDarkMode ? 'translate-x-4.5' : 'translate-x-0'
                }`} />
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
