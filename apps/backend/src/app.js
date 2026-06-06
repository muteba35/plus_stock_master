import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import departementRoutes from "./routes/departement.routes.js";
import roleRoutes from "./routes/role.routes.js"; 
import employeRoutes from "./routes/employe.routes.js";

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get("/", (req, res) => {
  res.send("Backend Plus Stock Master fonctionne !");
});

// 2. Déclaration des points d'accès API distincts
app.use("/api/auth", authRoutes);
app.use("/api/departements", departementRoutes); // URL propre : /api/departements
app.use("/api/roles", roleRoutes); 
app.use("/api/employes", employeRoutes);// <-- 2. AJOUT DE LA ROUTE POUR LES RÔLES

export default app;