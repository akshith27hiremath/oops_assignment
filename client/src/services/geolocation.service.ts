import { GeoLocation } from '../types/store.types';

/**
 * Geolocation Service
 * Handles browser geolocation and location permissions
 */

class GeolocationService {
  /**
   * Get current position from browser
   */
  async getCurrentPosition(): Promise<GeoLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Unable to retrieve your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // Cache for 5 minutes
        }
      );
    });
  }

  /**
   * Request location permission
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      await this.getCurrentPosition();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if geolocation is supported
   */
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Save location to localStorage
   */
  saveLocation(location: GeoLocation): void {
    localStorage.setItem('userLocation', JSON.stringify(location));
  }

  /**
   * Get saved location from localStorage
   */
  getSavedLocation(): GeoLocation | null {
    const saved = localStorage.getItem('userLocation');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Clear saved location
   */
  clearSavedLocation(): void {
    localStorage.removeItem('userLocation');
  }

  /**
   * Reverse geocode coordinates to address using Google Maps Geocoding API
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      // Check if google maps is loaded
      if (!window.google || !window.google.maps) {
        console.warn('Google Maps not loaded');
        return null;
      }

      return new Promise((resolve, reject) => {
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat: latitude, lng: longitude };

        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === 'OK') {
            if (results && results[0]) {
              // Get formatted address (most human-readable)
              resolve(results[0].formatted_address);
            } else {
              resolve(null);
            }
          } else {
            console.error('Geocoding failed:', status);
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to structured address components
   */
  async reverseGeocodeToComponents(latitude: number, longitude: number): Promise<{
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    formattedAddress: string;
  } | null> {
    try {
      // Check if google maps is loaded
      if (!window.google || !window.google.maps) {
        console.warn('Google Maps not loaded');
        return null;
      }

      return new Promise((resolve, reject) => {
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat: latitude, lng: longitude };

        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const result = results[0];
            const components = result.address_components;

            // Extract address components
            let streetNumber = '';
            let route = '';
            let locality = '';
            let administrativeAreaLevel2 = '';
            let administrativeAreaLevel1 = '';
            let postalCode = '';
            let country = '';

            components.forEach((component) => {
              const types = component.types;

              if (types.includes('street_number')) {
                streetNumber = component.long_name;
              }
              if (types.includes('route')) {
                route = component.long_name;
              }
              if (types.includes('locality')) {
                locality = component.long_name;
              }
              if (types.includes('administrative_area_level_2')) {
                administrativeAreaLevel2 = component.long_name;
              }
              if (types.includes('administrative_area_level_1')) {
                administrativeAreaLevel1 = component.short_name;
              }
              if (types.includes('postal_code')) {
                postalCode = component.long_name;
              }
              if (types.includes('country')) {
                country = component.long_name;
              }
            });

            // Construct street address
            const street = [streetNumber, route].filter(Boolean).join(' ') || result.formatted_address.split(',')[0];

            // Use locality or administrative_area_level_2 for city
            const city = locality || administrativeAreaLevel2;

            resolve({
              street,
              city,
              state: administrativeAreaLevel1,
              zipCode: postalCode,
              country,
              formattedAddress: result.formatted_address
            });
          } else {
            console.error('Geocoding failed:', status);
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Get location from localStorage
   */
  getLocation(): GeoLocation | null {
    return this.getSavedLocation();
  }
}

export default new GeolocationService();
