"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login, register, demoLogin } from "@/lib/actions";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : register, {});
  const input = "w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-violet";
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-[14px] border border-line bg-surface/60 p-8" noValidate>
        <Link href="/" className="flex items-center justify-center gap-2 font-display text-3xl font-extrabold"><span className="holo-bg h-8 w-8 rounded-full" />Lumio</Link>
        <h1 className="text-center text-sm text-muted">{mode === "login" ? "Welcome back" : "Create your gallery"}</h1>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <label className="block text-sm">Email<input name="email" type="email" required autoComplete="email" className={`${input} mt-1`} /></label>
        {mode === "register" && <label className="block text-sm">Username<input name="username" required pattern="[a-z0-9._]{3,24}" className={`${input} mt-1`} /></label>}
        <label className="block text-sm">Password<input name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} className={`${input} mt-1`} /></label>
        {state?.error && <p role="alert" className="text-sm text-[#F0445A]">{state.error}</p>}
        <button disabled={pending} className="w-full rounded-xl bg-violet py-3 font-semibold text-white hover:bg-violet-bright disabled:opacity-60">{pending ? "…" : mode === "login" ? "Log in" : "Sign up"}</button>
        <button type="button" disabled title="Configure GOOGLE_CLIENT_ID to enable" className="w-full rounded-xl border border-line py-3 text-sm text-muted">Continue with Google (needs keys)</button>
        {mode === "login" && <p className="text-center text-xs text-muted">Forgot password? A reset link is logged to the server console in this demo.</p>}
        <p className="text-center text-sm text-muted">{mode === "login" ? <>New here? <Link href="/register" className="text-vtext">Sign up</Link></> : <>Have an account? <Link href="/login" className="text-vtext">Log in</Link></>}</p>
        <div className="rounded-xl bg-elev p-3 text-xs text-muted">
          <p className="mb-2">One-click demo access (fictional accounts, password <b>lumio-demo</b>):</p>
          <div className="grid grid-cols-2 gap-2">
            {[["Member", "maya@lumio.demo"], ["Private member", "ren@lumio.demo"], ["Moderator", "mod@lumio.demo"], ["Admin", "admin@lumio.demo"]].map(([l, e]) => (
              <button key={e} type="button" onClick={() => demoLogin(e)} className="min-h-10 rounded-lg border border-line bg-surface px-2 font-semibold text-fg hover:border-violet">{l}</button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
