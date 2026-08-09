import type {
  AssistantStructuredResponse,
  PurchaseSimulation
} from '../src/modules/ai/types/assistant.js';
import type { ServerConfig } from './config.js';
import { formatCurrency } from './money.js';
import type { FinancialContext } from './financial-context.js';

export type AIProviderRequest = {
  context: FinancialContext;
  message: string;
  simulation?: PurchaseSimulation;
  systemPrompt: string;
};

export interface AIProvider {
  generateResponse(request: AIProviderRequest): Promise<AssistantStructuredResponse>;
}

function buildGroundedFallback(request: AIProviderRequest): AssistantStructuredResponse {
  if (request.simulation) {
    const scoreLabel: Record<string, string> = {
      attention: 'atencao',
      not_feasible: 'nao viavel',
      risky: 'risco',
      safe: 'seguro'
    };

    return {
      message: [
        `Conclusao: pelos dados atuais, a simulacao ficou como ${scoreLabel[request.simulation.decisionScore]}.`,
        `Impacto: ${request.simulation.installmentAmountLabel}.`,
        `Motivo: ${request.simulation.reasons.join(' ')}`,
        'A decisao final continua sendo sua; eu estou apenas organizando o impacto conhecido.'
      ].join('\n\n'),
      simulation: request.simulation,
      type: 'purchase_simulation'
    };
  }

  const monthlyPlan = request.context.monthlyPlan as
    | {
        realized_expense?: string;
        realized_income?: string;
        realized_savings?: string;
        spending_limit?: string | null;
      }
    | null;

  const summaryLines = [
    `Saldo total atual: ${formatCurrency(request.context.accounts.totalBalance)}.`,
    monthlyPlan
      ? `Neste mes, receitas realizadas somam ${formatCurrency(monthlyPlan.realized_income)} e despesas realizadas somam ${formatCurrency(monthlyPlan.realized_expense)}.`
      : 'Ainda nao encontrei planejamento mensal definido para esta competencia.',
    monthlyPlan?.spending_limit
      ? `Limite mensal planejado: ${formatCurrency(monthlyPlan.spending_limit)}.`
      : 'Sem limite mensal planejado.',
    request.context.upcomingCommitments.length
      ? `Existem ${request.context.upcomingCommitments.length} compromissos proximos monitorados.`
      : 'Nao encontrei compromissos proximos no horizonte consultado.'
  ];

  return {
    message: summaryLines.join('\n\n'),
    type: 'text'
  };
}

function buildProviderResponse(
  message: string,
  simulation: PurchaseSimulation | undefined
): AssistantStructuredResponse {
  if (simulation) {
    return {
      message,
      simulation,
      type: 'purchase_simulation'
    };
  }

  return {
    message,
    type: 'text'
  };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

export class MockAIProvider implements AIProvider {
  async generateResponse(request: AIProviderRequest) {
    return buildGroundedFallback(request);
  }
}

export class OpenAIProvider implements AIProvider {
  constructor(private readonly config: ServerConfig) {}

  async generateResponse(request: AIProviderRequest) {
    if (!this.config.aiApiKey) {
      return buildGroundedFallback(request);
    }

    const response = await fetchWithTimeout(
      'https://api.openai.com/v1/responses',
      {
        body: JSON.stringify({
          input: [
            {
              content: request.systemPrompt,
              role: 'system'
            },
            {
              content: JSON.stringify({
                financialContext: request.context,
                purchaseSimulation: request.simulation ?? null,
                userMessage: request.message
              }),
              role: 'user'
            }
          ],
          max_output_tokens: 900,
          model: this.config.aiModel
        }),
        headers: {
          Authorization: `Bearer ${this.config.aiApiKey}`,
          'Content-Type': 'application/json'
        },
        method: 'POST'
      },
      this.config.aiRequestTimeoutMs
    );

    if (!response.ok) {
      return buildGroundedFallback(request);
    }

    const data = (await response.json()) as {
      output_text?: string;
    };

    return buildProviderResponse(data.output_text || buildGroundedFallback(request).message, request.simulation);
  }
}

export class GeminiProvider implements AIProvider {
  constructor(private readonly config: ServerConfig) {}

  async generateResponse(request: AIProviderRequest) {
    if (!this.config.aiApiKey) {
      return buildGroundedFallback(request);
    }

    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.aiModel}:generateContent?key=${this.config.aiApiKey}`,
      {
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${request.systemPrompt}\n\n${JSON.stringify({
                    financialContext: request.context,
                    purchaseSimulation: request.simulation ?? null,
                    userMessage: request.message
                  })}`
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 900,
            temperature: 0.2
          }
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      },
      this.config.aiRequestTimeoutMs
    );

    if (!response.ok) {
      return buildGroundedFallback(request);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return buildProviderResponse(text || buildGroundedFallback(request).message, request.simulation);
  }
}

export function createAIProvider(config: ServerConfig): AIProvider {
  if (config.aiProvider === 'openai') {
    return new OpenAIProvider(config);
  }

  if (config.aiProvider === 'gemini') {
    return new GeminiProvider(config);
  }

  return new MockAIProvider();
}
