export type Season = {
  months: string;
  verdict: string;
  note: string;
};

export type BudgetItem = {
  item: string;
  low: number;
  high: number;
};

export type PackingGroup = {
  group: string;
  items: string[];
};

export type Alert = {
  tag: string;
  text: string;
};

export declare const SEASONS: Season[];
export declare const BUDGET: BudgetItem[];
export declare const PACKING: PackingGroup[];
export declare const ALERTS: Alert[];
export declare const SOURCES: [string, string][];
