import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js'; // IMPORTANT : On importe l'app déjà configurée !

dotenv.config();

const PORT = process.env.PORT || 10000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connecté'))
  .catch((err) => console.error('Erreur connexion MongoDB:', err));

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});