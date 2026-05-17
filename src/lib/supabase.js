import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wvbszmjqpfgrhjqpuccu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2YnN6bWpxcGZncmhqcXB1Y2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTE3MjIsImV4cCI6MjA5MzY4NzcyMn0.YVm7ddsL9pVvU-iMIe8R1VtmjguyGEeF_XqtanyMBek'

export const supabase = createClient(supabaseUrl, supabaseKey)
