/**
 * Store Type Definitions
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface OperatingHours {
  [day: string]: {
    openTime: string;
    closeTime: string;
  };
}

export interface Store {
  _id: string;
  name: string;
  description?: string;
  location: GeoLocation;
  address: Address;
  operatingHours?: OperatingHours;
  rating: number;
  reviewCount: number;
  deliveryRadius: number;
  isOpen: boolean;
  distance?: number;
  formattedDistance?: string;
  productsCount?: number;
  email?: string;
  phone?: string;
}

export interface StoreFilters {
  category?: string;
  minRating?: number;
  openNow?: boolean;
  radius?: number;
}

export interface StoreSearchParams {
  latitude: number;
  longitude: number;
  radius?: number;
  query?: string;
  category?: string;
  minRating?: number;
  openNow?: boolean;
  sortBy?: 'distance' | 'rating' | 'name';
}

export interface NearbyStoresResponse {
  success: boolean;
  data: {
    stores: Store[];
    total: number;
    userLocation: GeoLocation;
    searchRadius: number;
  };
}

export interface StoreDetailResponse {
  success: boolean;
  data: {
    store: Store;
  };
}
