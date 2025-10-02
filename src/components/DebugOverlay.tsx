// src/components/DebugOverlay.tsx
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type DebugOut = {
  label: string;
  at: string;
  data: unknown;
};

export default function DebugOverlay() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<DebugOut | null>(null);

  const show = (label: string, data: unknown) =>
    setOut({ label, at: new Date().toISOString(), data });

  const btn =
    "px-3 h-9 rounded border border-gray-300 bg-white hover:bg-gray-50 text-sm";
  const row = "flex gap-2 flex-wrap";

  async function checkSession() {
    setErr(null);
    setBusy(true);
    const { data, error } = await supabase.auth.getSession();
    setBusy(false);
    if (error) return setErr(error.message);
    show("session", data);
  }

  async function checkUser() {
    setErr(null);
    setBusy(true);
    const { data, error } = await supabase.auth.getUser();
    setBusy(false);
    if (error) return setErr(error.message);
    show("user", data);
  }

  async function getEntitlement() {
    setErr(null);
    setBusy(true);
    const { data, error } = await supabase
      .from("v_user_entitlement")
      .select("*")
      .maybeSingle();
    setBusy(false);
    if (error) return setErr(error.message);
    show("v_user_entitlement", data);
  }

  async function getProfile() {
    setErr(null);
    setBusy(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,is_paid,trial_used,trial_ends_at,current_period_end")
      .maybeSingle();
    setBusy(false);
    if (error) return setErr(error.message);
    show("profiles", data);
  }

  async function startTrial() {
    setErr(null);
    setBusy(true);
    const { data: u, error: ue } = await supabase.auth.getUser();
    if (ue || !u?.user) {
      setBusy(false);
      return setErr("Pole sisse logitud.");
    }

    // Strong, explicit shape for the RPC
    const payload: { p_user: string; p_email: string } = {
      p_user: u.user.id,
      p_email: u.user.email ?? "",
    };

    const { data, error } = await supabase.rpc("start_trial_once", payload);
    setBusy(false);
    if (error) return setErr(error.message);
    show("start_trial_once", data);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-blue-600 text-white h-11 px-4 shadow hover:bg-blue-700"
        >
          Debug
        </button>
      ) : (
        <div className="w-[360px] max-w-[90vw] rounded-xl border border-gray-300 bg-white shadow-lg p-3 text-gray-900">
          <div className="flex items-center justify-between mb-2">
            <strong>Debug</strong>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-600 hover:underline"
            >
              sulge
            </button>
          </div>

          <div className={`${row} mb-2`}>
            <button className={btn} onClick={checkSession} disabled={busy}>
              Session
            </button>
            <button className={btn} onClick={checkUser} disabled={busy}>
              User
            </button>
            <button className={btn} onClick={getEntitlement} disabled={busy}>
              Entitlement
            </button>
            <button className={btn} onClick={getProfile} disabled={busy}>
              Profile
            </button>
          </div>

          <div className={`${row} mb-2`}>
            <button className={btn} onClick={startTrial} disabled={busy}>
              Start trial
            </button>
            <button
              className={btn}
              onClick={() => {
                window.location.href = "/pricing";
              }}
            >
              /pricing
            </button>
            <button
              className={btn}
              onClick={() => {
                window.location.href = "/";
              }}
            >
              /
            </button>
            <button
              className={btn}
              onClick={() => {
                setErr(null);
                setOut(null);
              }}
            >
              Clear
            </button>
          </div>

          {busy && <div className="text-sm text-gray-600 mb-2">Töötan…</div>}
          {err && <div className="text-sm text-red-600 mb-2">Error: {err}</div>}

          <pre className="bg-gray-100 rounded p-2 max-h-60 overflow-auto text-xs whitespace-pre-wrap break-all">
            {out ? JSON.stringify(out, null, 2) : "—"}
          </pre>
        </div>
      )}
    </div>
  );
}