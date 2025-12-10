import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Court, Coach, InventoryItem, Booking, PricingBreakdown } from '../types';
import { Calendar, Clock, User, Zap, ChevronRight, CheckCircle, AlertCircle, DollarSign, Package } from 'lucide-react';

export const BookingSystem: React.FC = () => {
  // State
  const [step, setStep] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
  const [selectedResources, setSelectedResources] = useState<{ [key: string]: number }>({});
  const [bookingSuccess, setBookingSuccess] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Computed Pricing
  const [currentPrice, setCurrentPrice] = useState<PricingBreakdown | null>(null);

  // Data
  const courts = db.getCourts();
  const coaches = db.getCoaches();
  const inventory = db.getInventory();
  const timeSlots = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM (21:00)

  useEffect(() => {
    if (selectedCourt && selectedTime) {
      const resourceArray = Object.entries(selectedResources).map(([id, qty]) => ({ itemId: id, quantity: qty as number }));
      const price = db.calculatePrice(
        selectedCourt,
        selectedDate,
        selectedTime,
        selectedTime + 1, // Assume 1 hour slots for simplicity
        selectedCoach,
        resourceArray
      );
      setCurrentPrice(price);
    }
  }, [selectedCourt, selectedTime, selectedDate, selectedCoach, selectedResources]);

  const handleBooking = () => {
    if (!selectedCourt || !selectedTime) return;
    setError(null);

    try {
      const resourceArray = Object.entries(selectedResources).map(([id, qty]) => ({ itemId: id, quantity: qty as number }));
      
      const newBooking = db.createBooking({
        userId: 'guest-123',
        userName: 'Guest User', // In real app, from auth
        courtId: selectedCourt,
        date: selectedDate,
        startTime: selectedTime,
        endTime: selectedTime + 1,
        coachId: selectedCoach || undefined,
        resources: resourceArray
      });

      setBookingSuccess(newBooking);
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getSlotAvailability = (time: number, courtId?: string) => {
      // Check general availability for this slot
      // If we are in step 1 (picking time), we check if ANY court is free
      // If we are in step 2 (picking court), we check if THAT court is free
      const result = db.checkAvailability(
          selectedDate, 
          time, 
          time + 1, 
          courtId || null, 
          null, 
          []
      );
      return result.available;
  };

  if (bookingSuccess) {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-2xl mx-auto border border-slate-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2 font-display">Booking Confirmed!</h2>
        <p className="text-slate-600 mb-8">Your court has been reserved. Reference ID: <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-900 border border-slate-200">{bookingSuccess.id}</span></p>
        
        <div className="bg-slate-50 p-6 rounded-xl text-left space-y-3 mb-8 border border-slate-200 text-slate-900">
           <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-semibold text-slate-900">{bookingSuccess.date}</span>
           </div>
           <div className="flex justify-between">
              <span className="text-slate-500">Time</span>
              <span className="font-semibold text-slate-900">{bookingSuccess.startTime}:00 - {bookingSuccess.endTime}:00</span>
           </div>
           <div className="flex justify-between border-t border-slate-200 pt-3 mt-3">
              <span className="text-slate-900 font-bold">Total Paid</span>
              <span className="text-brand-600 font-bold text-xl">${bookingSuccess.pricing.total.toFixed(2)}</span>
           </div>
        </div>

        <button 
          onClick={() => {
              setBookingSuccess(null);
              setStep(1);
              setSelectedTime(null);
              setSelectedCourt(null);
              setSelectedCoach(null);
              setSelectedResources({});
          }}
          className="bg-brand-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-brand-700 transition"
        >
          Book Another Session
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Selection Flow */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Step 1: Date & Time */}
        <div className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${step === 1 ? 'border-brand-500 ring-4 ring-brand-50/50' : 'border-transparent'}`}>
            <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setStep(1)}>
                <h3 className="text-lg font-bold font-display flex items-center gap-2 text-slate-900">
                    <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-bold">1</span>
                    Select Date & Time
                </h3>
                {step > 1 && <CheckCircle className="text-green-500 w-5 h-5" />}
            </div>
            
            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-top-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 bg-white placeholder:text-slate-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Available Slots (1 Hour)</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {timeSlots.map(time => {
                                const isAvailable = getSlotAvailability(time); // Check generic availability
                                return (
                                    <button
                                        key={time}
                                        disabled={!isAvailable}
                                        onClick={() => setSelectedTime(time)}
                                        className={`p-2 rounded-lg text-sm font-medium border transition-all ${
                                            selectedTime === time 
                                            ? 'bg-brand-600 text-white border-brand-600' 
                                            : isAvailable 
                                                ? 'bg-white border-slate-200 hover:border-brand-300 text-slate-700' 
                                                : 'bg-slate-100 text-slate-500 border-slate-100 cursor-not-allowed opacity-70'
                                        }`}
                                    >
                                        {time}:00
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button 
                            disabled={!selectedTime}
                            onClick={() => setStep(2)}
                            className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            Next Step <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Step 2: Court Selection */}
        <div className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${step === 2 ? 'border-brand-500 ring-4 ring-brand-50/50' : 'border-transparent'}`}>
            <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => step > 2 && setStep(2)}>
                 <h3 className="text-lg font-bold font-display flex items-center gap-2 text-slate-900">
                    <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-bold">2</span>
                    Choose Court
                </h3>
                {step > 2 && <CheckCircle className="text-green-500 w-5 h-5" />}
            </div>

            {step === 2 && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                    {courts.map(court => {
                        const isAvailable = getSlotAvailability(selectedTime!, court.id);
                        return (
                            <div 
                                key={court.id}
                                onClick={() => isAvailable && setSelectedCourt(court.id)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                                    selectedCourt === court.id
                                    ? 'border-brand-500 bg-brand-50'
                                    : isAvailable 
                                        ? 'border-slate-100 hover:border-brand-200 bg-white'
                                        : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${court.type === 'indoor' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                        {court.type === 'indoor' ? <Package className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{court.name}</h4>
                                        <p className="text-sm text-slate-500">${court.basePricePerHour}/hour • {court.type === 'indoor' ? 'A/C Indoor' : 'Open Air'}</p>
                                    </div>
                                </div>
                                {!isAvailable && <span className="text-xs font-bold text-red-600 uppercase">Booked</span>}
                            </div>
                        );
                    })}
                     <div className="flex justify-end pt-4 gap-3">
                        <button onClick={() => setStep(1)} className="text-slate-500 font-medium px-4 hover:text-slate-700">Back</button>
                        <button 
                            disabled={!selectedCourt}
                            onClick={() => setStep(3)}
                            className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            Next Step <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Step 3: Resources */}
        <div className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${step === 3 ? 'border-brand-500 ring-4 ring-brand-50/50' : 'border-transparent'}`}>
             <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-bold font-display flex items-center gap-2 text-slate-900">
                    <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-bold">3</span>
                    Add Extras (Optional)
                </h3>
            </div>

            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-top-2">
                    {/* Coaches */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Select Coach</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div 
                                onClick={() => setSelectedCoach(null)}
                                className={`p-4 rounded-xl border-2 cursor-pointer text-center ${!selectedCoach ? 'border-brand-500 bg-brand-50 text-slate-900' : 'border-slate-100 text-slate-600'}`}
                            >
                                <span className="font-medium">No Coach</span>
                            </div>
                            {coaches.map(coach => (
                                <div 
                                    key={coach.id}
                                    onClick={() => setSelectedCoach(coach.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 ${selectedCoach === coach.id ? 'border-brand-500 bg-brand-50' : 'border-slate-100'}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-sm text-slate-900">{coach.name}</div>
                                        <div className="text-xs text-slate-500">{coach.specialty} (+${coach.hourlyRate})</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Inventory */}
                    <div>
                         <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Rent Equipment</h4>
                         <div className="space-y-3">
                            {inventory.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white rounded shadow-sm flex items-center justify-center border border-slate-200">
                                            <Package className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{item.name}</div>
                                            <div className="text-xs text-slate-500">${item.pricePerSession}/session • {item.totalStock} left</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setSelectedResources(prev => ({...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1)}))}
                                            className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center hover:bg-slate-100 border border-slate-200 text-slate-700"
                                        >-</button>
                                        <span className="font-mono font-bold w-4 text-center text-slate-900">{selectedResources[item.id] || 0}</span>
                                        <button 
                                            onClick={() => setSelectedResources(prev => ({...prev, [item.id]: (prev[item.id] || 0) + 1}))}
                                            className="w-8 h-8 rounded bg-white shadow-sm flex items-center justify-center hover:bg-slate-100 border border-slate-200 text-slate-700"
                                        >+</button>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>

                    <div className="flex justify-end pt-4 gap-3">
                        <button onClick={() => setStep(2)} className="text-slate-500 font-medium px-4 hover:text-slate-700">Back</button>
                        <button 
                            onClick={handleBooking}
                            className="bg-brand-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        >
                            Confirm Booking <CheckCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Right Column: Price Summary */}
      <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 text-white p-4">
                  <h3 className="font-bold font-display text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-neon-400" /> Live Price
                  </h3>
              </div>
              <div className="p-6 space-y-4">
                  {!selectedCourt || !selectedTime ? (
                      <div className="text-center py-8 text-slate-500 text-sm">
                          Select a date, time, and court to see pricing.
                      </div>
                  ) : currentPrice ? (
                      <>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Base Price</span>
                                <span className="text-slate-900 font-medium">${currentPrice.basePrice.toFixed(2)}</span>
                            </div>
                            
                            {/* Modifiers */}
                            {currentPrice.modifiers.map((mod, i) => (
                                <div key={i} className="flex justify-between text-amber-700 bg-amber-50 px-2 py-1 rounded">
                                    <span>{mod.name}</span>
                                    <span>+${mod.amount.toFixed(2)}</span>
                                </div>
                            ))}

                            {/* Coach */}
                            {currentPrice.coachFee > 0 && (
                                <div className="flex justify-between text-purple-700">
                                    <span>Coach Fee</span>
                                    <span>+${currentPrice.coachFee.toFixed(2)}</span>
                                </div>
                            )}

                             {/* Resources */}
                             {currentPrice.resourceFee > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span>Equipment</span>
                                    <span>+${currentPrice.resourceFee.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-dashed border-slate-300 pt-4 mt-2">
                             <div className="flex justify-between items-end">
                                <span className="text-slate-500 font-medium">Total</span>
                                <span className="text-3xl font-bold text-slate-900 font-display">${currentPrice.total.toFixed(2)}</span>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}
                      </>
                  ) : null}
              </div>
          </div>
      </div>
    </div>
  );
};