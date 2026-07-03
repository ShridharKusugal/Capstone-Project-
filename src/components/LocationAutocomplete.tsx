import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { searchLocation, PhotonFeature } from '../services/photonService';

interface LocationDetails {
  placeId: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  state: string;
  country: string;
  postalCode: string;
}

interface LocationAutocompleteProps {
  label: string;
  placeholder?: string;
  initialValue?: string;
  onSelect: (location: LocationDetails | null) => void;
  isDarkMode?: boolean;
}

export default function LocationAutocomplete({
  label,
  placeholder = 'Search location...',
  initialValue = '',
  onSelect,
  isDarkMode = false
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  // Cache object ref to prevent redundant duplicate API calls
  const cacheRef = useRef<Record<string, PhotonFeature[]>>({});
  const selectInProgress = useRef(false);

  // Sync with initial value changes (e.g. geolocated pre-population)
  useEffect(() => {
    if (initialValue && !selectInProgress.current) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  // Debounced Photon API search lookup
  useEffect(() => {
    if (selectInProgress.current) {
      selectInProgress.current = false;
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      return;
    }

    // Check Cache first
    if (cacheRef.current[trimmed]) {
      setSuggestions(cacheRef.current[trimmed]);
      return;
    }

    setLoading(true);

    const debounceTimer = setTimeout(async () => {
      try {
        const results = await searchLocation(trimmed);
        cacheRef.current[trimmed] = results;
        setSuggestions(results);
      } catch (err) {
        console.error('Photon search failed:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const formatMainText = (prop: any) => {
    return prop.name || prop.street || prop.city || 'Unknown Location';
  };

  const formatSecondaryText = (prop: any) => {
    const parts = [];
    if (prop.name && prop.street) parts.push(prop.street);
    if (prop.district && prop.district !== prop.name) parts.push(prop.district);
    if (prop.city && prop.city !== prop.name) parts.push(prop.city);
    if (prop.state && prop.state !== prop.city) parts.push(prop.state);
    if (parts.length === 0 && prop.country) parts.push(prop.country);
    return parts.join(', ');
  };

  const handleSelectPrediction = (suggestion: PhotonFeature) => {
    selectInProgress.current = true;
    const mainText = formatMainText(suggestion.properties);
    const secondaryText = formatSecondaryText(suggestion.properties);
    const fullAddress = secondaryText ? `${mainText}, ${secondaryText}` : mainText;
    
    setQuery(fullAddress);
    setSuggestions([]);
    setFocused(false);

    const details: LocationDetails = {
      placeId: suggestion.properties.osm_id.toString(),
      address: fullAddress,
      latitude: suggestion.geometry.coordinates[1],
      longitude: suggestion.geometry.coordinates[0],
      city: suggestion.properties.city || suggestion.properties.district || 'Unknown',
      district: suggestion.properties.district || suggestion.properties.city || 'Unknown',
      state: suggestion.properties.state || 'Unknown',
      country: suggestion.properties.country || 'India',
      postalCode: suggestion.properties.postcode || ''
    };

    onSelect(details);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    onSelect(null);
  };

  return (
    <div className="space-y-1 relative text-left w-full">
      <label className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
        isDarkMode ? 'text-slate-400' : 'text-slate-500'
      }`}>
        {label}
      </label>

      <div className={`relative flex items-center border rounded-xl overflow-hidden shadow-sm transition-all ${
        focused
          ? isDarkMode
            ? 'border-emerald-500 bg-slate-950 ring-1 ring-emerald-500/20'
            : 'border-emerald-600 bg-white ring-1 ring-emerald-500/20'
          : isDarkMode
            ? 'border-slate-800 bg-slate-950 hover:border-slate-700'
            : 'border-slate-250 bg-white hover:border-slate-350'
      }`}>
        <div className={`pl-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          <Search size={14} />
        </div>

        <input
          type="text"
          placeholder={placeholder}
          className={`w-full py-2 px-2.5 text-xs focus:outline-none bg-transparent font-medium ${
            isDarkMode ? 'text-slate-100 placeholder-slate-500' : 'text-slate-850 placeholder-slate-450'
          }`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestions.length > 0) {
              e.preventDefault();
              handleSelectPrediction(suggestions[0]);
            }
          }}
        />

        {loading && (
          <div className="pr-3 text-emerald-500">
            <Loader2 size={13} className="animate-spin" />
          </div>
        )}

        {!loading && query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className={`pr-3 transition-colors ${
              isDarkMode ? 'text-slate-500 hover:text-slate-350' : 'text-slate-400 hover:text-slate-650'
            }`}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Autocomplete Droplist Drawer */}
      {focused && query.trim().length >= 3 && !loading && suggestions.length === 0 && (
        <div className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-xl z-50 p-4 text-center text-xs ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-400'
            : 'bg-white border-slate-200 text-slate-500'
        }`}>
          No results found for "{query}". Try a broader search.
        </div>
      )}

      {focused && suggestions.length > 0 && (
        <div className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-xl z-50 max-h-[220px] overflow-y-auto ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}>
          {suggestions.map((suggestion) => {
            const mainText = formatMainText(suggestion.properties);
            const secondaryText = formatSecondaryText(suggestion.properties);
            
            return (
              <button
                key={suggestion.properties.osm_id}
                type="button"
                onMouseDown={() => handleSelectPrediction(suggestion)}
                className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 text-xs transition border-b last:border-b-0 ${
                  isDarkMode
                    ? 'border-slate-850 hover:bg-slate-800 text-slate-200'
                    : 'border-slate-150 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <MapPin size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate text-[11.5px]">
                    {mainText}
                  </div>
                  <div className={`text-[10px] truncate ${isDarkMode ? 'text-slate-450' : 'text-slate-500'}`}>
                    {secondaryText}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
