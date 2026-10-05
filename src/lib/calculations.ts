import type { Purchase, GameState, Problem, Team } from "./types";

/**
 * Formatage des montants en FCFA avec espaces insécables
 * Exemple : 1 500 000 FCFA
 */
export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)).replace(/\s/g, "\u00a0") + "\u00a0FCFA";
}

/**
 * Calcule le coût d'un achat à partir du pourcentage et du budget de référence.
 * Règle : pourcentage de l'élément × budget du problème, arrondi à l'entier.
 */
export function calculatePurchaseAmount(percent: number, problemBudget: number): number {
  return Math.round((percent / 100) * problemBudget);
}

export function getTeamBudget(team: Team, problems: Problem[]): number {
  return problems.find((problem) => problem.id === team.problemId)?.budget ?? 0;
}

export function calculateSpent(teamId: string, state: GameState): number {
  return state.purchases
    .filter((purchase) => purchase.teamId === teamId && !purchase.cancelledAt)
    .reduce((sum, purchase) => sum + purchase.amount, 0);
}

/**
 * Calcule le budget de référence d'une équipe (Budget du problème + ajustements éventuels)
 */
export function getTeamCeiling(team: Team, problems: Problem[]): number {
  return getTeamBudget(team, problems);
}

/**
 * Calcule le budget restant d'une équipe à partir de ses achats.
 * Budget restant = budget du problème moins la somme des achats.
 */
export function calculateRemainingBudget(team: Team, state: GameState, problems: Problem[]): number {
  const ceiling = getTeamCeiling(team, problems);
  const spent = calculateSpent(team.id, state);
  
  return Math.max(0, ceiling - spent);
}

/**
 * Vérifie si un achat est possible
 */
export function canAfford(team: Team, amount: number, state: GameState, problems: Problem[]): boolean {
  const remaining = calculateRemainingBudget(team, state, problems);
  return remaining >= amount;
}
