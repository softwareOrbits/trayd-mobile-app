export type InfoEntry = { label: string; value: string };
export type LineItemTag = 'VAN STOCK' | 'RECEIPT';
export type LineItem = { name: string; tag: LineItemTag; amount: string };
export type DayEntry = { label: string; sub: string; active?: boolean };
export type PhotoTag = { label: string; uri?: string; id?: string };
export type RosterMember = { name: string; confirmed: boolean };
