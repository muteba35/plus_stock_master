"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Navbar from "../src/components/Navbar";
import Hero from "../src/components/Hero";
import { useEffect, useState } from "react";
import { 
  CheckCircle2, Smartphone, Facebook, Linkedin, Instagram, ArrowUp,
  Zap, ShieldCheck, WifiOff, LayoutDashboard, Lock, CreditCard, Users,
  BarChart3, Store, History, Eye, Check, Mail, MapPin, Phone
} from "lucide-react";

// --- CONFIG ANIMATIONS ---
const reveal = {
  initial: { opacity: 0, y: 30, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }
};

const slideIn = (direction: "left" | "right") => ({
  initial: { opacity: 0, x: direction === "left" ? -60 : 60, filter: "blur(15px)" },
  whileInView: { opacity: 1, x: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as const }
});

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const backgroundColor = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.8], ["#ffffff", "#ffffff", "#020617", "#020617"]);
  const textColor = useTransform(scrollYProgress, [0, 0.2, 0.4], ["#0f172a", "#0f172a", "#f8fafc"]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.main style={{ backgroundColor }} className="min-h-screen transition-colors duration-1000 relative font-sans">
      <Navbar />
      <Hero />

      {/* --- SECTION 1 : ACCESSIBILITÉ & MOBILITÉ --- */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <motion.div {...reveal} className="text-center mb-12">
          <h2 className="text-indigo-600 font-bold uppercase tracking-widest text-[10px] mb-3">Votre boutique partout</h2>
          <motion.p style={{ color: textColor }} className="text-2xl md:text-3xl font-extrabold tracking-tight uppercase">
            Une gestion <span className="text-indigo-600">Sans Limites.</span>
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Smartphone size={20} />, t: "Application Mobile", d: "Installez StockMaster sur votre téléphone et gérez vos stocks comme une application native." },
            { icon: <Zap size={20} />, t: "Vente Instantanée", d: "Une interface fluide conçue pour encaisser vos clients en quelques secondes sans attente." },
            { icon: <Store size={20} />, t: "Multi-Points de Vente", d: "Pilotez toutes vos boutiques depuis un compte unique, peu importe leur emplacement géographique." }
          ].map((s, i) => (
            <motion.div 
              key={i} {...reveal} transition={{delay: i*0.1}} whileHover={{ y: -5 }}
              className="group p-8 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-white transition-all duration-300"
            >
              <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-5 group-hover:rotate-12 transition-all shadow-lg">
                {s.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900 group-hover:text-indigo-600 transition-colors">{s.t}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed uppercase tracking-tight">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>
      {/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>


      {/* --- SECTION 2 & 3 : SOLUTIONS BUSINESS --- */}
      <div className="space-y-24 py-12">
        <section className="px-6 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...slideIn("left")} className="relative z-10">
              <div className="inline-block px-3 py-1 rounded-full border border-indigo-200 text-indigo-600 text-[9px] font-bold uppercase tracking-widest mb-4">Continuité de Service</div>
              <motion.h2 style={{ color: textColor }} className="text-3xl md:text-4xl font-extrabold uppercase mb-6 leading-tight tracking-tighter">
                Zéro interruption <br/><span className="text-indigo-600">Hors Connexion.</span>
              </motion.h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-tight leading-relaxed max-w-md mb-8">
                L'internet tombe ? Votre commerce continue. Enregistrez vos ventes et mouvements de stock en mode hors-ligne. Le système se synchronise automatiquement dès le retour du réseau.
              </p>
              <div className="flex items-center gap-3 text-indigo-600 font-bold uppercase text-[10px] tracking-widest">
                <ShieldCheck size={14} /> Fiabilité garantie 24h/7j
              </div>
            </motion.div>
            
            <motion.div {...slideIn("right")} className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-xl bg-slate-900 p-2">
                <motion.img whileHover={{scale: 1.02}} src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=800" className="w-full object-cover h-[350px] rounded-xl opacity-80" alt="Vente continue" />
                <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/20 backdrop-blur-[2px]">
                    <WifiOff size={48} className="text-white opacity-80" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-6 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...slideIn("left")} className="order-2 lg:order-1 relative">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-xl bg-indigo-900/20">
                <motion.img whileHover={{scale: 1.05}} src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800" className="w-full object-cover h-[350px] opacity-70" alt="Security Dashboard" />
                <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                   <Lock className="text-indigo-400 mb-2" size={20} />
                   <div className="text-[10px] text-white font-bold uppercase tracking-widest">Données Protégées</div>
                </div>
              </div>
            </motion.div>

            <motion.div {...slideIn("right")} className="order-1 lg:order-2 lg:text-right flex flex-col lg:items-end">
              <div className="inline-block px-3 py-1 rounded-full border border-indigo-200 text-indigo-600 text-[9px] font-bold uppercase tracking-widest mb-4">Sécurité Maximale</div>
              <motion.h2 style={{ color: textColor }} className="text-3xl md:text-4xl font-extrabold uppercase mb-6 leading-tight tracking-tighter">
                Protection & <br/><span className="text-indigo-600">Confidentialité.</span>
              </motion.h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-tight leading-relaxed max-w-md mb-8">
                Vos informations commerciales sont précieuses. Choisissez qui accède à quoi : définissez des rôles précis pour vos vendeurs, gérants et administrateurs.
              </p>
              <ul className="space-y-3 text-slate-500 text-[10px] font-bold uppercase tracking-tighter">
                <li className="flex items-center gap-2 lg:flex-row-reverse"><CheckCircle2 size={14} className="text-indigo-500"/> Historique complet de chaque action</li>
                <li className="flex items-center gap-2 lg:flex-row-reverse"><CheckCircle2 size={14} className="text-indigo-500"/> Accès sécurisé par mot de passe</li>
                <li className="flex items-center gap-2 lg:flex-row-reverse"><CheckCircle2 size={14} className="text-indigo-500"/> Sauvegarde automatique sécurisée</li>
              </ul>
            </motion.div>
          </div>
        </section>
      </div>
      {/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>


      {/* --- SECTION 4 : FONCTIONNALITÉS CLÉS --- */}
      <section id="solutions" className="py-24 px-6 max-w-6xl mx-auto scroll-mt-20">
        <motion.div {...reveal} className="mb-12 text-center">
          <h2 className="text-indigo-500 font-bold uppercase text-[9px] tracking-[0.4em] mb-3">Outils de Gestion</h2>
          <p className="text-2xl md:text-4xl font-extrabold uppercase tracking-tighter text-white leading-none">
            Tout pour <span className="text-indigo-600">Réussir.</span>
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: <LayoutDashboard size={18}/>, t: "Tableau de Bord", d: "Une vue globale et simplifiée de la santé de votre business en temps réel." },
            { icon: <History size={18}/>, t: "Traçabilité Totale", d: "Suivez chaque mouvement de stock : qui a fait quoi, où et quand exactement." },
            { icon: <Users size={18}/>, t: "Gestion d'Équipe", d: "Collaborez avec vos employés tout en gardant un contrôle total sur leurs permissions." },
            { icon: <BarChart3 size={18}/>, t: "Rapports & Ventes", d: "Analysez vos revenus et identifiez vos produits les plus rentables en un clic." },
            { icon: <CreditCard size={18}/>, t: "Paiements Sécurisés", d: "Gestion simple et protégée de vos abonnements avec facturation transparente." },
            { icon: <Eye size={18}/>, t: "Alertes de Stock", d: "Recevez une notification avant la rupture pour ne plus jamais rater de vente." }
          ].map((s, i) => (
            <motion.div 
              key={i} {...reveal} transition={{delay: i*0.1}} whileHover={{ y: -8 }}
              className="group p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:border-indigo-500 transition-all duration-300"
            >
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center mb-4 shadow-lg">{s.icon}</div>
              <h3 className="text-sm font-bold uppercase mb-2 text-white group-hover:text-indigo-400 transition-colors">{s.t}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>
      {/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>


      {/* --- SECTION 5 : ABONNEMENTS & TARIFS --- */}
      <section id="pricing" className="py-24 px-6 max-w-6xl mx-auto">
        <motion.div {...reveal} className="text-center mb-16">
          <h2 className="text-indigo-500 font-bold uppercase text-[9px] tracking-[0.4em] mb-3">Tarification</h2>
          <p className="text-2xl md:text-4xl font-extrabold uppercase tracking-tighter text-white leading-none mb-4">
            Des plans adaptés à <span className="text-indigo-600">votre croissance.</span>
          </p>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aucun frais caché. Annulez à tout moment.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              name: "Essentiel", price: "15$", desc: "Pour les petites boutiques", 
              features: ["1 Point de vente", "Gestion de stock de base", "1 Utilisateur", "Support par email"] 
            },
            { 
              name: "Professionnel", price: "39$", desc: "Le choix des commerçants", 
              features: ["Multi-boutiques (jusqu'à 3)", "Rapports avancés", "5 Utilisateurs", "Mode Hors-ligne complet", "Support Prioritaire"],
              popular: true 
            },
            { 
              name: "Entreprise", price: "99$", desc: "Pour les réseaux de magasins", 
              features: ["Boutiques illimitées", "Analytique sur mesure", "Utilisateurs illimités", "Accès API sécurisé", "Gestionnaire dédié"] 
            }
          ].map((plan, i) => (
            <motion.div 
              key={i} {...reveal} transition={{delay: i*0.1}}
              className={`relative p-8 rounded-[2rem] border ${plan.popular ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 bg-white/5'} flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] font-black uppercase px-4 py-1 rounded-full tracking-[0.2em]">
                  Le plus populaire
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-white text-lg font-bold uppercase mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-slate-500 text-xs font-bold">/mois</span>
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">{plan.desc}</p>
              </div>
              <div className="space-y-4 mb-10 flex-grow">
                {plan.features.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                      <Check size={12} />
                    </div>
                    <span className="text-slate-300 text-[10px] font-bold uppercase tracking-tight">{f}</span>
                  </div>
                ))}
              </div>
              <button className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${plan.popular ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                Choisir ce plan
              </button>
            </motion.div>
          ))}
        </div>
      </section>
      {/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>


      
            {/* --- SECTION VISION : POURQUOI NOUS ? --- */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto border border-white/10 bg-white/[0.02] rounded-[2rem] p-10 md:p-16 relative overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...reveal}>
              <h2 className="text-indigo-500 font-bold uppercase text-[9px] tracking-[0.5em] mb-4">Notre Engagement</h2>
              <p className="text-2xl md:text-4xl font-extrabold text-white uppercase tracking-tighter leading-tight mb-6">
                Une solution pensée <span className="text-indigo-600">Pour Vous.</span>
              </p>
              <p className="text-slate-400 text-xs font-medium leading-relaxed mb-8 max-w-md">
                Nous avons conçu StockMaster pour répondre aux défis quotidiens des entrepreneurs. Simplicité, sécurité et efficacité sont les fondations de notre service.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="group">
                  <div className="text-white font-bold uppercase text-sm mb-1 flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                    <CheckCircle2 className="text-indigo-500" size={14}/> Support Dédié
                  </div>
                  <p className="text-slate-500 text-[9px] font-bold uppercase">Une équipe à votre écoute pour vous accompagner au quotidien.</p>
                </div>
                <div className="group">
                  <div className="text-white font-bold uppercase text-sm mb-1 flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                    <ShieldCheck className="text-indigo-500" size={14}/> 100% Sécurisé
                  </div>
                  <p className="text-slate-500 text-[9px] font-bold uppercase">Vos informations sont protégées par les plus hauts standards de sécurité.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div {...reveal} className="flex justify-center">
              <div className="w-48 h-48 border border-indigo-600/20 rounded-full flex items-center justify-center relative">
                <div className="absolute inset-0 border border-dashed border-indigo-600/30 rounded-full animate-[spin_30s_linear_infinite]" />
                <div className="text-center">
                    <div className="text-indigo-500 font-black text-2xl italic">STOCK</div>
                    <div className="text-[8px] text-slate-500 uppercase font-bold">Master Pro</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

{/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>


      {/* --- FOOTER AMÉLIORÉ --- */}
      <footer className="bg-slate-950 text-white pt-20 pb-10 border-t border-white/5 relative overflow-hidden">
        {/* Décoration d'arrière-plan */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="max-w-6xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            
            {/* Colonne 1: Branding */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 group cursor-pointer">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold italic text-sm">S</div>
                <span className="text-xl font-black uppercase tracking-tighter">StockMaster</span>
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase leading-relaxed tracking-tight">
                La solution de gestion intelligente pour les commerçants ambitieux. Performance, simplicité et sécurité au service de votre croissance.
              </p>
              <div className="flex gap-4">
                {[<Facebook key="fb" size={18}/>, <Linkedin key="li" size={18}/>, <Instagram key="in" size={18}/>].map((icon, i) => (
                  <motion.a key={i} href="#" whileHover={{ y: -3, color: "#6366f1" }} className="text-slate-500 transition-colors">
                    {icon}
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Colonne 2: Navigation */}
            <div>
              <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-6">Plateforme</h4>
              <ul className="space-y-4">
                {['Solutions', 'Tarifs', 'Sécurité', 'Application Mobile'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-slate-500 hover:text-indigo-400 text-[10px] font-bold uppercase transition-colors tracking-widest">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne 3: Support */}
            <div>
              <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-6">Assistance</h4>
              <ul className="space-y-4">
                {['Centre d\'aide', 'Documentation', 'Status Serveur', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-slate-500 hover:text-indigo-400 text-[10px] font-bold uppercase transition-colors tracking-widest">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne 4: Contact & Localisation */}
            <div className="space-y-6">
              <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-6">Nous trouver</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-slate-500">
                  <MapPin size={16} className="text-indigo-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">75008 Avenue de la Croissance, Paris, France</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <Phone size={16} className="text-indigo-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">+33 1 23 45 67 89</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <Mail size={16} className="text-indigo-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">contact@stockmaster.pro</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ligne de pied de page finale */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-center">
            <p className="text-slate-600 text-[9px] font-bold uppercase tracking-[0.2em]">
              © 2026 StockMaster Pro. Tous droits réservés.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-slate-600 hover:text-white text-[9px] font-bold uppercase tracking-[0.2em] transition-colors">Confidentialité</a>
              <a href="#" className="text-slate-600 hover:text-white text-[9px] font-bold uppercase tracking-[0.2em] transition-colors">Conditions</a>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({top: 0, behavior: "smooth"})}
            className="fixed bottom-6 right-6 z-50 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-indigo-500 transition-colors"
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.main>
  );
}