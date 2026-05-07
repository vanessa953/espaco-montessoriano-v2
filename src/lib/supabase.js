import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wvbszmjqpfgrhjqpuccu.supabase.co'
const supabaseKey = 'sb_publishable_SUA_CHAVE_COMPLETA'

export const supabase = createClient(supabaseUrl, supabaseKey)
