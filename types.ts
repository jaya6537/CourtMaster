import React from 'react';

// --- Domain Models ---

export interface Court {
  id: string;
  name: string;
  type: 'indoor' | 'outdoor';
  basePricePerHour: number;
}

export interface Coach {
  id: string;
  name: string;
  specialty: string;
  hourlyRate: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  totalStock: number;
  pricePerSession: number;
}

export interface PricingRule {
  id: string;
  name: string;
  type: 'weekend' | 'peak_hour' | 'holiday';
  modifier: number; // e.g., 1.5 for 50% increase, or 5 for flat $5 add
  isMultiplier: boolean;
  condition?: {
    days?: number[]; // 0=Sun, 6=Sat
    startHour?: number;
    endHour?: number;
  };
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  courtId: string;
  date: string; // ISO Date string YYYY-MM-DD
  startTime: number; // 24h format, e.g., 18 for 6PM
  endTime: number;
  coachId?: string;
  resources: {
    itemId: string;
    quantity: number;
  }[];
  pricing: PricingBreakdown;
  status: 'confirmed' | 'cancelled';
  timestamp: number;
}

export interface PricingBreakdown {
  basePrice: number;
  modifiers: { name: string; amount: number }[];
  coachFee: number;
  resourceFee: number;
  total: number;
}

// --- App State Interfaces ---

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export type BookingStep = 'date-select' | 'court-select' | 'extras-select' | 'review';
