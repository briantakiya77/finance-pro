import type {
  CreditCardInvoiceRow,
  CreditCardInvoiceStatus
} from '@/modules/credit-cards/types/creditCards';
import { addDecimalMoney, normalizeDecimalMoneyInput } from '@/shared/utils/money';

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function buildSafeDate(year: number, monthIndex: number, day: number) {
  const safeDay = Math.min(day, getDaysInMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, safeDay));
}

function parseIsoDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getReferenceMonthFromPurchaseDate(purchaseDate: string, closingDay: number) {
  const date = parseIsoDate(purchaseDate);
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const purchaseDay = date.getUTCDate();
  const nextMonth = purchaseDay <= closingDay ? monthIndex : monthIndex + 1;
  const nextYear = year + Math.floor(nextMonth / 12);
  const normalizedMonthIndex = ((nextMonth % 12) + 12) % 12;

  return formatIsoDate(new Date(Date.UTC(nextYear, normalizedMonthIndex, 1)));
}

export function getClosingDate(referenceMonth: string, closingDay: number) {
  const date = parseIsoDate(referenceMonth);
  return formatIsoDate(buildSafeDate(date.getUTCFullYear(), date.getUTCMonth(), closingDay));
}

export function getDueDate(referenceMonth: string, closingDay: number, dueDay: number) {
  const referenceDate = parseIsoDate(referenceMonth);
  const dueMonthIndex =
    dueDay > closingDay ? referenceDate.getUTCMonth() : referenceDate.getUTCMonth() + 1;
  const dueYear = referenceDate.getUTCFullYear() + Math.floor(dueMonthIndex / 12);
  const normalizedMonthIndex = ((dueMonthIndex % 12) + 12) % 12;

  return formatIsoDate(buildSafeDate(dueYear, normalizedMonthIndex, dueDay));
}

export function getInvoiceStatus(
  invoice: Pick<CreditCardInvoiceRow, 'closing_date' | 'paid_amount' | 'status' | 'total_amount'>,
  today = new Date()
): CreditCardInvoiceStatus {
  const total = Number(invoice.total_amount);
  const paid = Number(invoice.paid_amount);

  if (paid >= total && total > 0) {
    return 'paid';
  }

  const now = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const closing = parseIsoDate(invoice.closing_date);

  return now > closing ? 'closed' : 'open';
}

export function getInvoiceOutstandingAmount(
  invoice: Pick<CreditCardInvoiceRow, 'paid_amount' | 'total_amount'>
) {
  const total = Number(invoice.total_amount);
  const paid = Number(invoice.paid_amount);
  const outstanding = Math.max(total - paid, 0);

  return outstanding.toFixed(2);
}

export function sumInvoicesUtilizedAmount(
  invoices: Pick<CreditCardInvoiceRow, 'paid_amount' | 'status' | 'total_amount'>[]
) {
  return invoices.reduce((total, invoice) => {
    if (invoice.status === 'paid') {
      return total;
    }

    return addDecimalMoney(total, getInvoiceOutstandingAmount(invoice));
  }, '0.00');
}

export function getAvailableLimit(limitAmount: string, utilizedAmount: string) {
  const cents = Math.max(
    Math.round(Number(normalizeDecimalMoneyInput(limitAmount)) * 100) -
      Math.round(Number(normalizeDecimalMoneyInput(utilizedAmount)) * 100),
    0
  );

  return (cents / 100).toFixed(2);
}
