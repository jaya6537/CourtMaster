import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Booking } from '../types';
import { Database, Trash2, RefreshCw, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

export const AdminPanel: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [activeTab, setActiveTab] = useState<'bookings' | 'settings'>('bookings');
    const [isLoading, setIsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // Stores 'reset' or booking ID

    const refreshData = () => {
        setIsLoading(true);
        // Simulate network delay for realistic feel
        setTimeout(() => {
            setBookings(db.getBookings());
            setIsLoading(false);
        }, 500);
    };

    useEffect(() => {
        refreshData();
        // Subscribe to DB changes (e.g. from other tabs or internal updates)
        const unsubscribe = db.subscribe(() => {
            refreshData(); // Refresh triggers the loading state for visual feedback on update
        });
        return unsubscribe;
    }, []);

    const handleReset = async () => {
        if (confirm('Are you sure you want to delete all bookings? This cannot be undone.')) {
            setActionLoading('reset');
            await new Promise(resolve => setTimeout(resolve, 800));
            db.reset();
            refreshData();
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm(`Cancel booking ${id}?`)) {
            setActionLoading(id);
            await new Promise(resolve => setTimeout(resolve, 600));
            db.deleteBooking(id);
            setActionLoading(null);
            // Don't need explicit refresh here as subscribe will catch it, 
            // but for instant feedback in single-threaded context we can leave it to the subscription
        }
    };

    const totalRevenue = bookings.reduce((sum, b) => sum + b.pricing.total, 0);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[600px]">
            <div className="border-b border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-display text-slate-900">Admin Dashboard</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs font-medium text-green-700">
                            <Database className="w-3 h-3" />
                            <span>Browser DB Connected</span>
                        </div>
                        <span className="text-slate-400 text-xs">|</span>
                        <span className="text-slate-500 text-xs">LocalStorage Persistence Active</span>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button 
                         onClick={refreshData}
                         disabled={isLoading}
                         className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50"
                         title="Refresh Data"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
                    </button>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('bookings')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'bookings' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Bookings
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'settings' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Config
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {activeTab === 'bookings' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-brand-50 p-6 rounded-xl border border-brand-100">
                                <div className="text-brand-600 font-medium text-sm mb-1">Total Bookings</div>
                                <div className="text-3xl font-bold text-brand-900">{bookings.length}</div>
                            </div>
                            <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                                <div className="text-green-600 font-medium text-sm mb-1">Total Revenue</div>
                                <div className="text-3xl font-bold text-green-900">${totalRevenue.toFixed(2)}</div>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                                <div className="text-purple-600 font-medium text-sm mb-1">Active Resources</div>
                                <div className="text-3xl font-bold text-purple-900">{db.getCourts().length}</div>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-slate-700">ID</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Time</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Court</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Extras</th>
                                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Amount</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {bookings.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-8 text-slate-500">No bookings found in database</td></tr>
                                    ) : (
                                        bookings.map(b => {
                                            const courtName = db.getCourts().find(c => c.id === b.courtId)?.name;
                                            return (
                                                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-slate-500">{b.id}</td>
                                                    <td className="px-4 py-3 text-slate-900">{b.date}</td>
                                                    <td className="px-4 py-3 text-slate-900">{b.startTime}:00 - {b.endTime}:00</td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">{courtName}</td>
                                                    <td className="px-4 py-3 text-slate-500">
                                                        {b.coachId ? 'Coach, ' : ''}
                                                        {b.resources.length > 0 ? `${b.resources.reduce((a,c) => a+c.quantity, 0)} items` : ''}
                                                        {!b.coachId && b.resources.length === 0 ? '-' : ''}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-900">${b.pricing.total.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button 
                                                            onClick={() => handleDelete(b.id)}
                                                            disabled={!!actionLoading}
                                                            className="text-slate-400 hover:text-red-600 transition p-1 disabled:opacity-30"
                                                            title="Cancel Booking"
                                                        >
                                                            {actionLoading === b.id ? (
                                                                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                                                            ) : (
                                                                <XCircle className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Simulated Admin Actions (Authorized)</span>
                            </div>
                            <button 
                                onClick={handleReset}
                                disabled={!!actionLoading}
                                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                            >
                                {actionLoading === 'reset' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                Reset Database
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-xl">
                        <h3 className="font-bold text-slate-900 mb-4">Pricing Rules Configuration</h3>
                        <div className="space-y-3">
                            {db.getPricingRules().map(rule => (
                                <div key={rule.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <div>
                                        <div className="font-bold text-slate-800">{rule.name}</div>
                                        <div className="text-xs text-slate-600 uppercase">{rule.type}</div>
                                    </div>
                                    <div className="px-3 py-1 bg-white rounded border border-slate-200 font-mono text-sm text-slate-700">
                                        {rule.isMultiplier ? `x${rule.modifier}` : `+$${rule.modifier}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-xs text-slate-500">
                            * Configuration is read-only in this demo version.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};