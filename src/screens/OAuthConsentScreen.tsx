import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type AuthorizationDetails = {
  authorization_id: string
  redirect_uri?: string
  scope?: string
  client?: {
    name?: string
  }
}

export function OAuthConsentScreen() {
  const authorizationId = useMemo(
    () => new URLSearchParams(window.location.search).get('authorization_id') ?? '',
    [],
  )
  const [details, setDetails] = useState<AuthorizationDetails | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supabase) return
    if (!authorizationId) {
      setMessage('Missing authorization request.')
      return
    }

    let active = true

    void (async () => {
      const oauth = (supabase.auth as any).oauth
      if (!oauth?.getAuthorizationDetails) {
        if (active) setMessage('OAuth authorization is not available in this app build yet.')
        return
      }

      const { data, error } = await oauth.getAuthorizationDetails(authorizationId)
      if (!active) return

      if (error || !data) {
        setMessage(error?.message ?? 'Invalid authorization request.')
        return
      }

      if (!('authorization_id' in data)) {
        window.location.replace(data.redirect_url)
        return
      }

      setDetails(data as AuthorizationDetails)
    })()

    return () => {
      active = false
    }
  }, [authorizationId])

  async function decide(decision: 'approve' | 'deny') {
    if (!supabase || !authorizationId) return
    setBusy(true)
    setMessage(null)

    try {
      const oauth = (supabase.auth as any).oauth
      const operation =
        decision === 'approve'
          ? oauth?.approveAuthorization
          : oauth?.denyAuthorization

      if (!operation) throw new Error('OAuth authorization is not available in this app build yet.')

      const { data, error } = await operation.call(oauth, authorizationId)
      if (error || !data?.redirect_url) {
        throw new Error(error?.message ?? 'Authorization could not be completed.')
      }

      window.location.replace(data.redirect_url)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
      setBusy(false)
    }
  }

  const scopes = details?.scope?.split(' ').map((item) => item.trim()).filter(Boolean) ?? []

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090909] px-4 text-zinc-100">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="text-xs font-semibold tracking-[0.22em] text-amber-500">STAGE PRESENCE</div>
        <h1 className="mt-3 text-2xl font-semibold">Connect an AI assistant</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Review the request before allowing access to Stage Presence.
        </p>

        {message ? (
          <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {message}
          </div>
        ) : !details ? (
          <div className="mt-6 text-sm text-zinc-500">Loading authorization request…</div>
        ) : (
          <>
            <div className="mt-6 space-y-4 rounded-xl border border-zinc-800 bg-black/20 p-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-600">Application</div>
                <div className="mt-1 font-semibold text-zinc-200">{details.client?.name || 'AI connector'}</div>
              </div>

              {details.redirect_uri && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-600">Return address</div>
                  <div className="mt-1 break-all text-zinc-400">{details.redirect_uri}</div>
                </div>
              )}

              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-600">Requested access</div>
                {scopes.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {scopes.map((scope) => (
                      <span key={scope} className="rounded-full border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                        {scope}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 text-zinc-400">Stage Presence MCP access</div>
                )}
              </div>
            </div>

            <p className="mt-5 text-xs leading-5 text-zinc-600">
              Access is limited by your existing Stage Presence account and database permissions.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void decide('deny')}
                className="flex-1 rounded-xl border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 disabled:opacity-50"
              >
                Deny
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void decide('approve')}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50"
              >
                {busy ? 'Connecting…' : 'Allow'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
