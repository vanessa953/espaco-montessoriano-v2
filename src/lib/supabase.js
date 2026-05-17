import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wvbszmjqpfgrhjqpuccu.supabase.co'
const supabaseKey = 'sb_publishable_xxxxxxxxxxxxxxxxx'

export const supabase = createClient(supabaseUrl, supabaseKey)
