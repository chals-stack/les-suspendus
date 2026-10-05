# L'Atelier — Mini-Entreprise Digitale

## Boutique Les Suspendus

L'application est organisée en quatre onglets : Dashboard public, Configuration, Équipes et Boutique. Les coûts sont calculés comme un pourcentage du budget du problème, arrondis à l'entier de FCFA. Les achats conservent le nom, le pourcentage et le montant au moment de l'achat ; une annulation recrédite automatiquement le budget. Le mode local utilise `localStorage`. En production, configurez Supabase et appliquez `supabase/schema.sql` ; la fonction `record_shop_purchase` fournit le verrou transactionnel côté serveur.

Application web de pilotage en direct du challenge Mini-Entreprise Digitale. Elle centralise les équipes, les problèmes choisis, les budgets, les achats en boutique, les imprévus, les jokers et le journal de décisions.

## Fonctionnalités

- tableau de bord avec budget global, dépenses, progression et classement ;
- création et configuration de 1 à 14 groupes numérotés et de leurs membres ;
- attribution automatique du budget selon l'un des cinq problèmes ;
- boutique à prix proportionnels (5 % ou 10 % du budget initial) ;
- débit instantané et possibilité d'annuler un achat ;
- tirage des 25 imprévus et des 6 jokers du guide ;
- application automatique du joker de baisse de budget de 20 % ;
- journal de décisions et suivi de la progression ;
- synchronisation Supabase Realtime et connexion par lien magique ;
- minuteur libre jusqu'à 99 h 59, relançable à tout moment ;
- classement croissant ou décroissant avec départage par avancement, puis budget restant ;
- mode démo local automatique si Supabase n'est pas configuré.

## Démarrage local

```bash
pnpm install
pnpm dev
```

Ouvrir ensuite `http://localhost:3000`.

## Production avec Neon

Créer une base Neon, exécuter `neon/schema.sql`, puis renseigner dans Vercel : `DATABASE_URL`, `ORGANIZER_PASSWORD` et éventuellement `WORKSHOP_ID`. `DATABASE_URL` reste exclusivement côté serveur. Le Dashboard est public ; les mutations demandent le mot de passe organisateur et les achats sont validés dans une transaction avec verrouillage de la ligne atelier. Le client interroge l'état toutes les 1,5 secondes pour refléter les achats des autres appareils.

## Activer Supabase

1. Créer un projet Supabase.
2. Exécuter `supabase/schema.sql` dans l'éditeur SQL.
3. Ajouter au moins un organisateur dans `public.workshop_members` avec l'exemple à la fin du fichier SQL.
4. Activer l'authentification par e-mail dans Supabase Auth.
5. Copier `.env.example` vers `.env.local` et renseigner l'URL et la clé publique.
6. Ajouter l'URL locale et le domaine Vercel aux URL de redirection autorisées dans Supabase Auth.

Vérifier ensuite la connexion avec `pnpm supabase:check`.

Sans ces variables, l'application reste entièrement utilisable en mode démo et stocke les changements dans le navigateur.

## Déploiement Vercel

Importer le dépôt dans Vercel, puis ajouter :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_WORKSHOP_ID` (par exemple `atelier-principal`)

La commande de build est `pnpm build`. Le projet est une application Next.js App Router standard et ne nécessite aucun réglage Vercel supplémentaire.

## Modèle d'accès

Quand Supabase est activé, seuls les e-mails présents dans `public.workshop_members` peuvent lire ou modifier l'atelier. Les changements importants sont tracés dans `public.workshop_audit_logs` avec l'e-mail connecté, l'action, les détails et l'horodatage.

Le mode démo local reste disponible tant que les variables Supabase ne sont pas configurées. Il est pratique pour tester, mais il ne doit pas servir à conserver les données d'un vrai atelier.
