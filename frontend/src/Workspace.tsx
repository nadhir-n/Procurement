import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Sidebar } from './WorkspaceSidebar';
import { HomeView } from './HomeView';

export default function Workspace() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [wsUser, setWsUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'home');

  // Wait for auth to resolve, then pull user data (supports late demo restore)
  useEffect(() => {
    if (!user) return;
    setWsUser({
      name: user.email?.split('@')[0] || user.name || 'U',
      orgName: location.state?.orgName || user.orgName || 'Workspace',
    });
  }, [user, location.state]);

  // If not authenticated, redirect to sign-in
  if (loading) return null;
  if (!user && !wsUser) {
    navigate('/signin', { replace: true });
    return null;
  }

  if (!wsUser) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#144e3c] flex items-center justify-center text-white animate-pulse"/>
          <div className="w-8 h-8 rounded-lg bg-[#144e3c] flex items-center justify-center text-white animate-pulse" style={{ animationDelay: '0.2s' }}/>
          <div className="w-8 h-8 rounded-lg bg-[#144e3c] flex items-center justify-center text-white animate-pulse" style={{ animationDelay: '0.4s' }}/>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8faf9]">
      <Sidebar
        active={activeTab}
        setActive={(tab: string) => { setActiveTab(tab); navigate(`/workspace`, { state: { activeTab: tab } }); }}
        collapsed={!sidebarOpen}
        setCollapsed={setSidebarOpen}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 lg:px-8 gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              {activeTab === 'home' ? 'Home' :
              activeTab === 'requests' ? 'My Requests' :
              activeTab === 'approvals' ? 'Approvals' :
              activeTab === 'items' ? 'Items' :
              activeTab === 'vendors' ? 'Vendors' :
              activeTab === 'procurement' ? 'Procurement' :
              activeTab === 'payables' ? 'Payables' :
              activeTab === 'pr' ? 'Purchase Requests' :
              activeTab === 'rfq' ? 'Request for Quotes' :
              activeTab === 'po' ? 'Purchase Orders' :
              activeTab === 'receives' ? 'Purchase Receives' :
              activeTab === 'bills' ? 'Bills' :
              activeTab === 'recurring' ? 'Recurring Bills' :
              activeTab === 'payments' ? 'Payments Made' :
              'Dashboard'}
            </h1>
            {user?.demo && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#2084FA] to-[#7F3EDD] text-white text-[10px] font-bold tracking-wider">DEMO</span>
            )}
          </div>
          <div className="flex-1"/>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <input className="h-9 pl-9 pr-8 rounded-lg bg-slate-50 border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#144e3c]/20 focus:border-[#144e3c] transition-all w-56" placeholder="Search modules and workspaces"/>
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-100 border border-slate-200">⌘K</kbd>
            </div>
            <button className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <button className="relative w-9 h-9 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">3</span>
            </button>
            <button className="w-9 h-9 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M19.4 15a1.65 1.65 0 00.36 1.81l.04.06a1.65 1.65 0 001.13 1.16l.06.04a1.65 1.65 0 001.81.36l.14-.02a1.65 1.65 0 001.69-1.69l.02-.14a1.65 1.65 0 00.36-1.81l.06-.04a1.65 1.65 0 00-.16-1.16l-.04-.06a1.65 1.65 0 00-1.13-1.16l-.06-.04a1.65 1.65 0 00-1.81-.36l-.14.02a1.65 1.65 0 00-1.69 1.69l-.02.14a1.65 1.65 0 00-.36 1.81l-.06.04a1.65 1.65 0 00.16 1.16l.04.06a1.65 1.65 0 001.13 1.16l.06.04a1.65 1.65 0 001.81.36l.14-.02z" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
            <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold">
              {wsUser.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <HomeView user={wsUser} />
        </div>
      </main>
    </div>
  );
}
