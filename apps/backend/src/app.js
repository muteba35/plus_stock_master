import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import departementRoutes from "./routes/departement.routes.js";
import roleRoutes from "./routes/role.routes.js";
import employeRoutes from "./routes/employe.routes.js";
import boutiqueRoutes from "./routes/boutique.routes.js";
import inventaireRoutes from "./routes/inventaire.routes.js";
import caisseRoutes from "./routes/caisse.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import { auditLogger } from "./middlewares/auditMiddleware.js";

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.get("/", (req, res) => {
  res.send("Backend Plus Stock Master fonctionne !");
});

app.use("/api/auth", authRoutes);
app.use("/api/departements", departementRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/employes", employeRoutes);
app.use("/api/boutiques", boutiqueRoutes);
app.use("/api/inventaire", inventaireRoutes);
app.use("/api/caisse", caisseRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit", auditRoutes);

export default app;
