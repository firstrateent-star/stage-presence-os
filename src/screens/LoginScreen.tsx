import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function signIn() {
    if (!supabase) return
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-xs font-semibold tracking-[0.22em] text-amber-500">STAGE PRESENCE</div>
        <h1 className="mt-2 text-3xl font-semibold">Internal OS</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">Authorized Stage Presence users only.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="mt-8 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-amber-600" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-amber-600" />
        {message && <p className="mt-3 text-sm text-red-300">{message}</p>}
        <button type="button" onClick={signIn} className="mt-5 w-full rounded-xl bg-amber-500 px-5 py-3 font-bold text-zinc-950">Sign in</button>
      </div>
    </div>
  )
}
