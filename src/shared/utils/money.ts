export function normalizeDecimalMoneyInput(value: string) {
  const trimmedValue = value.trim();
  const withoutSpaces = trimmedValue.replace(/\s/g, '');
  const normalizedSeparators =
    withoutSpaces.includes(',') && withoutSpaces.includes('.')
      ? withoutSpaces.replace(/\./g, '').replace(',', '.')
      : withoutSpaces.replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedSeparators)) {
    return normalizedSeparators;
  }

  const [integerPart, decimalPart = ''] = normalizedSeparators.split('.');
  return `${integerPart}.${decimalPart.padEnd(2, '0')}`;
}

export function formatCurrency(value: string | number) {
  const numericValue = typeof value === 'number' ? value : Number(value);

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

export function addDecimalMoney(left: string, right: string) {
  const [leftInteger, leftDecimal = '00'] = normalizeDecimalMoneyInput(left).split('.');
  const [rightInteger, rightDecimal = '00'] = normalizeDecimalMoneyInput(right).split('.');
  const leftCents = BigInt(leftInteger) * 100n + BigInt(leftDecimal.padEnd(2, '0').slice(0, 2));
  const rightCents = BigInt(rightInteger) * 100n + BigInt(rightDecimal.padEnd(2, '0').slice(0, 2));
  const totalCents = leftCents + rightCents;

  return `${totalCents / 100n}.${String(totalCents % 100n).padStart(2, '0')}`;
}
