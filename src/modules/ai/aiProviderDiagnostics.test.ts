import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AIProviderRequest } from '../../../server/ai-provider';
import { GeminiProvider } from '../../../server/ai-provider';
import type { ServerConfig } from '../../../server/config';

const aiApiKey = 'test-secret-key';
const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature';

const config: ServerConfig = {
  aiApiKey,
  aiModel: 'gemini-2.5-flash',
  aiProvider: 'gemini',
  aiRateLimitPerMinute: 10,
  aiRequestTimeoutMs: 1000,
  nodeEnv: 'test',
  port: 3000,
  supabaseAnonKey: 'anon',
  supabaseUrl: 'https://example.supabase.co'
};

const request: AIProviderRequest = {
  conversationHistory: [],
  context: {
    balances: {
      projectedEndOfMonth: '1200.00',
      safeToSpend: '900.00',
      total: '1000.00'
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
    referenceMonth: '2026-08-01',
    upcomingCommitments: []
  },
  message: 'Quanto posso gastar?',
  systemPrompt: 'system prompt'
};

function mockGeminiError(status: number, errorStatus: string, message = `technical failure ${aiApiKey} Bearer ${jwt}`) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: async () => ({
        error: {
          code: status,
          message,
          status: errorStatus
        }
      }),
      ok: false,
      status,
      statusText: errorStatus
    })
  );
}

async function captureProviderLog() {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  await expect(new GeminiProvider(config).generateResponse(request)).rejects.toThrow(
    'assistant unavailable'
  );

  expect(consoleError).toHaveBeenCalledTimes(1);
  return JSON.parse(String(consoleError.mock.calls[0][0])) as Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AI provider diagnostics', () => {
  it.each([
    [400, 'INVALID_ARGUMENT'],
    [401, 'UNAUTHENTICATED'],
    [403, 'PERMISSION_DENIED'],
    [404, 'NOT_FOUND'],
    [429, 'RESOURCE_EXHAUSTED'],
    [503, 'UNAVAILABLE']
  ])('identifica erro HTTP %s do provider Gemini', async (status, errorStatus) => {
    mockGeminiError(status, errorStatus);

    const log = await captureProviderLog();

    expect(log).toMatchObject({
      errorCode: status,
      errorStatus,
      event: 'AI provider error',
      httpStatus: status,
      model: 'gemini-2.5-flash',
      provider: 'gemini',
      status: 'error',
      statusText: errorStatus
    });
  });

  it('identifica timeout do provider Gemini', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('operation aborted'), { name: 'AbortError' }))
    );

    const log = await captureProviderLog();

    expect(log).toMatchObject({
      errorStatus: 'TIMEOUT',
      event: 'AI provider error',
      message: 'provider request timed out',
      model: 'gemini-2.5-flash',
      provider: 'gemini',
      status: 'error'
    });
  });

  it('nunca registra API key, Authorization/Bearer ou JWT', async () => {
    mockGeminiError(401, 'UNAUTHENTICATED');

    const log = await captureProviderLog();
    const serializedLog = JSON.stringify(log);

    expect(serializedLog).not.toContain(aiApiKey);
    expect(serializedLog).not.toContain(jwt);
    expect(serializedLog).not.toMatch(/Bearer\s+eyJ/i);
    expect(serializedLog).toContain('[redacted-secret]');
    expect(serializedLog).toContain('Bearer [redacted]');
  });

  it('mantem erro 503 sanitizado para o frontend', () => {
    const server = readFileSync(resolve(process.cwd(), 'server/index.ts'), 'utf-8');

    expect(server).toContain('AI_ASSISTANT_UNAVAILABLE');
    expect(server).toContain('statusCode === 401');
    expect(server).toContain("'Nao foi possivel concluir a analise agora.'");
    expect(server).not.toContain('body.error?.message');
  });
});
