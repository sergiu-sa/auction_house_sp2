// User types
export interface User {
  name: string
  email: string
  avatar?: string
  banner?: string
  bio?: string
  credits: number
}

// Listing types
export interface Listing {
  id: string
  title: string
  description: string
  media: string[]
  created: string
  updated: string
  endsAt: string
  seller: User
  bids: Bid[]
}

// Bid types
export interface Bid {
  id: string
  amount: number
  bidder: User
  created: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}
