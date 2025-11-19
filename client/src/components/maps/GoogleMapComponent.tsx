import React, { useState, useCallback } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import { GeoLocation } from '../../types/store.types';

interface GoogleMapComponentProps {
  center: GeoLocation;
  zoom?: number;
  markers?: Array<{
    position: GeoLocation;
    title: string;
    onClick?: () => void;
    icon?: string;
  }>;
  onMapClick?: (location: GeoLocation) => void;
  className?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultMapOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  center,
  zoom = 13,
  markers = [],
  onMapClick,
  className = '',
}) => {
  const { isLoaded, loadError } = useGoogleMaps();

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (onMapClick && e.latLng) {
        onMapClick({
          latitude: e.latLng.lat(),
          longitude: e.latLng.lng(),
        });
      }
    },
    [onMapClick]
  );

  if (loadError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-8">
          <svg
            className="mx-auto h-12 w-12 text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-700 font-medium">Failed to load Google Maps</p>
          <p className="text-gray-500 text-sm mt-2">
            Please check your internet connection and API key
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      mapContainerClassName={className}
      center={{ lat: center.latitude, lng: center.longitude }}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
      options={defaultMapOptions}
    >
      {markers.map((marker, index) => (
        <Marker
          key={index}
          position={{ lat: marker.position.latitude, lng: marker.position.longitude }}
          title={marker.title}
          onClick={marker.onClick}
          icon={marker.icon}
        />
      ))}
    </GoogleMap>
  );
};

export default GoogleMapComponent;
