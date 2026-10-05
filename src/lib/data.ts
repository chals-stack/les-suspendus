import type { GameState, Problem, ShopItem, Team } from "./types";

export const problems: Problem[] = [
  {
    id: 1,
    title: "Trouver un professionnel fiable",
    shortTitle: "Professionnels fiables",
    budget: 1_500_000,
    deadline: "48 h",
    clients: "Particuliers, petites entreprises et indépendants",
    pitchQuestion: "Comment garantissez-vous la fiabilité de votre plateforme ?",
    surprises: ["Il faut vérifier !", "Je veux quelqu'un maintenant", "Où sont les professionnels près de moi ?", "Le professionnel veut aussi son espace", "Et si les avis étaient faux ?"],
  },
  {
    id: 2,
    title: "Les petites entreprises perdent leurs demandes clients",
    shortTitle: "Demandes clients",
    budget: 2_000_000,
    deadline: "72 h",
    clients: "PME, commerces, agences et prestataires",
    pitchQuestion: "Pourquoi votre solution serait-elle réellement adoptée par une petite équipe ?",
    surprises: ["WhatsApp reste incontournable", "Tout est urgent", "Qui s'occupe de quoi ?", "Le client attend une réponse", "Trop compliqué"],
  },
  {
    id: 3,
    title: "Organiser une compétition devient chaotique",
    shortTitle: "Compétition",
    budget: 1_000_000,
    deadline: "48 h",
    clients: "Écoles, universités, associations et organisateurs",
    pitchQuestion: "Votre solution peut-elle supporter 1 000 participants au lieu de 100 ?",
    surprises: ["Une équipe abandonne", "Le score est contesté", "Nouveau format", "Les participants ne trouvent rien", "10 fois plus de participants"],
  },
  {
    id: 4,
    title: "Les talents locaux sont difficiles à découvrir",
    shortTitle: "Talents locaux",
    budget: 2_500_000,
    deadline: "72 h",
    clients: "Talents, entreprises, recruteurs et agences",
    pitchQuestion: "Pourquoi un talent déjà visible ailleurs choisirait-il votre plateforme ?",
    surprises: ["Un CV ne suffit pas", "Comment savoir si c'est vrai ?", "Le talent ne sait pas se vendre", "Le recruteur veut chercher autrement", "Les meilleurs talents sont déjà ailleurs"],
  },
  {
    id: 5,
    title: "Les informations étudiantes sont dispersées",
    shortTitle: "Infos étudiantes",
    budget: 1_200_000,
    deadline: "48 h",
    clients: "Étudiants, établissements, associations et administration",
    pitchQuestion: "Comment faites-vous arriver la bonne information au bon étudiant au bon moment ?",
    surprises: ["Encore une plateforme ?", "Je cherche une information précise", "Tout le monde ne doit pas voir la même chose", "Une information peut changer", "Il faut prévenir au bon moment"],
  },
];

export const shopItems: ShopItem[] = [
  { id: "mentor", name: "Mentorat technique", description: "5 minutes pour lever un blocage", percent: 5, icon: "mentor" },
  { id: "test", name: "Test utilisateur", description: "3 testeurs pendant 5 minutes", percent: 10, icon: "test" },
  { id: "kit", name: "Banque de ressources", description: "Maquettes, données et composants", percent: 10, icon: "kit" },
  { id: "delay", name: "Report d'imprévu", description: "Lecture décalée de 10 minutes", percent: 5, icon: "clock" },
  { id: "pitch", name: "Relecture du pitch", description: "5 minutes avec un mentor", percent: 5, icon: "pitch" },
];

export const jokers = [
  { title: "Le budget baisse", detail: "Le client réduit le budget de 20 %. L'équipe décide ce qu'elle abandonne.", budgetEffect: -20 },
  { title: "Un coéquipier est indisponible", detail: "Un membre tiré au sort ne peut plus intervenir pendant 15 minutes." },
  { title: "Le client passe voir", detail: "Démonstration de 3 minutes, tout de suite." },
  { title: "La deadline avance", detail: "Le gel de la solution est avancé de 15 minutes." },
  { title: "Le pitch raccourcit", detail: "Le pitch passe de 5 à 4 minutes. Les questions restent à 2 minutes." },
  { title: "Imprévu imminent", detail: "Le prochain imprévu arrive dans 5 minutes." },
];

const now = new Date().toISOString();

const groupColors = [
  "#5538ee", "#149ec2", "#ff775d", "#9bd318", "#f4a51c", "#8b5cf6", "#e54882",
  "#187c65", "#de5b34", "#5367d9", "#aa7a12", "#317d9a", "#a24eb7", "#506031",
];

const initialTeams: Team[] = Array.from({ length: 14 }, (_, index) => ({
  id: `team-${String(index + 1).padStart(2, "0")}`,
  name: `Groupe ${String(index + 1).padStart(2, "0")}`,
  problemId: (index % problems.length) + 1,
  members: Array.from({ length: 5 }, (__, memberIndex) => `Membre ${memberIndex + 1}`),
  stage: (["Prototype", "Test", "Prototype", "Cadrage", "Pitch"] as const)[index % 5],
  progress: [64, 76, 48, 32, 82, 57, 69, 41, 73, 36, 88, 52, 61, 45][index],
  budgetAdjustment: 0,
  color: groupColors[index],
  updatedAt: now,
}));

export const initialState: GameState = {
  version: 2,
  sessionStartedAt: now,
  durationMinutes: 300,
  teams: initialTeams,
  purchases: [
    { id: "purchase-1", teamId: "team-02", itemId: "test", amount: 200_000, note: "Tester le parcours de triage", createdAt: new Date(Date.now() - 12 * 60_000).toISOString() },
    { id: "purchase-2", teamId: "team-01", itemId: "mentor", amount: 75_000, note: "Architecture du prototype", createdAt: new Date(Date.now() - 26 * 60_000).toISOString() },
    { id: "purchase-3", teamId: "team-03", itemId: "kit", amount: 100_000, note: "Composants de compétition", createdAt: new Date(Date.now() - 39 * 60_000).toISOString() },
  ],
  events: [
    { id: "event-1", teamId: "team-02", kind: "imprévu", title: "Tout est urgent", detail: "Décision enregistrée : adapter le parcours de priorisation.", decision: "Adapter", createdAt: new Date(Date.now() - 8 * 60_000).toISOString() },
    { id: "event-2", teamId: "team-01", kind: "note", title: "Prototype testable", detail: "Le groupe a ouvert son premier parcours de démonstration.", createdAt: new Date(Date.now() - 18 * 60_000).toISOString() },
  ],
};

export const formatMoney = (value: number) => `${new Intl.NumberFormat("fr-FR").format(Math.max(0, Math.round(value)))} FCFA`;
