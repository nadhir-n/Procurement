import { useState } from 'react';

interface HomeViewProps {
  user: { name?: string; email?: string; orgName?: string } | null;
}

export function HomeView({ user }: HomeViewProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const steps = [
    {
      id: 1,
      title: 'Complete your organization profile',
      body: 'Logo and address — these appear on every PDF you send.',
      hint: 'Set up',
      done: false,
      action: () => {},
    },
    {
      id: 2,
      title: 'Your first purchase order',
      body: 'Raise a PO, get it approved, and track it to the vendor.',
      hint: 'Open',
      done: false,
      action: () => {},
    },
    {
      id: 3,
      title: 'Approve and receive',
      body: 'Approvers get notified. Receiving closes the loop.',
      hint: 'Open',
      done: false,
      action: () => {},
    },
    {
      id: 4,
      title: 'Set up your vendor list',
      body: 'Add vendors once and reuse them across all properties.',
      hint: 'Open',
      done: false,
      action: () => {},
    },
    {
      id: 5,
      title: 'Invite your team',
      body: 'Give users the right roles so approvals move smoothly.',
      hint: 'Open',
      done: false,
      action: () => {},
    },
  ];

  const hasSome = checked.size > 0;
  const allDone = checked.size >= steps.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Confirm card */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#144e3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">You're all set!</h3>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Here's how to get started with ProcureFlow.</p>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors px-2 py-1 rounded hover:bg-slate-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Replay tour
          </button>
        </div>

        {/* Steps list */}
        <div className="divide-y divide-slate-100">
          {steps.map((step, i) => {
            const done = checked.has(step.id);
            const current = done ? 0 : i + 1;
            return (
              <div key={step.id} className="px-6 py-4 flex items-start gap-4">
                {/* Number + status */}
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold 
                  ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : current}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {step.title}
                    </span>
                    {done && <span className="ml-auto text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Done</span>}
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.body}</p>
                </div>
                {/* Action */}
                {!done && (
                  <button
                    onClick={() => { setChecked(prev => new Set([...prev, step.id])); }}
                    className="flex-shrink-0 px-4 py-1.5 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors shadow-sm"
                  >
                    {step.hint}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {checked.size} of {steps.length} done
          </span>
          {hasSome && !allDone && (
            <button
              onClick={() => setChecked(new Set())}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Reset progress
            </button>
          )}
        </div>
      </div>

      {/* Property info card */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0f241c] flex items-center justify-center text-white shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">{user?.orgName || 'Galle Face Hotel Group'}</div>
            <div className="text-xs text-slate-500">parent of 12 properties · Colombo HQ</div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Requests awaiting', value: '3', icon: 'clock' },
          { label: 'Pending approvals', value: '2', icon: 'check_circle' },
          { label: 'POs this week', value: '1', icon: 'inventory_2' },
          { label: 'Vendors online', value: '5', icon: 'store' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl bg-white shadow-sm border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
