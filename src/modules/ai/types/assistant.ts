export type AssistantMessageRole = 'assistant' | 'user';

export type AssistantConversation = {
  created_at: string;
  deleted_at: string | null;
  id: string;
  title: string | null;
  updated_at: string;
  user_id: string;
};

export type AssistantStoredMessage = {
  content: string;
  conversation_id: string;
  created_at: string;
  id: string;
  role: AssistantMessageRole;
  user_id: string;
};

export type DecisionScore = 'attention' | 'not_feasible' | 'risky' | 'safe';

export type PurchaseSimulationInput = {
  cardId?: string | null;
  categoryId?: string | null;
  installments: number;
  purchaseAmount: string;
};

export type PurchaseSimulationInstallment = {
  amount: string;
  dueDate: string;
  installmentNumber: number;
  referenceMonth: string;
};

export type PurchaseSimulation = {
  availableLimitAfterPurchase: string | null;
  availableLimitBeforePurchase: string | null;
  cashflowImpact: PurchaseSimulationInstallment[];
  decisionScore: DecisionScore;
  financialResult: {
    expenseAmount: string;
    recognizedAs: 'card_expense' | 'cash_expense';
  };
  installmentAmountLabel: string;
  installments: number;
  monthlySavingsAfterPurchase: string | null;
  planningImpact: {
    monthlyLimit: string | null;
    projectedSpentAfterPurchase: string | null;
    remainingAfterPurchase: string | null;
  };
  projectedLowestBalance: string | null;
  purchaseAmount: string;
  reasons: string[];
  simulationFeasible: boolean;
};

export type AssistantStructuredResponse =
  | {
      message: string;
      simulation?: PurchaseSimulation;
      type: 'purchase_simulation';
    }
  | {
      message: string;
      type: 'text';
    };

export type AssistantChatRequest = {
  conversationId?: string | null;
  message: string;
};

export type AssistantChatResponse = {
  assistantMessage: AssistantStoredMessage;
  conversation: AssistantConversation;
  response: AssistantStructuredResponse;
  userMessage: AssistantStoredMessage;
};

export const assistantQuickSuggestions = [
  'Quanto posso gastar este mes?',
  'Como estao minhas financas?',
  'Quais sao meus proximos compromissos?',
  'Como estao minhas metas?',
  'Posso fazer uma compra de R$ 3.000 em 10x?'
] as const;
