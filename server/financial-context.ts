import { currentReferenceMonth } from './date.js';
import { addMoney } from './money.js';
import type { AuthenticatedRequestContext } from './supabase.js';

export type FinancialContext = {
  accounts: {
    count: number;
    totalBalance: string;
  };
  cards: {
    availableLimit: string;
    id: string;
    limitAmount: string;
    name: string;
    utilizedAmount: string;
  }[];
  categoryBudgets: unknown[];
  goals: unknown[];
  monthlyPlan: unknown | null;
  projection3Months: unknown[];
  projection6Months?: unknown[];
  referenceMonth: string;
  upcomingCommitments: unknown[];
};

export type ContextToolName =
  | 'get_cashflow_projection'
  | 'get_category_spending'
  | 'get_credit_card_summary'
  | 'get_financial_goals'
  | 'get_financial_summary'
  | 'get_monthly_plan_status'
  | 'get_upcoming_commitments';

function getOutstanding(invoice: { paid_amount: string; status: string; total_amount: string }) {
  if (invoice.status === 'paid') {
    return '0.00';
  }

  return Math.max(Number(invoice.total_amount) - Number(invoice.paid_amount), 0).toFixed(2);
}

export function selectToolsForMessage(message: string): ContextToolName[] {
  const normalizedMessage = message.toLowerCase();
  const tools = new Set<ContextToolName>(['get_financial_summary']);

  if (/categoria|gastei|gastos|orcamento|orçamento|posso gastar|limite mensal/.test(normalizedMessage)) {
    tools.add('get_category_spending');
    tools.add('get_monthly_plan_status');
  }

  if (/cart[aã]o|fatura|limite/.test(normalizedMessage)) {
    tools.add('get_credit_card_summary');
  }

  if (/meta|economia|objetivo/.test(normalizedMessage)) {
    tools.add('get_financial_goals');
    tools.add('get_monthly_plan_status');
  }

  if (/proje[cç][aã]o|final do m[eê]s|futuro|parcel/.test(normalizedMessage)) {
    tools.add('get_cashflow_projection');
  }

  if (/compromisso|venc|recorr|pr[oó]xim/.test(normalizedMessage)) {
    tools.add('get_upcoming_commitments');
  }

  return [...tools].slice(0, 6);
}

export class FinancialContextService {
  constructor(private readonly requestContext: AuthenticatedRequestContext) {}

  async buildContext(tools: ContextToolName[], includeSixMonthProjection = false) {
    const context: FinancialContext = {
      accounts: {
        count: 0,
        totalBalance: '0.00'
      },
      cards: [],
      categoryBudgets: [],
      goals: [],
      monthlyPlan: null,
      projection3Months: [],
      referenceMonth: currentReferenceMonth(),
      upcomingCommitments: []
    };

    await Promise.all([
      tools.includes('get_financial_summary') ? this.loadAccounts(context) : Promise.resolve(),
      tools.includes('get_monthly_plan_status') ? this.loadMonthlyPlan(context) : Promise.resolve(),
      tools.includes('get_category_spending') ? this.loadCategoryBudgets(context) : Promise.resolve(),
      tools.includes('get_credit_card_summary') ? this.loadCards(context) : Promise.resolve(),
      tools.includes('get_financial_goals') ? this.loadGoals(context) : Promise.resolve(),
      tools.includes('get_cashflow_projection')
        ? this.loadProjection(context, includeSixMonthProjection)
        : Promise.resolve(),
      tools.includes('get_upcoming_commitments')
        ? this.loadUpcomingCommitments(context)
        : Promise.resolve()
    ]);

    return context;
  }

  private async loadAccounts(context: FinancialContext) {
    const { data, error, count } = await this.requestContext.client
      .from('accounts')
      .select('current_balance', { count: 'exact' })
      .eq('is_active', true)
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    context.accounts = {
      count: count ?? 0,
      totalBalance: (data ?? []).reduce(
        (total: string, account: { current_balance: string }) =>
          addMoney(total, account.current_balance),
        '0.00'
      )
    };
  }

  private async loadMonthlyPlan(context: FinancialContext) {
    const { data, error } = await this.requestContext.client.rpc('get_monthly_plan_overview', {
      p_reference_month: context.referenceMonth
    });

    if (error) {
      throw error;
    }

    context.monthlyPlan = data?.[0] ?? null;
  }

  private async loadCategoryBudgets(context: FinancialContext) {
    const { data, error } = await this.requestContext.client.rpc('get_category_budget_progress', {
      p_reference_month: context.referenceMonth
    });

    if (error) {
      throw error;
    }

    context.categoryBudgets = data ?? [];
  }

  private async loadCards(context: FinancialContext) {
    const { data: cards, error: cardsError } = await this.requestContext.client
      .from('credit_cards')
      .select('id,name,limit_amount')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (cardsError) {
      throw cardsError;
    }

    const cardRows = cards ?? [];
    const cardIds = cardRows.map((card: { id: string }) => card.id);

    if (cardIds.length === 0) {
      context.cards = [];
      return;
    }

    const { data: invoices, error: invoicesError } = await this.requestContext.client
      .from('credit_card_invoices')
      .select('credit_card_id,total_amount,paid_amount,status')
      .in('credit_card_id', cardIds);

    if (invoicesError) {
      throw invoicesError;
    }

    context.cards = cardRows.map((card: { id: string; limit_amount: string; name: string }) => {
      const utilizedAmount = (invoices ?? [])
        .filter((invoice: { credit_card_id: string }) => invoice.credit_card_id === card.id)
        .reduce((total: string, invoice: { paid_amount: string; status: string; total_amount: string }) => {
          return addMoney(total, getOutstanding(invoice));
        }, '0.00');

      return {
        availableLimit: Math.max(Number(card.limit_amount) - Number(utilizedAmount), 0).toFixed(2),
        id: card.id,
        limitAmount: card.limit_amount,
        name: card.name,
        utilizedAmount
      };
    });
  }

  private async loadGoals(context: FinancialContext) {
    const { data, error } = await this.requestContext.client
      .from('financial_goals')
      .select('name,target_amount,current_amount,target_date,status,type')
      .is('deleted_at', null)
      .order('target_date', { ascending: true, nullsFirst: false })
      .limit(12);

    if (error) {
      throw error;
    }

    context.goals = data ?? [];
  }

  private async loadProjection(context: FinancialContext, includeSixMonthProjection: boolean) {
    const [{ data: threeMonthData, error: threeMonthError }, sixMonthResponse] =
      await Promise.all([
        this.requestContext.client.rpc('get_financial_projection', {
          p_horizon_months: 3
        }),
        includeSixMonthProjection
          ? this.requestContext.client.rpc('get_financial_projection', {
              p_horizon_months: 6
            })
          : Promise.resolve({ data: undefined, error: null })
      ]);

    if (threeMonthError) {
      throw threeMonthError;
    }

    if (sixMonthResponse.error) {
      throw sixMonthResponse.error;
    }

    context.projection3Months = threeMonthData ?? [];
    context.projection6Months = sixMonthResponse.data;
  }

  private async loadUpcomingCommitments(context: FinancialContext) {
    const { data, error } = await this.requestContext.client.rpc('get_upcoming_commitments', {
      p_horizon_days: 45
    });

    if (error) {
      throw error;
    }

    context.upcomingCommitments = data ?? [];
  }
}
