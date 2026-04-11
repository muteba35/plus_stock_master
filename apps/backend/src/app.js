import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

const app = express();

/**
 * CONFIGURATION POUR RENDER (Trust Proxy)
 * Indispensable pour que 'express-rate-limit' récupère l'IP réelle du client
 * et non celle du proxy de Render.
 */
app.set('trust proxy', 1);

// CONFIGURATION UNIQUE DU CORS
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Route de test
app.get("/", (req, res) => {
  res.send("Backend Plus Stock Master fonctionne !");
});

// Routes d'authentification
app.use("/api/auth", authRoutes);

export default app;