export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
}

export const isBackendConfigured = Boolean(config.supabaseUrl && config.supabasePublishableKey)
