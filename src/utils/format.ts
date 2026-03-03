import { CURRENCY_CODE } from '../config/appConfig';

const gbpFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: CURRENCY_CODE,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCurrency = (value: number) => gbpFormatter.format(Number.isFinite(value) ? value : 0);

export const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};
