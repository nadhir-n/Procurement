import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { getHealth } from "./api";

function BackendStatus() {
  const [status, setStatus] = useState<"checking" | "live" | "down">("checking");
  const [version, setVersion] = useState("");
  useEffect(() => {
    getHealth()
      .then((h) => {
        if (h.ok) {
          setStatus("live");
          setVersion(h.version || "");
        } else setStatus("down");
      })
      .catch(() => setStatus("down"));
  }, []);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d2e5db] bg-white px-3 py-1 text-[11px] font-semibold text-[#3d5c4f]">
      <span className={`w-1.5 h-1.5 rounded-full ${status === "live" ? "bg-emerald-500 animate-pulse" : status === "checking" ? "bg-amber-400 animate-pulse" : "bg-red-500"}`} />
      {status === "live" ? `Backend connected${version ? ` · ${version}` : ""}` : status === "checking" ? "Checking backend…" : "Backend unreachable"}
    </span>
  );
}

function useCountUp(target: number, inView: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1200);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, inView]);
  return val;
}

export default function Landing() {
  // Real app origin: on Vite dev (:5173) the app lives on the proxy (:5174);
  // when served from the proxy (/landing), same-origin "/" is the app.
  const APP_URL = typeof window !== "undefined" && window.location.port === "5173" ? "http://localhost:5174/" : "/";
  const [openFaq, setOpenFaq] = useState(0);
  const scaleRef = useRef<HTMLDivElement>(null);
  const scaleInView = useInView(scaleRef, { once: true, margin: "-40px" as any });
  const c10 = useCountUp(10, scaleInView);
  const c27 = useCountUp(27, scaleInView);
  const c137 = useCountUp(137, scaleInView);
  const c16 = useCountUp(16, scaleInView);

  const faqs = [
    { q: "What is ProcureFlow?", a: "ProcureFlow is an invitation-only procure-to-pay platform for hotel groups. Your workspace ships with 10 departments, 27 purchasing categories, 137 sub-categories, and 4 expenditure classes (CapEx, OpEx, Repair, AMC)." },
    { q: "How do properties roll up?", a: "One property per line as Name | Location | Cluster. Clusters own properties — e.g. Galle Face Hotel, Kandy hotels, United Hotels (EKHO), CHC Rest Houses, CHC Food. Head office sees every cluster." },
    { q: "What is the approval flow?", a: "Budgeted: Dept Head → Head of Finance → General Manager → Purchasing Manager → Central Procurement → Procurement Committee. Non-budgeted and budget-exceed routes escalate to VP/CEO and Board." },
    { q: "What about currencies and tax?", a: "Base currency selectable (USD, LKR, INR, EUR, GBP, AED, SGD, AUD, CAD). Item master tracks UOM conversion, lead time, tax treatment (VAT, SSCL, exempt, import duties) and par levels." },
  ];

  return (
    <div className="min-h-screen bg-[#f8fbf9] text-[#0f291e]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playfair+Display:ital@0;1&display=swap');`}</style>

      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-[#d2e5db]">
        <div className="max-w-[1280px] mx-auto px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/img/procureflow-logo.png" alt="ProcureFlow logo" className="w-10 h-10 rounded-[10px] object-contain bg-white border border-[#d2e5db] p-0.5" />
            <span className="font-extrabold tracking-tight text-[19px]">ProcureFlow</span>
            <span className="hidden sm:inline text-[10px] font-bold tracking-[0.14em] text-[#1e6b52] border border-[#d2e5db] rounded-full px-2 py-1">HOTEL OPERATIONS</span>
          </div>
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2.5">
            <motion.a href={APP_URL} whileHover={{ y: -1, backgroundColor: "#f0f7f3", borderColor: "#0f241c" }} whileTap={{ scale: 0.96 }} transition={{ duration: 0.18 }} className="hidden sm:inline-flex h-10 px-5 rounded-full border border-[#0f241c]/70 bg-white text-sm font-semibold text-[#0f241c] items-center">Sign in</motion.a>
            <motion.a href="#cta" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 22 }} whileHover={{ y: -2, boxShadow: "0 12px 26px rgba(30,107,82,0.32)" }} whileTap={{ scale: 0.96 }} className="group relative overflow-hidden inline-flex h-10 px-5 rounded-full bg-[#1e6b52] text-white text-sm font-semibold items-center gap-1.5">
              <motion.span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent" initial={{ x: "-120%" }} whileHover={{ x: "120%" }} transition={{ duration: 0.6 }} />
              Step into your flow
              <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>→</motion.span>
            </motion.a>
          </motion.div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-[#eef6f1] to-[#f8fbf9] border-b border-[#d2e5db]/60">
        <div className="max-w-[1280px] mx-auto px-6 pt-12 pb-10 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-[11px] font-bold tracking-[0.14em] text-[#1e6b52]">
              <span className="w-2 h-2 rounded-full bg-[#1e6b52] animate-pulse" /> PROCUREMENT, IN PERFECT FLOW
            </span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6 font-bold leading-[0.95] text-[42px] sm:text-[54px] lg:text-[68px]">
            Every purchase, <span className="font-[Playfair_Display] italic font-medium text-[#1e6b52]">beautifully</span> in<br />control.
          </motion.h1>
          <p className="mx-auto mt-5 max-w-[720px] text-[16px] leading-7 text-[#3d5c4f]">
            One calm command centre for the people, properties and decisions behind every guest experience.
            Smarter Procurement. Simplified.
          </p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <motion.a href="#cta" whileHover={{ y: -2, boxShadow: "0 14px 30px rgba(30,107,82,0.3)" }} whileTap={{ scale: 0.98 }} className="group relative overflow-hidden h-12 px-7 rounded-full bg-[#1e6b52] text-white font-semibold inline-flex items-center justify-center gap-2">
              <motion.span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" initial={{ x: "-120%" }} whileHover={{ x: "120%" }} transition={{ duration: 0.6 }} />
              Step into your procurement flow
              <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>→</motion.span>
            </motion.a>
            <motion.a href="#demo" whileHover={{ y: -2, borderColor: "#0f241c", backgroundColor: "#f0f7f3" }} whileTap={{ scale: 0.98 }} className="h-12 px-7 rounded-full bg-white border border-[#0f241c]/40 font-semibold inline-flex items-center justify-center text-[#0f241c]">Request a demo</motion.a>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-4 flex justify-center">
            <BackendStatus />
          </motion.div>

          <div className="mt-8 mx-auto max-w-[980px] rounded-2xl border bg-white p-4 text-left">
            <div className="flex justify-between text-xs font-bold tracking-widest text-[#749688] px-2">
              <span>PF · Procure to pay in one flow</span>
              <span className="text-[#1e6b52]">REQUEST → APPROVAL → ORDER → RECEIVE → PAY</span>
            </div>
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { k: "Request", v: "PR-0284 raised" },
                { k: "Approval", v: "Finance cleared" },
                { k: "Order", v: "PO issued" },
                { k: "Receive", v: "3-way matched" },
              ].map((s, i) => (
                <motion.div key={s.k} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} className="rounded-xl border bg-[#f8fbf9] px-3 py-3">
                  <div className="text-[13px] font-semibold">{s.k}</div>
                  <div className="text-[11px] text-[#749688]">{s.v}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[980px] mx-auto">
          <div className="flex gap-3 rounded-xl border bg-white p-4"><span className="text-[11px] font-bold text-[#1e6b52]">01</span><div><div className="font-bold text-sm">Invitation-only</div><div className="text-xs text-[#3d5c4f]">Access stays within your hotel group.</div></div></div>
          <div className="flex gap-3 rounded-xl border bg-white p-4"><span className="text-[11px] font-bold text-[#1e6b52]">02</span><div><div className="font-bold text-sm">Role-bound</div><div className="text-xs text-[#3d5c4f]">Each decision reaches the right person.</div></div></div>
          <div className="flex gap-3 rounded-xl border bg-white p-4"><span className="text-[11px] font-bold text-[#1e6b52]">03</span><div><div className="font-bold text-sm">Always traceable</div><div className="text-xs text-[#3d5c4f]">Every commitment has a clear history.</div></div></div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-10">
        <div className="text-center max-w-[820px] mx-auto">
          <span className="inline-block text-[11px] font-bold tracking-[0.14em] text-white bg-[#0f241c] px-3 py-1 rounded-full">HOSPITALITY-NATIVE SETUP</span>
          <h2 className="mt-3 text-[30px] font-bold">Your workspace, pre-configured for hotels</h2>
          <p className="mt-2 text-[#3d5c4f]">Same classification as procurement.cloudhub.lk — no generic ERP setup.</p>
        </div>
        <div ref={scaleRef} className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-[#0f241c] text-white p-5"><div className="text-3xl font-extrabold text-[#7ad3b0]">{c10}</div><div className="font-bold text-sm mt-1">Departments</div><div className="text-xs text-white/60">F&B Culinary, F&B Service, Housekeeping, Engineering, Front Office, Spa, Sales, HR, IT, Admin</div></div>
          <div className="rounded-2xl bg-white border p-5"><div className="text-3xl font-extrabold">{c27}</div><div className="font-bold text-sm mt-1">Purchasing categories</div><div className="text-xs text-[#3d5c4f]">Perishables, Dry Goods, Guest Amenities, HVAC, Spa Consumables…</div></div>
          <div className="rounded-2xl bg-white border p-5"><div className="text-3xl font-extrabold">{c137}</div><div className="font-bold text-sm mt-1">Sub-categories</div><div className="text-xs text-[#3d5c4f]">Meat & Poultry, Seafood, Linen, LED Fixtures, Key Cards…</div></div>
          <div className="rounded-2xl bg-white border p-5"><div className="text-3xl font-extrabold">4</div><div className="font-bold text-sm mt-1">Expenditure classes</div><div className="text-xs text-[#3d5c4f]">CapEx · OpEx · Repair · AMC</div></div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-6">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-[11px] tracking-[0.16em] font-bold text-[#1e6b52]">YOUR PROPERTIES · CLUSTERS</div>
          <h3 className="mt-2 text-[22px] font-bold">Built for multi-property roll-up</h3>
          <p className="mt-1 text-sm text-[#3d5c4f]">Clusters own properties; head office sees every cluster. Format: Name | Location | Cluster.</p>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
            <div className="rounded-xl bg-[#f8fbf9] border p-4"><div className="font-bold">Galle Face Hotel</div><div className="text-xs text-[#3d5c4f]">Galle Face Hotel Colombo</div></div>
            <div className="rounded-xl bg-[#f8fbf9] border p-4"><div className="font-bold">Kandy hotels</div><div className="text-xs text-[#3d5c4f]">Queens Hotel Kandy, Suisse Hotel Kandy</div></div>
            <div className="rounded-xl bg-[#f8fbf9] border p-4"><div className="font-bold">United Hotels</div><div className="text-xs text-[#3d5c4f]">EKHO Surf · EKHO Tissa · EKHO Polonnaruwa</div></div>
            <div className="rounded-xl bg-[#f8fbf9] border p-4"><div className="font-bold">CHC Rest Houses</div><div className="text-xs text-[#3d5c4f]">{c16} properties: Kithulgala, Belihuloya, Pussellawa, Dambulla, Habarana, Sigiriya, Ella, Weligama…</div></div>
            <div className="rounded-xl bg-[#f8fbf9] border p-4"><div className="font-bold">CHC Food</div><div className="text-xs text-[#3d5c4f]">Ambepussa</div></div>
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-6">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="rounded-[20px] border border-[#d2e5db] bg-white overflow-hidden shadow-[0_24px_64px_rgba(15,41,30,0.12)]">
          <div className="h-10 flex items-center justify-between px-4 border-b bg-[#fbfdfb]">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#ff5f57]" /><span className="w-3 h-3 rounded-full bg-[#ffbd2e]" /><span className="w-3 h-3 rounded-full bg-[#28c840]" /><span className="ml-3 text-xs font-mono text-[#749688]">procureflow.cloudhub.lk/console</span></div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest px-2 py-1 rounded-full bg-[#0f241c] text-white"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />SECURE AP CONNECTION</span>
          </div>
          <div className="p-4 lg:p-6 bg-[#f8fbf9]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-bold">Procurement Operations Overview</h3><p className="text-xs text-[#749688]">Real-time spend velocity & line-item reconciliation ledger</p></div>
              <div className="flex gap-2"><span className="h-8 px-3 rounded-full border bg-white text-xs font-semibold inline-flex items-center">Filter</span><span className="h-8 px-3 rounded-full bg-[#1e6b52] text-white text-xs font-semibold inline-flex items-center">New PR</span></div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "TOTAL SPEND (MTD)", value: "$1,482,900", sub: "+12.4% vs last period" },
                { label: "PENDING APPROVALS", value: "18 PRs", sub: "Avg turnaround: 2.1 hrs" },
                { label: "3-WAY MATCH RATE", value: "99.4%", sub: "Autonomous validation" },
              ].map((c, i) => (
                <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -3 }} className="rounded-xl border border-[#d2e5db] bg-white p-3">
                  <div className="text-[10px] font-bold tracking-widest text-[#749688]">{c.label}</div>
                  <div className="text-lg font-extrabold mt-1">{c.value}</div>
                  <div className="text-xs text-[#1e6b52] font-semibold">{c.sub}</div>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-[#d2e5db] bg-white p-4">
              <div className="text-sm font-bold">Weekly Requisition & Clearance Volume</div>
              <div className="text-xs text-[#749688]">Vendor invoices matched autonomously vs manual exceptions</div>
              <div className="mt-4 flex items-end gap-1 h-[88px]">
                {[22, 38, 28, 52, 44, 66, 48, 72, 54, 60, 48, 70].map((h, i) => (
                  <motion.div key={i} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.03, duration: 0.45 }} style={{ height: h, transformOrigin: "bottom" }} className="flex-1 rounded-t bg-[#1e6b52]" />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto] gap-3 text-xs border-t pt-3">
                <div className="font-mono font-semibold">PO-9912 · AWS Cloud EMEA Ltd · $42,300.00</div>
                <span className="px-2 py-1 rounded-full bg-[#e8f5ee] text-[#1e6b52] font-bold">Matched</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="text-center max-w-[820px] mx-auto">
          <span className="inline-block text-[11px] font-bold tracking-[0.14em] text-white bg-[#0f241c] px-3 py-1 rounded-full">THE HOSPITALITY ADVANTAGE</span>
          <h2 className="mt-3 text-[30px] font-bold tracking-tight">Why Luxury Hoteliers Choose ProcureFlow Over Generic ERPs</h2>
          <p className="mt-3 text-[#3d5c4f]">Generic ERPs treat five-star hotels like factories. ProcureFlow is built for guest-facing operations, F&B catch-weights, and distributed clusters.</p>
        </div>
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Pre-configured Hospitality Taxonomy", desc: "10 departments, 27 purchasing categories, 137 sub-categories pre-loaded.", a: "4+ Mos generic setup", b: "Instant deployment", light: false },
            { title: "Multi-Property & Cluster Rollup", desc: "Property-level purchasing rolled into VP Finance & Group GM hierarchies.", a: "Manual entity silos", b: "1-click group rollup", light: false },
            { title: "Dock GRN & Catch-Weight Tolerance", desc: "Perishables with automated ±2.5% tolerance and dock tablet verification.", a: "Rigid invoicing breaks", b: "99.4% auto matched", light: true },
            { title: "Zero Per-Seat License Tax", desc: "Unlimited requestors — chefs, housekeeping, dock supervisors included.", a: "$45–$120 /seat/mo", b: "Unlimited users", light: true },
          ].map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -6 }} className={`rounded-2xl border p-5 flex flex-col ${c.light ? "bg-[#f8fbf9] border-[#d2e5db]" : "bg-[#0f241c] text-white border-[#1a3328]"}`}>
              <h3 className="font-bold leading-tight">{c.title}</h3>
              <p className={`mt-2 text-sm ${c.light ? "text-[#3d5c4f]" : "text-white/70"}`}>{c.desc}</p>
              <div className="mt-auto pt-4 flex justify-between text-[11px] font-bold">
                <span className={c.light ? "text-[#749688]" : "text-white/60"}>{c.a}</span>
                <span className={c.light ? "text-[#1e6b52]" : "text-[#7ad3b0]"}>{c.b}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-[#0f241c] text-white py-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center max-w-[760px] mx-auto">
            <div className="text-[11px] tracking-[0.16em] font-bold text-[#7ad3b0]">HOSPITALITY SPEND LIFECYCLE</div>
            <h2 className="mt-2 text-[30px] font-bold leading-tight">From Kitchen Requisition to Dock Clearance — In One Continuous Motion.</h2>
          </div>
          <div className="mt-8 grid lg:grid-cols-3 gap-4">
            {[
              { stage: "STAGE 01", title: "Property & Department Initiation", desc: "Chefs and housekeeping leads raise orders with par-level triggers and catch-weight buffers.", check: "Auto catch-weight ±2.5%" },
              { stage: "STAGE 02", title: "Intelligent DoA Routing", desc: "Dept Head <$2,500 · Property GM <$15,000 · VP Finance >$50,000 — assigned automatically.", check: "Auto-escalation < 4h SLA" },
              { stage: "STAGE 03", title: "Dock Receiving & 3-Way Match", desc: "Mobile GRN check-in with tolerance, OCR verification, direct push to PMS ledger.", check: "100% reconciled to GL" },
            ].map((s, i) => (
              <motion.div key={s.stage} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4 }} className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="text-[11px] tracking-widest font-bold text-[#7ad3b0]">{s.stage}</div>
                <h3 className="mt-2 font-bold text-lg leading-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-white/70">{s.desc}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#7ad3b0] border-t border-white/10 pt-3"><span className="w-2 h-2 rounded-full bg-[#7ad3b0] animate-pulse" />{s.check}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-14">
        <div className="text-center max-w-[760px] mx-auto">
          <div className="text-[11px] tracking-[0.16em] font-bold text-[#1e6b52]">SMART RECONCILIATION</div>
          <h2 className="mt-2 text-[30px] font-bold">AI: Built around real use cases, not hype</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-8 rounded-2xl border border-[#d2e5db] bg-white p-6">
          <div className="flex justify-center"><span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0f241c] text-white text-sm font-bold">3-way matching <span className="w-6 h-6 rounded-full bg-white text-[#0f241c] grid place-items-center text-xs">✓</span></span></div>
          <div className="mt-6 grid lg:grid-cols-3 gap-4">
            {[
              { label: "PURCHASE ORDER", id: "PO-8902", sum: "$14,250.00" },
              { label: "GOODS RECEIPT", id: "GRN-4421", sum: "Bay 04 - Austin" },
              { label: "VENDOR INVOICE", id: "INV-7730", sum: "$14,250.00" },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -3 }} className="rounded-xl bg-[#081711] text-white p-4 border border-[#1b3d2c]">
                <div className="text-[10px] tracking-widest font-bold text-white/60">{c.label}</div>
                <div className="mt-1 font-mono font-bold">{c.id}</div>
                <div className="mt-2 text-sm text-[#7ad3b0] font-semibold">{c.sum}</div>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-[#e8f5ee] border border-[#cfe8d9] p-4">
            <div className="flex items-center gap-2 text-sm"><span className="w-7 h-7 rounded-full bg-[#1e6b52] text-white grid place-items-center">✓</span>Reconciliation complete: 0 variances. Queued for AP settlement.</div>
            <span className="px-3 py-1.5 rounded-full bg-[#0f241c] text-white text-xs font-bold">AUTOMATICALLY RELEASED</span>
          </div>
        </motion.div>
      </section>

      <section className="bg-[#f0f7f3] border-y border-[#d2e5db] py-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center max-w-[820px] mx-auto">
            <div className="text-[11px] tracking-[0.16em] font-bold text-[#1e6b52]">CONFIGURABLE COMPLIANCE ENGINE</div>
            <h2 className="mt-2 text-[30px] font-bold">Hospitality Governance & Purchasing Policy Engine</h2>
          </div>
          <div className="mt-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
            <div className="rounded-2xl bg-[#0f241c] text-white p-6 border border-[#1a3328]">
              <div className="flex justify-between items-start"><h3 className="font-bold">Hospitality DoA Threshold Matrix</h3><span className="text-[10px] font-bold tracking-widest px-2 py-1 rounded-full bg-white/10 border border-white/15">HOTEL-POLICY-v4</span></div>
              <div className="mt-4 space-y-2">
                {[
                  { tier: "Tier 1: Department Head", who: "Exec Chef, Housekeeping, Spa Director", limit: "< $2,500" },
                  { tier: "Tier 2: Property & Cluster GM", who: "General Manager sign-off", limit: "< $15,000" },
                  { tier: "Tier 3: VP Finance & Board", who: "Corporate Treasury", limit: "> $50,000" },
                ].map((r, i) => (
                  <motion.div key={r.tier} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex justify-between items-center rounded-xl bg-white/5 border border-white/10 p-3">
                    <div><div className="text-sm font-semibold">{r.tier}</div><div className="text-xs text-white/60">{r.who}</div></div>
                    <div className="text-sm font-mono font-bold">{r.limit}</div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-2xl bg-white border border-[#d2e5db] p-5"><div className="text-[10px] tracking-widest font-bold text-[#749688]">CAPEX VS OPEX SPLIT</div><h3 className="mt-1 font-bold">Automated Budget Reservation</h3><p className="mt-1 text-sm text-[#3d5c4f]">Chillers, table linens and FF&E partitioned with real-time hold.</p></div>
              <div className="rounded-2xl bg-white border border-[#d2e5db] p-5"><div className="text-[10px] tracking-widest font-bold text-[#749688]">RECEIVING BAY QA</div><h3 className="mt-1 font-bold">± 2.5% Price & Catch-Weight</h3><p className="mt-1 text-sm text-[#3d5c4f]">Perishables auto-pass in tolerance; variance alerts the dock.</p></div>
              <div className="rounded-2xl bg-[#1e6b52] text-white p-5"><div className="text-[10px] tracking-widest font-bold text-white/70">BANQUET EMERGENCY</div><h3 className="mt-1 font-bold">24-Hour Retro-Reconciliation</h3><p className="mt-1 text-sm text-white/80">Emergency POs queue for audited post-event reconciliation.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0f241c] text-white py-10">
        <div className="max-w-[1280px] mx-auto px-6 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="text-[11px] tracking-[0.16em] font-bold text-[#7ad3b0]">REAL-TIME INTELLIGENCE</div>
            <h2 className="mt-2 text-[28px] font-bold">Analytics for smarter spend insight</h2>
            <p className="mt-3 text-white/70">Uncover off-contract buying and consolidate vendors before invoices hit AP.</p>
          </div>
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl bg-white text-[#0f241c] p-5 border">
            <div className="flex justify-between"><div><div className="text-[10px] tracking-widest font-bold text-[#749688]">CASH OUTFLOW MATRIX</div><div className="font-bold">Bill Aging Split</div></div><div className="text-right"><div className="text-[10px] tracking-widest font-bold text-[#749688]">TOTAL</div><div className="font-extrabold text-lg">$150 k</div></div></div>
            <div className="mt-4 flex gap-1 h-3">
              <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} style={{ transformOrigin: "left" }} className="flex-[55] bg-[#1e6b52] rounded-full" />
              <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.32 }} style={{ transformOrigin: "left" }} className="flex-[30] bg-[#7ad3b0] rounded-full" />
              <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.44 }} style={{ transformOrigin: "left" }} className="flex-[15] bg-[#d2e5db] rounded-full" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-[#0f241c] text-white p-3"><div className="text-[10px]">CURRENT DUE</div><div className="font-bold">$82,400</div></div>
              <div className="rounded-xl bg-[#0f241c] text-white p-3"><div className="text-[10px]">OVERDUE 1-15</div><div className="font-bold">$53,800</div></div>
              <div className="rounded-xl bg-[#0f241c] text-white p-3"><div className="text-[10px]">OVERDUE 16-30</div><div className="font-bold">$13,800</div></div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 py-10">
        <div className="rounded-2xl border border-[#d2e5db] bg-white p-6">
          <div className="inline-flex items-center gap-2 text-xs font-bold"><span className="w-7 h-7 rounded-lg bg-[#0f241c] text-white grid place-items-center">Mc</span>McCain & Ray <span className="text-[#749688] font-normal">ENTERPRISE HOSPITALITY</span></div>
          <p className="mt-4 text-[18px] leading-7 font-medium">“Our procurement process has gone from heavy paper work and scattered to quick, organised, and easy to track. Approvals that used to get stuck in long email threads now happen very quickly.”</p>
          <div className="mt-4 text-sm"><span className="font-bold">Harsh Sarkar</span><span className="text-[#749688]"> — Manager, Operations</span></div>
        </div>
      </section>

      <section className="max-w-[900px] mx-auto px-6 py-10">
        <h2 className="text-[28px] font-bold text-center">Frequently Asked Questions</h2>
        <div className="mt-6 divide-y border rounded-2xl overflow-hidden bg-white">
          {faqs.map((f, i) => (
            <div key={f.q}>
              <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="w-full flex justify-between items-center p-5 text-left">
                <span className="font-semibold">{f.q}</span>
                <span className="w-8 h-8 grid place-items-center rounded-full border">{openFaq === i ? "−" : "+"}</span>
              </button>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-5 pb-5 text-sm text-[#3d5c4f]">{f.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      <footer id="cta" className="bg-[#081711] text-white py-12 text-center">
        <div className="text-[11px] tracking-[0.16em] font-bold text-[#7ad3b0]">PROCUREMENT, IN PERFECT FLOW</div>
        <h2 className="mt-3 text-[34px] font-bold">Bring effortless calm to your hospitality procurement.</h2>
        <div className="mt-6 flex justify-center gap-3">
          <a href={APP_URL} className="h-12 px-7 rounded-full bg-[#1e6b52] font-semibold inline-flex items-center">Step into your procurement flow →</a>
          <a href="#demo" className="h-12 px-7 rounded-full bg-white text-[#0f241c] font-semibold inline-flex items-center">Request a demo</a>
        </div>
      </footer>
    </div>
  );
}
