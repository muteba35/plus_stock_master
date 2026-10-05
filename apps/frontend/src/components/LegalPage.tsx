"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck, FileText, Mail } from "lucide-react";
import AuthNavbar from "./AuthNavbar";
import { useLanguage } from "./LanguageRuntime";

const content = {
  fr: {
    back: "Retour à l'accueil",
    conditions: {
      title: "Conditions d'utilisation",
      sections: [
        ["Responsabilité du compte", "Le propriétaire de boutique garantit l'exactitude des informations fournies et reste responsable des actions réalisées depuis son espace Movoora."],
        ["Sécurité des accès", "Les mots de passe, codes temporaires et accès doivent rester confidentiels. Les accès employés doivent être attribués uniquement aux personnes autorisées."],
        ["Données de gestion", "Movoora conserve les données nécessaires au fonctionnement de la boutique : utilisateurs, produits, ventes, mouvements, audit, notifications et paramètres."],
        ["Traçabilité", "Les actions sensibles peuvent être enregistrées dans le journal d'audit afin d'identifier qui a fait quoi, quand, depuis quelle adresse IP et quel navigateur."],
        ["Utilisation conforme", "L'application doit être utilisée pour une gestion commerciale légale. Toute tentative de contournement de sécurité peut entraîner une restriction d'accès."],
      ],
    },
    confidentialite: {
      title: "Confidentialité",
      sections: [
        ["Formulaire de contact", "Le formulaire prépare un brouillon dans votre messagerie, sans envoyer les champs à notre serveur. Vous confirmez vous-même l'envoi à juniormuteba10@gmail.com. Si vous choisissez Gmail, les champs préremplis sont transmis à Google. N'envoyez pas de mot de passe ni de code de vérification. Vous pouvez écrire à cette adresse pour demander la suppression de votre correspondance."],
        ["Informations enregistrées", "Le service utilise les informations du compte, de la boutique et de ses opérations pour permettre la gestion commerciale. Les journaux peuvent contenir l'identité de l'utilisateur, la date, l'adresse IP et le navigateur."],
        ["Authentification", "Les mots de passe sont hachés. Les codes de vérification et les liens de récupération servent à sécuriser l'accès au compte. Ne communiquez jamais ces codes à une personne non autorisée."],
        ["Stockage dans le navigateur", "Le navigateur conserve des informations de session, des préférences de langue et d'affichage. Une preuve temporaire de connexion est conservée dans l'onglet pendant la vérification OTP."],
        ["Accès aux données", "L'accès aux opérations de la boutique dépend des permissions attribuées au compte. Les prestataires techniques d'hébergement et d'envoi d'emails interviennent dans le fonctionnement du service."],
        ["Gestion de votre compte", "Vous pouvez modifier les informations disponibles dans votre profil. Pour une question sur les données de votre boutique ou les accès employés, rapprochez-vous du propriétaire de la boutique."],
      ],
    },
  },
  en: {
    back: "Back to home",
    conditions: {
      title: "Terms of use",
      sections: [
        ["Account responsibility", "The shop owner is responsible for the accuracy of the information provided and for actions performed within their Movoora workspace."],
        ["Access security", "Passwords, temporary codes and access credentials must remain confidential. Employee access must only be assigned to authorised people."],
        ["Business data", "Movoora stores the data needed to operate the shop: users, products, sales, stock movements, audit records, notifications and settings."],
        ["Traceability", "Sensitive actions may be recorded in the audit log to identify who performed them, when, and from which IP address and browser."],
        ["Acceptable use", "The application must be used for lawful business management. Attempts to bypass security may result in access restrictions."],
      ],
    },
    confidentialite: {
      title: "Privacy",
      sections: [
        ["Contact form", "The form prepares a draft in your email app without sending its fields to our server. You confirm sending to juniormuteba10@gmail.com yourself. If you choose Gmail, the prefilled fields are shared with Google. Do not send passwords or verification codes. You can write to this address to request deletion of your correspondence."],
        ["Stored information", "The service uses account, shop and transaction information to provide business management. Logs may include the user identity, date, IP address and browser."],
        ["Authentication", "Passwords are hashed. Verification codes and recovery links help secure account access. Never share these codes with an unauthorised person."],
        ["Browser storage", "The browser stores session information, language and display preferences. Temporary proof of login is stored in the tab during OTP verification."],
        ["Data access", "Access to shop operations depends on account permissions. Technical hosting and email providers are involved in operating the service."],
        ["Managing your account", "You can edit the information available in your profile. Contact the shop owner with questions about shop data or employee access."],
      ],
    },
  },
};

export default function LegalPage({ kind }: { kind: "conditions" | "confidentialite" }) {
  const { language } = useLanguage();
  const copy = content[language];
  const page = copy[kind];
  const en = language === "en";
  const privacy = kind === "confidentialite";
  const Icon = privacy ? ShieldCheck : FileText;
  return (
    <>
      <AuthNavbar />
      <main className="min-h-screen bg-white pb-16 pt-28 text-slate-800 sm:pt-32" data-no-translate>
        <header className="border-b border-slate-200 bg-slate-50 px-5 pb-10 pt-6 sm:px-8 sm:pb-14">
          <div className="mx-auto max-w-6xl">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"><ArrowLeft size={16} />{copy.back}</Link>
            <p className="mb-5 mt-9 flex items-center gap-2 text-sm font-semibold text-blue-700"><Icon size={20} />Movoora</p>
            <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-normal text-slate-950 sm:text-4xl">{page.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">{privacy ? (en ? "Understand what information the service uses and how access to your data works." : "Comprenez quelles informations le service utilise et comment fonctionne l'accès à vos données.") : (en ? "The responsibilities and rules that guide the use of your Movoora workspace." : "Les responsabilités et les règles qui encadrent l'utilisation de votre espace Movoora.")}</p>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:py-14">
          <aside>
            <nav aria-label={en ? "On this page" : "Sur cette page"} className="lg:sticky lg:top-28">
              <p className="mb-4 text-xs font-bold uppercase tracking-normal text-slate-500">{en ? "On this page" : "Sur cette page"}</p>
              <ol className="space-y-1 border-l border-slate-200">
                {page.sections.map(([title], index) => <li key={title}><a href={`#section-${index + 1}`} className="flex gap-3 px-4 py-2.5 text-sm leading-6 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"><span className="text-blue-600">{String(index + 1).padStart(2, "0")}</span>{title}</a></li>)}
              </ol>
            </nav>
          </aside>
          <article className="min-w-0">
            <div className="divide-y divide-slate-200">
              {page.sections.map(([title, body], index) => (
                <section id={`section-${index + 1}`} key={title} className="scroll-mt-28 py-7 first:pt-0">
                  <h2 className="mb-4 flex items-baseline gap-3 text-lg font-semibold text-slate-950"><span className="text-sm font-medium text-blue-600">{String(index + 1).padStart(2, "0")}</span>{title}</h2>
                  <p className="break-words text-sm leading-8 text-slate-600 sm:text-base">{body}</p>
                </section>
              ))}
            </div>
            <div className="mt-6 border-t border-slate-200 pt-8">
              <h2 className="text-lg font-semibold text-slate-950">{en ? "A question about this page?" : "Une question sur cette page ?"}</h2>
              <a href="mailto:juniormuteba10@gmail.com" className="mt-3 inline-flex max-w-full items-center gap-2 text-sm font-medium text-blue-700 hover:underline"><Mail size={17} className="shrink-0" /><span className="break-all">juniormuteba10@gmail.com</span></a>
              <Link href={privacy ? "/conditions" : "/confidentialite"} className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-700">{privacy ? content[language].conditions.title : content[language].confidentialite.title}<ArrowRight size={16} /></Link>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}
