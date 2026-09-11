import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';
import { Sidebar } from './WorkspaceSidebar';
import { HomeView } from './HomeView';
import {
  Search, Plus, Bell, Settings, LayoutGrid, ChevronDown,
  Pin, MessageCircle, Tags, Megaphone, Mail,
} from 'lucide-react';

function titleFor(tab: string) {
  return tab === 'home' ? 'Home' :
    tab === 'requests' ? 'My Requests' :
    tab === 'approvals' ? 'Approvals' :
    tab === 'items' ? 'Items' :
    tab === 'vendors' ? 'Vendors' :
    tab === 'procurement' ? 'Procurement' :
    tab === 'payables' ? 'Payables' :
    tab === 'pr' ? 'Purchase Requests' :
    tab === 'rfq' ? 'Request for Quotes' :
    tab === 'po' ? 'Purchase Orders' :
    tab === 'receives' ? 'Purchase Receives' :
    tab === 'bills' ? 'Bills' :
    tab === 'recurring' ? 'Recurring Bills' :
    tab === 'payments' ? 'Payments Made' :
    tab === 'batch' ? 'Batch Payments' :
    tab === 'budgets' ? 'Budgets' :
    tab === 'analytics' ? 'Analytics' :
    'Dashboard';
}

export default function Workspace() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [wsUser, setWsUser] = useState<any>(null);
  const [navigating, setNavigating] = useState(false);

  const activeTab = (() => {
    const seg = location.pathname.split('/').pop() || '';
    if (location.pathname === '/workspace' || seg === 'workspace') return 'home';
    return seg;
  })();

  useEffect(() => {
    if (!user) return;
    setWsUser({
      name: user.email?.split('@')[0] || user.name || 'U',
      orgName: location.state?.orgName || user.orgName || 'Workspace',
      email: user.email,
    });
  }, [user, location.state]);

  // Zoho-style redirect effect: thin progress bar + calm page fade on route change
  useEffect(() => {
    setNavigating(true);
    const t = setTimeout(() => setNavigating(false), 450);
    return () => clearTimeout(t);
  }, [location.pathname]);

  if (loading) return null;
  if (!user && !wsUser) {
    navigate('/signin', { replace: true });
    return null;
  }

  if (!wsUser) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#144e3c] flex items-center justify-center text-white animate-pulse" />
        </div>
      </div>
    );
  }

  const isHome = activeTab === 'home';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-slate-800 antialiased">
      <Sidebar
        active={activeTab}
        setActive={(tab: string) => {
          if (tab === 'home') navigate('/workspace');
          else navigate(`/workspace/${tab}`);
        }}
        collapsed={!sidebarOpen}
        setCollapsed={setSidebarOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
        {/* Top app bar */}
        <header className="h-14 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            {!isHome && <h1 className="text-[15px] font-bold text-slate-900">{titleFor(activeTab)}</h1>}
            {isHome && (
              <div className="relative w-80 max-w-[40vw]">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full h-8 pl-9 pr-8 text-[12.5px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700 placeholder-slate-400"
                  placeholder="Search in ProcureFlow ( / )"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 bg-white px-1 border border-slate-200 rounded leading-tight">/</kbd>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-[12.5px] text-slate-600">
              <span>Trial expires in <strong className="text-slate-900 font-semibold">10 days</strong>.</span>
            </div>
            <button className="flex items-center gap-1 text-[13px] font-medium text-slate-700 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
              <span className="max-w-28 truncate">{wsUser.orgName}</span>
              <ChevronDown size={16} className="text-slate-400" />
            </button>
            {user?.demo && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#2084FA] to-[#7F3EDD] text-white text-[10px] font-bold tracking-wider">DEMO</span>
            )}
            <button
              onClick={() => navigate('/workspace/pr')}
              className="w-8 h-8 rounded-md bg-[#2563eb] hover:bg-blue-700 text-white flex items-center justify-center shadow-sm transition-all"
              title="New Transaction"
            >
              <Plus size={18} />
            </button>
            <button className="relative p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors" title="Notifications">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <button className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors" title="Settings">
              <Settings size={20} />
            </button>
            <button className="w-7 h-7 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-[12px] font-bold ring-1 ring-blue-700" title={wsUser.email}>
              {wsUser.name?.[0]?.toUpperCase() || 'U'}
            </button>
            <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700" title="Apps">
              <LayoutGrid size={20} />
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto bg-[#fafbfc] px-6 lg:px-12 py-8 relative">
          <AnimatePresence>
            {navigating && (
              <motion.div
                className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-[#2084FA] to-[#7F3EDD] z-20"
                initial={{ width: '0%', opacity: 1 }}
                animate={{ width: '100%', opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {isHome ? <HomeView user={wsUser} /> : (
                <div className="max-w-4xl mx-auto">
                  <Outlet />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom status strip */}
        <footer className="h-8 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[11.5px] text-slate-500 flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 hover:text-slate-800">
              <Pin size={14} /> My Pins
            </button>
            <button className="flex items-center gap-1 hover:text-slate-800">
              <MessageCircle size={14} /> Chats
            </button>
            <button className="flex items-center gap-1 hover:text-slate-800">
              <Tags size={14} /> Channels
            </button>
            <button className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium text-[10.5px]">
              <Megaphone size={12} /> What&apos;s new
            </button>
          </div>
          <button className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
            <Mail size={14} /> Contact Support
          </button>
        </footer>
      </div>
    </div>
  );
}
