import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';
import { getApprovals } from './api';
import {
  Home, Inbox, ClipboardCheck, Package, Store, ShoppingBag, ReceiptText,
  Wallet, BarChart3, ChevronDown, ChevronsLeft, ChevronsRight,
  MessageCircle, Sparkles, RefreshCw, LogOut,
} from 'lucide-react';

function NavIcon({ name, size = 19, active = false }: { name: string; size?: number; active?: boolean }) {
  const cls = active ? 'text-emerald-800' : 'text-slate-500';
  const props = { size, className: cls };
  switch (name) {
    case 'home': return <Home {...props} />;
    case 'inbox': return <Inbox {...props} />;
    case 'approvals': return <ClipboardCheck {...props} />;
    case 'items': return <Package {...props} />;
    case 'vendors': return <Store {...props} />;
    case 'procurement': return <ShoppingBag {...props} />;
    case 'payables': return <ReceiptText {...props} />;
    case 'budgets': return <Wallet {...props} />;
    case 'analytics': return <BarChart3 {...props} />;
    default: return <Home {...props} />;
  }
}

const PROCUREMENT_CHILDREN = [
  { id: 'pr', label: 'Purchase Requests' },
  { id: 'rfq', label: 'Request for Quotes' },
  { id: 'po', label: 'Purchase Orders' },
  { id: 'receives', label: 'Purchase Receives' },
];

const PAYABLES_CHILDREN = [
  { id: 'bills', label: 'Bills' },
  { id: 'recurring', label: 'Recurring Bills' },
  { id: 'batch', label: 'Batch Payments' },
  { id: 'payments', label: 'Payments Made' },
];

function Group({
  label, icon, active, collapsed, setActive, children,
}: {
  label: string; icon: string; active: string; collapsed: boolean; setActive: (t: string) => void;
  children: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(true);
  const childActive = children.some((c) => c.id === active);
  return (
    <div className="pt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium transition-colors group cursor-pointer ${
          collapsed ? 'justify-center' : ''
        } ${childActive ? 'text-slate-900' : 'text-slate-700 hover:bg-slate-100'}`}
      >
        <span className="flex items-center gap-3">
          <NavIcon name={icon} active={childActive} />
          {!collapsed && <span className="group-hover:text-slate-900">{label}</span>}
        </span>
        {!collapsed && (
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && !collapsed && (
        <AnimatePresence initial={false}>
          <motion.div
            key="group"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-8 pr-1 py-1 space-y-0.5 text-[13px] border-l-2 border-slate-100 ml-5 my-0.5">
              {children.map((c) => (
                <ChildLink key={c.id} id={c.id} label={c.label} active={active} setActive={setActive} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function ChildLink({ id, label, active, setActive }: { id: string; label: string; active: string; setActive?: (t: string) => void }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => setActive?.(id)}
      className={`w-full flex items-center gap-2 py-1.5 px-2.5 rounded text-left transition-colors ${
        isActive ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      <span className="text-slate-300 text-xs">·</span>
      <span>{label}</span>
    </button>
  );
}

export function Sidebar({ active, setActive, collapsed, setCollapsed }: any) {
  const { logout } = useAuth();
  const [approvalCount, setApprovalCount] = useState(0);

  useEffect(() => {
    getApprovals()
      .then((r: any) => {
        const arr = Array.isArray(r) ? r : r?.data || r?.items || [];
        setApprovalCount(Array.isArray(arr) ? arr.length : 0);
      })
      .catch(() => {});
  }, []);

  const item = (id: string, label: string, icon: string, badge?: number) => {
    const isActive = active === id;
    return (
      <button
        key={id}
        onClick={() => setActive(id)}
        className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors duration-150 ${
          isActive ? 'text-slate-900 font-semibold' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        } ${collapsed ? 'justify-center' : ''}`}
      >
        {isActive && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-md bg-slate-100 shadow-[inset_3px_0_0_0_#144e3c]"
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-3 min-w-0">
          <NavIcon name={icon} active={isActive} />
          {!collapsed && <span className="truncate">{label}</span>}
        </span>
        {!collapsed && badge != null && badge > 0 && (
          <span className="relative z-10 ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-800 font-semibold text-[10px] rounded-full">{badge}</span>
        )}
      </button>
    );
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-[245px]'} flex-shrink-0 bg-white border-r border-slate-200/90 flex flex-col h-full z-20 select-none transition-all duration-200`}>
      {/* Brand header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100">
        <button onClick={() => setActive('home')} className="flex items-center gap-2 group min-w-0" title="ProcureFlow Home">
          {collapsed ? (
            <img src="/img/procureflow-p-icon.png" alt="ProcureFlow" className="w-7 h-7 rounded-md object-contain flex-shrink-0" />
          ) : (
            <img src="/img/procureflow-logo-full.png" alt="ProcureFlow — Smarter Procurement. Simplified." className="h-8 w-auto object-contain" />
          )}
          {!collapsed && <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />}
        </button>
        {!collapsed && (
          <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Sync & Refresh">
            <RefreshCw size={18} />
          </button>
        )}
      </div>

      {/* Getting started widget */}
      {!collapsed && (
        <div className="p-3">
          <button
            onClick={() => setActive('home')}
            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 transition-all group text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-slate-700 leading-none">Getting Started</div>
                <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '25%' }} />
                </div>
              </div>
            </div>
            <ChevronDown size={16} className="text-slate-400 -rotate-90 group-hover:text-blue-600 transition-all" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 text-[13px] font-medium">
        {item('home', 'Home', 'home')}
        {item('requests', 'My Requests', 'inbox')}
        {item('approvals', 'Approvals', 'approvals', approvalCount)}
        {item('items', 'Items', 'items')}
        {item('vendors', 'Vendors', 'vendors')}
        <Group label="Procurement" icon="procurement" active={active} collapsed={collapsed} setActive={setActive} children={PROCUREMENT_CHILDREN} />
        <Group label="Payables" icon="payables" active={active} collapsed={collapsed} setActive={setActive} children={PAYABLES_CHILDREN} />
        {item('budgets', 'Budgets', 'budgets')}
        {item('analytics', 'Analytics', 'analytics')}
      </nav>

      {/* Sidebar bottom actions */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center justify-between px-1 text-slate-400">
            <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Collapse sidebar">
              <ChevronsLeft size={18} />
            </button>
            <button onClick={logout} className="p-1 rounded hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Sign out">
              <LogOut size={16} />
            </button>
            <button className="p-1 rounded hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Help & Feedback">
              <MessageCircle size={18} />
            </button>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="p-2 border-t border-slate-100 flex flex-col items-center gap-1">
          <button onClick={() => setCollapsed(false)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Expand sidebar">
            <ChevronsRight size={18} />
          </button>
          <button onClick={logout} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
