import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

interface MapWithMarkerProps {
  center: google.maps.LatLngLiteral;
  onClick?: (e: google.maps.MapMouseEvent) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  marginTop: '1rem',
  marginBottom: '1rem',
  position: 'relative' as 'relative'
};

const markerStyle = {
  position: 'absolute' as 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -100%)',
  zIndex: 1000,
  width: '30px',
  height: '30px'
};

const MapWithMarker: React.FC<MapWithMarkerProps> = ({ center, onClick }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"]
  });
  
  const onLoad = useCallback((map: google.maps.Map) => {
    console.log('Mapa carregado, centralizando em:', center);
    setMap(map);
    map.setCenter(center);
    map.setZoom(15);
  }, [center]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);
  
  // Atualiza o mapa quando o centro muda
  useEffect(() => {
    if (map) {
      map.setCenter(center);
    }
  }, [center, map]);
  
  if (!isLoaded) {
    return (
      <div style={mapContainerStyle} className="flex items-center justify-center bg-gray-100">
        <p>Carregando mapa...</p>
      </div>
    );
  }
  
  return (
    <div className="relative">
      <div style={{ position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={15}
          center={center}
          onClick={onClick}
          onLoad={onLoad}
          onUnmount={onUnmount}
        />
        {/* Marcador personalizado usando um elemento HTML */}
        <div style={markerStyle}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" width="30px" height="30px">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      </div>
      <div className="absolute top-2 right-2 bg-white p-2 rounded shadow">
        <p className="text-xs">Lat: {center.lat.toFixed(6)}, Lng: {center.lng.toFixed(6)}</p>
      </div>
    </div>
  );
};

export default MapWithMarker;
