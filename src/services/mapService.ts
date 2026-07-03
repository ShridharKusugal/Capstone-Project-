export const MAP_DEFAULTS = {
  center: [77.216721, 28.622564] as [number, number], // New Delhi as default fallback
  zoom: 12,
  minZoom: 4,
  maxZoom: 18,
};

// Use an open-source style compatible with MapLibre, such as CartoDB Positron
// The 'voyager' style is colorful and similar to Uber/Google maps default.
export const getMapStyle = (isDarkMode: boolean) => {
  if (isDarkMode) {
    return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  }
  return 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
};
