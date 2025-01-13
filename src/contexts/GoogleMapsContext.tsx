import React, { createContext, useContext, useState, useCallback } from 'react';
import { LoadScript } from '@react-google-maps/api';

const libraries = ['places'];

interface GoogleMapsContextType {
  isLoaded: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({ isLoaded: false });

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <LoadScript
      googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
      libraries={libraries as any}
      onLoad={handleLoad}
    >
      <GoogleMapsContext.Provider value={{ isLoaded }}>
        {children}
      </GoogleMapsContext.Provider>
    </LoadScript>
  );
}
