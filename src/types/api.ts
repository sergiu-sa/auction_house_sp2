// API Response Types
export interface ApiResponse<T> {
  data: T;
  meta?: {
    isFirstPage: boolean;
    isLastPage: boolean;
    currentPage: number;
    previousPage: number | null;
    nextPage: number | null;
    pageCount: number;
    totalCount: number;
  };
}

export interface ApiError {
  errors: Array<{
    message: string;
    code?: string;
  }>;
  status: string;
  statusCode: number;
}

// Authentication Types
export interface LoginResponse {
  data: {
    name: string;
    email: string;
    bio: string | null;
    avatar: MediaObject | null;
    banner: MediaObject | null;
    credits: number;
    accessToken: string;
  };
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Media Object
export interface MediaObject {
  url: string;
  alt?: string;
}

// User/Profile Types
export interface User {
  name: string;
  email: string;
  bio?: string | null;
  avatar?: MediaObject | null;
  banner?: MediaObject | null;
  credits?: number;
  _count?: {
    listings: number;
    wins: number;
  };
}

export interface Profile extends User {
  listings?: Listing[];
  wins?: Listing[];
}

// Listing Types
export interface Listing {
  id: string;
  title: string;
  description?: string;
  media?: MediaObject[];
  tags?: string[];
  created: string;
  updated: string;
  endsAt: string;
  _count?: {
    bids: number;
  };
  bids?: Bid[];
  seller?: User;
}

export interface CreateListingData {
  title: string;
  description?: string;
  tags?: string[];
  media?: MediaObject[];
  endsAt: string;
}

export interface UpdateListingData {
  title?: string;
  description?: string;
  tags?: string[];
  media?: MediaObject[];
}

// Bid Types
export interface Bid {
  id: string;
  amount: number;
  bidder?: User;
  created: string;
  listing?: Listing;
}

export interface CreateBidData {
  amount: number;
}

// Profile Update Types
export interface UpdateProfileData {
  bio?: string;
  avatar?: MediaObject;
  banner?: MediaObject;
}
