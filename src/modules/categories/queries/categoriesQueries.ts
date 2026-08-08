import { useQuery } from '@tanstack/react-query';

import { categoriesService } from '@/modules/categories/services/categoriesService';
import type { FinancialEntryType } from '@/modules/categories/types/categories';

export const categoriesQueryKey = ['categories'] as const;

export function useCategoriesQuery(type?: FinancialEntryType) {
  return useQuery({
    queryKey: type ? [...categoriesQueryKey, type] : categoriesQueryKey,
    queryFn: async () => {
      const result = await categoriesService.listCategories(type);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}
