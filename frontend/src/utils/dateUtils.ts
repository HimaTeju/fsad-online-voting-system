import { format, parseISO } from 'date-fns';

export function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy');
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy, HH:mm');
}

export function isExpired(iso: string): boolean {
  return new Date(iso) < new Date();
}
