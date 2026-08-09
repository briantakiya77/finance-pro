import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import type { CategoryRow } from '@/modules/categories/types/categories';
import { planningFormSchema } from '@/modules/planning/schemas/planningSchema';
import type {
  CategoryBudgetProgress,
  MonthlyPlanOverview,
  PlanningFormValues
} from '@/modules/planning/types/planning';
import { Button, FieldError, FieldLabel, Input, Modal } from '@/shared/components/ui';

type PlanningFormModalProps = {
  budgets: CategoryBudgetProgress[];
  categories: CategoryRow[];
  isSubmitting: boolean;
  monthlyPlan: MonthlyPlanOverview | null;
  onClose: () => void;
  onSubmit: (values: PlanningFormValues) => void;
  referenceMonthLabel: string;
};

function mapPlanningToFormValues(
  monthlyPlan: MonthlyPlanOverview | null,
  categories: CategoryRow[],
  budgets: CategoryBudgetProgress[]
): PlanningFormValues {
  const budgetsMap = new Map(budgets.map((budget) => [budget.category_id, budget.budget_amount]));

  return {
    expectedIncome: monthlyPlan?.expected_income ?? '',
    notes: monthlyPlan?.notes ?? '',
    savingsTarget: monthlyPlan?.savings_target ?? '0.00',
    spendingLimit: monthlyPlan?.spending_limit ?? '',
    categoryBudgets: categories.map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      budgetAmount: budgetsMap.get(category.id) ?? ''
    }))
  };
}

export function PlanningFormModal({
  budgets,
  categories,
  isSubmitting,
  monthlyPlan,
  onClose,
  onSubmit,
  referenceMonthLabel
}: PlanningFormModalProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<PlanningFormValues>({
    resolver: zodResolver(planningFormSchema),
    defaultValues: mapPlanningToFormValues(monthlyPlan, categories, budgets)
  });

  useEffect(() => {
    reset(mapPlanningToFormValues(monthlyPlan, categories, budgets));
  }, [budgets, categories, monthlyPlan, reset]);

  return (
    <Modal
      title="Editar planejamento mensal"
      description={`Defina previsao, meta de economia e limites para ${referenceMonthLabel}.`}
      onClose={onClose}
      className="max-w-4xl"
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-5 md:grid-cols-2">
          <FieldLabel className="space-y-2">
            <span>Receita esperada</span>
            <Input {...register('expectedIncome')} inputMode="decimal" placeholder="0,00" />
            <FieldError>{errors.expectedIncome?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Meta de economia</span>
            <Input {...register('savingsTarget')} inputMode="decimal" placeholder="0,00" />
            <FieldError>{errors.savingsTarget?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Limite de gastos</span>
            <Input {...register('spendingLimit')} inputMode="decimal" placeholder="0,00" />
            <FieldError>{errors.spendingLimit?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Observacoes</span>
            <Input {...register('notes')} placeholder="Opcional" />
            <FieldError>{errors.notes?.message}</FieldError>
          </FieldLabel>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary">Orcamento por categoria</h3>
            <p className="mt-1 text-caption text-text-secondary">
              Informe apenas as categorias que deseja acompanhar mais de perto.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="rounded-control border border-border bg-background/70 px-4 py-3"
              >
                <FieldLabel className="space-y-2">
                  <span>{category.name}</span>
                  <Input
                    {...register(`categoryBudgets.${index}.budgetAmount`)}
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                </FieldLabel>
                <input type="hidden" {...register(`categoryBudgets.${index}.categoryId`)} />
                <input type="hidden" {...register(`categoryBudgets.${index}.categoryName`)} />
                <FieldError>{errors.categoryBudgets?.[index]?.budgetAmount?.message}</FieldError>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar planejamento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
