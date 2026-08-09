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
      credit_card_invoice_payments: {
        Row: {
          id: string;
          user_id: string;
          invoice_id: string;
          account_id: string;
          amount: string;
          paid_at: string;
          client_mutation_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          invoice_id: string;
          account_id: string;
          amount: string;
          paid_at?: string;
          client_mutation_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          invoice_id?: string;
          account_id?: string;
          amount?: string;
          paid_at?: string;
          client_mutation_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_card_invoice_payments_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_card_invoice_payments_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'credit_card_invoices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_card_invoice_payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      credit_card_installment_plans: {
        Row: {
          id: string;
          user_id: string;
          credit_card_id: string;
          category_id: string | null;
          description: string;
          total_amount: string;
          installment_count: number;
          purchase_date: string;
          notes: string | null;
          client_mutation_id: string;
          status: Database['public']['Enums']['credit_card_installment_plan_status'];
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          credit_card_id: string;
          category_id?: string | null;
          description: string;
          total_amount: string;
          installment_count: number;
          purchase_date: string;
          notes?: string | null;
          client_mutation_id: string;
          status?: Database['public']['Enums']['credit_card_installment_plan_status'];
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          credit_card_id?: string;
          category_id?: string | null;
          description?: string;
          total_amount?: string;
          installment_count?: number;
          purchase_date?: string;
          notes?: string | null;
          client_mutation_id?: string;
          status?: Database['public']['Enums']['credit_card_installment_plan_status'];
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_card_installment_plans_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_card_installment_plans_credit_card_id_fkey';
            columns: ['credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_card_installment_plans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      credit_card_invoices: {
        Row: {
          id: string;
          user_id: string;
          credit_card_id: string;
          reference_month: string;
          closing_date: string;
          due_date: string;
          status: Database['public']['Enums']['credit_card_invoice_status'];
          total_amount: string;
          paid_amount: string;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          credit_card_id: string;
          reference_month: string;
          closing_date: string;
          due_date: string;
          status?: Database['public']['Enums']['credit_card_invoice_status'];
          total_amount?: string;
          paid_amount?: string;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          credit_card_id?: string;
          reference_month?: string;
          closing_date?: string;
          due_date?: string;
          status?: Database['public']['Enums']['credit_card_invoice_status'];
          total_amount?: string;
          paid_amount?: string;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_card_invoices_credit_card_id_fkey';
            columns: ['credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_card_invoices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      credit_card_transactions: {
        Row: {
          id: string;
          user_id: string;
          credit_card_id: string;
          invoice_id: string;
          category_id: string | null;
          description: string;
          amount: string;
          purchase_date: string;
          notes: string | null;
          client_mutation_id: string;
          installment_plan_id: string | null;
          installment_number: number | null;
          installment_count: number | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          credit_card_id: string;
          invoice_id: string;
          category_id?: string | null;
          description: string;
          amount: string;
          purchase_date: string;
          notes?: string | null;
          client_mutation_id: string;
          installment_plan_id?: string | null;
          installment_number?: number | null;
          installment_count?: number | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          credit_card_id?: string;
          invoice_id?: string;
          category_id?: string | null;
          description?: string;
          amount?: string;
          purchase_date?: string;
          notes?: string | null;
          client_mutation_id?: string;
          installment_plan_id?: string | null;
          installment_number?: number | null;
          installment_count?: number | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_card_transactions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_card_transactions_credit_card_id_fkey';
            columns: ['credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_card_transactions_installment_plan_id_fkey';
            columns: ['installment_plan_id'];
            isOneToOne: false;
            referencedRelation: 'credit_card_installment_plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_card_transactions_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'credit_card_invoices';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_card_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      credit_cards: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          bank: string;
          brand: string | null;
          last_four: string | null;
          limit_amount: string;
          closing_day: number;
          due_day: number;
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
          bank: string;
          brand?: string | null;
          last_four?: string | null;
          limit_amount: string;
          closing_day: number;
          due_day: number;
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
          bank?: string;
          brand?: string | null;
          last_four?: string | null;
          limit_amount?: string;
          closing_day?: number;
          due_day?: number;
          color?: string;
          is_active?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_cards_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      recurring_transaction_occurrences: {
        Row: {
          id: string;
          user_id: string;
          recurring_transaction_id: string;
          transaction_id: string;
          reference_period: string;
          scheduled_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          recurring_transaction_id: string;
          transaction_id: string;
          reference_period: string;
          scheduled_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recurring_transaction_id?: string;
          transaction_id?: string;
          reference_period?: string;
          scheduled_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recurring_transaction_occurrences_recurring_transaction_id_fkey';
            columns: ['recurring_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'recurring_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recurring_transaction_occurrences_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recurring_transaction_occurrences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      recurring_transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          category_id: string | null;
          type: Database['public']['Enums']['financial_entry_type'];
          description: string;
          amount: string;
          frequency: Database['public']['Enums']['recurring_transaction_frequency'];
          day_of_month: number;
          start_date: string;
          end_date: string | null;
          status: Database['public']['Enums']['recurring_transaction_status'];
          last_generated_period: string | null;
          notes: string | null;
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
          frequency?: Database['public']['Enums']['recurring_transaction_frequency'];
          day_of_month: number;
          start_date: string;
          end_date?: string | null;
          status?: Database['public']['Enums']['recurring_transaction_status'];
          last_generated_period?: string | null;
          notes?: string | null;
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
          frequency?: Database['public']['Enums']['recurring_transaction_frequency'];
          day_of_month?: number;
          start_date?: string;
          end_date?: string | null;
          status?: Database['public']['Enums']['recurring_transaction_status'];
          last_generated_period?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recurring_transactions_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recurring_transactions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recurring_transactions_user_id_fkey';
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
          recurring_transaction_id: string | null;
          recurrence_period: string | null;
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
          recurring_transaction_id?: string | null;
          recurrence_period?: string | null;
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
          recurring_transaction_id?: string | null;
          recurrence_period?: string | null;
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
            foreignKeyName: 'transactions_recurring_transaction_id_fkey';
            columns: ['recurring_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'recurring_transactions';
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
      cancel_credit_card_installment_plan: {
        Args: {
          p_installment_plan_id: string;
        };
        Returns: Database['public']['Tables']['credit_card_installment_plans']['Row'];
      };
      cancel_recurring_transaction: {
        Args: {
          p_recurring_transaction_id: string;
        };
        Returns: Database['public']['Tables']['recurring_transactions']['Row'];
      };
      create_credit_card_installment_purchase: {
        Args: {
          p_credit_card_id: string;
          p_category_id: string;
          p_description: string;
          p_total_amount: string;
          p_purchase_date: string;
          p_notes: string | null;
          p_installment_count: number;
          p_client_mutation_id: string;
        };
        Returns: Database['public']['Tables']['credit_card_installment_plans']['Row'];
      };
      create_credit_card_purchase: {
        Args: {
          p_credit_card_id: string;
          p_category_id: string;
          p_description: string;
          p_amount: string;
          p_purchase_date: string;
          p_notes: string | null;
          p_client_mutation_id: string;
        };
        Returns: Database['public']['Tables']['credit_card_transactions']['Row'];
      };
      create_recurring_transaction: {
        Args: {
          p_account_id: string;
          p_category_id: string | null;
          p_type: Database['public']['Enums']['financial_entry_type'];
          p_description: string;
          p_amount: string;
          p_day_of_month: number;
          p_start_date: string;
          p_end_date: string | null;
          p_notes: string | null;
        };
        Returns: Database['public']['Tables']['recurring_transactions']['Row'];
      };
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
      generate_due_recurring_transactions: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      pay_credit_card_invoice: {
        Args: {
          p_invoice_id: string;
          p_account_id: string;
          p_amount: string;
          p_client_mutation_id: string;
        };
        Returns: Database['public']['Tables']['credit_card_invoice_payments']['Row'];
      };
      refresh_credit_card_invoice_status: {
        Args: {
          p_invoice_id: string;
        };
        Returns: Database['public']['Enums']['credit_card_invoice_status'];
      };
      soft_delete_credit_card_purchase: {
        Args: {
          p_credit_card_transaction_id: string;
        };
        Returns: Database['public']['Tables']['credit_card_transactions']['Row'];
      };
      soft_delete_transaction: {
        Args: {
          p_transaction_id: string;
        };
        Returns: Database['public']['Tables']['transactions']['Row'];
      };
      pause_recurring_transaction: {
        Args: {
          p_recurring_transaction_id: string;
        };
        Returns: Database['public']['Tables']['recurring_transactions']['Row'];
      };
      update_credit_card_purchase: {
        Args: {
          p_credit_card_transaction_id: string;
          p_credit_card_id: string;
          p_category_id: string;
          p_description: string;
          p_amount: string;
          p_purchase_date: string;
          p_notes: string | null;
        };
        Returns: Database['public']['Tables']['credit_card_transactions']['Row'];
      };
      update_credit_card_installment_plan: {
        Args: {
          p_installment_plan_id: string;
          p_category_id: string;
          p_description: string;
          p_notes: string | null;
        };
        Returns: Database['public']['Tables']['credit_card_installment_plans']['Row'];
      };
      update_recurring_transaction: {
        Args: {
          p_recurring_transaction_id: string;
          p_account_id: string;
          p_category_id: string | null;
          p_type: Database['public']['Enums']['financial_entry_type'];
          p_description: string;
          p_amount: string;
          p_day_of_month: number;
          p_start_date: string;
          p_end_date: string | null;
          p_notes: string | null;
        };
        Returns: Database['public']['Tables']['recurring_transactions']['Row'];
      };
      resume_recurring_transaction: {
        Args: {
          p_recurring_transaction_id: string;
        };
        Returns: Database['public']['Tables']['recurring_transactions']['Row'];
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
      credit_card_installment_plan_status: 'active' | 'cancelled' | 'completed';
      credit_card_invoice_status: 'open' | 'closed' | 'paid';
      financial_entry_type: 'income' | 'expense';
      recurring_transaction_frequency: 'monthly';
      recurring_transaction_status: 'active' | 'paused' | 'cancelled';
    };
    CompositeTypes: Record<string, never>;
  };
};
