// src/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Initialisation des variables d'environnement
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Pour lire le JSON dans les requêtes

// Route test
app.get("/", (req, res) => {
  res.send("Backend Plus Stock Master fonctionne !");
});

export default app;