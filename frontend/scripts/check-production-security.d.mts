export function checkProductionSecurity(
  root: string,
): Promise<{ files: number; issues: string[] }>;
