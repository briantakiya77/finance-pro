import type { PurchaseSimulation, PurchaseSimulationInput } from '../src/modules/ai/types/assistant.js';
import { addMonths, currentReferenceMonth, getDueDate, getReferenceMonthFromPurchaseDate, todayIso } from './date.js';
import { addMoney, formatCurrency, moneyToCents, splitInstallments, subtractMoney } from './money.js';
import type { AuthenticatedRequestContext } from './supabase.js';

type CardRow = {
  closing_day: number;
  due_day: number;
  id: string;
  limit_amount: string;
  name: string;
};

function toInput(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function parseSimulationInput(message: string): PurchaseSimulationInput | null {
  const amountMatch = message.match(/(?:r\$|\b)(\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?/i);
  const installmentsMatch = message.match(/(\d{1,2})\s*x|\b(\d{1,2})\s*parcel/i);

  if (!amountMatch) {
    return null;
  }

  const rawAmount = amountMatch[0].replace(/r\$/i, '').trim();
  const installments = Number(installmentsMatch?.[1] ?? installmentsMatch?.[2] ?? 1);

  return {
    installments: Number.isFinite(installments) ? installments : 1,
    purchaseAmount: rawAmount
  };
}

export function classifySimulation(params: {
  feasibleByLimit: boolean;
  lowestProjectedBalance: string | null;
  monthlySavingsAfterPurchase: string | null;
  planningRemaining: string | null;
}) {
  if (!params.feasibleByLimit) {
    return 'not_feasible' as const;
  }

  if (params.lowestProjectedBalance && moneyToCents(params.lowestProjectedBalance) < 0n) {
    return 'not_feasible' as const;
  }

  if (params.planningRemaining && moneyToCents(params.planningRemaining) < 0n) {
    return 'risky' as const;
  }

  if (params.monthlySavingsAfterPurchase && moneyToCents(params.monthlySavingsAfterPurchase) < 0n) {
    return 'risky' as const;
  }

  if (params.planningRemaining && Number(params.planningRemaining) < 300) {
    return 'attention' as const;
  }

  return 'safe' as const;
}

function getLowestBalance(projection: { closing_balance: string }[]) {
  if (projection.length === 0) {
    return null;
  }

  return projection.reduce((lowest, item) =>
    moneyToCents(item.closing_balance) < moneyToCents(lowest) ? item.closing_balance : lowest
  , projection[0].closing_balance);
}

export class PurchaseSimulator {
  constructor(private readonly requestContext: AuthenticatedRequestContext) {}

  async simulate(input: PurchaseSimulationInput): Promise<PurchaseSimulation> {
    const purchaseAmount = toInput(input.purchaseAmount);
    const installments = Math.max(1, Math.min(Number(input.installments || 1), 60));
    if (moneyToCents(purchaseAmount) <= 0n) {
      throw new Error('purchase amount must be positive');
    }

    const installmentValues = splitInstallments(purchaseAmount, installments);
    const currentMonth = currentReferenceMonth();
    let card: CardRow | null = null;
    let availableLimitBeforePurchase: string | null = null;
    let availableLimitAfterPurchase: string | null = null;
    let feasibleByLimit = true;

    if (input.cardId) {
      const { data, error } = await this.requestContext.client
        .from('credit_cards')
        .select('id,name,limit_amount,closing_day,due_day')
        .eq('id', input.cardId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        throw new Error('credit card not found for current user');
      }

      card = data as CardRow;
      const { data: invoices, error: invoicesError } = await this.requestContext.client
        .from('credit_card_invoices')
        .select('total_amount,paid_amount,status')
        .eq('credit_card_id', card.id);

      if (invoicesError) {
        throw invoicesError;
      }

      const utilized = (invoices ?? []).reduce((total: string, invoice: { paid_amount: string; status: string; total_amount: string }) => {
        if (invoice.status === 'paid') {
          return total;
        }

        return addMoney(
          total,
          Math.max(Number(invoice.total_amount) - Number(invoice.paid_amount), 0).toFixed(2)
        );
      }, '0.00');

      availableLimitBeforePurchase = Math.max(Number(card.limit_amount) - Number(utilized), 0).toFixed(2);
      availableLimitAfterPurchase = subtractMoney(availableLimitBeforePurchase, purchaseAmount);
      feasibleByLimit = moneyToCents(availableLimitAfterPurchase) >= 0n;
    }

    if (input.categoryId) {
      const { data, error } = await this.requestContext.client
        .from('categories')
        .select('id')
        .eq('id', input.categoryId)
        .eq('type', 'expense')
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        throw new Error('category not found for current user and transaction type');
      }
    }

    const { data: monthlyPlanData, error: monthlyPlanError } = await this.requestContext.client.rpc(
      'get_monthly_plan_overview',
      {
        p_reference_month: currentMonth
      }
    );

    if (monthlyPlanError) {
      throw monthlyPlanError;
    }

    const { data: projectionData, error: projectionError } = await this.requestContext.client.rpc(
      'get_financial_projection',
      {
        p_horizon_months: installments > 3 ? 6 : 3
      }
    );

    if (projectionError) {
      throw projectionError;
    }

    const monthlyPlan = monthlyPlanData?.[0] ?? null;
    const firstImpact = installmentValues[0] ?? purchaseAmount;
    const projectedSpentAfterPurchase = monthlyPlan
      ? addMoney(monthlyPlan.realized_expense, card ? firstImpact : purchaseAmount)
      : null;
    const remainingAfterPurchase =
      monthlyPlan?.spending_limit && projectedSpentAfterPurchase
        ? subtractMoney(monthlyPlan.spending_limit, projectedSpentAfterPurchase)
        : null;
    const monthlySavingsAfterPurchase = monthlyPlan
      ? subtractMoney(monthlyPlan.realized_savings, card ? firstImpact : purchaseAmount)
      : null;

    const cashflowImpact = installmentValues.map((amount, index) => {
      const referenceMonth = card
        ? getReferenceMonthFromPurchaseDate(addMonths(todayIso(), index), card.closing_day)
        : addMonths(currentMonth, index);

      return {
        amount,
        dueDate: card ? getDueDate(referenceMonth, card.closing_day, card.due_day) : addMonths(todayIso(), index),
        installmentNumber: index + 1,
        referenceMonth
      };
    });

    const projectedLowestBalance = getLowestBalance(
      (projectionData ?? []) as { closing_balance: string }[]
    );
    const decisionScore = classifySimulation({
      feasibleByLimit,
      lowestProjectedBalance: projectedLowestBalance,
      monthlySavingsAfterPurchase,
      planningRemaining: remainingAfterPurchase
    });

    const reasons = [
      installments === 1
        ? `Compra a vista de ${formatCurrency(purchaseAmount)}.`
        : `${installments} parcelas calculadas com rateio exato de centavos.`,
      card
        ? `Cartao analisado: ${card.name}.`
        : 'Simulacao sem cartao, avaliando impacto direto no caixa.',
      monthlyPlan?.spending_limit
        ? `Limite mensal apos a simulacao: ${formatCurrency(remainingAfterPurchase)}.`
        : 'Nao ha limite mensal definido para esta competencia.'
    ];

    if (!feasibleByLimit) {
      reasons.push('O valor excede o limite disponivel do cartao selecionado.');
    }

    return {
      availableLimitAfterPurchase,
      availableLimitBeforePurchase,
      cashflowImpact,
      decisionScore,
      financialResult: {
        expenseAmount: purchaseAmount,
        recognizedAs: card ? 'card_expense' : 'cash_expense'
      },
      installmentAmountLabel:
        installments === 1
          ? formatCurrency(purchaseAmount)
          : `${installments}x de ${formatCurrency(installmentValues[0])}`,
      installments,
      monthlySavingsAfterPurchase,
      planningImpact: {
        monthlyLimit: monthlyPlan?.spending_limit ?? null,
        projectedSpentAfterPurchase,
        remainingAfterPurchase
      },
      projectedLowestBalance,
      purchaseAmount,
      reasons,
      simulationFeasible: decisionScore !== 'not_feasible'
    };
  }
}
