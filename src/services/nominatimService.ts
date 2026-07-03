export interface ReverseGeocodeResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    [key: string]: string | undefined;
  };
}

export const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodeResult | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        // Provide a User-Agent to respect Nominatim usage policy
        'User-Agent': 'RideConnect-App/1.0'
      }
    });
    
    if (!res.ok) {
      throw new Error(`Nominatim API error: ${res.status}`);
    }
    
    const data = await res.json();
    if (data && data.error) {
      console.warn("Nominatim error returned:", data.error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Nominatim Reverse Geocode Error:", error);
    return null;
  }
};
