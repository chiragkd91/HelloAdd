/** `GET/PUT /api/budget` JSON shape. */
export type BudgetApi = {
  id?: string;
  organizationId: string;
  month: number;
  year: number;
  totalBudget: number;
  platforms: Record<string, unknown>;
  createdAt?: string;
};

export type PlatformBudgetNumbers = {
  allocated: number;
  spent: number;
};
