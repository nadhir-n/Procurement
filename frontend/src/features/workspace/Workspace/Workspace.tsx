import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { TopBar } from '../TopBar';
import { Sidebar } from '../Sidebar';
import { HomeView } from '../../dashboard/HomeView';
import { useWorkspaceBoot } from './hooks/useWorkspaceBoot';
import PerfectLoader from "../../../components/PerfectLoader";

export default function Workspace() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [wsUser, setWsUser] = useState<any>(null);
  const [homeView, setHomeView] = useState<'myhome' | 'dashboard' | 'setup'>('myhome');

  const { bootProgress, bootReady, bootData } = useWorkspaceBoot({ loading, wsUser });

  // Derive active tab from URL path
  const path = location.pathname.replace('/workspace/', '').replace('/workspace', '');
  const activeTab = path || 'home';
  const isHome = !path || path === 'home';
  // Zoho-style: settings takes over the full screen — no TopBar, no Sidebar,
  // no way to reach workspace pages until you close it.
  const isSettings = path === 'settings' || path.startsWith('settings/');

  useEffect(() => {
    if (!user) return;
    setWsUser({ name: user.email?.split('@')[0] || 'U', orgName: (user as any).orgName || 'Galle Face Hotel Group' });
  }, [user]);

  if (!user && !wsUser && !loading) {
    navigate('/signin', { replace: true });
    return null;
  }

  const bootDone = !loading && !!wsUser && bootReady;
  if (!bootDone) {
    const stageMsg = loading
      ? 'Please wait while we make everything perfect for you...'
      : !wsUser
        ? 'Setting up your workspace...'
        : 'Loading your workspace data...';
    return <PerfectLoader progress={bootProgress} message={stageMsg} />;
  }

  return (
    isSettings ? (
      // ── Full-screen settings mode (Zoho pattern) ──
      <div className="flex flex-col h-screen overflow-hidden bg-[#F6F7F9] pf-settings-enter">
        <div className="shrink-0 bg-white border-b border-slate-200 pf-settings-bar-enter">
          <div className="px-4 sm:px-6 h-14 flex items-center gap-3 max-w-[1280px] mx-auto w-full">
            <span className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0 shadow-sm p-1">
              <img src="/img/logo.svg" alt="ProcureFlow" className="w-7 h-7 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/img/procureflow-logo-full.png'; }} />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-bold text-slate-900 leading-tight">All Settings</span>
              <span className="block text-[11.5px] text-slate-400 leading-tight truncate">{wsUser.orgName || 'Workspace'}</span>
            </span>
            <button
              onClick={() => navigate('/workspace')}
              className="ml-auto inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[13px] font-semibold text-slate-700 transition-colors shrink-0"
            >
              Close Settings <span aria-hidden="true" className="text-red-500 font-bold">✕</span>
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    ) : (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Separate Top Bar — fixed, doesn't change per tab (Zoho style) */}
      <TopBar user={wsUser} />

      {/* Main workspace area — sidebar + content below the top bar */}
      <div className="flex flex-1 overflow-hidden bg-[#f8faf9]">
        <Sidebar
          active={activeTab}
          setActive={(tab: string) => { navigate(tab === 'home' ? '/workspace' : `/workspace/${tab}`); }}
          onGettingStarted={() => { navigate('/workspace'); setHomeView('setup'); }}
          collapsed={!sidebarOpen}
          setCollapsed={(v: boolean) => setSidebarOpen(!v)}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* Hello strip — home only, hidden in Getting Started guide mode like Zoho */}
            {isHome && homeView !== 'setup' ? (
              <div className="relative bg-white border-b border-slate-200 px-4 sm:px-6 py-4 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <div className="absolute inset-0 pf-pattern-bg pointer-events-none" style={{ opacity: 0.38 }} aria-hidden="true" />
                <div className="absolute inset-0 pf-logo-tile-bg pointer-events-none" aria-hidden="true" style={{ opacity: 0.1 }} />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-slate-500"><rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" /><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" /></svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[17px] font-semibold text-slate-900 leading-tight">Hello, {wsUser.name || 'user1'}</div>
                      <div className="text-[13px] text-slate-500 truncate">{wsUser.orgName || 'Demo Cloud Partners'}</div>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right shrink-0">
                    <div className="text-[13px] font-medium text-slate-700">ProcureFlow Helpline: <span className="font-bold text-slate-900">18005692747</span></div>
                    <div className="text-xs text-slate-500">Mon - Fri • 9:00 AM - 6:00 PM • Toll Free</div>
                  </div>
                </div>
              </div>
            ) : null}
            {isHome && homeView !== 'setup' ? (
              <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-5 text-sm pt-2.5">
                  <button
                    onClick={() => setHomeView('myhome')}
                    className={`pb-1 transition-colors ${homeView === 'myhome' ? 'font-semibold text-[#07175A] border-b-2 border-[#2084FA] -mb-1' : 'font-medium text-slate-600 hover:text-slate-900'}`}
                  >
                    My Home
                  </button>
                  <button
                    onClick={() => setHomeView('dashboard')}
                    className={`pb-1 transition-colors ${homeView === 'dashboard' ? 'font-semibold text-[#07175A] border-b-2 border-[#2084FA] -mb-1' : 'font-medium text-slate-600 hover:text-slate-900'}`}
                  >
                    Dashboard
                  </button>
                  <button onClick={() => setHomeView('setup')} className="ml-auto text-[13px] font-medium text-[#2084FA] flex items-center gap-1 hover:underline"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg> Getting Started</button>
                </div>
              </div>
            ) : null}
            {/* Page content — scrolls as one with the greeting like Zoho (pages carry their own titles) */}
            <div className="px-4 sm:px-6 pt-1 pb-6">
              {isHome ? <HomeView user={wsUser} view={homeView} onViewChange={setHomeView} initialData={bootData} /> : <Outlet />}
            </div>
          </div>
        </main>
      </div>
    </div>
    )
  );
}