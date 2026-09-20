const defaultSupabaseUrl = 'https://yaojcuvgtlncytujfxef.supabase.co'
const defaultSupabasePublishableKey = 'sb_publishable_1I9IaLqTW-sGko4qFYFACw_ccfK_Dp7'

export const config = {
  // Vercel/other hosts can override these values with environment variables.
  // The fallback key is Supabase's browser-safe publishable key; authorization
  // still depends on Supabase Auth + RLS, not secrecy of this client value.
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string | undefined) || defaultSupabaseUrl,
  supabasePublishableKey:
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || defaultSupabasePublishableKey,
}

export const isBackendConfigured = Boolean(config.supabaseUrl && config.supabasePublishableKey)
