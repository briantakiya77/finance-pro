export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function currentReferenceMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export function addMonths(referenceDate: string, monthOffset: number) {
  const [year, month, day] = referenceDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + monthOffset, day)).toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function safeDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, Math.min(day, daysInMonth(year, monthIndex))))
    .toISOString()
    .slice(0, 10);
}

export function getReferenceMonthFromPurchaseDate(purchaseDate: string, closingDay: number) {
  const [year, month, day] = purchaseDate.split('-').map(Number);
  const monthIndex = month - 1;
  const targetMonthIndex = day <= closingDay ? monthIndex : monthIndex + 1;

  return new Date(Date.UTC(year, targetMonthIndex, 1)).toISOString().slice(0, 10);
}

export function getDueDate(referenceMonth: string, closingDay: number, dueDay: number) {
  const [year, month] = referenceMonth.split('-').map(Number);
  const monthIndex = month - 1;
  const dueMonthIndex = dueDay > closingDay ? monthIndex : monthIndex + 1;

  return safeDate(year, dueMonthIndex, dueDay);
}
