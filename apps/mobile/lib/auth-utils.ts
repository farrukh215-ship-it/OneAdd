export function normalizePkPhone(input: string) {
  const digits = input.replace(/\D/g, '');

  if (digits.startsWith('92') && digits.length >= 12) {
    return `+${digits.slice(0, 12)}`;
  }

  if (digits.startsWith('0') && digits.length >= 11) {
    return `+92${digits.slice(1, 11)}`;
  }

  return `+92${digits.slice(0, 10)}`;
}

export function getPkPhoneLocalPart(input: string) {
  const digits = input.replace(/\D/g, '');

  if (digits.startsWith('92') && digits.length >= 12) {
    return digits.slice(2, 12);
  }

  if (digits.startsWith('0') && digits.length >= 11) {
    return digits.slice(1, 11);
  }

  return digits.slice(0, 10);
}

export function extractApiMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message;
  if (Array.isArray(message) && message.length) return String(message[0]);
  if (typeof message === 'string' && message.trim()) return message;
  if (typeof error?.message === 'string' && error.message.trim()) return error.message;
  return fallback;
}
