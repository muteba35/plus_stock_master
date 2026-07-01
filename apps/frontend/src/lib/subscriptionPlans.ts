export type PlanCode = "TRIAL" | "STARTER" | "PRO" | "BUSINESS";

export interface SubscriptionState {
  planCode: PlanCode;
  planName?: string;
  status?: string;
  features?: string[];
  limits?: Record<string, number>;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
}

export const planOrder: Record<PlanCode, number> = {
  TRIAL: 0,
  STARTER: 1,
  PRO: 2,
  BUSINESS: 3,
};

export const planNames: Record<PlanCode, string> = {
  TRIAL: "Essai gratuit",
  STARTER: "Starter",
  PRO: "Pro",
  BUSINESS: "Business",
};

export const fallbackSubscription: SubscriptionState = {
  planCode: "TRIAL",
  planName: "Essai gratuit",
  status: "trialing",
  features: [],
  limits: { boutiques: 1, users: 2, products: 50 },
};

export const routePlanRequirements: Array<{ href: string; plan: PlanCode; feature: string }> = [
  { href: "/dashboard/finances", plan: "PRO", feature: "Finance complete" },
  { href: "/dashboard/caisse/rapports", plan: "PRO", feature: "Rapports caisse" },
  { href: "/dashboard/inventaire/projection", plan: "PRO", feature: "Projection produits" },
  { href: "/dashboard/parametres/audit", plan: "PRO", feature: "Audit global" },
  { href: "/dashboard/equipe/roles", plan: "PRO", feature: "Roles et permissions avances" },
  { href: "/dashboard/equipe/departements", plan: "PRO", feature: "Departements" },
  { href: "/dashboard/parametres/notifications", plan: "PRO", feature: "Notifications avancees" },
];

export const getRequiredPlanForPath = (pathname: string) =>
  routePlanRequirements
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0] || null;

export const canUsePlan = (currentPlan: PlanCode, requiredPlan?: PlanCode) => {
  if (!requiredPlan) return true;
  return planOrder[currentPlan] >= planOrder[requiredPlan];
};
