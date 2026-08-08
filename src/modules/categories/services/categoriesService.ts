import { requireSupabaseClient } from '@/integrations/supabase';
import type {
  CategoryMutationResult,
  CategoryRow,
  FinancialEntryType
} from '@/modules/categories/types/categories';

const defaultCategoriesErrorMessage =
  'Nao foi possivel concluir a operacao com categorias. Tente novamente.';

function mapCategoriesError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return defaultCategoriesErrorMessage;
}

function createCategoryErrorResult<T>(error: unknown): CategoryMutationResult<T> {
  return {
    data: null,
    error: mapCategoriesError(error)
  };
}

export const categoriesService = {
  async ensureDefaultCategories(): Promise<CategoryMutationResult<void>> {
    try {
      const { error } = await requireSupabaseClient().rpc('ensure_default_categories');

      if (error) {
        return createCategoryErrorResult<void>(error);
      }

      return {
        data: undefined,
        error: null
      };
    } catch (error) {
      return createCategoryErrorResult<void>(error);
    }
  },

  async listCategories(type?: FinancialEntryType): Promise<CategoryMutationResult<CategoryRow[]>> {
    try {
      let query = requireSupabaseClient()
        .from('categories')
        .select('id,name,type,icon,color,is_active,deleted_at,created_at,updated_at,user_id')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        return createCategoryErrorResult<CategoryRow[]>(error);
      }

      return {
        data: data ?? [],
        error: null
      };
    } catch (error) {
      return createCategoryErrorResult<CategoryRow[]>(error);
    }
  }
};
