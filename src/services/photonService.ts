export interface PhotonFeature {
  type: string;
  geometry: {
    coordinates: [number, number];
    type: string;
  };
  properties: {
    osm_id: number;
    osm_type: string;
    extent: number[];
    country: string;
    osm_key: string;
    city?: string;
    countrycode: string;
    osm_value: string;
    name?: string;
    state?: string;
    street?: string;
    postcode?: string;
    district?: string;
  };
}

export const searchLocation = async (query: string): Promise<PhotonFeature[]> => {
  if (!query || query.length < 3) return [];
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Photon API error: ${res.status}`);
    }
    const data = await res.json();
    return data.features || [];
  } catch (error) {
    console.error("Photon Search Error:", error);
    return [];
  }
};
