export interface RouteResult {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: any;    // GeoJSON LineString
}

export const getRoute = async (
  startCoord: { lat: number; lng: number },
  endCoord: { lat: number; lng: number }
): Promise<RouteResult | null> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoord.lng},${startCoord.lat};${endCoord.lng},${endCoord.lat}?overview=full&geometries=geojson`;
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OSRM API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
      };
    }
    
    return null;
  } catch (error) {
    console.error("OSRM Route Error:", error);
    return null;
  }
};
