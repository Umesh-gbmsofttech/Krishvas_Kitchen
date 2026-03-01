export const formatCurrency = (value: number) => `Rs ${value.toFixed(2)}`;

export const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};
