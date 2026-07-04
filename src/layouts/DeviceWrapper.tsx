import React from 'react';

interface DeviceWrapperProps {
  mode: 'ios' | 'android';
  setMode: (mode: 'ios' | 'android') => void;
  phoneClock: string;
  themeColor: 'emerald' | 'amber';
  children: React.ReactNode;
}

export default function DeviceWrapper({ mode, setMode, phoneClock, themeColor, children }: DeviceWrapperProps) {
  const isIos = mode === 'ios';
  
  // Mobile Viewport Resolutions
  const width = isIos ? 393 : 412; // iPhone 15 Pro vs Google Pixel 8
  const height = isIos ? 852 : 892;
  
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Device Mode Toggle Tabs */}
      <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl gap-1 shadow-inner relative z-20">
        <button
          onClick={() => setMode('ios')}
          className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            isIos 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-350'
          }`}
        >
           iOS Preview (393 × 852)
        </button>
        <button
          onClick={() => setMode('android')}
          className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            !isIos 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-500 hover:text-slate-350'
          }`}
        >
          🤖 Android Preview (412 × 892)
        </button>
      </div>

      {/* Physical phone mock bezel wrapper */}
      <div 
        className="border-[11px] border-slate-900 bg-slate-950 rounded-[46px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] relative flex flex-col items-center justify-center transition-all duration-300 ease-in-out border-b-[14px]"
        style={{
          width: `${width + 22}px`,
          height: `${height + 25}px`,
        }}
      >
        {/* Top Camera Notch / Dynamic Island */}
        {isIos ? (
          <div className="absolute top-2 w-[105px] h-[28px] bg-black rounded-full z-50 flex items-center justify-center transition-all shadow-inner border border-slate-800/10">
            <div className="absolute left-3 w-2.5 h-2.5 bg-zinc-900/60 rounded-full border border-blue-900/20" />
            <div className="absolute right-6 w-1 h-1 bg-zinc-800 rounded-full" />
          </div>
        ) : (
          <div className="absolute top-3 w-3.5 h-3.5 bg-black rounded-full z-50 transition-all border border-slate-800 shadow-inner" />
        )}

        {/* Embedded OS Status Bar */}
        <div 
          className="absolute top-0 inset-x-0 h-9 px-6 flex items-center justify-between text-[10px] font-bold z-40 select-none pointer-events-none text-slate-800"
        >
          {isIos ? (
            <>
              <span className="font-sans pl-1.5">{phoneClock}</span>
              <div className="flex items-center gap-1.5 pr-1.5">
                <svg className="w-4 h-2.5 fill-current opacity-85" viewBox="0 0 17 12">
                  <rect x="0" y="9" width="2.5" height="3" rx="0.5" />
                  <rect x="3.5" y="7" width="2.5" height="5" rx="0.5" />
                  <rect x="7" y="5" width="2.5" height="7" rx="0.5" />
                  <rect x="10.5" y="2" width="2.5" height="10" rx="0.5" />
                  <rect x="14" y="0" width="2.5" height="12" rx="0.5" />
                </svg>
                <div className="w-5 h-2.5 border border-current rounded-sm p-[1px] flex items-center">
                  <div className={`h-full w-[80%] rounded-2xs ${themeColor === 'emerald' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                  <div className="w-0.5 h-1 bg-current rounded-r-2xs ml-[1px]" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 pl-1.5">
                <svg className="w-3.5 h-3.5 fill-current opacity-85" viewBox="0 0 24 24">
                  <path d="M2 22h20V2z" />
                </svg>
                <svg className="w-3.5 h-3.5 fill-current opacity-85" viewBox="0 0 24 24">
                  <path d="M12 21l-12-18h24z" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5 pr-1.5">
                <span className="font-sans">{phoneClock}</span>
                <svg className="w-4 h-4 fill-current opacity-85" viewBox="0 0 24 24">
                  <path d="M17 5H16V3c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v2H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-1 15H8V7h8v13z" />
                </svg>
              </div>
            </>
          )}
        </div>

        {/* Viewport content */}
        <div 
          className="bg-white overflow-hidden relative flex flex-col w-full h-full rounded-[35px] border border-slate-200/50 pt-9 pb-3"
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          {children}
        </div>

        {/* Bottom OS Gesture Line */}
        {isIos ? (
          <div className="absolute bottom-1 w-[120px] h-[4px] bg-slate-900 rounded-full z-50 left-1/2 -translate-x-1/2" />
        ) : (
          <div className="absolute bottom-1.5 w-[70px] h-[3px] bg-slate-900 rounded-full z-50 left-1/2 -translate-x-1/2" />
        )}
      </div>

      {/* Dim Indicator */}
      <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
        Viewport: {width} × {height} px ({isIos ? 'iPhone 15 Pro' : 'Pixel 8'})
      </span>
    </div>
  );
}
