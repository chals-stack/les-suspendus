export type Stage = "Cadrage" | "Prototype" | "Test" | "Pitch" | "Gelé";

export type Problem = {
  id: number;
  title: string;
  shortTitle: string;
  budget: number;
  deadline: string;
  clients: string;
  pitchQuestion: string;
  surprises: string[];
};

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  percent: number;
  icon: "mentor" | "test" | "kit" | "clock" | "pitch";
};

export type Team = {
  id: string;
  name: string;
  problemId: number;
  members: string[];
  stage: Stage;
  progress: number;
  budgetAdjustment: number;
  color: string;
  updatedAt: string;
};

export type Purchase = {
  id: string;
  teamId: string;
  itemId: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type GameEvent = {
  id: string;
  teamId: string;
  kind: "imprévu" | "joker" | "note";
  title: string;
  detail: string;
  decision?: "Intégrer" | "Adapter" | "Reporter";
  createdAt: string;
};

export type GameState = {
  version: 2;
  teams: Team[];
  purchases: Purchase[];
  events: GameEvent[];
  sessionStartedAt: string;
  durationMinutes: number;
};
