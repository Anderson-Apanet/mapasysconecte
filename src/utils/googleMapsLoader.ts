// Utilitário para carregamento da API do Google Maps
import { useJsApiLoader } from '@react-google-maps/api';

// Bibliotecas que serão carregadas com a API do Google Maps
const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

// Hook personalizado para carregar a API do Google Maps
export const useGoogleMapsApi = (options = {}) => {
  return useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
    id: 'google-map-script',
    ...options
  });
};
