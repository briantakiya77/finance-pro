import { normalizeDecimalMoneyInput } from '@/shared/utils/money';

export type InstallmentPreview = {
  installmentCount: number;
  installments: string[];
  totalAmount: string;
};

export function buildInstallmentPreview(
  totalAmount: string,
  installmentCount: number
): InstallmentPreview {
  const normalizedAmount = normalizeDecimalMoneyInput(totalAmount);

  if (!/^\d+(\.\d{2})$/.test(normalizedAmount) || installmentCount < 2) {
    return {
      installmentCount,
      installments: [],
      totalAmount: normalizedAmount
    };
  }

  const [integerPart, decimalPart] = normalizedAmount.split('.');
  const totalCents = BigInt(integerPart) * 100n + BigInt(decimalPart);
  const baseCents = totalCents / BigInt(installmentCount);
  const remainder = totalCents % BigInt(installmentCount);

  const installments = Array.from({ length: installmentCount }, (_, index) => {
    const cents = baseCents + (BigInt(index) < remainder ? 1n : 0n);
    return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
  });

  return {
    installmentCount,
    installments,
    totalAmount: normalizedAmount
  };
}
