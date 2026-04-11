import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js"; // Importation des routes d'auth

// Initialisation des variables d'environnement
dotenv.config();

const app = express();

// --- Middlewares ---
// 2. Configure le CORS
app.use(cors({
  origin: "*", // Autorise absolument tout le monde temporairement
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));// Autorise toutes les origines pendant le développement
app.use(express.json()); // Permet de lire le body JSON (indispensable pour le login/register)

// --- Déclaration des Routes //
// Route de test
app.get("/", (req, res) => {
  res.send("Backend Plus Stock Master fonctionne !");
});

// Routes d'authentification (Register, Login, OTP)
// Toutes les routes dans authRoutes commenceront par /api/auth
app.use("/api/auth", authRoutes);



export default app;