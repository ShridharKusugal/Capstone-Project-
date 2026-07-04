// src/components/RideProgress.tsx
"use client";

import React, { useEffect } from "react";
import CityMap from "./CityMap";
import { X } from "lucide-react";

interface RideProgressProps {
  pickupLocation: { latitude: number; longitude: number } | null;
  destinationLocation: { latitude: number; longitude: number } | null;
  directionsData: {
    distance: number;
    duration: number;
    routeCoordinates: { lat: number; lng: number }[];
  } | null;
  driverCoords: { lat: number; lng: number } | null;
  onArrive: () => void;
  onCancel: () => void;
  isDarkMode?: boolean;
}

export default function RideProgress({
  pickupLocation,
  destinationLocation,
  directionsData,
  driverCoords,
  onArrive,
  onCancel,
  isDarkMode = false,
}: RideProgressProps) {
  // Simple tolerance check for arrival (≈20 m)
  useEffect(() => {
    if (!driverCoords || !destinationLocation) return;
    const distance = Math.hypot(
      driverCoords.lat - destinationLocation.latitude,
      driverCoords.lng - destinationLocation.longitude
    ) * 111; // km approximation
    if (distance < 0.02) {
      onArrive();
    }
  }, [driverCoords, destinationLocation, onArrive]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white/90 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">Ride in progress</h2>
        <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full">
          <X size={20} />
        </button>
      </div>

      {/* Info */}
      <div className="p-4 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-b-lg">
        <p className="font-medium">Distance: <span className="font-bold">{directionsData?.distance?.toFixed(2)} km</span></p>
        <p className="font-medium">ETA: <span className="font-bold">{directionsData?.duration} min</span></p>
      </div>

      {/* Map */}
      <div className="flex-1 overflow-hidden">
        <CityMap
          pickup={pickupLocation ? (pickupLocation.latitude + "," + pickupLocation.longitude) : ""}
          destination={destinationLocation ? (destinationLocation.latitude + "," + destinationLocation.longitude) : ""}
          onSelectPickup={() => {}}
          onSelectDestination={() => {}}
          driverCoords={driverCoords}
          rideStatus="active"
          activeRoute={directionsData?.routeCoordinates}
          currentStepIndex={0}
          isDarkMode={isDarkMode}
          hideControls={true}
        />
      </div>
    </div>
  );
}
