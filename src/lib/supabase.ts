import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ENV } from '../config/env';

class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient;

  private constructor() {
    this.client = createClient(
      ENV.SUPABASE_URL,
      ENV.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        global: {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        }
      }
    );
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }
}

// Export a single instance of the Supabase client
export const supabase = SupabaseService.getInstance().getClient();
