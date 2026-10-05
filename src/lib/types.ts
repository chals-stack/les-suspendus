export type Problem = { id: number; title: string; budget: number; deadline: string };
export type ShopItem = { id: string; name: string; description: string; percent: number; icon: "mentor" | "test" | "kit" | "clock" | "pitch"; active: boolean };
export type Team = { id: string; name: string; leader: string; members: string[]; problemId: number; color: string; updatedAt: string };
export type PurchaseLine = { itemId: string; itemName: string; itemPercent: number; quantity: number; amount: number };
export type Purchase = { id: string; teamId: string; lines: PurchaseLine[]; amount: number; createdAt: string; cancelledAt?: string };
export type GameState = { version: number; teams: Team[]; purchases: Purchase[]; problems: Problem[]; shopItems: ShopItem[]; alertThreshold: number; updatedAt: string };
