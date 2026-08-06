export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          bank: string;
          type: Database['public']['Enums']['account_type'];
          color: string;
          icon: string;
          initial_balance: string;
          current_balance: string;
          is_active: boolean;
          is_primary: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          bank: string;
          type: Database['public']['Enums']['account_type'];
          color: string;
          icon: string;
          initial_balance: string;
          current_balance: string;
          is_active?: boolean;
          is_primary?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          bank?: string;
          type?: Database['public']['Enums']['account_type'];
          color?: string;
          icon?: string;
          initial_balance?: string;
          current_balance?: string;
          is_active?: boolean;
          is_primary?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_type: 'corrente' | 'poupanca' | 'investimento' | 'carteira';
    };
    CompositeTypes: Record<string, never>;
  };
};
