import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cpgdayafavcifnirtkla.supabase.co'
const supabasePublishableKey = 'sb_publishable_Mvseo1W1jvF9_8ahTxQ0QQ_hUm8tE3D'

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
