import { Court, Coach, InventoryItem, PricingRule, Booking, PricingBreakdown } from '../types';

// --- Database Configuration ---
const DB_KEY = 'courtmaster_bookings_v1';

// --- Seed Data (Static Config for Venue) ---

const courts: Court[] = [
  { id: 'c1', name: 'Court A (Premium Indoor)', type: 'indoor', basePricePerHour: 25 },
  { id: 'c2', name: 'Court B (Standard Indoor)', type: 'indoor', basePricePerHour: 20 },
  { id: 'c3', name: 'Court C (Outdoor)', type: 'outdoor', basePricePerHour: 15 },
];

const coaches: Coach[] = [
  { id: 'ch1', name: 'Mike Ross', specialty: 'Advanced Tactics', hourlyRate: 30 },
  { id: 'ch2', name: 'Sarah Lee', specialty: 'Beginners & Kids', hourlyRate: 25 },
];

const inventory: InventoryItem[] = [
  { id: 'inv1', name: 'Pro Yonex Racket', totalStock: 10, pricePerSession: 5 },
  { id: 'inv2', name: 'Court Shoes (Pair)', totalStock: 5, pricePerSession: 8 },
  { id: 'inv3', name: 'Shuttlecock Tube', totalStock: 20, pricePerSession: 3 },
];

const pricingRules: PricingRule[] = [
  { 
    id: 'pr1', 
    name: 'Weekend Surcharge', 
    type: 'weekend', 
    modifier: 5, 
    isMultiplier: false,
    condition: { days: [0, 6] } 
  },
  { 
    id: 'pr2', 
    name: 'Peak Hour (6PM-9PM)', 
    type: 'peak_hour', 
    modifier: 1.25, 
    isMultiplier: true,
    condition: { startHour: 18, endHour: 21 } 
  },
];

// --- Active Data State ---
let bookings: Booking[] = [];
let subscribers: (() => void)[] = [];

// --- Persistence Layer ---
const loadData = () => {
    try {
        const stored = localStorage.getItem(DB_KEY);
        if (stored) {
            bookings = JSON.parse(stored);
            // Basic integrity check
            if (!Array.isArray(bookings)) {
                console.warn("[DB] Corrupt data detected, resetting DB.");
                bookings = [];
            } else {
                console.log(`[DB] Hydrated ${bookings.length} bookings.`);
            }
        }
    } catch (e) {
        console.error("[DB] Failed to load data", e);
        bookings = [];
    }
};

const saveData = () => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(bookings));
        notifySubscribers();
    } catch (e) {
        console.error("[DB] Failed to save data", e);
        alert("Database Error: Quota exceeded or storage unavailable.");
    }
};

const notifySubscribers = () => {
    subscribers.forEach(cb => cb());
};

// Initialize DB
loadData();

// Cross-tab synchronization
window.addEventListener('storage', (event) => {
    if (event.key === DB_KEY) {
        console.log("[DB] Syncing data from another tab...");
        loadData();
        notifySubscribers();
    }
});

// --- Logic Services ---

export const db = {
  // Listen for changes (React hook support)
  subscribe: (callback: () => void) => {
      subscribers.push(callback);
      return () => {
          subscribers = subscribers.filter(cb => cb !== callback);
      };
  },

  getCourts: () => courts,
  getCoaches: () => coaches,
  getInventory: () => inventory,
  getPricingRules: () => pricingRules,
  
  // Returns a copy to prevent direct mutation
  getBookings: () => [...bookings], 

  // Phase 3: The Availability Logic (The "Brain")
  checkAvailability: (
    date: string, 
    start: number, 
    end: number, 
    courtId: string | null,
    coachId: string | null,
    requestedResources: { itemId: string; quantity: number }[]
  ) => {
    // 1. Get all bookings for this specific time slot
    const overlappingBookings = bookings.filter(b => {
      if (b.date !== date || b.status === 'cancelled') return false;
      // Overlap formula: (StartA < EndB) and (EndA > StartB)
      return (start < b.endTime && end > b.startTime);
    });

    // 2. Check Court Availability
    if (courtId) {
      const isCourtTaken = overlappingBookings.some(b => b.courtId === courtId);
      if (isCourtTaken) return { available: false, reason: 'Court is already booked for this time.' };
    }

    // 3. Check Coach Availability
    if (coachId) {
      const isCoachTaken = overlappingBookings.some(b => b.coachId === coachId);
      if (isCoachTaken) return { available: false, reason: 'Coach is unavailable for this time.' };
    }

    // 4. Check Inventory Stock
    for (const req of requestedResources) {
      const item = inventory.find(i => i.id === req.itemId);
      if (!item) continue;

      const usedQuantity = overlappingBookings.reduce((sum, b) => {
        const res = b.resources.find(r => r.itemId === req.itemId);
        return sum + (res ? res.quantity : 0);
      }, 0);

      if (usedQuantity + req.quantity > item.totalStock) {
        return { available: false, reason: `Not enough ${item.name} available (Only ${item.totalStock - usedQuantity} left).` };
      }
    }

    return { available: true };
  },

  // Phase 4: The Pricing Engine
  calculatePrice: (
    courtId: string, 
    date: string, 
    start: number, 
    end: number,
    coachId: string | null,
    resources: { itemId: string; quantity: number }[]
  ): PricingBreakdown => {
    const court = courts.find(c => c.id === courtId);
    if (!court) throw new Error("Court not found");

    const duration = end - start;
    const dateObj = new Date(date);
    const day = dateObj.getDay(); 

    // Apply Rules
    let runningRate = court.basePricePerHour;
    const activeModifiers: { name: string; amount: number }[] = [];

    // Weekend Rule
    const weekendRule = pricingRules.find(r => r.type === 'weekend');
    if (weekendRule && weekendRule.condition?.days?.includes(day)) {
         const extra = weekendRule.modifier;
         runningRate += extra;
         activeModifiers.push({ name: 'Weekend Surcharge', amount: extra * duration });
    }

    let seatPrice = runningRate * duration;

    // Peak Hour Rule
    const peakRule = pricingRules.find(r => r.type === 'peak_hour');
    if (peakRule && ((start >= 18 && start < 21) || (end > 18 && end <= 21))) {
        const oldPrice = seatPrice;
        seatPrice *= peakRule.modifier;
        activeModifiers.push({ name: 'Peak Hour x' + peakRule.modifier, amount: seatPrice - oldPrice });
    }

    // Coach Fee
    let coachFee = 0;
    if (coachId) {
        const coach = coaches.find(c => c.id === coachId);
        if (coach) coachFee = coach.hourlyRate * duration;
    }

    // Resource Fee
    let resourceFee = 0;
    resources.forEach(r => {
        const item = inventory.find(i => i.id === r.itemId);
        if (item) resourceFee += item.pricePerSession * r.quantity;
    });

    return {
        basePrice: court.basePricePerHour * duration,
        modifiers: activeModifiers,
        coachFee,
        resourceFee,
        total: seatPrice + coachFee + resourceFee
    };
  },

  createBooking: (booking: Omit<Booking, 'id' | 'timestamp' | 'status' | 'pricing'>) => {
    // Verify availability one last time (Race condition check)
    const availability = db.checkAvailability(
        booking.date, 
        booking.startTime, 
        booking.endTime, 
        booking.courtId, 
        booking.coachId || null, 
        booking.resources
    );

    if (!availability.available) {
        throw new Error(availability.reason);
    }

    const pricing = db.calculatePrice(
        booking.courtId, 
        booking.date, 
        booking.startTime, 
        booking.endTime, 
        booking.coachId || null, 
        booking.resources
    );

    const newBooking: Booking = {
        ...booking,
        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
        timestamp: Date.now(),
        status: 'confirmed',
        pricing
    };

    bookings.push(newBooking);
    saveData(); 
    return newBooking;
  },

  deleteBooking: (bookingId: string) => {
      const initialLength = bookings.length;
      bookings = bookings.filter(b => b.id !== bookingId);
      if (bookings.length !== initialLength) {
          saveData();
          return true;
      }
      return false;
  },

  reset: () => {
      bookings = [];
      saveData();
  }
};