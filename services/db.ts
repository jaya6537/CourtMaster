import { Court, Coach, InventoryItem, PricingRule, Booking, PricingBreakdown } from '../types';

// --- Seed Data ---

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

// --- In-Memory Database State ---
let bookings: Booking[] = [];

// --- Logic Services (Simulating Backend Controllers) ---

export const db = {
  getCourts: () => courts,
  getCoaches: () => coaches,
  getInventory: () => inventory,
  getPricingRules: () => pricingRules,
  getBookings: () => bookings,

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
    let basePrice = court.basePricePerHour * duration;
    const modifiers: { name: string; amount: number }[] = [];
    const dateObj = new Date(date);
    const day = dateObj.getDay(); // 0-6 (Sun-Sat) Note: String date parsing might need adjustment based on timezone, assuming local for simplified demo

    // Apply Rules
    let currentHourlyRate = court.basePricePerHour;
    
    // Check Weekend
    const weekendRule = pricingRules.find(r => r.type === 'weekend');
    if (weekendRule && weekendRule.condition?.days?.includes(day)) {
        if (weekendRule.isMultiplier) {
            currentHourlyRate *= weekendRule.modifier;
            modifiers.push({ name: weekendRule.name, amount: (court.basePricePerHour * weekendRule.modifier - court.basePricePerHour) * duration });
        } else {
            currentHourlyRate += weekendRule.modifier;
            modifiers.push({ name: weekendRule.name, amount: weekendRule.modifier * duration });
        }
    }

    // Check Peak Hours (Simplified: if ANY part of booking touches peak)
    const peakRule = pricingRules.find(r => r.type === 'peak_hour');
    if (peakRule && peakRule.condition) {
        // Check overlap with peak window
        const pStart = peakRule.condition.startHour!;
        const pEnd = peakRule.condition.endHour!;
        // Simple logic: If booking starts or ends during peak
        if ((start >= pStart && start < pEnd) || (end > pStart && end <= pEnd)) {
             if (peakRule.isMultiplier) {
                 const increase = (basePrice * peakRule.modifier) - basePrice;
                 modifiers.push({ name: peakRule.name, amount: increase });
                 // Update base calculation for total
                 basePrice *= peakRule.modifier;
             }
        }
    }

    // Add Coach
    let coachFee = 0;
    if (coachId) {
        const coach = coaches.find(c => c.id === coachId);
        if (coach) coachFee = coach.hourlyRate * duration;
    }

    // Add Resources
    let resourceFee = 0;
    resources.forEach(r => {
        const item = inventory.find(i => i.id === r.itemId);
        if (item) resourceFee += item.pricePerSession * r.quantity;
    });

    // Re-calculate base total with modifiers added
    // Note: The logic above for modifiers was split for display. 
    // Let's do a simpler sum for the breakdown object.
    const total = basePrice + modifiers.reduce((acc, m) => acc + m.amount, 0) + coachFee + resourceFee;
    
    // Correction: The basePrice variable was mutated by peak multiplier.
    // Let's reset for the clean breakdown object.
    const cleanBase = court.basePricePerHour * duration;
    const totalModifiers = modifiers.reduce((acc, curr) => acc + curr.amount, 0);

    // If peak rule multiplied the base, the difference is the modifier amount.
    // If weekend added flat fee, that is the modifier amount.
    
    // Let's just trust the accumulated parts for the final sum
    // Total = (Base * Multipliers + FlatAdders) + Coach + Resources
    // My previous logic was slightly mixed. Let's strict sum:
    
    // Recalculate strictly:
    let runningRate = court.basePricePerHour;
    const activeModifiers: { name: string; amount: number }[] = [];

    // Weekend
    if (weekendRule && weekendRule.condition?.days?.includes(day)) {
         const extra = weekendRule.modifier; // Assuming flat fee for simplicity based on mock data (5)
         runningRate += extra;
         activeModifiers.push({ name: 'Weekend Surcharge', amount: extra * duration });
    }

    let seatPrice = runningRate * duration;

    // Peak Multiplier on the seat price
    if (peakRule && ((start >= 18 && start < 21) || (end > 18 && end <= 21))) {
        const oldPrice = seatPrice;
        seatPrice *= peakRule.modifier;
        activeModifiers.push({ name: 'Peak Hour x' + peakRule.modifier, amount: seatPrice - oldPrice });
    }

    return {
        basePrice: court.basePricePerHour * duration,
        modifiers: activeModifiers,
        coachFee,
        resourceFee,
        total: seatPrice + coachFee + resourceFee
    };
  },

  createBooking: (booking: Omit<Booking, 'id' | 'timestamp' | 'status' | 'pricing'>) => {
    // Final atomic check
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
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        status: 'confirmed',
        pricing
    };

    bookings.push(newBooking);
    return newBooking;
  }
};
