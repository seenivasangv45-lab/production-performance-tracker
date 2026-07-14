import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { DashboardView } from './components/DashboardView';
import { ProductivityView } from './components/ProductivityView';
import { QualityView } from './components/QualityView';
import { ShrinkageView } from './components/ShrinkageView';
import { EmployeeMatrixView } from './components/EmployeeMatrixView';
import { RampUpRuleView } from './components/RampUpRuleView';
import { BulkUploadView } from './components/BulkUploadView';
import { TicketsView } from './components/TicketsView';
import { ClipboardList, TrendingUp, AlertTriangle, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LoginView } from './components/LoginView';

import { 
  BarChart2, ShieldCheck, Clock, Users, Award, Database, Compass, CheckCircle, Calendar
} from 'lucide-react';

type PageID = 'dashboard' | 'productivity' | 'quality' | 'shrinkage' | 'employees' | 'rampUp' | 'upload' | 'tickets';

function HeaderClock() {
  const [currentTime, setCurrentTime] = useState<Date>(() => {
    return new Date('2026-06-30T11:00:00Z');
  });

  useEffect(() => {
    const startTime = Date.now();
    const baseTime = new Date('2026-06-30T11:00:00Z').getTime();
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setCurrentTime(new Date(baseTime + elapsed));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const formatUTC = (date: Date) => {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    
    let hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    
    return `TIME: ${yyyy}-${mm}-${dd} ${strHours}:${minutes}:${seconds} ${ampm} UTC`;
  };

  return (
    <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-md border border-slate-200 font-mono text-3xs">
      <Calendar className="w-3.5 h-3.5 text-slate-400" />
      <span className="font-bold">{formatUTC(currentTime)}</span>
    </div>
  );
}

function MainAppContent() {
  const { alertModal, closeAlert, currentUser, currentUserRole, setCurrentUserRole, logoutUser } = useApp();
  const [activePage, setActivePage] = useState<PageID>('dashboard');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 antialiased" id="app_root">
      
      {/* Spacer to prevent sidebar from pushing content when fixed */}
      <div className={`hidden md:block shrink-0 transition-all duration-300 ease-in-out ${
        isSidebarHovered ? 'w-64' : 'w-16'
      }`} />

      {/* Navigation Sidebar */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`w-full md:fixed md:top-0 md:left-0 md:h-screen md:z-50 bg-slate-900 flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-800 transition-all duration-300 ease-in-out shadow-2xl ${
          isSidebarHovered ? 'md:w-64' : 'md:w-16'
        }`} 
        id="sidebar_nav"
      >
        <div className="flex flex-col h-full w-full overflow-hidden">
          {/* Sidebar Header / Brand Logo */}
          <div className={`border-b border-slate-800 bg-slate-950 flex items-center transition-all duration-300 ${
            isSidebarHovered ? 'p-5 gap-3' : 'p-3.5 justify-center'
          }`}>
            <div className="w-9 h-9 rounded-xl border border-amber-500 bg-gradient-to-br from-[#f2ab35] to-[#cf5114] flex items-center justify-center text-white shrink-0 shadow-sm font-black text-lg select-none">
              P
            </div>
            {isSidebarHovered && (
              <div className="flex flex-col min-w-0 transition-all duration-300">
                <h1 className="text-white font-black text-[11px] tracking-tight uppercase leading-none">
                  Performance
                </h1>
                <h1 className="text-white font-black text-[11px] tracking-tight uppercase leading-none mt-0.5">
                  Management System
                </h1>
                <p className="text-[#f2ab35] text-[9px] font-black uppercase tracking-wider mt-1 font-mono">
                  Performance Tracker
                </p>
              </div>
            )}
          </div>

          {/* Sidebar Navigation Options */}
          <nav className={`flex-1 py-4 space-y-1 overflow-y-auto transition-all duration-300 ${
            isSidebarHovered ? 'px-3' : 'px-2'
          }`}>
            {isSidebarHovered && (
              <span className="text-[9px] text-[#f2ab35]/80 font-black uppercase tracking-widest block px-3 mb-2 font-mono truncate">
                OPERATIONS WORKSPACES
              </span>
            )}
            
            <button
              onClick={() => setActivePage('dashboard')}
              className={`w-full flex items-center transition-all cursor-pointer ${
                isSidebarHovered ? 'gap-3 px-3 py-2.5 text-xs font-semibold rounded-md' : 'justify-center p-2.5 rounded-xl'
              } ${
                activePage === 'dashboard'
                  ? 'bg-gradient-to-r from-[#f2ab35] via-[#ec6b1e] to-[#cf5114] text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Dashboard"
            >
              <BarChart2 className="w-5 h-5 shrink-0" />
              {isSidebarHovered && <span className="truncate">Dashboard</span>}
            </button>
            
            <button
              onClick={() => setActivePage('productivity')}
              className={`w-full flex items-center transition-all cursor-pointer ${
                isSidebarHovered ? 'gap-3 px-3 py-2.5 text-xs font-semibold rounded-md' : 'justify-center p-2.5 rounded-xl'
              } ${
                activePage === 'productivity'
                  ? 'bg-gradient-to-r from-[#f2ab35] via-[#ec6b1e] to-[#cf5114] text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Productivity"
            >
              <Award className="w-5 h-5 shrink-0" />
              {isSidebarHovered && <span className="truncate">Productivity</span>}
            </button>
            
            <button
              onClick={() => setActivePage('quality')}
              className={`w-full flex items-center transition-all cursor-pointer ${
                isSidebarHovered ? 'gap-3 px-3 py-2.5 text-xs font-semibold rounded-md' : 'justify-center p-2.5 rounded-xl'
              } ${
                activePage === 'quality'
                  ? 'bg-gradient-to-r from-[#f2ab35] via-[#ec6b1e] to-[#cf5114] text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Quality Accuracy"
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              {isSidebarHovered && <span className="truncate">Quality Accuracy</span>}
            </button>
            
            <button
              onClick={() => setActivePage('shrinkage')}
              className={`w-full flex items-center transition-all cursor-pointer ${
                isSidebarHovered ? 'gap-3 px-3 py-2.5 text-xs font-semibold rounded-md' : 'justify-center p-2.5 rounded-xl'
              } ${
                activePage === 'shrinkage'
                  ? 'bg-gradient-to-r from-[#f2ab35] via-[#ec6b1e] to-[#cf5114] text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Shrinkage Tracker"
            >
              <Clock className="w-5 h-5 shrink-0" />
              {isSidebarHovered && <span className="truncate">Shrinkage Tracker</span>}
            </button>

            <div className="pt-4 border-t border-slate-800/60 my-2" />
            
            {isSidebarHovered && (
              <span className="text-[9px] text-[#f2ab35]/80 font-black uppercase tracking-widest block px-3 mb-2 font-mono truncate">
                DIRECTORY & STRATEGY
              </span>
            )}
            
            <button
              onClick={() => setActivePage('employees')}
              className={`w-full flex items-center transition-all cursor-pointer ${
                isSidebarHovered ? 'gap-3 px-3 py-2.5 text-xs font-semibold rounded-md' : 'justify-center p-2.5 rounded-xl'
              } ${
                activePage === 'employees'
                  ? 'bg-gradient-to-r from-[#f2ab35] via-[#ec6b1e] to-[#cf5114] text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Employee Matrix"
            >
              <Users className="w-5 h-5 shrink-0" />
              {isSidebarHovered && <span className="truncate">Employee Matrix</span>}
            </button>
            
            <button
              onClick={() => setActivePage('rampUp')}
              className={`w-full flex items-center transition-all cursor-pointer ${
                isSidebarHovered ? 'gap-3 px-3 py-2.5 text-xs font-semibold rounded-md' : 'justify-center p-2.5 rounded-xl'
              } ${
                activePage === 'rampUp'
                  ? 'bg-gradient-to-r from-[#f2ab35] via-[#ec6b1e] to-[#cf5114] text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Ramp-up Rules"
            >
              <Compass className="w-5 h-5 shrink-0" />
              {isSidebarHovered && <span className="truncate">Ramp-up Rules</span>}
            </button>

            <div className="pt-4 border-t border-slate-800/60 my-2" />
            
            {isSidebarHovered && (
              <span className="text-[9px] text-[#f2ab35]/80 font-black uppercase tracking-widest block px-3 mb-2 font-mono truncate">
                DATA GOVERNANCE
              </span>
            )}

            <button
              onClick={() => setActivePage('tickets')}
              className={`w-full flex items-center transition-all cursor-pointer ${
                isSidebarHovered ? 'gap-3 px-3 py-2.5 text-xs font-semibold rounded-md' : 'justify-center p-2.5 rounded-xl'
              } ${
                activePage === 'tickets'
                  ? 'bg-gradient-to-r from-[#f2ab35] via-[#ec6b1e] to-[#cf5114] text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Ticketing System"
            >
              <ClipboardList className="w-5 h-5 shrink-0" />
              {isSidebarHovered && <span className="truncate">Ticketing System</span>}
            </button>
          </nav>

          {/* Bulk Data Upload & Sign Out Footer */}
          <div className={`border-t border-slate-800 transition-all duration-300 flex flex-col gap-2 ${
            isSidebarHovered ? 'p-4' : 'p-2'
          }`}>
            <button
              onClick={() => setActivePage('upload')}
              className={`w-full rounded border transition-all flex items-center justify-center cursor-pointer ${
                isSidebarHovered ? 'py-2.5 px-3 gap-2 text-xs font-semibold' : 'p-2.5 rounded-xl'
              } ${
                activePage === 'upload'
                  ? 'bg-gradient-to-r from-[#f2ab35] via-[#ec6b1e] to-[#cf5114] text-white border-[#ec6b1e] shadow-md font-black'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title="Bulk Data Upload"
            >
              <Database className="w-5 h-5 text-[#f2ab35] shrink-0" />
              {isSidebarHovered && <span className="truncate">Bulk Data Upload</span>}
            </button>

            <button
              onClick={() => logoutUser()}
              className={`w-full rounded border border-slate-800/80 transition-all flex items-center justify-center cursor-pointer ${
                isSidebarHovered ? 'py-2 px-3 gap-2 text-xs font-extrabold' : 'p-2.5 rounded-xl'
              } bg-slate-900/60 text-rose-400 hover:text-rose-300 hover:bg-slate-800/80 hover:border-slate-700`}
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarHovered && <span className="truncate">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Dynamic Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 sticky top-0 z-40 shadow-xs" id="app_header">
          <div className="flex flex-col justify-center">
            <h2 className="text-xs md:text-sm font-black text-slate-900 tracking-tight leading-none uppercase font-mono">
              {activePage === 'dashboard' && 'Executive Dashboard'}
              {activePage === 'productivity' && 'Productivity Workspace'}
              {activePage === 'quality' && 'Quality Workspace'}
              {activePage === 'shrinkage' && 'Shrinkage & Leave Tracker'}
              {activePage === 'employees' && 'Employee Matrix'}
              {activePage === 'rampUp' && 'Ramp-up Target Rules'}
              {activePage === 'upload' && 'Bulk Spreadsheets Repository'}
              {activePage === 'tickets' && 'Audit Data Tickets'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 md:gap-5 text-xs text-slate-500">
            {/* Quick switcher dropdown */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200 select-none">
              <span className="text-[9px] font-black font-mono text-amber-700 uppercase tracking-wider hidden sm:inline">Active Role:</span>
              <select
                value={currentUserRole || 'User(Production)'}
                onChange={(e) => setCurrentUserRole(e.target.value)}
                className="bg-transparent font-black font-mono text-[10px] text-amber-800 focus:outline-none cursor-pointer border-none p-0 pr-5 uppercase select-none"
                id="header_role_switcher"
              >
                <option value="Admin">Admin</option>
                <option value="General Manager">General Manager</option>
                <option value="RCM Manager">RCM Manager</option>
                <option value="RM">Reporting Manager (RM)</option>
                <option value="LM">Line Manager (LM)</option>
                <option value="HR">HR</option>
                <option value="User(Production)">User (Production)</option>
              </select>
            </div>
            
            {/* Logged in info (role already shown in the Active Role badge) */}
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-black text-slate-800 uppercase leading-none">{currentUser}</span>
            </div>

            <HeaderClock />
          </div>
        </header>

        {/* Content Workspace */}
        <main className="p-6 overflow-y-auto flex-1 space-y-6" id="main_content_stage">
          {activePage === 'dashboard' && <DashboardView />}
          {activePage === 'productivity' && <ProductivityView />}
          {activePage === 'quality' && <QualityView />}
          {activePage === 'shrinkage' && <ShrinkageView />}
          {activePage === 'employees' && <EmployeeMatrixView />}
          {activePage === 'rampUp' && <RampUpRuleView />}
          {activePage === 'upload' && <BulkUploadView />}
          {activePage === 'tickets' && <TicketsView />}
        </main>
      </div>

      <AnimatePresence>
        {alertModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAlert}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden z-10"
              id="alert_modal_body"
            >
              {/* Top accent bar */}
              <div className="h-2 bg-gradient-to-r from-[#f2ab35] via-[#ec6b1e] to-[#cf5114]" />
              
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-50 rounded-xl text-rose-600 border border-rose-100 shrink-0">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-900 font-mono uppercase tracking-wider">
                      {alertModal.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed font-sans">
                      {alertModal.message}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={closeAlert}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] rounded-xl cursor-pointer uppercase tracking-wider font-mono shadow-xs transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-white font-sans" id="error_boundary_stage">
          <div className="max-w-xl w-full bg-slate-900 rounded-2xl border border-rose-500/30 p-8 shadow-2xl relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
            
            <h2 className="text-base font-black text-rose-500 uppercase tracking-wider font-mono flex items-center gap-2">
              ⚠️ Critical System Error Caught
            </h2>
            <p className="text-xs text-slate-300 mt-4 leading-relaxed font-semibold">
              The application encountered a runtime crash. This is typically caused by loading malformed CSV entries with mismatched column indices, unrecognized time structures, or corrupted browser storage.
            </p>
            
            <div className="mt-5 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[10px] text-rose-400 overflow-x-auto max-h-48 scrollbar-thin">
              <strong className="text-slate-400 text-3xs uppercase tracking-wider block mb-1">Diagnostics / Error Stack:</strong>
              <div className="whitespace-pre-wrap leading-normal">{this.state.error?.stack || this.state.error?.message || "Unknown error"}</div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-mono uppercase tracking-wider font-extrabold text-[10px] rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-rose-900/10"
              >
                Clear Cache & Restart App
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono uppercase tracking-wider font-extrabold text-[10px] rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Refresh Page Only
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

