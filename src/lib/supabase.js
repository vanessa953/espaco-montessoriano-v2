import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wvbszmjqpfgrhjqpuccu.supabase.co'
const supabaseKey = 'COLE_A_CHAVE_COMPLETA_AQUI'

export const supabase = createClient(supabaseUrl, supabaseKey)
