export const average = (values: number[]) =>
  values.reduce((acc, value) => acc + value, 0) / values.length;
