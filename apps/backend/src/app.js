import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

const app = express();

// CONFIGURATION UNIQUE DU CORS
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Plus Stock Master fonctionne !");
});

app.use("/api/auth", authRoutes);

export default app; // On exporte l'instance configurée