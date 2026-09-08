import { createClient } from '@supabase/supabase-js'
import { config, isBackendConfigured } from './config'

export const supabase = isBackendConfigured
  ? createClient(config.supabaseUrl!, config.supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
