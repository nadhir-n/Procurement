import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardHome } from './DashboardHome';
import { MyHome } from './MyHome';
import {
  getDashboard, getSettings, getTenantUsers, getBudgets, getItems, getVendors,
  getBills, getPayments, getBatches,
} from '../../api';
import {
  ShoppingBag, Store, ClipboardList, ReceiptText, Upload, Copy, Check,
  Plug, Blocks, Workflow, LifeBuoy, BookOpen, MessageCircleQuestion,
  ArrowRight, ArrowUpRight, Compass, Play, X,
} from 'lucide-react';

interface HomeViewProps {
  user: { name?: string; email?: string; orgName?: string } | null;
}

type GuideTask = { id: string; title: string; action: string; route: string; done: boolean };
type GuideGroup = { id: string; title: string; desc: string; tasks: GuideTask[] };

// Same content as Zoho reference — presentation is original ProcureFlow launchpad.
const GUIDE_CONTENT: GuideGroup[] = [
  {
    id: 'org',
    title: 'Set Up Your Organization',
    desc: 'Add users, set budgets, and create chart of accounts',
    tasks: [
      { id: 'modules', title: 'Configure the modules required for your business', action: 'Configure Modules', route: '/workspace/settings/general', done: false },
      { id: 'users', title: 'Add users and assign them role-based access', action: 'Add Users', route: '/workspace/settings/users', done: true },
      { id: 'budgets', title: 'Set budgets to track and control spend across departments', action: 'Set Budgets', route: '/workspace/budgets', done: false },
      { id: 'accounts', title: 'Create and track accounts to categorize procurement transactions accurately', action: 'Chart of Accounts', route: '/workspace/settings/mod-accounts', done: false },
    ],
  },
  {
    id: 'catalog',
    title: 'Manage Items and Vendors',
    desc: 'Configure item and vendor settings',
    tasks: [
      { id: 'items', title: 'Add or import the items your business procures', action: 'Add Items', route: '/workspace/items', done: false },
      { id: 'vendors', title: 'Add or onboard vendors to your organization', action: 'Add Vendors', route: '/workspace/vendors', done: false },
      { id: 'vendor-approvals', title: 'Configure approvals for onboarding and managing vendors', action: 'Approvals', route: '/workspace/approvals', done: false },
      { id: 'vendor-portal', title: 'Configure and manage the actions vendors can perform in the vendor portal', action: 'Vendor Portal', route: '/workspace/settings/vendor-portal', done: false },
    ],
  },
  {
    id: 'payables',
    title: 'Streamline Bills and Vendor Payments',
    desc: 'Set up the bill preferences and configure payment methods',
    tasks: [
      { id: 'inbox', title: 'Enable Inbox to manage vendor bills directly from the app', action: 'Open Inbox', route: '/workspace/inbox', done: true },
      { id: 'matching', title: 'Match bills with orders and receives using 2-way and 3-way matching', action: 'Bill Settings', route: '/workspace/settings/mod-bills', done: false },
      { id: 'bill-approvals', title: 'Configure bill approvals to verify bill details before processing them', action: 'Workflows', route: '/workspace/settings/workflow-rules', done: false },
      { id: 'pay-methods', title: 'Set up payment methods to process vendor payments', action: 'Payments', route: '/workspace/settings/mod-payments', done: false },
    ],
  },
];

const STORAGE_KEY = 'pf-getting-started-v1';
const MANUAL_KEY = 'pf-getting-started-manual-v1';

type ManualMap = Record<string, boolean>;

function loadManual(): ManualMap {
  try {
    const raw = localStorage.getItem(MANUAL_KEY);
    if (raw) return JSON.parse(raw);
    // Back-compat: legacy doneIds list means manual=true
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      const ids: string[] = JSON.parse(legacy);
      return Object.fromEntries(ids.map((id) => [id, true]));
    }
  } catch { /* noop */ }
  return {};
}

function asArray(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.bills)) return res.bills;
  if (Array.isArray(res?.budgets)) return res.budgets;
  if (Array.isArray(res?.users)) return res.users;
  return [];
}

function normSettings(res: any): Record<string, any> {
  if (!res) return {};
  if (res.settings && typeof res.settings === 'object') return res.settings;
  if (typeof res === 'object') return res;
  return {};
}

function Donut({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-[76px] h-[76px] shrink-0">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="#E2E8F0" strokeWidth="7" />
        <circle
          cx="38" cy="38" r={r} fill="none" stroke="url(#pfLaunch)"
          strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="pfLaunch" x1="0" y1="0" x2="76" y2="76">
            <stop offset="0%" stopColor="#2DC5FB" />
            <stop offset="55%" stopColor="#2084FA" />
            <stop offset="100%" stopColor="#7F3EDD" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[14px] font-bold text-[#07175A] tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}

function LaunchTask({ task, auto, onToggle }: { task: GuideTask; auto: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  return (
    <div
      className={`group flex items-center gap-3.5 rounded-xl border px-4 py-3 transition-all ${
        task.done
          ? 'border-slate-100 bg-slate-50/60'
          : 'border-slate-200 bg-white hover:border-[#2084FA]/50 hover:shadow-[0_6px_20px_-10px_rgba(32,132,250,0.4)]'
      }`}
    >
      <button
        onClick={onToggle}
        aria-label={task.done ? 'Reopen' : 'Mark done'}
        className={`w-6 h-6 rounded-[8px] flex items-center justify-center shrink-0 transition-all border ${
          task.done
            ? 'bg-[#16A34A] border-[#16A34A] text-white'
            : 'bg-white border-slate-300 text-transparent hover:border-[#2084FA] hover:text-[#2084FA]/30'
        }`}
      >
        <Check size={14} strokeWidth={3.2} />
      </button>
      <p className={`flex-1 min-w-0 text-[13.5px] leading-snug ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
        {task.title}
      </p>
      {task.done ? (
        <span className="flex items-center gap-1.5 shrink-0">
          {auto && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700" title="Detected automatically from your workspace data">
              Auto
            </span>
          )}
          <button onClick={onToggle} title="Reopen (manual override)" className="text-[11.5px] font-semibold text-[#16A34A] hover:underline underline-offset-2">
            Done · Undo
          </button>
        </span>
      ) : (
        <span className="flex items-center gap-2 shrink-0">
          <button onClick={onToggle} className="hidden lg:block text-[12px] text-slate-400 hover:text-slate-700" title="Just tick it off without leaving this page">
            Mark done
          </button>
          <button
            onClick={() => navigate(task.route)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2084FA] px-3 py-[7px] text-[12.5px] font-semibold text-white transition-colors hover:bg-[#1B6FE0]"
          >
            {task.action}
            <ArrowUpRight size={14} className="opacity-70" />
          </button>
        </span>
      )}
    </div>
  );
}

function SetupHome({ user, onClose }: HomeViewProps & { onClose: () => void }) {
  const navigate = useNavigate();
  const [manual, setManual] = useState<ManualMap>(() => loadManual());
  const [autoDone, setAutoDone] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(true);
  const [activePhase, setActivePhase] = useState('org');
  const [queuedBills, setQueuedBills] = useState<string[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(MANUAL_KEY, JSON.stringify(manual));
    } catch { /* noop */ }
  }, [manual]);

  // Zoho-style live detection: tick steps automatically when the real work exists.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [settingsRes, usersRes, budgetsRes, itemsRes, vendorsRes, billsRes, paymentsRes, batchesRes] =
          await Promise.allSettled([
            getSettings().catch(() => null),
            getTenantUsers().catch(() => null),
            getBudgets().catch(() => null),
            getItems().catch(() => null),
            getVendors().catch(() => null),
            getBills().catch(() => null),
            getPayments().catch(() => null),
            getBatches().catch(() => null),
          ]).then((rs) => rs.map((r) => (r.status === 'fulfilled' ? r.value : null)));
        if (cancelled) return;
        const s = normSettings(settingsRes);
        const users = asArray(usersRes);
        const budgets = asArray(budgetsRes);
        const items = asArray(itemsRes);
        const vendors = asArray(vendorsRes);
        const bills: any[] = asArray(billsRes);
        const payments = asArray(paymentsRes);
        const batches = asArray(batchesRes);
        const hasModuleKey = Object.keys(s).some((k) => k.startsWith('modules.') || k === 'setup.general');
        const accounts: any = (s as any)['setup.accounts'];
        const portal: any = (s as any)['setup.portal'];
        const vendorsPrefs: any = (s as any)['modules.vendors'];
        const approvedStatuses = new Set(['open', 'partially_paid', 'paid', 'overdue', 'pending', 'approved']);
        const next: Record<string, boolean> = {
          'org:modules': hasModuleKey,
          'org:users': users.length > 1,
          'org:budgets': budgets.length > 0,
          'org:accounts': Array.isArray(accounts) ? accounts.length > 7 : false,
          'catalog:items': items.length > 0,
          'catalog:vendors': vendors.length > 0,
          'catalog:vendor-approvals': vendorsPrefs?.requireApproval === true,
          'catalog:vendor-portal': portal?.enabled === true,
          'payables:inbox': bills.length > 0 || !!localStorage.getItem('pf-inbox-config'),
          'payables:matching': bills.some((b) => b.poId || b.poNumber || b.matchPct === 100 || b.status !== 'draft'),
          'payables:bill-approvals': bills.some((b) => approvedStatuses.has(String(b.status || '').toLowerCase())),
          'payables:pay-methods': payments.length > 0 || batches.length > 0,
        };
        setAutoDone(next);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Effective state = manual override wins, else live detection, else seeded default.
  const groups: GuideGroup[] = useMemo(
    () =>
      GUIDE_CONTENT.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => {
          const key = `${g.id}:${t.id}`;
          const done = manual[key] ?? autoDone[key] ?? t.done;
          return { ...t, done };
        }),
      })),
    [manual, autoDone],
  );

  const isAuto = (groupId: string, taskId: string) => {
    const key = `${groupId}:${taskId}`;
    return manual[key] === undefined && !!autoDone[key];
  };

  const toggleTask = (groupId: string, taskId: string) => {
    const key = `${groupId}:${taskId}`;
    const g = groups.find((x) => x.id === groupId);
    const current = g?.tasks.find((t) => t.id === taskId)?.done ?? false;
    setManual((m) => ({ ...m, [key]: !current }));
  };

  const totals = useMemo(() => {
    const total = groups.reduce((n, g) => n + g.tasks.length, 0);
    const done = groups.reduce((n, g) => n + g.tasks.filter((t) => t.done).length, 0);
    return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }, [groups]);

  const nextTask = useMemo(() => {
    for (const g of groups) {
      const t = g.tasks.find((x) => !x.done);
      if (t) return { group: g, task: t };
    }
    return null;
  }, [groups]);

  const firstName = user?.name?.split(/[@.\s]/)[0] || 'there';
  const cap = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const orgName = user?.orgName || 'your organization';
  const billEmail = `bills@${(user?.orgName || 'procureflow').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'procureflow'}.procureflow.io`;

  const scrollTo = (id: string) => {
    setActivePhase(id);
    document.getElementById(`launch-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Top meta row */}
      <div className="flex items-center justify-between pt-1 pb-4">
        <p className="text-[12px] text-slate-400">
          <span className="hover:text-slate-600 cursor-pointer" onClick={onClose}>Home</span>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700 font-medium">Launchpad</span>
          {checking && <span className="ml-2 text-slate-400">· checking live progress…</span>}
        </p>
        <button
          onClick={onClose}
          aria-label="Close getting started"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-500 hover:text-[#07175A] hover:border-[#2084FA]/40 hover:shadow-sm transition-all"
        >
          <X size={14} /> Close
        </button>
      </div>

      {/* Hero — original launchpad banner, not a Zoho accordion */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#2DC5FB] via-[#2084FA] to-[#7F3EDD]" />
        <div className="absolute inset-0 pf-pattern-bg pointer-events-none opacity-[0.35]" aria-hidden="true" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF2FF] border border-[#DBEAFE] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#07175A]">
              <Compass size={13} /> ProcureFlow Launchpad
            </p>
            <h1 className="mt-3 text-[24px] sm:text-[28px] font-bold tracking-tight text-[#07175A] leading-tight">
              Hi {cap}, let&rsquo;s get {orgName} live
            </h1>
            <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-slate-500">
              Three short playbooks to manage and optimize your business spend — modules, catalog, then bills and payments. Pick up where you left off.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {nextTask ? (
                <button
                  onClick={() => scrollTo(nextTask.group.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2084FA] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(32,132,250,0.7)] hover:bg-[#1B6FE0] transition-colors"
                >
                  <Play size={14} /> Continue: {nextTask.task.action}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2.5 text-[13px] font-semibold text-white hover:brightness-95 transition"
                >
                  <Check size={15} strokeWidth={3} /> Setup complete — open dashboard
                </button>
              )}
              <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                {groups.map((g, i) => {
                  const done = g.tasks.filter((t) => t.done).length;
                  return (
                    <button
                      key={g.id}
                      onClick={() => scrollTo(g.id)}
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors border ${activePhase === g.id ? 'bg-[#EAF2FF] border-[#DBEAFE] text-[#07175A]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                    >
                      {i + 1} · {done}/{g.tasks.length}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-[#F8FAFF] p-4">
            <Donut pct={totals.pct} />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#07175A]">{totals.done} of {totals.total} steps</p>
              <p className="text-[12px] text-slate-500 leading-snug mt-0.5">
                {nextTask ? <>Next up: <span className="font-medium text-slate-700">{nextTask.task.title}</span></> : 'Everything is checked off. Nice work.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Body — roadmap + playbooks */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Roadmap rail */}
        <aside className="lg:sticky lg:top-4 h-fit space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {groups.map((g, gi) => {
              const done = g.tasks.filter((t) => t.done).length;
              const complete = done === g.tasks.length;
              const active = activePhase === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => scrollTo(g.id)}
                  className={`w-full flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${active ? 'bg-[#F0F6FF]' : 'hover:bg-slate-50'}`}
                >
                  <span className="flex flex-col items-center pt-0.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border ${complete ? 'bg-[#16A34A] border-[#16A34A] text-white' : active ? 'bg-[#2084FA] border-[#2084FA] text-white' : 'bg-white border-slate-300 text-slate-500'}`}>
                      {complete ? <Check size={13} strokeWidth={3} /> : gi + 1}
                    </span>
                    {gi < groups.length - 1 && <span className="w-px h-6 bg-slate-200 my-1" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] font-semibold leading-tight ${active ? 'text-[#07175A]' : 'text-slate-700'}`}>{g.title}</span>
                    <span className="block text-[11.5px] text-slate-400 mt-0.5 tabular-nums">{done}/{g.tasks.length} done</span>
                    <span className="mt-1.5 block h-1 rounded-full bg-slate-100 overflow-hidden">
                      <span className={`block h-full rounded-full ${complete ? 'bg-[#16A34A]' : 'bg-[#2084FA]'}`} style={{ width: `${(done / g.tasks.length) * 100}%` }} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border border-[#DBEAFE] bg-[#F0F6FF] p-4 overflow-hidden relative">
            <p className="relative text-[13px] font-bold text-[#07175A]">Stuck on a step?</p>
            <p className="relative text-[12px] text-slate-500 mt-0.5 leading-relaxed">Talk to support or skim the guides — most teams finish in under 20 minutes.</p>
            <span className="relative mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#2084FA] hover:underline cursor-pointer">
              Contact support <ArrowRight size={13} />
            </span>
          </div>
        </aside>

        {/* Playbooks */}
        <div className="space-y-5 min-w-0">
          {groups.map((g, gi) => {
            const done = g.tasks.filter((t) => t.done).length;
            return (
              <section key={g.id} id={`launch-${g.id}`} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-start gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100">
                  <span className="rounded-lg bg-[#F0F6FF] border border-[#DBEAFE] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#2084FA] shrink-0">
                    Playbook {gi + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15.5px] font-bold text-[#07175A] tracking-tight">{g.title}</h2>
                    <p className="text-[12.5px] text-slate-500 mt-0.5">{g.desc}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-bold text-slate-600 tabular-nums shrink-0">
                    {done}/{g.tasks.length}
                  </span>
                </div>
                <div className="p-3 sm:p-4 space-y-2.5 bg-[#FAFBFD]">
                  {g.tasks.map((t) => (
                    <LaunchTask key={t.id} task={t} auto={isAuto(g.id, t.id)} onToggle={() => toggleTask(g.id, t.id)} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Quick create */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-[#07175A]">Create your first record</h2>
                <p className="text-[12.5px] text-slate-500 mt-0.5">Kick start your procurement journey with a live transaction.</p>
              </div>
              <span className="hidden sm:block text-[11.5px] font-semibold text-slate-400 uppercase tracking-wider">Quick launch</span>
            </div>
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Item', hint: 'Catalog & pricing', icon: ShoppingBag, route: '/workspace/items', well: 'from-[#2DC5FB] to-[#2084FA]' },
                { label: 'Vendor', hint: 'Onboard suppliers', icon: Store, route: '/workspace/vendors', well: 'from-[#2084FA] to-[#5248F5]' },
                { label: 'Purchase Request', hint: 'Raise a request', icon: ClipboardList, route: '/workspace/pr', well: 'from-[#5248F5] to-[#7F3EDD]' },
                { label: 'Purchase Order', hint: 'Send an order', icon: ReceiptText, route: '/workspace/po', well: 'from-[#2084FA] to-[#2DC5FB]' },
              ].map((t) => (
                <button
                  key={t.label}
                  onClick={() => navigate(t.route)}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-[#2084FA]/50 hover:shadow-[0_12px_28px_-14px_rgba(32,132,250,0.55)] hover:-translate-y-0.5 transition-all"
                >
                  <span className={`inline-flex w-10 h-10 rounded-xl bg-gradient-to-br ${t.well} text-white items-center justify-center shadow-sm`}>
                    <t.icon size={19} />
                  </span>
                  <span className="mt-3 block text-[13.5px] font-bold text-slate-800">{t.label}</span>
                  <span className="block text-[12px] text-slate-400">{t.hint}</span>
                  <ArrowRight size={15} className="absolute right-3.5 top-3.5 text-slate-200 group-hover:text-[#2084FA] group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-dashed border-[#2084FA]/25 bg-[#F7FAFF] p-5 text-center">
                <Upload size={19} className="mx-auto text-[#2084FA]" />
                <p className="mt-2 text-[13.5px] font-bold text-[#07175A]">Drop your bills here</p>
                <p className="text-[12px] text-slate-500">Up to 20 files · 5 MB each</p>
                <label className="inline-block mt-3 cursor-pointer">
                  <span className="rounded-lg bg-[#2084FA] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#1B6FE0] transition-colors">
                    Upload files
                  </span>
                  <input
                    type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                    onChange={(e) => setQueuedBills(Array.from(e.target.files || []).map((f) => f.name))}
                  />
                </label>
                {queuedBills.length > 0 && <p className="mt-2 text-[12px] text-slate-500">{queuedBills.length} selected</p>}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <p className="text-[13px] font-bold text-[#07175A]">Prefer email forwarding?</p>
                <p className="text-[12.5px] text-slate-500 mt-1 leading-relaxed">Send vendor bills to your inbound address and they land in the Bills inbox automatically.</p>
                <p className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-medium text-[#07175A]">
                  <Copy size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{billEmail}</span>
                </p>
              </div>
            </div>
          </section>

          {/* Grow */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
            <h2 className="text-[15px] font-bold text-[#07175A]">Scale when you&rsquo;re ready</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">Integrations, custom modules, and workflow automation.</p>
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              {[
                { label: 'Connect other apps', icon: Plug, route: '/workspace/settings/zoho-apps' },
                { label: 'Create modules', icon: Blocks, route: '/workspace/settings/custom-overview' },
                { label: 'Configure workflows', icon: Workflow, route: '/workspace/settings/workflow-rules' },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => navigate(f.route)}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 text-left hover:border-[#2084FA]/40 hover:bg-[#F7FAFF] transition-colors"
                >
                  <span className="flex w-9 h-9 rounded-lg bg-[#EAF2FF] text-[#2084FA] items-center justify-center shrink-0 group-hover:bg-[#2084FA] group-hover:text-white transition-colors">
                    <f.icon size={17} />
                  </span>
                  <span className="text-[13px] font-semibold text-slate-700 flex-1">{f.label}</span>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-[#2084FA] transition-colors" />
                </button>
              ))}
            </div>
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              {[
                { title: 'Contact support', icon: LifeBuoy, body: 'Replies within one business day.' },
                { title: 'Help docs', icon: BookOpen, body: 'In-depth product guides.' },
                { title: 'FAQs', icon: MessageCircleQuestion, body: 'Common questions answered.' },
              ].map((c) => (
                <div key={c.title} className="rounded-xl bg-slate-50 border border-slate-100 p-3.5">
                  <c.icon size={16} className="text-slate-400" />
                  <p className="mt-2 text-[12.5px] font-bold text-slate-800">{c.title}</p>
                  <p className="text-[12px] text-slate-500">{c.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Post-setup home: My Home + Dashboard + Setup (tabs owned by Workspace header) ──
const PERIOD_PARAM: Record<string, string> = {
  'This month': 'month',
  'Last month': 'lastmonth',
  'This quarter': 'quarter',
  'This year': 'year',
};

const LINK_MAP: Record<string, string> = {
  '/purchase-requests': '/workspace/pr',
  '/bills': '/workspace/bills',
  '/rfqs': '/workspace/rfq',
  '/workspace/receiving': '/workspace/receives',
};

export type HomeSubView = 'myhome' | 'dashboard' | 'setup';

export function HomeView({ user, view, onViewChange, initialData }: HomeViewProps & { view: HomeSubView; onViewChange: (v: HomeSubView) => void; initialData?: any }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('This year');
  const [data, setData] = useState<any>(initialData ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const firstRun = useRef(true);

  const load = (p: string) => {
    setRefreshing(true);
    getDashboard(PERIOD_PARAM[p] || 'year')
      .then(setData)
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      if (initialData && period === 'This year') return;
    }
    load(period);
  }, [period]);

  const handleNavigate = (path: string) => {
    if (path === '/workspace') { onViewChange('setup'); return; }
    navigate(LINK_MAP[path] || path);
  };

  if (view === 'setup') {
    return <SetupHome user={user} onClose={() => onViewChange('dashboard')} />;
  }

  if (view === 'myhome') {
    return <MyHome />;
  }

  return (
    <DashboardHome
      data={data}
      user={{ name: user?.name || user?.email?.split('@')[0] || '', org: user?.orgName || '', role: 'Enterprise Buyer' }}
      period={period}
      onPeriod={setPeriod}
      onRefresh={() => load(period)}
      refreshing={refreshing}
      onNavigate={handleNavigate}
    />
  );
}
