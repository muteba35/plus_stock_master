export const SUBSCRIPTION_PLANS = [
  {
    code: "TRIAL",
    name: "Essai gratuit",
    level: 0,
    priceMonthly: 0,
    currency: "USD",
    durationDays: 14,
    description: "Pour tester Movoora avec une boutique et une caisse simple.",
    limits: { boutiques: 1, users: 2, products: 50 },
    features: [
      "DASHBOARD_LIMITED",
      "BOUTIQUE_SETTINGS",
      "PRODUCTS_LIMITED",
      "CATEGORIES",
      "CAISSE_LIMITED",
      "SALES_HISTORY_LIMITED",
      "BASIC_SUPPORT"
    ],
    unavailable: [
      "Finance avancee",
      "Exports PDF/Excel",
      "Multi-boutique",
      "Audit global",
      "Rapports avances"
    ]
  },
  {
    code: "STARTER",
    name: "Starter",
    level: 1,
    priceMonthly: 15,
    currency: "USD",
    description: "Pour une petite boutique qui veut gerer stock et caisse.",
    limits: { boutiques: 1, users: 3, products: 500 },
    features: [
      "DASHBOARD",
      "BOUTIQUE_SETTINGS",
      "PRODUCTS",
      "CATEGORIES",
      "STOCK_MOVEMENTS",
      "STOCK_ALERTS_BASIC",
      "CAISSE",
      "SALES_HISTORY",
      "INVOICES_BASIC",
      "RETURNS_BASIC",
      "TVA_BASIC",
      "CURRENCY_BASIC",
      "EXPORTS_LIMITED",
      "NOTIFICATIONS_BASIC",
      "TEAM_LIMITED"
    ],
    unavailable: [
      "Finance complete",
      "Audit global",
      "Imports Excel avances",
      "Rapports consolides"
    ]
  },
  {
    code: "PRO",
    name: "Pro",
    level: 2,
    priceMonthly: 39,
    currency: "USD",
    description: "Pour une boutique serieuse avec equipe, rapports et finance.",
    limits: { boutiques: 3, users: 10, products: 5000 },
    features: [
      "DASHBOARD",
      "BOUTIQUE_SETTINGS",
      "MULTI_BOUTIQUE_LIMITED",
      "PRODUCTS",
      "CATEGORIES",
      "STOCK_MOVEMENTS",
      "STOCK_ALERTS",
      "PRODUCT_PROJECTION",
      "CAISSE",
      "SALES_HISTORY",
      "INVOICES",
      "RETURNS",
      "CASH_REPORTS",
      "TEAM",
      "ROLES_PERMISSIONS",
      "DEPARTMENTS",
      "AUDIT_GLOBAL",
      "INVENTORY_REPORTS",
      "FINANCE",
      "EXPENSES",
      "PROFIT_LOSS",
      "EXPORTS_FULL",
      "NOTIFICATIONS_ADVANCED",
      "BARCODE_SCANNER",
      "TVA_ADVANCED",
      "CURRENCY_ADVANCED",
      "EXCEL_IMPORTS"
    ],
    unavailable: ["Rapports consolides multi-reseaux", "API future"]
  },
  {
    code: "BUSINESS",
    name: "Business / Entreprise",
    level: 3,
    priceMonthly: 99,
    currency: "USD",
    description: "Pour plusieurs boutiques, reseaux et besoins avances.",
    limits: { boutiques: 999, users: 999, products: 999999 },
    features: [
      "DASHBOARD",
      "BOUTIQUE_SETTINGS",
      "MULTI_BOUTIQUE",
      "PRODUCTS",
      "CATEGORIES",
      "STOCK_MOVEMENTS",
      "STOCK_ALERTS",
      "PRODUCT_PROJECTION",
      "CAISSE",
      "SALES_HISTORY",
      "INVOICES",
      "RETURNS",
      "CASH_REPORTS",
      "TEAM",
      "ROLES_PERMISSIONS",
      "DEPARTMENTS",
      "AUDIT_GLOBAL",
      "AUDIT_ADVANCED",
      "INVENTORY_REPORTS",
      "FINANCE",
      "EXPENSES",
      "PROFIT_LOSS",
      "CONSOLIDATED_REPORTS",
      "EXPORTS_FULL",
      "NOTIFICATIONS_ADVANCED",
      "BARCODE_SCANNER",
      "TVA_ADVANCED",
      "CURRENCY_ADVANCED",
      "EXCEL_IMPORTS",
      "BACKUPS_EXPORT",
      "FUTURE_API",
      "CUSTOM_BRANDING",
      "PRIORITY_SUPPORT",
      "SETUP_ASSISTANCE"
    ],
    unavailable: []
  }
];

export const PLAN_BY_CODE = Object.fromEntries(SUBSCRIPTION_PLANS.map((plan) => [plan.code, plan]));

export const getPlanByCode = (code = "TRIAL") => PLAN_BY_CODE[String(code || "TRIAL").toUpperCase()] || PLAN_BY_CODE.TRIAL;

export const featurePlanLabel = (feature) => {
  const plan = SUBSCRIPTION_PLANS.find((item) => item.features.includes(feature));
  return plan?.name || "Pro";
};

