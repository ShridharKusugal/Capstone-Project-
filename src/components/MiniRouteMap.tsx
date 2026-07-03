import React from 'react';
import { Navigation } from 'lucide-react';

interface MiniRouteMapProps {
  route: { lat: number; lng: number }[];
  currentIndex: number;
  pickupName: string;
  destName: string;
  isDarkMode?: boolean;
}

export default function MiniRouteMap({
  route,
  currentIndex,
  pickupName,
  destName,
  isDarkMode = false
}: MiniRouteMapProps) {
  if (!route || route.length === 0) return null;

  // Compute latitude and longitude bounding limits to project 2D SVG
  const lats = route.map(p => p.lat);
  const lngs = route.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const rangeLat = maxLat - minLat || 1;
  const rangeLng = maxLng - minLng || 1;

  // Add 15% padding so we do not clip nodes at SVG edges
  const padX = rangeLng * 0.15;
  const padY = rangeLat * 0.15;

  const svgMinLng = minLng - padX;
  const svgMaxLng = maxLng + padX;
  const svgMinLat = minLat - padY;
  const svgMaxLat = maxLat + padY;

  // Map coordinate pairs onto a 300x80 local coordinate grid space
  const mapToSVG = (lat: number, lng: number) => {
    const x = ((lng - svgMinLng) / (svgMaxLng - svgMinLng)) * 300;
    const y = 80 - ((lat - svgMinLat) / (svgMaxLat - svgMinLat)) * 80;
    return { x, y };
  };

  const points = route.map(p => mapToSVG(p.lat, p.lng));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const currentPoint = points[currentIndex] || points[0];
  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  // Helper names
  const cleanPickup = pickupName.split(',')[0];
  const cleanDest = destName.split(',')[0];

  return (
    <div className={`mt-3 p-3 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-850/80 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'} space-y-1.5 shadow-sm`} id="simulator-mini-map-route">
      <div className="flex justify-between items-center text-[9px] font-mono select-none">
        <span className="truncate max-w-[110px] font-black text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{cleanPickup}</span>
        </span>
        <span className="text-indigo-400 font-extrabold tracking-wide uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 animate-pulse text-[8px]">
          ROUTE TELEMETRY
        </span>
        <span className="truncate max-w-[110px] font-black text-rose-450 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>{cleanDest}</span>
        </span>
      </div>

      <div className="relative h-24 w-full overflow-hidden rounded-xl bg-slate-950 border border-slate-850/40">
        {/* Decorative Grid Mesh */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '12px 12px' }} />

        <svg viewBox="0 0 300 80" className="w-full h-full relative z-10" preserveAspectRatio="xMidYMid meet">
          {/* Subtle Gridlines for coordinates reference */}
          <line x1="0" y1="20" x2="300" y2="20" stroke="#334155" strokeDasharray="3,3" strokeWidth="0.5" className="opacity-40" />
          <line x1="0" y1="40" x2="300" y2="40" stroke="#334155" strokeDasharray="3,3" strokeWidth="0.5" className="opacity-40" />
          <line x1="0" y1="60" x2="300" y2="60" stroke="#334155" strokeDasharray="3,3" strokeWidth="0.5" className="opacity-40" />
          
          {/* Main Route Polyline Line (under-glow) */}
          <path
            d={pathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-15"
          />
          <path
            d={pathD}
            fill="none"
            stroke="#818cf8"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Draw passed section of the route in highly visible emerald green */}
          {currentIndex > 0 && (
            <path
              d={points.slice(0, currentIndex + 1).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Predefined Pickup Point Node */}
          <circle cx={startPoint.x} cy={startPoint.y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
          <circle cx={startPoint.x} cy={startPoint.y} r="8" fill="#10b981" opacity="0.25" className="animate-pulse" />

          {/* Predefined Destination Dropoff Point Node */}
          <circle cx={endPoint.x} cy={endPoint.y} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.2" />
          <circle cx={endPoint.x} cy={endPoint.y} r="8" fill="#ef4444" opacity="0.15" />

          {/* Dynamic Car Pulsing Tracker Node Icon */}
          <g transform={`translate(${currentPoint.x}, ${currentPoint.y})`}>
            <circle cx="0" cy="0" r="11" fill="#fbbf24" opacity="0.35" className="animate-ping" style={{ animationDuration: '1.2s' }} />
            <circle cx="0" cy="0" r="5.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            <g transform="translate(-4, -4) scale(0.5)">
              <Navigation className="text-white fill-white transform rotate-[45deg]" size={16} />
            </g>
          </g>
        </svg>
      </div>

      <div className="flex justify-between text-[8px] font-mono text-slate-500 font-medium leading-none select-none">
        <span>Lng: {route[currentIndex]?.lng.toFixed(4) ?? '0.00'}-E</span>
        <span className="text-emerald-400 font-bold">• GPS STREAM SYNCED</span>
        <span>Lat: {route[currentIndex]?.lat.toFixed(4) ?? '0.00'}-N</span>
      </div>
    </div>
  );
}
