import type { GameState, Problem, ShopItem } from "./types";
export const initialProblems: Problem[] = [
{ id: 1, title: "Trouver un professionnel fiable", budget: 1500000, deadline: "48 h" },
{ id: 2, title: "Les petites entreprises perdent leurs demandes clients", budget: 2000000, deadline: "72 h" },
{ id: 3, title: "Organiser une compétition devient chaotique", budget: 1000000, deadline: "48 h" },
{ id: 4, title: "Les talents locaux sont difficiles à découvrir", budget: 2500000, deadline: "72 h" },
{ id: 5, title: "Les informations étudiantes sont dispersées", budget: 1200000, deadline: "48 h" }];
export const initialShopItems: ShopItem[] = [
{ id: "mentor", name: "Mentorat technique de 5 minutes", description: "Un mentor aide à lever un blocage.", percent: 5, icon: "mentor", active: true },
{ id: "test", name: "Test utilisateur par 3 personnes", description: "Des testeurs d'une autre équipe.", percent: 10, icon: "test", active: true },
{ id: "kit", name: "Banque de ressources", description: "Maquettes, données et composants.", percent: 10, icon: "kit", active: true },
{ id: "delay", name: "Report de la lecture d'un imprévu", description: "Lecture reportée de 10 minutes.", percent: 5, icon: "clock", active: true },
{ id: "pitch", name: "Relecture du pitch", description: "Relecture par un mentor.", percent: 5, icon: "pitch", active: true }];
export const initialState: GameState = { version: 4, teams: [], purchases: [], problems: initialProblems, shopItems: initialShopItems, alertThreshold: 20, budgetReductionPercent: 0, updatedAt: new Date().toISOString() };
export const problems = initialProblems;
export const shopItems = initialShopItems;
export const formatMoney = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)).replace(/\s/g, "\u00a0") + "\u00a0FCFA";
export const jokers: never[] = [];
