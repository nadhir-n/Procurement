import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { api, getHealth } from "./api";

declare global {
  interface Window {
    catalyst?: {
      auth?: {
        signIn?: (containerId: string, opts?: Record<string, string>) => Promise<unknown> | void;
        signOut?: (redirect?: string) => void;
        isUserAuthenticated?: () => Promise<{ content?: Record<string, string> }>;
      };
    };
  }
}

type Phase = "checking" | "signin" | "workspace";

interface Workspace {
  orgName: string;
  orgStatus: string;
  userName: string;
  userEmail: string;
  userRole: string;
  counts: { properties: number; items: number; suppliers: number };
  backendVersion: string;
  setupRequired?: boolean;
  notice?: string;
}

function waitForSDK(timeoutMs = 6000): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const t = setInterval(() => {
      if (window.catalyst?.auth) {
        clearInterval(t);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(t);
        reject(new Error("SDK failed to load"));
      }
    }, 80);
  });
}

const APP_BASE = typeof window !== "undefined"
  ? ((typeof window !== "undefined" && /:(5173|5175)$/.test(window.location.port)) ? "http://localhost:5174" : "") || window.location.origin
  : "";

export function AuthPanel() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [message, setMessage] = useState("");
  const [sdkMissing, setSdkMissing] = useState(false);
  const [ws, setWs] = useState<Workspace | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = (() => {
          try {
            const v = sessionStorage.getItem("pf_login_msg") || "";
            sessionStorage.removeItem("pf_login_msg");
            return v;
          } catch {
            return "";
          }
        })();
        if (stored) setMessage(stored);

        // Dev preview (?dev=1): mock session, no Zoho needed.
        if (new URLSearchParams(window.location.search).get("dev") === "1") {
          if (!cancelled) {
            setWs({
              orgName: "Galle Face Hotel Group (LOCAL DEV)",
              orgStatus: "Active",
              userName: "Nadhir Noori (Dev)",
              userEmail: "test@procureflow.local",
              userRole: "Admin",
              counts: { properties: 0, items: 0, suppliers: 0 },
              backendVersion: "dev-bypass",
              notice: "DEV MODE: mock session — no live data.",
            });
            setPhase("workspace");
          }
          return;
        }

        const health = await getHealth().catch(() => ({ ok: false as const }));
        if (!health.ok) {
          if (!cancelled) {
            setMessage("Can't reach ProcureFlow. This is a connection problem, not your account.");
            setPhase("signin");
          }
          return;
        }

        await waitForSDK();
        const auth = await window.catalyst!.auth!.isUserAuthenticated!().catch(() => null);
        const cUser = auth?.content || {};
        const email = String(cUser.email_id || "").toLowerCase();
        if (!email) {
          if (!cancelled) setPhase("signin");
          return;
        }

        const sync = (await api("POST", "/api/sync-user", {}).catch((e: Error) => {
          throw e;
        })) as { setupRequired?: boolean; user?: Record<string, string>; notice?: string };
        if (sync.setupRequired) {
          if (!cancelled) {
            setWs({
              orgName: "New workspace",
              orgStatus: "Setup required",
              userName: `${cUser.first_name || ""} ${cUser.last_name || ""}`.trim() || email,
              userEmail: email,
              userRole: "",
              counts: { properties: 0, items: 0, suppliers: 0 },
              backendVersion: health.version || "",
              setupRequired: true,
            });
            setPhase("workspace");
          }
          return;
        }
        if (!sync.user) {
          if (!cancelled) {
            setMessage("This Zoho Account has not been invited to this Procurement workspace.");
            setPhase("signin");
          }
          return;
        }

        const orgs = (await api("GET", "/api/organizations").catch(() => [] as Array<Record<string, string>>)) as Array<Record<string, string>>;
        const properties = (await api("GET", "/api/properties").catch(() => [] as unknown[])) as unknown[];
        const items = (await api("GET", "/api/items").catch(() => [] as unknown[])) as unknown[];
        const suppliers = (await api("GET", "/api/suppliers").catch(() => [] as unknown[])) as unknown[];
        if (!cancelled) {
          setWs({
            orgName: orgs[0]?.Name || "Workspace",
            orgStatus: orgs[0]?.Status || "",
            userName: sync.user.FullName || email,
            userEmail: sync.user.Email || email,
            userRole: sync.user.Role || "",
            counts: { properties: properties.length, items: items.length, suppliers: suppliers.length },
            backendVersion: health.version || "",
            notice: sync.notice,
          });
          setPhase("workspace");
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "";
          if (/401|unauthor|session|sign in/i.test(msg)) {
            setPhase("signin");
          } else {
            setMessage(msg || "Something went wrong signing in.");
            setPhase("signin");
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== "signin" || mounted.current) return;
    mounted.current = true;
    try {
      const signIn = window.catalyst?.auth?.signIn;
      if (!signIn) {
        setSdkMissing(true);
        return;
      }
      const out = signIn("react-login-container", { login_redirect: `${window.location.origin}/#auth` });
      if (out && typeof (out as Promise<unknown>).catch === "function") {
        (out as Promise<unknown>).catch(() => {
          /* frame is authority; leave it mounted */
        });
      }
    } catch {
      setSdkMissing(true);
    }
  }, [phase]);

  const signOut = () => {
    try {
      window.catalyst?.auth?.signOut?.(`${window.location.origin}/#auth`);
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="rounded-2xl border border-[#d2e5db] bg-white p-6 sm:p-8 shadow-[0_24px_64px_rgba(15,41,30,0.10)]">
      {phase === "checking" && (
        <div className="py-10 text-center">
          <div className="mx-auto w-8 h-8 rounded-full border-2 border-[#d2e5db] border-t-[#1e6b52] animate-spin" />
          <p className="mt-4 text-sm text-[#3d5c4f]">Verifying your session…</p>
        </div>
      )}

      {phase === "signin" && (
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#1e6b52]">GOOD TO SEE YOU</p>
          <h3 className="mt-2 text-[26px] font-extrabold tracking-tight">Step into your procurement flow.</h3>
          <p className="mt-2 text-sm text-[#3d5c4f]">Sign in with the Zoho Account linked to your invitation. Your workspace is ready when you are.</p>
          <div id="react-login-container" className="mt-5 min-h-[60px]" aria-live="polite" />
          {sdkMissing && (
            <button onClick={() => window.location.reload()} className="mt-3 h-12 w-full rounded-full bg-[#1e6b52] text-white font-semibold hover:brightness-110">
              Reload secure sign-in
            </button>
          )}
          <a
            href={`${APP_BASE}/app/?dev=1`}
            className="mt-3 h-12 w-full rounded-full border border-dashed border-[#1e6b52] text-[#1e6b52] font-semibold inline-flex items-center justify-center hover:bg-[#f0faf8]"
          >
            ▶ Enter Demo Account — view inside without Zoho invite
          </a>
          <div className="mt-2 text-center text-[11px] text-[#749688]">demo@procureflow.local / Demo123! · local preview</div>
          {message && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm p-3" role="alert">
              {message}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-[#d2e5db] text-xs text-[#749688]">
            <strong className="text-[#0f291e]">Need help signing in?</strong> Use the recovery option in Zoho sign-in, or ask your Procurement administrator for an invitation.
          </div>
        </div>
      )}

      {phase === "workspace" && ws && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#1e6b52]">YOU&apos;RE SIGNED IN</p>
          <h3 className="mt-2 text-[26px] font-extrabold tracking-tight">{ws.orgName}</h3>
          <p className="mt-1 text-sm text-[#3d5c4f]">
            {ws.userName} · {ws.userEmail}
            {ws.userRole ? ` · ${ws.userRole}` : ""}
            {ws.orgStatus ? ` · ${ws.orgStatus}` : ""}
          </p>
          {ws.notice && <div className="mt-3 rounded-xl bg-[#e8f5ee] border border-[#cfe8d9] text-sm p-3">{ws.notice}</div>}
          {!ws.setupRequired && (
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-[#f8fbf9] border p-3"><div className="text-xl font-extrabold">{ws.counts.properties}</div><div className="text-[11px] text-[#749688]">Properties</div></div>
              <div className="rounded-xl bg-[#f8fbf9] border p-3"><div className="text-xl font-extrabold">{ws.counts.items}</div><div className="text-[11px] text-[#749688]">Items</div></div>
              <div className="rounded-xl bg-[#f8fbf9] border p-3"><div className="text-xl font-extrabold">{ws.counts.suppliers}</div><div className="text-[11px] text-[#749688]">Suppliers</div></div>
            </div>
          )}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a href={`${APP_BASE}/app/`} className="h-12 px-7 rounded-full bg-[#1e6b52] text-white font-semibold inline-flex items-center justify-center hover:brightness-110">
              {ws.setupRequired ? "Set up your hotel group →" : "Continue to workspace →"}
            </a>
            <button onClick={signOut} className="h-12 px-7 rounded-full border border-[#0f241c]/40 font-semibold hover:bg-[#f0f7f3]">
              Sign out
            </button>
          </div>
          {ws.backendVersion && <div className="mt-4 text-[11px] text-[#749688]">Backend {ws.backendVersion}</div>}
        </motion.div>
      )}
    </div>
  );
}
