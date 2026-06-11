"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Users2,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  Store,
  Search,
  Moon,
  Sun,
  User,
  Menu,
  X,
  CircleDollarSign,
  ChevronRight,
} from "lucide-react";

// ==========================================
// TYPES & CONSTANTES STATIQUES (Hors composant)
// ==========================================

interface UserProfile {
  id: string;
  prenom: string;
  nom?: string;
  email?: string;
  roleId: string | null;
  role?: string;
  avatar?: string;
  boutiqueActive?: string;
  boutique?: {
    id?: string;
    nom?: string;
    secteurActivite?: string;
  } | null;
}

interface SubMenuItem {
  name: string;
  href: string;
  permission?: string;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  module: string;
  permission?: string;
  subMenu?: SubMenuItem[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const DEFAULT_PROFILE: UserProfile = {
  id: "",
  prenom: "Chargement...",
  nom: "",
  email: "",
  roleId: "__loading__",
  role: "",
  avatar: "",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // ==========================================
  // STATES
  // ==========================================
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [user, setUser] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isMounted, setIsMounted] = useState(false);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    Caisse: false,
    Inventaire: false,
    "Mon Équipe": false,
    Finances: false,
    Paramètres: false,
  });

  // ==========================================
  // EFFECT 1 : Gestion du montage (Asynchrone pour éviter le linter)
  // ==========================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  // ==========================================
  // EFFECT 2 : Synchronisation Profil & Permissions
  // ==========================================
  useEffect(() => {
    const loadDataFromStorage = () => {
      // 1. Récupération des permissions
      try {
        const storedPermissions = localStorage.getItem("user_permissions");
        if (storedPermissions) {
          setUserPermissions(JSON.parse(storedPermissions));
        }
      } catch (error) {
        console.error("Erreur permissions:", error);
      }

      // 2. Récupération du profil
      try {
        const storedProfile = localStorage.getItem("user_profile");

        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          const userData = parsedProfile.user || parsedProfile;

          setUser({
            id: userData.id || userData._id || "",
            prenom: userData.prenom || DEFAULT_PROFILE.prenom,
            nom: userData.nom || DEFAULT_PROFILE.nom,
            email: userData.email || DEFAULT_PROFILE.email,
            roleId: userData.roleId !== undefined ? userData.roleId : null,
            role: userData.role || DEFAULT_PROFILE.role,
            avatar: userData.avatar || DEFAULT_PROFILE.avatar,
            boutiqueActive: userData.boutiqueActive || "",
            boutique: userData.boutique || null,
          });
        } else {
          setUser(DEFAULT_PROFILE);
        }
      } catch (error) {
        console.error("Erreur de parsing du profil dans le localStorage :", error);
        setUser(DEFAULT_PROFILE);
      }
    };

    const syncSessionFromBackend = async () => {
      loadDataFromStorage();

      const token = localStorage.getItem("token");
      if (!token) {
        setUser(DEFAULT_PROFILE);
        setUserPermissions([]);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
          throw new Error(data.message || "Session invalide.");
        }

        const userData = data.user || {};
        const permissions = Array.isArray(data.permissions) ? data.permissions : [];

        localStorage.setItem("user_profile", JSON.stringify(userData));
        localStorage.setItem("user_permissions", JSON.stringify(permissions));

        setUserPermissions(permissions);
        setUser({
          id: userData.id || userData._id || "",
          prenom: userData.prenom || DEFAULT_PROFILE.prenom,
          nom: userData.nom || DEFAULT_PROFILE.nom,
          email: userData.email || DEFAULT_PROFILE.email,
          roleId: userData.roleId !== undefined ? userData.roleId : null,
          role: userData.role || DEFAULT_PROFILE.role,
          avatar: userData.avatar || DEFAULT_PROFILE.avatar,
          boutiqueActive: userData.boutiqueActive || "",
          boutique: userData.boutique || null,
        });
      } catch (error) {
        console.error("Erreur synchronisation session:", error);
        document.cookie = "stockmaster_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        localStorage.removeItem("token");
        localStorage.removeItem("user_permissions");
        localStorage.removeItem("user_profile");
        router.push("/login");
      }
    };

    const timer = setTimeout(syncSessionFromBackend, 0);

    window.addEventListener("userProfileUpdated", syncSessionFromBackend);
    window.addEventListener("storage", syncSessionFromBackend);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("userProfileUpdated", syncSessionFromBackend);
      window.removeEventListener("storage", syncSessionFromBackend);
    };
  }, [pathname, router]);

  const boutique = {
    nom: user.boutique?.nom || "Ma Boutique",
    secteur: "Commerce Général",
  };

  // ==========================================
  // HELPERS
  // ==========================================
  const hasPermission = (permission?: string) => {
    if (user.roleId === null || user.roleId === "") {
      return true;
    }
    if (!permission) return true;
    return userPermissions.includes(permission);
  };

  const toggleSubMenu = (menuName: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove("dark");
      setDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  };

  const handleLogout = () => {
    document.cookie = "stockmaster_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem("token");
    localStorage.removeItem("user_permissions");
    localStorage.removeItem("user_profile");
    router.push("/login");
  };

  // ==========================================
  // CONFIGURATION DES MODULES & DROITS
  // ==========================================
  const navigation: NavigationItem[] = [
    {
      name: "Vue d'ensemble",
      href: "/dashboard",
      icon: LayoutDashboard,
      module: "DASHBOARD",
      permission: "VOIR_RESUME_VENTES",
    },
    {
      name: "Caisse",
      icon: ShoppingCart,
      module: "VENTE",
      subMenu: [
        { name: "Accueil Caisse", href: "/dashboard/caisse", permission: "EFFECTUER_VENTE" },
        { name: "Historique Ventes", href: "/dashboard/caisse/ventes", permission: "VOIR_HISTORIQUE_VENTES" },
        { name: "Factures", href: "/dashboard/caisse/factures", permission: "IMPRIMER_FACTURE" },
        { name: "Retours clients", href: "/dashboard/caisse/retours", permission: "ANNULER_VENTE" },
      ],
    },
    {
      name: "Inventaire",
      icon: Boxes,
      module: "INVENTAIRE",
      subMenu: [
        { name: "Vue Globale", href: "/dashboard/inventaire", permission: "VOIR_LISTE_PRODUITS" },
        { name: "Gestion Produits", href: "/dashboard/inventaire/produits", permission: "AJOUTER_PRODUIT" },
        { name: "Catégories", href: "/dashboard/inventaire/categories", permission: "VOIR_LISTE_PRODUITS" },
        { name: "Mouvements Stock", href: "/dashboard/inventaire/stock", permission: "AJUSTER_STOCK" },
        { name: "Alertes Rupture", href: "/dashboard/inventaire/alertes", permission: "VOIR_ALERTES_STOCK" },
      ],
    },
   {
  name: "Mon Équipe",
  icon: Users2,
  module: "EQUIPE",
  subMenu: [
    { 
      name: "Vue d'ensemble", 
      href: "/dashboard/equipe", 
      permission: "VOIR_EQUIPE" // Permet à quiconque ayant un droit dans l'équipe d'y accéder
    },
    { 
      name: "Employés", 
      href: "/dashboard/equipe/employes", 
      permission: "VOIR_EMPLOYES" //
    },
    { 
      name: "Départements", 
      href: "/dashboard/equipe/departements", 
      permission: "VOIR_DEPARTEMENTS" // Cohérent (Visualisation)
    },
    { 
      name: "Rôles", 
      href: "/dashboard/equipe/roles", 
      permission: "VOIR_ROLES" // Cohérent avec la page RolesPage qu'on vient de faire
    },
  ],
},
    {
      name: "Finances",
      icon: CircleDollarSign,
      module: "FINANCE",
      subMenu: [
        { name: "Tableau de bord", href: "/dashboard/finances", permission: "VOIR_CHIFFRE_AFFAIRE" },
        { name: "Analyse Ventes", href: "/dashboard/finances/ventes", permission: "VOIR_HISTORIQUE_VENTES" },
        { name: "Bénéfices & Pertes", href: "/dashboard/finances/benefices", permission: "VOIR_BENEFICES" },
        { name: "Rapports d'activité", href: "/dashboard/finances/rapports", permission: "VOIR_CHIFFRE_AFFAIRE" },
        { name: "Exportations", href: "/dashboard/finances/exportations", permission: "EXPORTER_RAPPORTS" },
      ],
    },
    {
      name: "Paramètres",
      icon: Settings,
      module: "PARAMETRES",
      subMenu: [
        { name: "Général", href: "/dashboard/parametres", permission: "MODIFIER_INFOS_BOUTIQUE" },
        { name: "Ma Boutique", href: "/dashboard/parametres/boutique", permission: "MODIFIER_INFOS_BOUTIQUE" },
        { name: "Devises & Taxes", href: "/dashboard/parametres/devise", permission: "CHANGER_DEVISE" },
        { name: "Abonnement", href: "/dashboard/parametres/abonnement", permission: "VOIR_ABONNEMENT" },
      ],
    },
  ];

  if (!isMounted) {
    return <div className="flex h-screen bg-[#F1F5F9] items-center justify-center font-sans">Chargement...</div>;
  }

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden relative font-sans antialiased text-slate-800 selection:bg-indigo-100">
      {/* OVERLAY MOBILE */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed lg:static top-0 left-0 z-50 h-screen
          ${isSidebarOpen ? "w-64" : "lg:w-20"}
          bg-[#1C2434] text-slate-200 flex flex-col justify-between
          border-r border-slate-800/60 shadow-2xl transition-all duration-300
          ${
            isMobileSidebarOpen
              ? "translate-x-0 w-64"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
          {/* LOGO */}
          <div className="p-6 border-b border-slate-800/60 bg-[#141C2F] h-20 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
                <Boxes size={20} className="-rotate-6" />
              </div>

              {(isSidebarOpen || isMobileSidebarOpen) && (
                <div className="flex flex-col items-start">
                  <h1 className="text-lg font-black tracking-tight leading-none text-white">
                    STOCK<span className="text-indigo-500">MASTER</span>
                  </h1>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">
                    Pro Edition
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* BOUTIQUE */}
          <div
            className={`mx-4 mt-6 p-3 bg-slate-900/50 rounded-2xl border border-slate-800/40 flex items-center shrink-0 ${
              isSidebarOpen || isMobileSidebarOpen ? "space-x-3" : "lg:justify-center"
            }`}
          >
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
              <Store size={16} />
            </div>

            {(isSidebarOpen || isMobileSidebarOpen) && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{boutique.nom}</p>
                <p className="text-[10px] text-slate-500 truncate font-medium">{user.boutique?.secteurActivite || "Boutique active"}</p>
              </div>
            )}
          </div>

          {/* NAVIGATION */}
          <nav className="p-4 mt-4 space-y-1.5 flex-1">
            {navigation.map((item) => {
              if (item.permission && !hasPermission(item.permission)) return null;

              const hasSubMenu = item.subMenu && item.subMenu.length > 0;
              const allowedSubMenus = item.subMenu?.filter((sub) => hasPermission(sub.permission)) || [];

              if (hasSubMenu && allowedSubMenus.length === 0) return null;

              const IconComponent = item.icon;
              const isMenuOpen = openSubMenus[item.name];
              const isChildActive = hasSubMenu && allowedSubMenus.some((sub) => pathname === sub.href);
              const isParentActive = item.href ? pathname === item.href : isChildActive;

              return (
                <div key={item.name} className="w-full">
                  {hasSubMenu ? (
                    <button
                      onClick={() =>
                        isSidebarOpen || isMobileSidebarOpen
                          ? toggleSubMenu(item.name)
                          : setIsSidebarOpen(true)
                      }
                      className={`
                        w-full flex items-center justify-between px-4 py-3 rounded-xl
                        text-xs font-black uppercase tracking-wider transition-all duration-300 group
                        ${isSidebarOpen || isMobileSidebarOpen ? "" : "lg:justify-center"}
                        ${
                          isParentActive
                            ? "bg-slate-800 text-white border-l-4 border-indigo-500 rounded-l-none"
                            : "text-slate-400 hover:bg-slate-800/40 hover:text-white"
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <IconComponent
                          size={18}
                          className={`shrink-0 transition-transform ${
                            isParentActive ? "text-indigo-400 scale-110" : "group-hover:text-indigo-400"
                          }`}
                        />
                        {(isSidebarOpen || isMobileSidebarOpen) && <span>{item.name}</span>}
                      </div>

                      {(isSidebarOpen || isMobileSidebarOpen) && (
                        <ChevronDown
                          size={14}
                          className={`text-slate-500 transition-transform duration-200 ${
                            isMenuOpen ? "rotate-180 text-white" : ""
                          }`}
                        />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href || "#"}
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`
                        flex items-center px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider
                        transition-all duration-300 relative group ${
                          isSidebarOpen || isMobileSidebarOpen ? "space-x-3" : "lg:justify-center"
                        }
                        ${
                          isParentActive
                            ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                        }
                      `}
                    >
                      <IconComponent size={18} className="shrink-0" />
                      {(isSidebarOpen || isMobileSidebarOpen) && <span>{item.name}</span>}
                    </Link>
                  )}

                  {hasSubMenu && isMenuOpen && (isSidebarOpen || isMobileSidebarOpen) && (
                    <div className="mt-1 ml-6 pl-3 border-l border-slate-800/70 space-y-1 transition-all duration-300">
                      {allowedSubMenus.map((sub) => {
                        const isSubActive = pathname === sub.href;

                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className={`
                              flex items-center space-x-2 py-2 px-3 rounded-lg text-[11px] font-bold tracking-wide transition-colors
                              ${
                                isSubActive
                                  ? "text-indigo-400 bg-indigo-50/5 font-black"
                                  : "text-slate-400 hover:text-white hover:bg-slate-800/30"
                              }
                            `}
                          >
                            <ChevronRight
                              size={10}
                              className={isSubActive ? "text-indigo-400" : "text-slate-600"}
                            />
                            <span>{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* FOOTER SIDEBAR */}
        <div className="p-4 border-t border-slate-800/60 bg-[#141C2F]/60 shrink-0 space-y-3">
          <button
            onClick={handleLogout}
            title={!isSidebarOpen ? "Se déconnecter" : ""}
            className={`
              w-full flex items-center rounded-xl text-xs font-black uppercase tracking-wider
              text-rose-400 bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/30
              transition-all duration-300 group py-3
              ${isSidebarOpen || isMobileSidebarOpen ? "space-x-3 px-4" : "lg:justify-center px-0"}
            `}
          >
            <LogOut size={18} className="shrink-0 group-hover:translate-x-1 transition-transform duration-200 text-rose-400" />
            {(isSidebarOpen || isMobileSidebarOpen) && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 shrink-0 hover:bg-slate-200/60 transition-colors"
            >
              <Menu size={18} />
            </button>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200/60 transition-colors shrink-0"
            >
              <Menu size={18} />
            </button>

            {/* SEARCH */}
            <div className="hidden sm:block w-full max-w-[220px] md:max-w-[260px] lg:max-w-[320px]">
              <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 group focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50 transition-all duration-200 shadow-sm">
                <Search size={16} className="text-slate-500 group-focus-within:text-indigo-600 transition-colors shrink-0" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white ml-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 font-bold uppercase tracking-wider"
                />
              </div>
            </div>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-600 transition-colors shrink-0"
            >
              {darkMode ? <Sun size={20} className="text-amber-500 animate-pulse" /> : <Moon size={20} className="text-slate-600" />}
            </button>

            <button className="w-10 h-10 flex items-center justify-center relative rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-600 transition-colors shrink-0">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            </button>

            <div className="hidden sm:block w-px h-8 bg-slate-200" />

            {/* BLOC PROFILE */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 sm:gap-3 py-1.5 focus:outline-none group"
              >
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                    {user.prenom} {user.nom}
                  </p>
                  <p className="text-[11px] text-slate-400 font-black tracking-wide mt-0.5 uppercase">
                    {user.role || (user.roleId ? "Employé" : "Admin Général")}
                  </p>
                </div>

                <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-600 font-black shadow-inner shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.prenom} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm text-indigo-600 bg-indigo-50 w-full h-full flex items-center justify-center">
                      {user.prenom?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>

                <ChevronDown
                  size={16}
                  className={`hidden sm:block text-slate-400 group-hover:text-slate-600 transition-transform duration-300 ${
                    showUserMenu ? "rotate-180 text-indigo-600" : ""
                  }`}
                />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-30">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                      <p className="text-xs font-black text-slate-800 truncate uppercase tracking-wider">
                        {user.prenom} {user.nom}
                      </p>
                      {user.email && (
                        <p className="text-[10px] text-slate-500 truncate lowercase font-semibold mt-0.5">
                          {user.email}
                        </p>
                      )}
                    </div>

                    <Link
                      href="/dashboard/profil"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center space-x-2.5 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                    >
                      <User size={16} />
                      <span>Mon Profil</span>
                    </Link>

                    <Link
                      href="/dashboard/parametres"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center space-x-2.5 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                    >
                      <Settings size={16} />
                      <span>Paramètres</span>
                    </Link>

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center space-x-2.5 px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors uppercase tracking-wider text-left"
                    >
                      <LogOut size={16} />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#F1F5F9]">{children}</main>
      </div>
    </div>
  );
}
