"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Navbar from "../src/components/Navbar";
import Hero from "../src/components/Hero";
import { LandingDemo, LandingPlans, LandingHelp } from "../src/components/LandingDetails";
import { useLanguage } from "../src/components/LanguageRuntime";
import { useEffect, useRef, useState } from "react";
import { 
  CheckCircle2, Smartphone, ArrowUp,
  Zap, ShieldCheck, LayoutDashboard, Lock, CreditCard, Users,
  BarChart3, Store, History, Eye, Phone
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
  const { translate, language } = useLanguage();
  const en = language === "en";
  const { scrollYProgress } = useScroll();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollFrame = useRef<number | null>(null);
  const stopScroll = () => { if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current); scrollFrame.current = null; };
  const scrollToTop = () => {
    stopScroll();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { window.scrollTo({ top: 0, behavior: "instant" }); return; }
    const startY = window.scrollY;
    const startTime = performance.now();
    const duration = Math.min(1100, Math.max(500, startY / 4));
    const step = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration);
      window.scrollTo({ top: startY * Math.pow(1 - progress, 3), behavior: "instant" });
      scrollFrame.current = progress < 1 ? requestAnimationFrame(step) : null;
    };
    scrollFrame.current = requestAnimationFrame(step);
  };
  useEffect(() => {
    window.addEventListener("wheel", stopScroll, { passive: true });
    window.addEventListener("touchstart", stopScroll, { passive: true });
    window.addEventListener("keydown", stopScroll);
    return () => { stopScroll(); window.removeEventListener("wheel", stopScroll); window.removeEventListener("touchstart", stopScroll); window.removeEventListener("keydown", stopScroll); };
  }, []);
  
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
      <LandingDemo />

      {/* --- SECTION 1 : ACCESSIBILITÉ & MOBILITÉ --- */}
      <section id="Fonctionnalités" className="py-20 px-6 max-w-6xl mx-auto">
        <motion.div {...reveal} className="text-center mb-12">
          <h2 className="text-indigo-600 font-bold uppercase tracking-widest text-[10px] mb-3">Votre boutique partout</h2>
          <motion.p style={{ color: textColor }} className="text-2xl md:text-3xl font-extrabold tracking-tight uppercase">
            Une gestion <span className="text-indigo-600">Sans Limites.</span>
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Smartphone size={20} />, t: "Application Mobile", d: "Accédez à Movoora depuis le navigateur de votre téléphone pour consulter votre activité." },
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
              <h3 className="text-lg font-bold mb-2 text-slate-900 group-hover:text-indigo-600 transition-colors">{translate(s.t)}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed uppercase tracking-tight">{translate(s.d)}</p>
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
              <div className="inline-block px-3 py-1 rounded-full border border-indigo-200 text-indigo-600 text-[9px] font-bold uppercase tracking-widest mb-4">{translate("Gestion centralisée")}</div>
              <motion.h2 style={{ color: textColor }} className="text-3xl md:text-4xl font-extrabold uppercase mb-6 leading-tight tracking-tighter">
                Votre activité <br/><span className="text-indigo-600">Au même endroit.</span>
              </motion.h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-tight leading-relaxed max-w-md mb-8">
                Consultez vos produits, vos ventes et vos mouvements de stock depuis votre navigateur. Une connexion internet est nécessaire pour accéder aux données de votre boutique.
              </p>
              <div className="flex items-center gap-3 text-indigo-600 font-bold uppercase text-[10px] tracking-widest">
                <ShieldCheck size={14} /> Accès selon les permissions
              </div>
            </motion.div>
            
            <motion.div {...slideIn("right")} className="relative">
              <figure className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <img src="https://images.unsplash.com/photo-1783115259399-3a5a3e0e4592?auto=format&fit=crop&q=80&w=1000" width="1000" height="667" loading="lazy" className="aspect-[3/2] w-full object-cover" alt={en ? "Managing a product inventory spreadsheet on a laptop." : "Gestion d'un inventaire de produits sur ordinateur."} />
                <figcaption className="px-3 py-2 text-right text-xs text-slate-500"><a href="https://unsplash.com/photos/9fZuqBYlV1w" target="_blank" rel="noopener noreferrer" className="hover:underline">Gorilla ROI Data Connector / Unsplash</a></figcaption>
              </figure>
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
              <div className="inline-block px-3 py-1 rounded-full border border-indigo-200 text-indigo-600 text-[9px] font-bold uppercase tracking-widest mb-4">Contrôle des accès</div>
              <motion.h2 style={{ color: textColor }} className="text-3xl md:text-4xl font-extrabold uppercase mb-6 leading-tight tracking-tighter">
                Protection & <br/><span className="text-indigo-600">Confidentialité.</span>
              </motion.h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-tight leading-relaxed max-w-md mb-8">
                Vos informations commerciales sont précieuses. Choisissez qui accède à quoi : définissez des rôles précis pour vos vendeurs, gérants et administrateurs.
              </p>
              <ul className="space-y-3 text-slate-500 text-[10px] font-bold uppercase tracking-tighter">
                <li className="flex items-center gap-2 lg:flex-row-reverse"><CheckCircle2 size={14} className="text-indigo-500"/> Journal des actions sensibles</li>
                <li className="flex items-center gap-2 lg:flex-row-reverse"><CheckCircle2 size={14} className="text-indigo-500"/> Accès sécurisé par mot de passe</li>
                <li className="flex items-center gap-2 lg:flex-row-reverse"><CheckCircle2 size={14} className="text-indigo-500"/> Permissions vérifiées côté serveur</li>
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
              <h3 className="text-sm font-bold uppercase mb-2 text-white group-hover:text-indigo-400 transition-colors">{translate(s.t)}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{translate(s.d)}</p>
            </motion.div>
          ))}
        </div>
      </section>
      {/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>

      <LandingPlans />
      <LandingHelp />

      {/* --- SEPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>

        {/* --- SECTION VISION : POURQUOI NOUS ? --- */}
      <section id="apropos" data-no-translate className="bg-slate-950 px-6 py-20 text-white sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-blue-400"><Store size={18} />{en ? "About Movoora" : "À propos de Movoora"}</p>
            <h2 className="text-3xl font-bold leading-tight tracking-normal sm:text-4xl">{en ? "Your shop. A clearer view of every day." : "Votre boutique. Une vision plus claire, chaque jour."}</h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">{en ? "Movoora brings stock, sales and team management together. Less scattered information, more time to focus on your business." : "Movoora réunit la gestion du stock, des ventes et de votre équipe. Moins d'informations dispersées, plus de temps pour vous concentrer sur votre activité."}</p>
            <a href="#contact" className="mt-8 inline-flex items-center gap-2 border-b border-blue-400 pb-2 text-sm font-semibold text-blue-300 transition-colors hover:text-white">{en ? "Let's talk about your shop" : "Parlons de votre boutique"}<Phone size={16} /></a>
          </div>
          <div className="divide-y divide-white/15 border-y border-white/15">
            {[
              { icon: LayoutDashboard, title: en ? "Everything in context" : "L'essentiel au même endroit", text: en ? "Track products, sales and stock movements from a shared workspace." : "Retrouvez vos produits, vos ventes et vos mouvements de stock dans un espace commun." },
              { icon: Users, title: en ? "A place for your team" : "Une place pour votre équipe", text: en ? "Assign access according to each person's responsibilities in your shop." : "Attribuez les accès en fonction des responsabilités de chacun dans votre boutique." },
              { icon: ShieldCheck, title: en ? "Clearer oversight" : "Une gestion plus lisible", text: en ? "Use reports and activity history to understand what happens in your business." : "Appuyez-vous sur les rapports et l'historique des opérations pour comprendre votre activité." },
            ].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4 py-7"><Icon size={23} className="mt-1 shrink-0 text-blue-400" /><div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-slate-400">{text}</p></div></div>)}
          </div>
        </div>
      </section>

{/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>


      {/* --- FOOTER AMÉLIORÉ --- */}
      <footer id="footer" className="bg-slate-950 text-white pt-20 pb-10 border-t border-white/5 relative overflow-hidden">
        {/* Décoration d'arrière-plan */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="max-w-6xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            
            {/* Colonne 1: Branding */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 group cursor-pointer">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><img src="/movoora-mark.svg?v=2" alt="Movoora" className="bg-white rounded-sm p-0.5 w-5 h-5" /></div>
                <span className="text-xl font-black uppercase tracking-tighter">Movoora</span>
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase leading-relaxed tracking-tight">
                La solution de gestion intelligente pour les commerçants ambitieux. Performance, simplicité et sécurité au service de votre croissance.
              </p>

            </div>

            {/* Colonne 2: Navigation */}
            {/* Navigation Plateforme */}
            <div>
              <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-6">Plateforme</h4>
              <ul className="space-y-4">
                {[
                  { n: 'Fonctionnalités', h: '#Fonctionnalités' },
                  { n: 'Solutions', h: '#solutions' },
                  { n: 'Tarifs', h: '#pricing' },
                  { n: 'A propos', h: '#apropos' }
                ].map((item) => (
                  <li key={item.n}>
                    <a href={item.h} className="text-slate-500 hover:text-indigo-400 text-[10px] font-bold uppercase transition-colors tracking-widest">{translate(item.n)}</a>
                  </li>
                ))}
              </ul>
            </div>

    {/* Colonne 3: Support */}
            <div>
              <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-6">Assistance</h4>
              <ul className="space-y-4">
                {[{ name: "FAQ", href: "#faq" }, { name: "Contact", href: "#contact" }].map((item) => (
                  <li key={item.name}>
                    <a href={item.href} className="text-slate-500 hover:text-indigo-400 text-[10px] font-bold uppercase transition-colors tracking-widest">{translate(item.name)}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne 4: Contact & Localisation */}
            <div className="space-y-6">
              <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-6">Nous trouver</h4>
              <div className="space-y-4">
                <a href="tel:+243990835638" className="flex items-center gap-3 text-slate-300 hover:text-white"><Phone size={16} className="shrink-0" />+243 990 835 638</a>
              </div>
            </div>
          </div>

          {/* Ligne de pied de page finale */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-center">
            <p className="text-slate-600 text-[9px] font-bold uppercase tracking-[0.2em]">
              © 2026 Movoora. Tous droits réservés.
            </p>
            <div className="flex gap-6">
              <a href="/confidentialite" className="text-slate-600 hover:text-white text-[9px] font-bold uppercase tracking-[0.2em] transition-colors">Confidentialité</a>
              <a href="/conditions" className="text-slate-600 hover:text-white text-[9px] font-bold uppercase tracking-[0.2em] transition-colors">Conditions</a>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            aria-label={translate("Retour en haut")}
            title={translate("Retour en haut")}
            className="fixed bottom-6 right-6 z-50 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-indigo-500 transition-colors"
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

