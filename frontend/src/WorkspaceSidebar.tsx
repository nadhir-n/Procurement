import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getOrders, getApprovals, getItems, getVendors, getProperties } from './api';

interface Data {
  orders: any[];
  approvals: any[];
  items: any[];
  vendors: any[];
  properties: any[];
}

export function useWorkspaceData() {
  const [data, setData] = useState<Data>({ orders: [], approvals: [], items: [], vendors: [], properties: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOrders().catch(() => [] as any[]),
      getApprovals().catch(() => [] as any[]),
      getItems().catch(() => [] as any[]),
      getVendors().catch(() => [] as any[]),
      getProperties().catch(() => [] as any[]),
    ]).then(([orders, approvals, items, vendors, properties]) => {
      setData({ orders: orders as any[], approvals: approvals as any[], items: items as any[], vendors: vendors as any[], properties: properties as any[] });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'Approved' ? 'emerald' :
    status === 'Pending' || status === 'Pending Approval' ? 'amber' :
    status === 'Verified' || status === 'Reconciled' ? 'emerald' :
    status === 'Issued' ? 'amber' :
    status === 'Active' ? 'emerald' :
    'slate';
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${color === 'emerald' ? 'bg-emerald-100 text-emerald-800' : color === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
      {status}
    </span>
  );
}

export function Sidebar({ active, setActive, collapsed, setCollapsed }: any) {
  const { logout } = useAuth();
  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-200`}>
      <div className="flex items-center h-14 px-3 sm:px-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#144e3c] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 13h2v5H3v-5zm10 0h2v5h-2v-5zm-10 3h14v2H3v-2z" fill="white"/></svg>
          </div>
          {!collapsed && <span className="font-extrabold text-sm text-slate-900 tracking-tight whitespace-nowrap">ProcureFlow</span>}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            {collapsed ? <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> :
             <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
          </svg>
        </button>
      </div>
      <nav className="flex-1 px-2 sm:px-3 py-3 space-y-0.5 overflow-y-auto">
        {[
          { id: 'home', label: 'Home', icon: 'house' },
          { id: 'requests', label: 'My Requests', icon: 'list' },
          { id: 'approvals', label: 'Approvals', icon: 'check_circle' },
          { id: 'items', label: 'Items', icon: 'inventory_2' },
          { id: 'vendors', label: 'Vendors', icon: 'store' },
          { id: 'procurement', label: 'Procurement', icon: 'shopping_cart', expandable: true, children: [
            { id: 'pr', label: 'Purchase Requests' },
            { id: 'rfq', label: 'Request for Quotes' },
            { id: 'po', label: 'Purchase Orders' },
            { id: 'receives', label: 'Purchase Receives' },
          ]},
          { id: 'payables', label: 'Payables', icon: 'receipt_long', expandable: true, children: [
            { id: 'bills', label: 'Bills' },
            { id: 'recurring', label: 'Recurring Bills' },
            { id: 'payments', label: 'Payments Made' },
          ]},
        ].map((item) => (
          <div key={item.id} className="space-y-0.5">
            <button
              onClick={() => { if (!item.expandable) setActive(item.id); }}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${active === item.id && !item.expandable ? 'bg-[#ecfdf5] text-emerald-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'} ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon name={item.icon} size={18} color={active === item.id && !item.expandable ? '#059669' : 'none'}/>
              {!collapsed && <span>{item.label}</span>}
              {item.expandable && !collapsed && (
                <svg className="ml-auto text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </button>
            {item.expandable && !collapsed && (
              <div className="ml-6 pl-2 border-l border-slate-100/80 space-y-0.5 pb-1">
                {item.children.map(c => (
                  <button key={c.id} onClick={() => setActive(c.id)} className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${active === c.id ? 'bg-[#ecfdf5] text-emerald-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <span className="text-slate-400 text-xs">·</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="p-2 sm:p-3 border-t border-slate-100">
        <button onClick={logout} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors">
          <Icon name="logout" size={16} color="none"/>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

function Icon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const c = color !== 'none' ? color : 'currentColor';
  const icons: Record<string, any> = {
    house: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    list: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    check_circle: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
    inventory_2: <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m8-4v10M4 3h16v18H4V3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    store: <path d="M3 21h18M3 21l3-18h6l3 18M9 14h6M9 14a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2v5a2 2 0 01-2 2v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    shopping_cart: <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a5.002 5.002 0 019.94 0M18 13H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    receipt_long: <path d="M4 2v20M4 2h16a2 2 0 012 2v20a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm0 2v16h16V4M4 9h16M4 15h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    logout: <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    add: <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>,
    search: <><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    keyboard: <><rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
    bell: <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>,
    settings: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M19.4 15a1.65 1.65 0 00.36 1.81l.04.06a1.65 1.65 0 001.13 1.16l.06.04a1.65 1.65 0 001.81.36l.14-.02a1.65 1.65 0 001.69-1.69l.02-.14a1.65 1.65 0 00.36-1.81l.06-.04a1.65 1.65 0 00-.16-1.16l-.04-.06a1.65 1.65 0 00-1.13-1.16l-.06-.04a1.65 1.65 0 00-1.81-.36l-.14.02a1.65 1.65 0 00-1.69 1.69l-.02.14a1.65 1.65 0 00-.36 1.81l-.06.04a1.65 1.65 0 00.16 1.16l.04.06a1.65 1.65 0 001.13 1.16l.06.04a1.65 1.65 0 001.81.36l.14-.02z" stroke="currentColor" strokeWidth="1.5"/></>,
    x: <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>,
    help: <><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
    replay: <path d="M12 5v14M8 10l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color: c }}>{icons[name]}</svg>;
}
