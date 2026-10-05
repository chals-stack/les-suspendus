"use client";

import {
  ArrowDownRight,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  BadgeCheck,
  Banknote,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Dice5,
  Edit3,
  FlaskConical,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquareText,
  PackageOpen,
  Plus,
  ReceiptText,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  TimerReset,
  Trash2,
  TrendingUp,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatMoney, initialState, jokers, problems, shopItems } from "@/lib/data";
import { getSupabaseClient, workshopId } from "@/lib/supabase";
import type { GameEvent, GameState, Purchase, Stage, Team } from "@/lib/types";

type View = "dashboard" | "teams" | "shop" | "events";
type AuthState = "demo" | "checking" | "signed-out" | "signed-in";
type Actor = Pick<User, "id" | "email">;

const STORAGE_KEY = "les-suspendus-state-v2";
const colors = ["#5538ee", "#149ec2", "#ff775d", "#9bd318", "#f4a51c", "#8b5cf6", "#e54882", "#187c65", "#de5b34", "#5367d9", "#aa7a12", "#317d9a", "#a24eb7", "#506031"];
const stages: Stage[] = ["Cadrage", "Prototype", "Test", "Pitch", "Gelé"];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getProblem(team: Team) {
  return problems.find((problem) => problem.id === team.problemId) ?? problems[0];
}

function getTeamNumber(state: GameState, team: Team) {
  return String(state.teams.findIndex((entry) => entry.id === team.id) + 1).padStart(2, "0");
}

function durationLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${hours} h`;
}

function spentFor(state: GameState, teamId: string) {
  return state.purchases.filter((purchase) => purchase.teamId === teamId).reduce((sum, purchase) => sum + purchase.amount, 0);
}

function moneyState(state: GameState, team: Team) {
  const problem = getProblem(team);
  const spent = spentFor(state, team.id);
  const ceiling = Math.max(0, problem.budget + team.budgetAdjustment);
  const remaining = Math.max(0, ceiling - spent);
  return { problem, spent, ceiling, remaining, rate: ceiling ? Math.round((remaining / ceiling) * 100) : 0 };
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.floor(minutes / 60)} h`;
}

const shopIcons = {
  mentor: GraduationCap,
  test: FlaskConical,
  kit: PackageOpen,
  clock: TimerReset,
  pitch: MessageSquareText,
};

export function GameDashboard() {
  const [view, setView] = useState<View>("dashboard");
  const [state, setState] = useState<GameState>(initialState);
  const [ready, setReady] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [actor, setActor] = useState<Actor | null>(null);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [syncState, setSyncState] = useState<"local" | "syncing" | "live" | "error">("local");
  const [mobileNav, setMobileNav] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [checkout, setCheckout] = useState<{ teamId: string; itemId: string } | null>(null);
  const [toast, setToast] = useState("");
  const [clock, setClock] = useState(Date.now());
  const skipRemoteSave = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<GameState>;
        setState(parsed.version === 2 ? parsed as GameState : initialState);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthState("demo");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setActor(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null);
      setAuthState(data.session ? "signed-in" : "signed-out");
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setActor(session?.user ? { id: session.user.id, email: session.user.email } : null);
      setAuthState(session ? "signed-in" : "signed-out");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authState !== "signed-in") return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    setSyncState("syncing");
    supabase
      .from("workshops")
      .select("state")
      .eq("id", workshopId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setSyncState("error");
          return;
        }
        if (data?.state && (data.state as Partial<GameState>).version === 2) {
          skipRemoteSave.current = true;
          setState(data.state as GameState);
        }
        setSyncState("live");
      });

    const channel = supabase
      .channel(`workshop-${workshopId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "workshops", filter: `id=eq.${workshopId}` },
        (payload) => {
          const next = (payload.new as { state?: GameState }).state;
          if (next) {
            skipRemoteSave.current = true;
            setState(next);
            setSyncState("live");
          }
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [authState]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (authState !== "signed-in") return;
    if (skipRemoteSave.current) {
      skipRemoteSave.current = false;
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSyncState("syncing");
    const timer = window.setTimeout(() => {
      supabase
        .from("workshops")
        .upsert({ id: workshopId, state, updated_at: new Date().toISOString(), updated_by: actor?.id, updated_by_email: actor?.email })
        .then(({ error }) => setSyncState(error ? "error" : "live"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [state, ready, authState, actor]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const totals = useMemo(() => {
    const budget = state.teams.reduce((sum, team) => sum + moneyState(state, team).ceiling, 0);
    const spent = state.purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const average = state.teams.length ? Math.round(state.teams.reduce((sum, team) => sum + team.progress, 0) / state.teams.length) : 0;
    return { budget, spent, remaining: Math.max(0, budget - spent), average };
  }, [state]);

  const elapsedMinutes = Math.floor((clock - new Date(state.sessionStartedAt).getTime()) / 60_000);
  const timeLeft = Math.max(0, state.durationMinutes - elapsedMinutes);
  const hours = Math.floor(timeLeft / 60);
  const minutes = String(timeLeft % 60).padStart(2, "0");

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase || !email) return;
    setAuthMessage("Envoi en cours…");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setAuthMessage(error ? error.message : "Lien envoyé. Vérifiez votre boîte mail.");
  }

  async function signOut() {
    await getSupabaseClient()?.auth.signOut();
  }

  function showToast(message: string) {
    setToast(message);
  }

  function audit(action: string, details: Record<string, unknown>) {
    const supabase = getSupabaseClient();
    if (!supabase || authState !== "signed-in" || !actor?.email) return;
    void supabase.from("workshop_audit_logs").insert({
      workshop_id: workshopId,
      actor_id: actor.id,
      actor_email: actor.email,
      action,
      details,
    });
  }

  function saveTeam(team: Team) {
    setState((current) => ({ ...current, teams: current.teams.map((item) => (item.id === team.id ? { ...team, updatedAt: new Date().toISOString() } : item)) }));
    audit("team.updated", { teamId: team.id, teamName: team.name, problemId: team.problemId, progress: team.progress, stage: team.stage });
    setEditingTeam(null);
    showToast(`${team.name} a été mise à jour`);
  }

  function addPurchase(teamId: string, itemId: string, note: string) {
    const team = state.teams.find((item) => item.id === teamId);
    const item = shopItems.find((entry) => entry.id === itemId);
    if (!team || !item) return;
    const money = moneyState(state, team);
    const amount = Math.round(getProblem(team).budget * (item.percent / 100));
    if (amount > money.remaining) {
      showToast("Budget insuffisant pour cet achat");
      return;
    }
    const purchase: Purchase = { id: uid("purchase"), teamId, itemId, amount, note, createdAt: new Date().toISOString() };
    setState((current) => ({ ...current, purchases: [purchase, ...current.purchases] }));
    audit("purchase.created", { purchaseId: purchase.id, teamId, teamName: team.name, itemId, itemName: item.name, amount, note });
    setCheckout(null);
    showToast(`${item.name} acheté pour ${formatMoney(amount)}`);
  }

  function deletePurchase(id: string) {
    const purchase = state.purchases.find((entry) => entry.id === id);
    const team = purchase ? state.teams.find((entry) => entry.id === purchase.teamId) : undefined;
    setState((current) => ({ ...current, purchases: current.purchases.filter((purchase) => purchase.id !== id) }));
    audit("purchase.deleted", { purchaseId: id, teamId: purchase?.teamId, teamName: team?.name, amount: purchase?.amount });
    showToast("Achat annulé et budget recrédité");
  }

  function addEvent(event: GameEvent, budgetPercent?: number) {
    setState((current) => ({
      ...current,
      teams: budgetPercent
        ? current.teams.map((team) =>
            team.id === event.teamId
              ? { ...team, budgetAdjustment: team.budgetAdjustment + Math.round(getProblem(team).budget * (budgetPercent / 100)), updatedAt: new Date().toISOString() }
              : team,
          )
        : current.teams,
      events: [event, ...current.events],
    }));
    const team = state.teams.find((entry) => entry.id === event.teamId);
    audit("event.created", { eventId: event.id, teamId: event.teamId, teamName: team?.name, kind: event.kind, title: event.title, budgetPercent });
    showToast(`${event.kind === "joker" ? "Joker" : "Imprévu"} attribué`);
  }

  if (authState === "checking" || !ready) {
    return <div className="loading-screen"><div className="loading-mark"><Zap size={28} /></div><p>Préparation de l'atelier…</p></div>;
  }

  if (authState === "signed-out") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark"><Zap size={22} fill="currentColor" /></div>
          <p className="eyebrow">Les Suspendus</p>
          <h1>Entrez dans la salle de contrôle.</h1>
          <p className="auth-copy">Recevez un lien sécurisé pour rejoindre l'atelier et collaborer en temps réel.</p>
          <form onSubmit={sendMagicLink} className="auth-form">
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" type="email" required placeholder="vous@organisation.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            <button className="button button-primary" type="submit"><LogIn size={18} /> Recevoir mon lien</button>
          </form>
          {authMessage && <p className="form-message">{authMessage}</p>}
        </section>
      </main>
    );
  }

  const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: "teams", label: "Équipes", icon: Users },
    { id: "shop", label: "Boutique", icon: Store },
    { id: "events", label: "Imprévus", icon: Dice5 },
  ];

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Zap size={21} fill="currentColor" /></div>
          <div><strong>L'Atelier</strong><span>Les Suspendus</span></div>
        </div>
        <nav aria-label="Navigation principale">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileNav(false); }}><Icon size={19} /><span>{item.label}</span>{item.id === "shop" && <b>{state.purchases.length}</b>}</button>;
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="session-card">
          <div className="session-orbit"><Clock3 size={20} /></div>
          <span>Temps restant</span>
          <strong>{hours}:{minutes}</strong>
          <div className="mini-progress"><i style={{ width: `${Math.max(0, (timeLeft / state.durationMinutes) * 100)}%` }} /></div>
        </div>
        <button className="sidebar-action" onClick={() => setSetupOpen(true)}><Settings2 size={18} /> Configurer l'atelier</button>
        {authState === "signed-in" && <button className="sidebar-action" onClick={signOut}><LogOut size={18} /> Se déconnecter</button>}
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Ouvrir le menu" onClick={() => setMobileNav(true)}><Menu /></button>
          <div>
            <p className="eyebrow">Challenge en cours</p>
            <h1>{view === "dashboard" ? "Bonjour, organisateur !" : navItems.find((item) => item.id === view)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <div className={`sync-pill ${syncState}`}><span />{authState === "demo" ? "Mode démo" : syncState === "live" ? "Synchronisé" : syncState === "syncing" ? "Synchronisation" : "Hors ligne"}</div>
            <button className="button button-ghost" onClick={() => setSetupOpen(true)}><Settings2 size={18} /><span>Réglages</span></button>
            <button className="avatar" aria-label="Compte organisateur">SO</button>
          </div>
        </header>

        <div className="page-content">
          {view === "dashboard" && <DashboardView state={state} totals={totals} timeLabel={`${hours}:${minutes}`} onNavigate={setView} onEdit={setEditingTeam} />}
          {view === "teams" && <TeamsView state={state} onEdit={setEditingTeam} onAdd={() => setSetupOpen(true)} />}
          {view === "shop" && <ShopView state={state} onCheckout={(teamId, itemId) => setCheckout({ teamId, itemId })} onDeletePurchase={deletePurchase} />}
          {view === "events" && <EventsView state={state} onAdd={addEvent} />}
        </div>
      </section>

      {mobileNav && <button className="nav-backdrop" aria-label="Fermer le menu" onClick={() => setMobileNav(false)} />}
      {setupOpen && <SetupModal state={state} onClose={() => setSetupOpen(false)} onSave={(next) => { setState(next); audit("workshop.configured", { teamCount: next.teams.length, durationMinutes: next.durationMinutes }); setSetupOpen(false); showToast("Atelier configuré"); }} />}
      {editingTeam && <TeamModal team={editingTeam} onClose={() => setEditingTeam(null)} onSave={saveTeam} />}
      {checkout && <CheckoutModal state={state} teamId={checkout.teamId} itemId={checkout.itemId} onClose={() => setCheckout(null)} onConfirm={addPurchase} />}
      {toast && <div className="toast"><Check size={18} />{toast}</div>}
    </main>
  );
}

function DashboardView({ state, totals, timeLabel, onNavigate, onEdit }: { state: GameState; totals: { budget: number; spent: number; remaining: number; average: number }; timeLabel: string; onNavigate: (view: View) => void; onEdit: (team: Team) => void }) {
  const [rankingOrder, setRankingOrder] = useState<"desc" | "asc">("desc");
  const ranking = [...state.teams].sort((a, b) => {
    const moneyA = moneyState(state, a);
    const moneyB = moneyState(state, b);
    const budgetDifference = rankingOrder === "desc" ? moneyB.rate - moneyA.rate : moneyA.rate - moneyB.rate;
    if (budgetDifference) return budgetDifference;
    if (b.progress !== a.progress) return b.progress - a.progress;
    return moneyA.remaining - moneyB.remaining;
  });
  const activity = [
    ...state.purchases.map((purchase) => ({ id: purchase.id, at: purchase.createdAt, teamId: purchase.teamId, title: shopItems.find((item) => item.id === purchase.itemId)?.name ?? "Achat", detail: `− ${formatMoney(purchase.amount)}`, kind: "purchase" })),
    ...state.events.map((event) => ({ id: event.id, at: event.createdAt, teamId: event.teamId, title: event.title, detail: event.kind, kind: event.kind })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 6);

  return (
    <>
      <section className="hero-grid">
        <article className="focus-card">
          <div className="focus-top"><span className="session-label"><Clock3 size={15} /> Session active</span><span>{durationLabel(state.durationMinutes)}</span></div>
          <div className="focus-copy"><p>Temps avant le gel</p><strong>{timeLabel}</strong><span>Le minuteur reste modifiable dans les réglages.</span></div>
          <div className="timer-motif" aria-hidden="true"><span /><span /><span /></div>
          <button onClick={() => onNavigate("events")}>Lancer un imprévu <Dice5 size={18} /></button>
        </article>
        <div className="metric-grid">
          <Metric icon={CircleDollarSign} label="Budget total" value={formatMoney(totals.budget)} note="Budget actif" tone="blue" />
          <Metric icon={ShoppingBag} label="Dépenses" value={formatMoney(totals.spent)} note={`${state.purchases.length} achats enregistrés`} tone="purple" />
          <Metric icon={ShieldCheck} label="Encore disponible" value={formatMoney(totals.remaining)} note={`${totals.budget ? Math.round((totals.remaining / totals.budget) * 100) : 0} % du budget`} tone="lime" />
          <Metric icon={TrendingUp} label="Avancement moyen" value={`${totals.average} %`} note={`${state.teams.length} équipes actives`} tone="orange" />
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Pilotage</p><h2>Équipes en course</h2></div><button className="text-button" onClick={() => onNavigate("teams")}>Voir toutes les équipes</button></div>
        <div className="team-grid">
          {state.teams.map((team) => <TeamCard key={team.id} state={state} team={team} onEdit={() => onEdit(team)} />)}
        </div>
      </section>

      <section className="lower-grid">
        <article className="panel ranking-panel">
          <div className="panel-heading"><div><p className="eyebrow">Gestion du budget</p><h2>Classement des groupes</h2></div><button className="sort-button" onClick={() => setRankingOrder((current) => current === "desc" ? "asc" : "desc")} aria-label={`Trier par budget ${rankingOrder === "desc" ? "croissant" : "décroissant"}`}>{rankingOrder === "desc" ? <ArrowDownWideNarrow size={18} /> : <ArrowUpNarrowWide size={18} />}<span>{rankingOrder === "desc" ? "Décroissant" : "Croissant"}</span></button></div>
          <p className="ranking-rule">Égalité : avancement le plus élevé, puis budget restant le plus faible.</p>
          <div className="ranking-list">
            {ranking.map((team, index) => {
              const money = moneyState(state, team);
              return <div className="rank-row" key={team.id}><strong className={`rank rank-${index + 1}`}>{index + 1}</strong><span className="team-dot" style={{ background: team.color }}>{getTeamNumber(state, team)}</span><div><b>{team.name}</b><small>{team.progress} % avancé · {money.problem.shortTitle}</small></div><div className="rank-money"><b>{money.rate} %</b><small>{formatMoney(money.remaining)}</small></div></div>;
            })}
          </div>
        </article>
        <article className="panel activity-panel">
          <div className="panel-heading"><div><p className="eyebrow">Derniers mouvements</p><h2>Activité de l'atelier</h2></div><ReceiptText size={22} /></div>
          <div className="activity-list">
            {activity.map((item) => {
              const team = state.teams.find((entry) => entry.id === item.teamId);
              return <div className="activity-row" key={`${item.kind}-${item.id}`}><span className={`activity-icon ${item.kind}`}><ArrowDownRight size={17} /></span><div><b>{item.title}</b><small>{team?.name} · {relativeTime(item.at)}</small></div><strong>{item.detail}</strong></div>;
            })}
          </div>
        </article>
      </section>
    </>
  );
}

function Metric({ icon: Icon, label, value, note, tone }: { icon: typeof Banknote; label: string; value: string; note: string; tone: string }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={21} /></span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

function TeamCard({ state, team, onEdit }: { state: GameState; team: Team; onEdit: () => void }) {
  const money = moneyState(state, team);
  return (
    <article className="team-card">
      <div className="team-card-top"><span className="team-avatar" style={{ background: team.color }}>{getTeamNumber(state, team)}</span><div><h3>{team.name}</h3><p>{team.members.length} membres · {team.stage}</p></div><button aria-label={`Modifier ${team.name}`} onClick={onEdit}><Edit3 size={17} /></button></div>
      <div className="problem-chip"><span>Problème {money.problem.id}</span>{money.problem.shortTitle}</div>
      <div className="budget-line"><span>Budget restant</span><strong>{formatMoney(money.remaining)}</strong></div>
      <div className="progress-track"><i style={{ width: `${money.rate}%`, background: team.color }} /></div>
      <div className="team-card-foot"><span>{money.rate} % disponible</span><span>{team.progress} % avancé</span></div>
    </article>
  );
}

function TeamsView({ state, onEdit, onAdd }: { state: GameState; onEdit: (team: Team) => void; onAdd: () => void }) {
  return (
    <section className="view-stack">
      <div className="view-intro"><div><p className="eyebrow">Composition et progression</p><h2>Les équipes</h2><p>Attribuez les problèmes, ajustez les membres et faites avancer chaque équipe.</p></div><button className="button button-primary" onClick={onAdd}><Plus size={18} /> Ajouter des équipes</button></div>
      <div className="teams-table-wrap panel">
        <table className="teams-table">
          <thead><tr><th>Équipe</th><th>Problème</th><th>Budget restant</th><th>Phase</th><th>Avancement</th><th /></tr></thead>
          <tbody>{state.teams.map((team) => { const money = moneyState(state, team); return <tr key={team.id}><td><div className="table-team"><span style={{ background: team.color }}>{getTeamNumber(state, team)}</span><div><b>{team.name}</b><small>{team.members.join(" · ")}</small></div></div></td><td><span className="table-problem">{money.problem.id}</span>{money.problem.shortTitle}</td><td><b>{formatMoney(money.remaining)}</b><small className="cell-note">sur {formatMoney(money.ceiling)}</small></td><td><span className="stage-pill">{team.stage}</span></td><td><div className="inline-progress"><i style={{ width: `${team.progress}%`, background: team.color }} /></div><small>{team.progress} %</small></td><td><button className="icon-button" onClick={() => onEdit(team)}><Edit3 size={17} /></button></td></tr>; })}</tbody>
        </table>
      </div>
    </section>
  );
}

function ShopView({ state, onCheckout, onDeletePurchase }: { state: GameState; onCheckout: (teamId: string, itemId: string) => void; onDeletePurchase: (id: string) => void }) {
  const [selectedTeam, setSelectedTeam] = useState(state.teams[0]?.id ?? "");
  const team = state.teams.find((item) => item.id === selectedTeam) ?? state.teams[0];
  const money = team ? moneyState(state, team) : null;
  return (
    <section className="view-stack">
      <div className="view-intro"><div><p className="eyebrow">Caisse de l'atelier</p><h2>La boutique</h2><p>Chaque prix est calculé sur le budget initial du problème choisi.</p></div><label className="team-select"><span>Équipe acheteuse</span><select value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)}>{state.teams.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><ChevronDown size={16} /></label></div>
      {team && money && <div className="shop-balance"><div><span className="team-avatar" style={{ background: team.color }}>{getTeamNumber(state, team)}</span><div><small>Solde disponible</small><strong>{formatMoney(money.remaining)}</strong></div></div><div><span>Dépensé</span><b>{formatMoney(money.spent)}</b></div><div><span>Budget actif</span><b>{formatMoney(money.ceiling)}</b></div></div>}
      <div className="shop-grid">{shopItems.map((item) => { const Icon = shopIcons[item.icon]; const amount = team ? Math.round(getProblem(team).budget * item.percent / 100) : 0; const disabled = !money || amount > money.remaining; return <article className="shop-card" key={item.id}><div className="shop-card-icon"><Icon size={25} /></div><span className="percent-tag">{item.percent} %</span><h3>{item.name}</h3><p>{item.description}</p><strong>{formatMoney(amount)}</strong><button disabled={disabled} onClick={() => team && onCheckout(team.id, item.id)}>{disabled ? "Budget insuffisant" : "Ajouter au panier"}</button></article>; })}</div>
      <article className="panel purchase-history"><div className="panel-heading"><div><p className="eyebrow">Traçabilité</p><h2>Historique des achats</h2></div><CreditCard size={22} /></div>{state.purchases.length ? <div className="purchase-list">{state.purchases.map((purchase) => { const purchaseTeam = state.teams.find((entry) => entry.id === purchase.teamId); const item = shopItems.find((entry) => entry.id === purchase.itemId); return <div className="purchase-row" key={purchase.id}><span className="purchase-avatar" style={{ background: purchaseTeam?.color }}>{purchaseTeam ? getTeamNumber(state, purchaseTeam) : "--"}</span><div><b>{item?.name}</b><small>{purchaseTeam?.name} · {purchase.note || "Sans note"} · {relativeTime(purchase.createdAt)}</small></div><strong>− {formatMoney(purchase.amount)}</strong><button aria-label="Annuler l'achat" onClick={() => onDeletePurchase(purchase.id)}><Trash2 size={16} /></button></div>; })}</div> : <EmptyState icon={ShoppingBag} text="Aucun achat enregistré." />}</article>
    </section>
  );
}

function EventsView({ state, onAdd }: { state: GameState; onAdd: (event: GameEvent, budgetPercent?: number) => void }) {
  const [teamId, setTeamId] = useState(state.teams[0]?.id ?? "");
  const [decision, setDecision] = useState<GameEvent["decision"]>("Adapter");
  const [lastDraw, setLastDraw] = useState<{ title: string; detail: string; kind: "imprévu" | "joker" } | null>(null);
  const team = state.teams.find((entry) => entry.id === teamId);

  function draw(kind: "imprévu" | "joker") {
    if (!team) return;
    if (kind === "joker") {
      const joker = jokers[Math.floor(Math.random() * jokers.length)];
      setLastDraw({ ...joker, kind });
      onAdd({ id: uid("event"), teamId, kind, title: joker.title, detail: joker.detail, createdAt: new Date().toISOString() }, joker.budgetEffect);
    } else {
      const problem = getProblem(team);
      const title = problem.surprises[Math.floor(Math.random() * problem.surprises.length)];
      const detail = `L'équipe choisit de ${decision?.toLowerCase()} cet imprévu et doit justifier sa décision au pitch.`;
      setLastDraw({ title, detail, kind });
      onAdd({ id: uid("event"), teamId, kind, title, detail, decision, createdAt: new Date().toISOString() });
    }
  }

  return (
    <section className="view-stack">
      <div className="view-intro"><div><p className="eyebrow">Changer la donne</p><h2>Imprévus et jokers</h2><p>Tirez une carte, attribuez-la et consignez immédiatement la réponse.</p></div><label className="team-select"><span>Équipe concernée</span><select value={teamId} onChange={(event) => setTeamId(event.target.value)}>{state.teams.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><ChevronDown size={16} /></label></div>
      <div className="draw-layout">
        <article className="draw-card surprise-card"><div className="draw-icon"><WandSparkles size={28} /></div><p className="eyebrow">Carte du problème</p><h3>Tirer un imprévu</h3><p>Une contrainte directement liée au problème de l'équipe.</p><div className="decision-group">{(["Intégrer", "Adapter", "Reporter"] as const).map((item) => <button className={decision === item ? "active" : ""} key={item} onClick={() => setDecision(item)}>{item}</button>)}</div><button className="draw-button" onClick={() => draw("imprévu")}><Dice5 size={19} /> Tirer la carte</button></article>
        <article className="joker-playing-card">
          <div className="joker-corner joker-corner-top"><strong>J</strong><Sparkles size={16} /></div>
          <div className="joker-corner joker-corner-bottom"><strong>J</strong><Sparkles size={16} /></div>
          <div className="joker-art"><img src="/joker-jester.png" alt="Bouffon illustré de la carte Joker" /></div>
          <div className="joker-copy"><span>Carte commune</span><h3>Joker</h3><p>Une règle inattendue qui change le rythme du challenge.</p></div>
          <button className="joker-draw-button" onClick={() => draw("joker")}><Dice5 size={19} /> Tirer le joker</button>
        </article>
        <article className="draw-result"><p className="eyebrow">Dernier tirage</p>{lastDraw ? <><span>{lastDraw.kind}</span><h3>{lastDraw.title}</h3><p>{lastDraw.detail}</p><div className="result-team"><BadgeCheck size={18} /> Attribué à {team?.name}</div></> : <EmptyState icon={Dice5} text="La prochaine carte apparaîtra ici." />}</article>
      </div>
      <article className="panel event-log"><div className="panel-heading"><div><p className="eyebrow">Journal de décisions</p><h2>Cartes attribuées</h2></div><MessageSquareText size={22} /></div>{state.events.length ? <div className="event-list">{state.events.map((event) => { const eventTeam = state.teams.find((entry) => entry.id === event.teamId); return <div className="event-row" key={event.id}><span className={`event-kind ${event.kind}`}>{event.kind}</span><div><b>{event.title}</b><small>{event.detail}</small></div><div><b>{eventTeam?.name}</b><small>{event.decision || relativeTime(event.createdAt)}</small></div></div>; })}</div> : <EmptyState icon={MessageSquareText} text="Aucune décision consignée." />}</article>
    </section>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof ShoppingBag; text: string }) {
  return <div className="empty-state"><Icon size={24} /><span>{text}</span></div>;
}

function SetupModal({ state, onClose, onSave }: { state: GameState; onClose: () => void; onSave: (state: GameState) => void }) {
  const [teamCount, setTeamCount] = useState(state.teams.length || 1);
  const [membersCount, setMembersCount] = useState(state.teams[0]?.members.length || 5);
  const [hours, setHours] = useState(Math.floor(state.durationMinutes / 60));
  const [minutes, setMinutes] = useState(state.durationMinutes % 60);
  const [restartTimer, setRestartTimer] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const safeCount = Math.min(14, Math.max(1, teamCount));
    const durationMinutes = Math.max(1, Math.min(99, hours) * 60 + Math.min(59, minutes));
    const teams = Array.from({ length: safeCount }, (_, index) => state.teams[index] ?? { id: uid("group"), name: `Groupe ${String(index + 1).padStart(2, "0")}`, problemId: (index % problems.length) + 1, members: Array.from({ length: membersCount }, (__, memberIndex) => `Membre ${memberIndex + 1}`), stage: "Cadrage" as Stage, progress: 10, budgetAdjustment: 0, color: colors[index % colors.length], updatedAt: new Date().toISOString() });
    const teamIds = new Set(teams.map((team) => team.id));
    onSave({ ...state, teams, durationMinutes, sessionStartedAt: restartTimer ? new Date().toISOString() : state.sessionStartedAt, purchases: state.purchases.filter((purchase) => teamIds.has(purchase.teamId)), events: state.events.filter((gameEvent) => teamIds.has(gameEvent.teamId)) });
  }

  return <Modal title="Configurer l'atelier" subtitle="Groupes, participants et minuteur restent modifiables pendant le challenge." onClose={onClose}><form className="modal-form" onSubmit={submit}><div className="form-grid"><label><span>Nombre de groupes (1 à 14)</span><input type="number" min="1" max="14" value={teamCount} onChange={(event) => setTeamCount(Number(event.target.value))} /></label><label><span>Membres par nouveau groupe</span><input type="number" min="1" max="20" value={membersCount} onChange={(event) => setMembersCount(Number(event.target.value))} /></label><div className="duration-editor span-2"><div><p>Durée libre</p><small>Jusqu'à 99 heures et 59 minutes</small></div><label><span>Heures</span><input type="number" min="0" max="99" value={hours} onChange={(event) => setHours(Number(event.target.value))} /></label><b>:</b><label><span>Minutes</span><input type="number" min="0" max="59" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label></div><label className="restart-option span-2"><input type="checkbox" checked={restartTimer} onChange={(event) => setRestartTimer(event.target.checked)} /><span>Relancer le minuteur dès l'enregistrement</span></label></div><p className="form-hint">Réduire le nombre de groupes retire aussi leurs achats et événements du suivi. Les autres données sont conservées.</p><div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose}>Annuler</button><button className="button button-primary" type="submit">Enregistrer la configuration</button></div></form></Modal>;
}

function TeamModal({ team, onClose, onSave }: { team: Team; onClose: () => void; onSave: (team: Team) => void }) {
  const [draft, setDraft] = useState(team);
  return <Modal title={`Modifier ${team.name}`} subtitle="Tout changement est partagé avec les autres organisateurs." onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><div className="form-grid"><label><span>Nom du groupe</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label><span>Couleur du groupe</span><input className="color-input" type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} /></label><label className="span-2"><span>Problème choisi</span><select value={draft.problemId} onChange={(event) => setDraft({ ...draft, problemId: Number(event.target.value), budgetAdjustment: 0 })}>{problems.map((problem) => <option value={problem.id} key={problem.id}>{problem.id}. {problem.title} — {formatMoney(problem.budget)}</option>)}</select></label><label><span>Phase</span><select value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value as Stage })}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></label><label><span>Avancement ({draft.progress} %)</span><input type="range" min="0" max="100" step="1" value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Number(event.target.value) })} /></label><label className="span-2"><span>Ajustement manuel du budget en FCFA</span><input type="number" step="1000" value={draft.budgetAdjustment} onChange={(event) => setDraft({ ...draft, budgetAdjustment: Number(event.target.value) })} /><small className="field-help">Utilisez une valeur négative pour réduire le budget, positive pour l'augmenter.</small></label><label className="span-2"><span>Membres, séparés par une virgule</span><textarea rows={3} value={draft.members.join(", ")} onChange={(event) => setDraft({ ...draft, members: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label></div><div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose}>Annuler</button><button className="button button-primary" type="submit">Mettre à jour</button></div></form></Modal>;
}

function CheckoutModal({ state, teamId, itemId, onClose, onConfirm }: { state: GameState; teamId: string; itemId: string; onClose: () => void; onConfirm: (teamId: string, itemId: string, note: string) => void }) {
  const [note, setNote] = useState("");
  const team = state.teams.find((entry) => entry.id === teamId)!;
  const item = shopItems.find((entry) => entry.id === itemId)!;
  const amount = Math.round(getProblem(team).budget * item.percent / 100);
  const money = moneyState(state, team);
  return <Modal title="Confirmer l'achat" subtitle="La dépense sera déduite immédiatement." onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onConfirm(teamId, itemId, note); }}><div className="receipt-preview"><div><span className="team-avatar" style={{ background: team.color }}>{getTeamNumber(state, team)}</span><div><small>{team.name}</small><h3>{item.name}</h3></div></div><strong>{formatMoney(amount)}</strong></div><div className="receipt-lines"><p><span>Tarif</span><b>{item.percent} % du budget initial</b></p><p><span>Solde avant achat</span><b>{formatMoney(money.remaining)}</b></p><p className="receipt-total"><span>Solde après achat</span><b>{formatMoney(money.remaining - amount)}</b></p></div><label><span>Justification pour le journal</span><textarea rows={3} placeholder="Pourquoi cet achat est utile à l'équipe ?" value={note} onChange={(event) => setNote(event.target.value)} /></label><div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose}>Annuler</button><button className="button button-primary" type="submit"><ShoppingBag size={17} /> Valider l'achat</button></div></form></Modal>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><p className="eyebrow">Back-office</p><h2>{title}</h2><p>{subtitle}</p></div><button aria-label="Fermer" onClick={onClose}><X size={20} /></button></div>{children}</section></div>;
}
