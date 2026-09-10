"use client";

import Link from "next/link";
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
  return (
    <>
      <AuthNavbar />
      <main className="min-h-screen bg-white px-6 pb-16 pt-32 text-slate-800" data-no-translate>
        <article className="mx-auto max-w-3xl">
          <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">{copy.back}</Link>
          <h1 className="mb-10 mt-6 text-2xl font-bold text-slate-950">{page.title}</h1>
          <div className="space-y-8">
            {page.sections.map(([title, body]) => (
              <section key={title}>
                <h2 className="mb-2 text-base font-semibold">{title}</h2>
                <p className="text-sm leading-7 text-slate-600">{body}</p>
              </section>
            ))}
          </div>
        </article>
      </main>
    </>
  );
}
