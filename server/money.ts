export function normalizeMoney(value: string) {
  const compact = value.trim().replace(/\s/g, '').replace(/[^\d,.-]/g, '');
  const negative = compact.startsWith('-');
  const unsigned = compact.replace(/-/g, '');
  const lastComma = unsigned.lastIndexOf(',');
  const lastDot = unsigned.lastIndexOf('.');
  const separator = lastComma > -1 ? ',' : lastDot > -1 ? '.' : '';
  const separatorIndex = separator ? unsigned.lastIndexOf(separator) : -1;
  const fractionalSize = separatorIndex > -1 ? unsigned.length - separatorIndex - 1 : 0;
  const hasDecimalSeparator = separatorIndex > -1 && fractionalSize > 0 && fractionalSize <= 2;
  const normalized = hasDecimalSeparator
    ? `${unsigned.slice(0, separatorIndex).replace(/[.,]/g, '')}.${unsigned.slice(separatorIndex + 1)}`
    : unsigned.replace(/[.,]/g, '');
  const signed = `${negative ? '-' : ''}${normalized}`;

  if (!/^-?\d+(\.\d{1,2})?$/.test(signed)) {
    return signed;
  }

  const [integerPart, decimalPart = ''] = signed.split('.');
  return `${integerPart}.${decimalPart.padEnd(2, '0')}`;
}

export function moneyToCents(value: string) {
  const normalized = normalizeMoney(value);

  if (!/^-?\d+\.\d{2}$/.test(normalized)) {
    throw new Error('amount must be numeric(14,2)');
  }

  const [integerPart, decimalPart] = normalized.split('.');
  return BigInt(integerPart) * 100n + BigInt(decimalPart);
}

export function centsToMoney(cents: bigint) {
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? cents * -1n : cents;

  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

export function addMoney(left: string, right: string) {
  return centsToMoney(moneyToCents(left) + moneyToCents(right));
}

export function subtractMoney(left: string, right: string) {
  return centsToMoney(moneyToCents(left) - moneyToCents(right));
}

export function formatCurrency(value: string | null | undefined) {
  const numericValue = Number(value ?? '0');

  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    style: 'currency'
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function splitInstallments(totalAmount: string, installmentCount: number) {
  if (installmentCount < 1 || installmentCount > 60) {
    throw new Error('installments must be between 1 and 60');
  }

  const totalCents = moneyToCents(totalAmount);
  const divisor = BigInt(installmentCount);
  const baseCents = totalCents / divisor;
  const remainder = totalCents % divisor;

  return Array.from({ length: installmentCount }, (_, index) => {
    const cents = baseCents + (BigInt(index) < remainder ? 1n : 0n);
    return centsToMoney(cents);
  });
}
