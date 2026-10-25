"use client";
import Link from "next/link";
import { useState } from "react";
import { categories } from "@/config/media";
import FollowButton from "./FollowButton";

type S = { id: number; username: string; avatar: string; name: string };
export default function Onboarding({ username, avatar, suggestions }: { username: string; avatar: string; suggestions: S[] }) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[14px] border border-line bg-surface p-8">
        <div className="mb-6 flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "holo-bg" : "bg-line"}`} />)}</div>
        <div key={step} className="animate-rise">
          {step === 0 && <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="holo-ring mx-auto inline-block"><img src={avatar} alt="Your avatar" className="h-24 w-24 bg-elev" /></span>
            <h1 className="mt-4 text-2xl font-extrabold">Hi, @{username}</h1>
            <p className="mt-2 text-sm text-muted">This is your generated avatar. Edit your profile any time in Settings. (Verification email logged to server console.)</p>
          </div>}
          {step === 1 && <div>
            <h1 className="text-2xl font-extrabold">What do you love?</h1>
            <div className="mt-4 flex flex-wrap gap-2">{categories.slice(1).map((c) => <button key={c} aria-pressed={picks.includes(c)} onClick={() => setPicks((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c])} className={`min-h-11 rounded-full border px-4 text-sm ${picks.includes(c) ? "border-violet bg-violet text-white" : "border-line"}`}>{c}</button>)}</div>
          </div>}
          {step === 2 && <div>
            <h1 className="text-2xl font-extrabold">Follow a few accounts</h1>
            <ul className="mt-4 space-y-3">{suggestions.map((s) => <li key={s.id} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.avatar} alt="" className="h-10 w-10 rounded-full bg-elev" /><span className="flex-1 text-sm font-semibold">{s.username}</span><FollowButton userId={s.id} initial={null} /></li>)}</ul>
          </div>}
        </div>
        <div className="mt-8 flex justify-between">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="text-sm text-muted" disabled={step === 0}>Back</button>
          {step < 2 ? <button onClick={() => setStep(step + 1)} className="rounded-xl bg-violet px-6 py-2.5 font-semibold text-white">Next</button> : <Link href="/home" className="rounded-xl bg-violet px-6 py-2.5 font-semibold text-white">Start exploring</Link>}
        </div>
      </div>
    </div>
  );
}
