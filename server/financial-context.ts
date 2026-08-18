import { currentReferenceMonth } from './date.js';
import { addMoney, formatCurrency, subtractMoney } from './money.js';
import type { AuthenticatedRequestContext } from './supabase.js';

export type FinancialContextBudget = {
  budget: string;
  category: string;
  forecast: string;
  projectedAmount: string;
  realized: string;
  remaining: string;
  status: string;
  utilizationPercent: number;
};

export type FinancialContextGoal = {
  currentAmount: string;
  name: string;
  progressPercent: number;
  remainingAmount: string;
  targetAmount: string;
};

export type FinancialContext = {
  balances: {
    projectedEndOfMonth: string;
    safeToSpend: string;
    total: string;
  };
  budgets: FinancialContextBudget[];
  creditCards: {
    availableLimit: string;
    nextInvoiceAmount: string;
    totalLimit: string;
    usedLimit: string;
  };
  goals: FinancialContextGoal[];
  month: {
    expenseForecast: string;
    expenseRealized: string;
    incomeForecast: string;
    incomeRealized: string;
  };
  monthlyPlan: {
    invoice_cash_obligation: string;
    minimum_reserve_amount: string;
    monthly_budget_total: string;
    projected_month_end_balance: string;
    projected_expense_total: string;
    projected_income_total: string;
    realized_expense: string;
    realized_income: string;
    safe_to_spend: string;
    savings_target: string;
    spending_limit: string | null;
  } | null;
  referenceMonth: string;
  upcomingCommitments: Array<{
    amount: string;
    date: string;
    description: string;
    type: string;
  }>;
};

export type ContextToolName =
  | 'get_cashflow_projection'
  | 'get_category_spending'
  | 'get_credit_card_summary'
  | 'get_financial_goals'
  | 'get_financial_summary'
  | 'get_monthly_plan_status'
  | 'get_upcoming_commitments';

function toPercent(value: string | null | undefined) {
  const numeric = Number(value ?? '0');
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

function toCommitmentType(detail: string) {
  if (/fatura/i.test(detail)) {
    return 'invoice';
  }

  if (/meta/i.test(detail)) {
    return 'goal';
  }

  if (/parcela/i.test(detail)) {
    return 'installment';
  }

  if (/receita/i.test(detail)) {
    return 'recurring_income';
  }

  return 'recurring_expense';
}

export function selectToolsForMessage(message: string): ContextToolName[] {
  const normalizedMessage = message.toLowerCase();
  const tools = new Set<ContextToolName>([
    'get_financial_summary',
    'get_monthly_plan_status',
    'get_category_spending',
    'get_financial_goals',
    'get_upcoming_commitments'
  ]);

  if (/cart[aã]o|fatura|limite/.test(normalizedMessage)) {
    tools.add('get_credit_card_summary');
  }

  if (/proje[cç][aã]o|final do m[eê]s|futuro|parcel|compra|posso comprar/.test(normalizedMessage)) {
    tools.add('get_cashflow_projection');
  }

  return [...tools].slice(0, 7);
}

export class FinancialContextService {
  constructor(private readonly requestContext: AuthenticatedRequestContext) {}

  async buildContext(tools: ContextToolName[]) {
    const context: FinancialContext = {
      balances: {
        projectedEndOfMonth: '0.00',
        safeToSpend: '0.00',
        total: '0.00'
      },
      budgets: [],
      creditCards: {
        availableLimit: '0.00',
        nextInvoiceAmount: '0.00',
        totalLimit: '0.00',
        usedLimit: '0.00'
      },
      goals: [],
      month: {
        expenseForecast: '0.00',
        expenseRealized: '0.00',
        incomeForecast: '0.00',
        incomeRealized: '0.00'
      },
      monthlyPlan: null,
      referenceMonth: currentReferenceMonth(),
      upcomingCommitments: []
    };

    await Promise.all([
      tools.includes('get_financial_summary') ? this.loadBalances(context) : Promise.resolve(),
      tools.includes('get_monthly_plan_status') ? this.loadMonthlyPlan(context) : Promise.resolve(),
      tools.includes('get_category_spending') ? this.loadCategoryBudgets(context) : Promise.resolve(),
      tools.includes('get_credit_card_summary') ? this.loadCards(context) : Promise.resolve(),
      tools.includes('get_financial_goals') ? this.loadGoals(context) : Promise.resolve(),
      tools.includes('get_upcoming_commitments')
        ? this.loadUpcomingCommitments(context)
        : Promise.resolve(),
      tools.includes('get_cashflow_projection') ? this.loadProjection(context) : Promise.resolve()
    ]);

    return context;
  }

  private async loadBalances(context: FinancialContext) {
    const { data, error } = await this.requestContext.client
      .from('accounts')
      .select('current_balance')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    context.balances.total = (data ?? []).reduce(
      (total: string, account: { current_balance: string }) => addMoney(total, account.current_balance),
      '0.00'
    );
  }

  private async loadMonthlyPlan(context: FinancialContext) {
    const { data, error } = await this.requestContext.client.rpc('get_monthly_plan_overview', {
      p_reference_month: context.referenceMonth
    });

    if (error) {
      throw error;
    }

    const monthlyPlan = data?.[0] ?? null;

    context.monthlyPlan = monthlyPlan;
    context.month = {
      expenseForecast: monthlyPlan?.forecast_expense ?? '0.00',
      expenseRealized: monthlyPlan?.realized_expense ?? '0.00',
      incomeForecast: monthlyPlan?.forecast_income ?? '0.00',
      incomeRealized: monthlyPlan?.realized_income ?? '0.00'
    };
    context.balances.projectedEndOfMonth = monthlyPlan?.projected_month_end_balance ?? '0.00';
    context.balances.safeToSpend = monthlyPlan?.safe_to_spend ?? '0.00';
  }

  private async loadCategoryBudgets(context: FinancialContext) {
    const { data, error } = await this.requestContext.client.rpc('get_category_budget_progress', {
      p_reference_month: context.referenceMonth
    });

    if (error) {
      throw error;
    }

    context.budgets = (data ?? []).map((budget) => ({
      budget: budget.budget_amount,
      category: budget.category_name,
      forecast: budget.forecast_amount,
      projectedAmount: budget.projected_amount,
      realized: budget.realized_amount,
      remaining: budget.remaining_amount,
      status: budget.status,
      utilizationPercent: toPercent(budget.projected_usage_percentage)
    }));
  }

  private async loadCards(context: FinancialContext) {
    const { data: cards, error: cardsError } = await this.requestContext.client
      .from('credit_cards')
      .select('id,limit_amount')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (cardsError) {
      throw cardsError;
    }

    const cardIds = (cards ?? []).map((card) => card.id);
    context.creditCards.totalLimit = (cards ?? []).reduce(
      (total, card) => addMoney(total, card.limit_amount),
      '0.00'
    );

    if (cardIds.length === 0) {
      return;
    }

    const { data: invoices, error: invoicesError } = await this.requestContext.client
      .from('credit_card_invoices')
      .select('due_date,total_amount,paid_amount')
      .in('credit_card_id', cardIds);

    if (invoicesError) {
      throw invoicesError;
    }

    const usedLimit = (invoices ?? []).reduce((total, invoice) => {
      const outstanding = Math.max(Number(invoice.total_amount) - Number(invoice.paid_amount), 0).toFixed(2);
      return addMoney(total, outstanding);
    }, '0.00');

    const nextInvoice = [...(invoices ?? [])]
      .filter((invoice) => invoice.due_date >= new Date().toISOString().slice(0, 10))
      .sort((left, right) => left.due_date.localeCompare(right.due_date))[0];

    context.creditCards.usedLimit = usedLimit;
    context.creditCards.availableLimit = subtractMoney(context.creditCards.totalLimit, usedLimit);
    context.creditCards.nextInvoiceAmount = nextInvoice
      ? Math.max(Number(nextInvoice.total_amount) - Number(nextInvoice.paid_amount), 0).toFixed(2)
      : '0.00';
  }

  private async loadGoals(context: FinancialContext) {
    const { data, error } = await this.requestContext.client
      .from('financial_goals')
      .select('name,target_amount,current_amount,status')
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .order('status', { ascending: true })
      .order('target_date', { ascending: true, nullsFirst: false })
      .limit(6);

    if (error) {
      throw error;
    }

    context.goals = (data ?? []).map((goal) => {
      const remainingAmount = Math.max(
        0,
        Number(goal.target_amount) - Number(goal.current_amount)
      ).toFixed(2);
      const progressPercent =
        Number(goal.target_amount) > 0
          ? Number(((Number(goal.current_amount) / Number(goal.target_amount)) * 100).toFixed(2))
          : 0;

      return {
        currentAmount: goal.current_amount,
        name: goal.name,
        progressPercent,
        remainingAmount,
        targetAmount: goal.target_amount
      };
    });
  }

  private async loadUpcomingCommitments(context: FinancialContext) {
    const { data, error } = await this.requestContext.client.rpc('get_upcoming_commitments', {
      p_horizon_days: 45
    });

    if (error) {
      throw error;
    }

    context.upcomingCommitments = (data ?? []).slice(0, 8).map((commitment) => ({
      amount: commitment.amount,
      date: commitment.due_date,
      description: commitment.title,
      type: toCommitmentType(commitment.detail)
    }));
  }

  private async loadProjection(context: FinancialContext) {
    const { data, error } = await this.requestContext.client.rpc('get_financial_projection', {
      p_horizon_months: 3
    });

    if (error) {
      throw error;
    }

    const currentMonthProjection =
      (data ?? []).find((item) => item.reference_month === context.referenceMonth) ?? data?.[0] ?? null;

    if (currentMonthProjection && context.monthlyPlan === null) {
      context.balances.projectedEndOfMonth = currentMonthProjection.closing_balance;
    }
  }
}

export function buildTopSpendingInsight(context: FinancialContext) {
  const topBudget = [...context.budgets].sort(
    (left, right) => right.utilizationPercent - left.utilizationPercent
  )[0];

  if (!topBudget) {
    return 'Nenhuma categoria com orcamento definido foi encontrada.';
  }

  return `${topBudget.category} esta em ${topBudget.utilizationPercent}% do orcamento, com ${formatCurrency(topBudget.realized)} realizado e ${formatCurrency(topBudget.forecast)} previsto.`;
}
