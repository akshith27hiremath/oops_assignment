import { Client } from '@googlemaps/google-maps-services-js';
import { IGeoLocation } from '../models/User.model';
import { logger } from '../utils/logger';

/**
 * Location Service
 * Handles geocoding, distance calculations, and location-based queries
 */

class LocationService {
  private googleMapsClient: Client;

  constructor() {
    this.googleMapsClient = new Client({});
  }

  /**
   * Convert address to coordinates (Geocoding)
   */
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      if (!process.env.GOOGLE_MAPS_API_KEY) {
        logger.warn('Google Maps API key not configured');
        return null;
      }

      const response = await this.googleMapsClient.geocode({
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      });

      if (response.data.results && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      }

      return null;
    } catch (error: any) {
      logger.error('❌ Geocoding error:', error);
      return null;
    }
  }

  /**
   * Convert coordinates to address (Reverse Geocoding)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      if (!process.env.GOOGLE_MAPS_API_KEY) {
        logger.warn('Google Maps API key not configured');
        return null;
      }

      const response = await this.googleMapsClient.reverseGeocode({
        params: {
          latlng: { lat: latitude, lng: longitude },
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      });

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      }

      return null;
    } catch (error: any) {
      logger.error('❌ Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   * Accepts both GeoJSON and simple coordinate objects
   */
  calculateDistance(
    point1: IGeoLocation | { latitude: number; longitude: number },
    point2: IGeoLocation | { latitude: number; longitude: number }
  ): number {
    // Extract coordinates from GeoJSON or simple format
    const lat1 = this.extractLatitude(point1);
    const lng1 = this.extractLongitude(point1);
    const lat2 = this.extractLatitude(point2);
    const lng2 = this.extractLongitude(point2);

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Extract latitude from GeoJSON or simple coordinate object
   */
  private extractLatitude(point: IGeoLocation | { latitude: number; longitude: number }): number {
    if ('coordinates' in point) {
      return point.coordinates[1]; // GeoJSON: [longitude, latitude]
    }
    return point.latitude;
  }

  /**
   * Extract longitude from GeoJSON or simple coordinate object
   */
  private extractLongitude(point: IGeoLocation | { latitude: number; longitude: number }): number {
    if ('coordinates' in point) {
      return point.coordinates[0]; // GeoJSON: [longitude, latitude]
    }
    return point.longitude;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if a point is within radius of another point
   */
  isWithinRadius(
    center: IGeoLocation | { latitude: number; longitude: number },
    point: IGeoLocation | { latitude: number; longitude: number },
    radiusInKm: number
  ): boolean {
    const distance = this.calculateDistance(center, point);
    return distance <= radiusInKm;
  }

  /**
   * Convert GeoJSON to simple {latitude, longitude} format
   */
  geoJsonToLatLng(geoJson: IGeoLocation): { latitude: number; longitude: number } {
    return {
      latitude: geoJson.coordinates[1],
      longitude: geoJson.coordinates[0],
    };
  }

  /**
   * Convert {latitude, longitude} to GeoJSON format
   */
  latLngToGeoJson(lat: number, lng: number): IGeoLocation {
    return {
      type: 'Point',
      coordinates: [lng, lat],
    };
  }

  /**
   * Get distance matrix from Google Maps API
   * Useful for calculating travel time and distance by road
   */
  async getDistanceMatrix(
    origins: string[],
    destinations: string[]
  ): Promise<any> {
    try {
      if (!process.env.GOOGLE_MAPS_API_KEY) {
        logger.warn('Google Maps API key not configured');
        return null;
      }

      const response = await this.googleMapsClient.distancematrix({
        params: {
          origins,
          destinations,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('❌ Distance matrix error:', error);
      return null;
    }
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  /**
   * Format distance for display
   */
  formatDistance(distanceInKm: number): string {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)} m`;
    }
    return `${distanceInKm.toFixed(1)} km`;
  }
}

export default new LocationService();
