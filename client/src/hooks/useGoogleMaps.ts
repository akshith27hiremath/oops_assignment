import { useJsApiLoader } from '@react-google-maps/api';

// Define libraries once to prevent re-renders
const libraries: ("places" | "geometry")[] = ["places", "geometry"];

/**
 * Shared Google Maps loader hook
 * Use this instead of useJsApiLoader directly to ensure consistent options
 */
export const useGoogleMaps = () => {
  return useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });
};
