// src/server.js
import app from "./app.js";
import mongoose from "mongoose";

const PORT = process.env.PORT || 5000;

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("Connecté à MongoDB Atlas");
  // Démarrage serveur
  app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
  });
})
.catch((err) => {
  console.error("Erreur connexion MongoDB:", err);
});