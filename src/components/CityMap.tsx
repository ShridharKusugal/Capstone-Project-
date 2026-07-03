import React, { useRef, useEffect } from 'react';
import { Navigation } from 'lucide-react';
import { Map as MapLibreMap, MapMarker, MarkerContent, MapRoute, MapControls, MarkerLabel } from './ui/map';
import { getMapStyle, MAP_DEFAULTS } from '../services/mapService';

interface CityMapProps {
  pickup: string;
  destination: string;
  onSelectPickup: (name: string, lat: number, lng: number) => void;
  onSelectDestination: (name: string, lat: number, lng: number) => void;
  driverCoords?: { lat: number; lng: number };
  rideStatus?: 'pending' | 'searching' | 'accepted' | 'arriving' | 'arrived' | 'active' | 'completed' | 'cancelled' | 'failed' | 'idle' | 'requested';
  activeRoute?: { lat: number; lng: number }[];
  currentStepIndex?: number;
  isDarkMode?: boolean;
  hideControls?: boolean;
}

export default function CityMap({
  pickup,
  destination,
  onSelectPickup,
  onSelectDestination,
  driverCoords,
  rideStatus,
  activeRoute,
  currentStepIndex,
  isDarkMode = false,
  hideControls = false
}: CityMapProps) {
  const mapLibreRef = useRef<any>(null);

  // Extract lat/lng from activeRoute or default
  const pickupLatLng = activeRoute && activeRoute.length > 0 ? activeRoute[0] : null;
  const destLatLng = activeRoute && activeRoute.length > 1 ? activeRoute[activeRoute.length - 1] : null;

  useEffect(() => {
    if (mapLibreRef.current) {
      const map = mapLibreRef.current;
      if (pickupLatLng && destLatLng) {
        // Fit bounds for route
        const bounds = [
          [Math.min(pickupLatLng.lng, destLatLng.lng) - 0.05, Math.min(pickupLatLng.lat, destLatLng.lat) - 0.05],
          [Math.max(pickupLatLng.lng, destLatLng.lng) + 0.05, Math.max(pickupLatLng.lat, destLatLng.lat) + 0.05]
        ];
        map.fitBounds(bounds, { padding: 60, duration: 1000 });
      } else if (pickupLatLng) {
        map.flyTo({ center: [pickupLatLng.lng, pickupLatLng.lat], zoom: 14, duration: 1000 });
      } else if (driverCoords) {
        map.flyTo({ center: [driverCoords.lng, driverCoords.lat], zoom: 14, duration: 1000 });
      }
    }
  }, [pickupLatLng, destLatLng, driverCoords]);

  return (
    <div className="w-full h-full relative flex flex-col bg-slate-100">
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <MapLibreMap
          ref={mapLibreRef}
          theme={isDarkMode ? 'dark' : 'light'}
          className="w-full h-full"
          initialViewState={{
            longitude: MAP_DEFAULTS.center[0],
            latitude: MAP_DEFAULTS.center[1],
            zoom: MAP_DEFAULTS.zoom
          }}
          mapStyle={getMapStyle(isDarkMode)}
        >
          {/* Route Polyline */}
          {activeRoute && activeRoute.length > 0 && (
            <MapRoute
              coordinates={activeRoute.map(r => [r.lng, r.lat] as [number, number])}
              color={isDarkMode ? '#818cf8' : '#4f46e5'}
              width={5}
            />
          )}

          {/* Pickup Marker */}
          {pickupLatLng && (
            <MapMarker longitude={pickupLatLng.lng} latitude={pickupLatLng.lat}>
              <MarkerContent>
                <div className="flex items-center justify-center w-6 h-6 bg-black border-2 border-white shadow-xl transform rotate-45 rounded-sm z-10">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                </div>
              </MarkerContent>
              <MarkerLabel position="top">
                <div className="bg-white text-slate-900 border border-slate-200/80 px-2.5 py-1.5 rounded-lg shadow-xl text-[10.5px] font-sans font-bold flex items-center gap-1.5 pointer-events-none select-none -translate-y-2 whitespace-nowrap">
                  <span>Pickup</span>
                </div>
              </MarkerLabel>
            </MapMarker>
          )}

          {/* Destination Marker */}
          {destLatLng && (
            <MapMarker longitude={destLatLng.lng} latitude={destLatLng.lat}>
              <MarkerContent>
                <div className="flex items-center justify-center w-6 h-6 bg-black border-2 border-white shadow-xl transform rotate-45 rounded-sm z-10">
                  <div className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
                </div>
              </MarkerContent>
              <MarkerLabel position="top">
                <div className="bg-white text-slate-900 border border-slate-200/80 px-2.5 py-1.5 rounded-lg shadow-xl text-[10.5px] font-sans font-bold flex items-center gap-1.5 pointer-events-none select-none -translate-y-2 whitespace-nowrap">
                  <span>Drop-off</span>
                </div>
              </MarkerLabel>
            </MapMarker>
          )}

          {/* Driver Marker */}
          {driverCoords && (
            <MapMarker longitude={driverCoords.lng} latitude={driverCoords.lat}>
              <MarkerContent>
                <div className="relative flex items-center justify-center p-2 bg-indigo-600 rounded-full border-2 border-white shadow-xl animate-bounce z-20">
                  <Navigation size={12} className="text-white fill-white transform rotate-45" />
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-[8px] font-bold px-1 py-0.5 rounded text-white whitespace-nowrap leading-none">
                    Driver Online
                  </span>
                </div>
              </MarkerContent>
            </MapMarker>
          )}

          {!hideControls && <MapControls showZoom showCompass showFullscreen showLocate={false} />}
        </MapLibreMap>
      </div>
    </div>
  );
}

// Export empty array for components still requiring it to prevent crashing
export const PREDEFINED_LOCATIONS: any[] = [];
