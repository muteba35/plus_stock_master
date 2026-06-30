const DEFAULT_LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

const splitOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const configuredOrigins = [
  ...splitOrigins(process.env.CORS_ORIGINS),
  ...splitOrigins(process.env.FRONTEND_URL),
  "https://plusstockmaster.netlify.app",
  "https://plustockmaster.netlify.app",
];

const allowedOrigins = new Set([
  ...configuredOrigins,
  ...DEFAULT_LOCAL_ORIGINS,
]);

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origine CORS non autorisee."));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

const fallbackSecurityHeaders = (_req, res, next) => {
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
};

let helmetMiddleware = fallbackSecurityHeaders;

try {
  const helmetModule = await import("helmet");
  const helmet = helmetModule.default;
  helmetMiddleware = helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });
} catch {
  helmetMiddleware = fallbackSecurityHeaders;
}

export const securityHeaders = helmetMiddleware;

const dangerousKeys = new Set(["__proto__", "prototype", "constructor"]);

const inspectPayload = (value, path = "body", depth = 0) => {
  if (depth > 20) return "Payload trop profond.";
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    if (value.length > 2000) return "Tableau trop volumineux.";
    for (let index = 0; index < value.length; index += 1) {
      const error = inspectPayload(value[index], path + "[" + index + "]", depth + 1);
      if (error) return error;
    }
    return null;
  }

  for (const key of Object.keys(value)) {
    if (dangerousKeys.has(key) || key.startsWith("$") || key.includes(".")) {
      return "Champ interdit detecte dans la requete.";
    }
    const entry = value[key];
    if (typeof entry === "string" && entry.length > 20000) {
      return "Champ texte trop long.";
    }
    const error = inspectPayload(entry, path + "." + key, depth + 1);
    if (error) return error;
  }

  return null;
};

export const requestPayloadGuard = (req, res, next) => {
  const error = inspectPayload(req.body) || inspectPayload(req.query, "query") || inspectPayload(req.params, "params");
  if (error) {
    return res.status(400).json({ success: false, status: "error", message: error });
  }
  return next();
};

const validators = {
  string(value, rule) {
    if (value === undefined || value === null || value === "") return rule.required ? "Champ requis." : null;
    if (typeof value !== "string") return "Doit etre une chaine.";
    const trimmed = value.trim();
    if (rule.min && trimmed.length < rule.min) return "Trop court.";
    if (rule.max && trimmed.length > rule.max) return "Trop long.";
    if (rule.pattern && !rule.pattern.test(trimmed)) return "Format invalide.";
    if (rule.enum && !rule.enum.includes(trimmed)) return "Valeur non autorisee.";
    return null;
  },
  number(value, rule) {
    if (value === undefined || value === null || value === "") return rule.required ? "Champ requis." : null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "Doit etre un nombre.";
    if (rule.min !== undefined && numeric < rule.min) return "Valeur trop petite.";
    if (rule.max !== undefined && numeric > rule.max) return "Valeur trop grande.";
    return null;
  },
  array(value, rule) {
    if (value === undefined || value === null) return rule.required ? "Champ requis." : null;
    if (!Array.isArray(value)) return "Doit etre une liste.";
    if (rule.max && value.length > rule.max) return "Liste trop longue.";
    return null;
  },
  boolean(value, rule) {
    if (value === undefined || value === null) return rule.required ? "Champ requis." : null;
    if (typeof value !== "boolean") return "Doit etre vrai ou faux.";
    if (rule.mustBeTrue && value !== true) return "Doit etre accepte.";
    return null;
  },
};

export const validateBody = (schema) => (req, res, next) => {
  const errors = {};
  for (const [field, rule] of Object.entries(schema)) {
    const validator = validators[rule.type || "string"];
    if (!validator) continue;
    const message = validator(req.body?.[field], rule);
    if (message) errors[field] = message;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      status: "error",
      message: "Certaines donnees envoyees sont invalides.",
      errors,
    });
  }

  return next();
};

export const authValidation = {
  register: validateBody({
    prenom: { required: true, min: 2, max: 80, pattern: /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/ },
    nom: { required: true, min: 2, max: 80, pattern: /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/ },
    email: { required: true, max: 180, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    telephone: { required: true, min: 9, max: 20, pattern: /^[0-9+\s()-]+$/ },
    nomBoutique: { required: true, min: 2, max: 120 },
    secteurActivite: { required: true, max: 80 },
    deviseParDefaut: { required: true, enum: ["USD ($)", "CDF (FC)", "EUR (€)"] },
    tailleBusiness: { required: true, max: 40 },
    password: { required: true, min: 8, max: 128 },
    confirmPassword: { required: true, min: 8, max: 128 },
    acceptTerms: { type: "boolean", required: true, mustBeTrue: true },
  }),
  email: validateBody({
    email: { required: true, max: 180, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  }),
  login: validateBody({
    email: { required: true, max: 180, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { required: true, min: 1, max: 128 },
  }),
  otp: validateBody({
    email: { required: true, max: 180, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    otp: { required: true, min: 6, max: 6, pattern: /^[0-9]{6}$/ },
  }),
  resetPassword: validateBody({
    password: { required: true, min: 8, max: 128 },
    confirmPassword: { required: true, min: 8, max: 128 },
  }),
  updatePassword: validateBody({
    currentPassword: { required: true, min: 1, max: 128 },
    newPassword: { required: true, min: 8, max: 128 },
    confirmPassword: { required: true, min: 8, max: 128 },
  }),
};

export const boutiqueValidation = {
  create: validateBody({
    nom: { required: true, min: 2, max: 120 },
    secteurActivite: { required: true, max: 80 },
    deviseParDefaut: { required: true, enum: ["USD ($)", "CDF (FC)", "EUR (€)"] },
    tailleBusiness: { required: true, max: 40 },
  }),
  update: validateBody({
    nom: { required: true, min: 2, max: 120 },
    secteurActivite: { required: true, max: 80 },
    tailleBusiness: { required: true, max: 40 },
  }),
  deleteCode: validateBody({
    code: { required: false, min: 6, max: 6, pattern: /^[0-9]{6}$/ },
  }),
  currency: validateBody({
    deviseReference: { required: true, enum: ["USD ($)", "CDF (FC)", "EUR (€)"] },
    rates: { type: "array", required: true, max: 20 },
  }),
};
