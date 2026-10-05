import test from "node:test";
import assert from "node:assert";
import { 
  calculatePurchaseAmount, 
  calculateRemainingBudget, 
  canAfford,
  formatFCFA 
} from "./calculations.js";

const mockProblems = [
  { id: 1, title: "Prob 1", shortTitle: "P1", budget: 1_000_000, deadline: "48h" }
];

const mockTeam = {
  id: "team-1",
  name: "Equipe 1",
  problemId: 1,
  members: [],
  stage: "Cadrage",
  progress: 0,
  budgetAdjustment: 0,
  color: "blue",
  updatedAt: new Date().toISOString()
};

const mockState = {
  version: 3,
  teams: [mockTeam],
  purchases: [],
  problems: mockProblems,
  shopItems: [],
  alertThreshold: 20,
  updatedAt: new Date().toISOString()
};

test("calculatePurchaseAmount rounded to integer", () => {
  assert.strictEqual(calculatePurchaseAmount(5, 1_500_000), 75_000);
  assert.strictEqual(calculatePurchaseAmount(10, 1_000_000), 100_000);
  // Test rounding
  assert.strictEqual(calculatePurchaseAmount(3.333, 100_000), 3333);
});

test("calculateRemainingBudget derived from purchases", () => {
  const stateWithPurchases = {
    ...mockState,
    purchases: [
      { id: "p1", teamId: "team-1", itemId: "m", itemName: "M", itemPercent: 5, amount: 50_000, createdAt: "" }
    ]
  };
  // 1,000,000 - 50,000 = 950,000
  assert.strictEqual(calculateRemainingBudget(mockTeam, stateWithPurchases, mockProblems), 950_000);
});

test("canAfford checks budget correctly", () => {
  assert.strictEqual(canAfford(mockTeam, 500_000, mockState, mockProblems), true);
  assert.strictEqual(canAfford(mockTeam, 1_500_000, mockState, mockProblems), false);
});

test("formatFCFA uses non-breaking spaces", () => {
  const formatted = formatFCFA(1500000);
  // Should contain non-breaking spaces (U+00A0)
  assert.ok(formatted.includes("\u00a0"));
  assert.ok(formatted.includes("1\u00a0500\u00a0000\u00a0FCFA"));
});
