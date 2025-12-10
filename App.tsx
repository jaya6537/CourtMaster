import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Zap } from 'lucide-react';
import { BookingSystem } from './components/BookingSystem';
import { AdminPanel } from './components/AdminPanel';
import { AICounselor } from './components/AICounselor';

const Navbar: React.FC = () => {
  const location = useLocation();
  
  return (
    <nav className="bg-slate-900 text-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
           <Zap className="w-6 h-6 text-neon-400 group-hover:scale-110 transition-transform" />
           <span className="text-xl font-bold font-display tracking-tight text-white">COURT<span className="text-neon-400">MASTER</span></span>
        </Link>
        
        <div className="flex space-x-6">
           <Link to="/" className={`flex items-center gap-2 text-sm font-medium hover:text-neon-400 transition ${location.pathname === '/' ? 'text-neon-400' : 'text-slate-300'}`}>
              <CalendarDays className="w-4 h-4" /> Book Now
           </Link>
           <Link to="/admin" className={`flex items-center gap-2 text-sm font-medium hover:text-neon-400 transition ${location.pathname === '/admin' ? 'text-neon-400' : 'text-slate-300'}`}>
              <LayoutDashboard className="w-4 h-4" /> Admin
           </Link>
        </div>
      </div>
    </nav>
  );
};

const BookingPage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8 items-start mb-10">
                <div className="flex-1">
                     <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-display mb-2">Book Your Slot</h1>
                     <p className="text-slate-600">Select a time, choose your court, and customize your game with pro equipment.</p>
                </div>
                <div className="w-full md:w-80">
                     <div className="bg-brand-50 border border-brand-100 p-4 rounded-xl flex items-start gap-3">
                        <div className="p-2 bg-brand-100 rounded-lg">
                            <Zap className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-brand-900 text-sm">Dynamic Pricing Active</h4>
                            <p className="text-xs text-brand-700 mt-1">Rates vary based on time (Peak Hours 6-9 PM) and weekends.</p>
                        </div>
                     </div>
                </div>
            </div>
            
            <BookingSystem />

            <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-slate-200 pt-12">
                <div>
                     <h3 className="text-xl font-bold font-display text-slate-900 mb-4">Need Help?</h3>
                     <p className="text-slate-600 mb-6">Not sure which court is right for you? Ask our AI assistant for details about court surfaces, coaching availability, and pricing rules.</p>
                </div>
                <div>
                    <AICounselor />
                </div>
            </div>
        </div>
    );
};

const AdminPage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <AdminPanel />
        </div>
    );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<BookingPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
        <footer className="bg-white border-t border-slate-200 py-8 mt-20">
            <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
                &copy; {new Date().getFullYear()} CourtMaster Sports Facility. All rights reserved.
            </div>
        </footer>
      </div>
    </HashRouter>
  );
};

export default App;