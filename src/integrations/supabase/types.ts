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
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: Database['public']['Enums']['financial_entry_type'];
          icon: string;
          color: string;
          is_active: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          type: Database['public']['Enums']['financial_entry_type'];
          icon?: string;
          color?: string;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: Database['public']['Enums']['financial_entry_type'];
          icon?: string;
          color?: string;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          category_id: string | null;
          type: Database['public']['Enums']['financial_entry_type'];
          description: string;
          amount: string;
          transaction_date: string;
          notes: string | null;
          client_mutation_id: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          account_id: string;
          category_id?: string | null;
          type: Database['public']['Enums']['financial_entry_type'];
          description: string;
          amount: string;
          transaction_date: string;
          notes?: string | null;
          client_mutation_id: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string;
          category_id?: string | null;
          type?: Database['public']['Enums']['financial_entry_type'];
          description?: string;
          amount?: string;
          transaction_date?: string;
          notes?: string | null;
          client_mutation_id?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_transaction: {
        Args: {
          p_account_id: string;
          p_category_id: string | null;
          p_type: Database['public']['Enums']['financial_entry_type'];
          p_description: string;
          p_amount: string;
          p_transaction_date: string;
          p_notes: string | null;
          p_client_mutation_id: string;
        };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      ensure_default_categories: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      soft_delete_transaction: {
        Args: {
          p_transaction_id: string;
        };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      update_transaction: {
        Args: {
          p_transaction_id: string;
          p_account_id: string;
          p_category_id: string | null;
          p_type: Database['public']['Enums']['financial_entry_type'];
          p_description: string;
          p_amount: string;
          p_transaction_date: string;
          p_notes: string | null;
        };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
    };
    Enums: {
      account_type: 'corrente' | 'poupanca' | 'investimento' | 'carteira';
      financial_entry_type: 'income' | 'expense';
    };
    CompositeTypes: Record<string, never>;
  };
};
