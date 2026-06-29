"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  ShieldCheck,
} from "lucide-react";

// ==========================================
// TYPES & CONSTANTES STATIQUES (Hors composant)
// ==========================================

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "danger" | "success";
  category: string;
  href: string;
  createdAt: string;
}

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
  permissions?: string[];
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  module: string;
  permission?: string;
  permissions?: string[];
  subMenu?: SubMenuItem[];
}

const EmptyPermissionState = () => (
  <div className="min-h-full bg-[#f9fafd] rounded-3xl border border-slate-200/80 flex items-center justify-center p-8">
    <div className="max-w-md text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center mx-auto mb-4">
        <ShieldCheck size={22} />
      </div>
      <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Acces restreint</h2>
      <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
        Aucune permission active ne permet d&apos;afficher cette interface. Contactez l&apos;administrateur de la boutique.
      </p>
    </div>
  </div>
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsSeen, setNotificationsSeen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    Caisse: false,
    Inventaire: false,
    "Mon Equipe": false,
    Finances: false,
    Parametres: false,
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

        if (response.status === 428 && data.mustChangePassword) {
          router.replace("/first-login");
          return;
        }

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
    const interval = window.setInterval(syncSessionFromBackend, 30000);
    const handleFocus = () => syncSessionFromBackend();

    window.addEventListener("userProfileUpdated", syncSessionFromBackend);
    window.addEventListener("storage", syncSessionFromBackend);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("userProfileUpdated", syncSessionFromBackend);
      window.removeEventListener("storage", syncSessionFromBackend);
      window.removeEventListener("focus", handleFocus);
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
    if (user.roleId === "__loading__") return false;
    if (user.roleId === null || user.roleId === "") {
      return true;
    }
    if (!permission) return true;
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions?: string[]) => {
    if (user.roleId === "__loading__") return false;
    if (user.roleId === null || user.roleId === "") return true;
    if (!permissions || permissions.length === 0) return true;
    return permissions.some((permission) => userPermissions.includes(permission));
  };

  const canAccessNavigationItem = (item: { permission?: string; permissions?: string[] }) =>
    item.permissions ? hasAnyPermission(item.permissions) : hasPermission(item.permission);

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

  const fetchNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setNotifications(result.notifications || []);
      }
    } catch (error) {
      console.error("Erreur notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) return;
    void fetchNotifications();
  }, [fetchNotifications]);

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
        { name: "Historique Ventes", href: "/dashboard/caisse/ventes", permissions: ["VOIR_HISTORIQUE_VENTES", "VOIR_MES_VENTES"] },
        { name: "Factures", href: "/dashboard/caisse/factures", permissions: ["VOIR_FACTURES", "VOIR_MES_FACTURES", "IMPRIMER_FACTURE"] },
        { name: "Retours clients", href: "/dashboard/caisse/retours", permissions: ["VOIR_RETOURS_CLIENTS", "VOIR_MES_RETOURS_CLIENTS", "CREER_RETOUR_CLIENT", "ANNULER_VENTE"] },
        { name: "Rapports Caisse", href: "/dashboard/caisse/rapports", permissions: ["VOIR_RAPPORTS_CAISSE", "VOIR_MES_RAPPORTS_CAISSE", "EXPORTER_RAPPORTS_CAISSE"] },
      ],
    },
    {
      name: "Inventaire",
      icon: Boxes,
      module: "INVENTAIRE",
      subMenu: [
        { name: "Vue Globale", href: "/dashboard/inventaire", permission: "VOIR_RESUME_INVENTAIRE" },
        { name: "Gestion Produits", href: "/dashboard/inventaire/produits", permission: "VOIR_LISTE_PRODUITS" },
        { name: "Catégories", href: "/dashboard/inventaire/categories", permission: "VOIR_CATEGORIES" },
        { name: "Mouvements Stock", href: "/dashboard/inventaire/stock", permissions: ["VOIR_MOUVEMENTS_STOCK", "VOIR_MES_OPERATIONS_INVENTAIRE"] },
        { name: "Projection Produits", href: "/dashboard/inventaire/projection", permissions: ["VOIR_PROJECTION_PRODUITS", "EXPORTER_PROJECTION_PRODUITS"] },
        { name: "Alertes Rupture", href: "/dashboard/inventaire/alertes", permission: "VOIR_ALERTES_STOCK" },
      ],
    },
   {
  name: "Mon Equipe",
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
        { name: "Formules", href: "/dashboard/finances/formules", permission: "VOIR_CHIFFRE_AFFAIRE" },
      ],
    },
    {
      name: "Paramètres",
      icon: Settings,
      module: "PARAMETRES",
      subMenu: [
        { name: "Général", href: "/dashboard/parametres", permission: "MODIFIER_INFOS_BOUTIQUE" },
        { name: "Ma Boutique", href: "/dashboard/parametres/boutique", permission: "VOIR_BOUTIQUES" },
        { name: "Profil", href: "/dashboard/profil", permissions: ["MODIFIER_PROFIL_RESTREINT", "MODIFIER_PROFIL_TOTAL"] },
        { name: "Abonnement", href: "/dashboard/parametres/abonnement", permission: "VOIR_ABONNEMENT" },
      ],
    },
  ];

  const routePermissions = [
    { href: "/dashboard/profil", permissions: ["MODIFIER_PROFIL_RESTREINT", "MODIFIER_PROFIL_TOTAL"] },
    ...navigation.flatMap((item) => [
      ...(item.href ? [{ href: item.href, permission: item.permission, permissions: item.permissions }] : []),
      ...(item.subMenu || []).map((sub) => ({ href: sub.href, permission: sub.permission, permissions: sub.permissions })),
    ]),
  ];
  const currentRoute = routePermissions
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const isEmployeeWithNoPermission =
    user.roleId !== "__loading__" &&
    user.roleId !== null &&
    user.roleId !== "" &&
    userPermissions.length === 0;
  const canRenderCurrentRoute =
    !isEmployeeWithNoPermission &&
    (currentRoute
      ? currentRoute.permissions?.length
        ? hasAnyPermission(currentRoute.permissions)
        : hasPermission("permission" in currentRoute ? currentRoute.permission : undefined)
      : true);

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
          fixed lg:static inset-y-0 left-0 z-50 h-[100dvh] lg:h-screen
          w-[min(18rem,calc(100vw-1rem))]
          ${isSidebarOpen ? "lg:w-64" : "lg:w-20"}
          bg-[#1C2434] text-slate-200 flex flex-col justify-between
          border-r border-slate-800/60 shadow-2xl transition-all duration-300 overflow-hidden
          ${
            isMobileSidebarOpen
              ? "translate-x-0"
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
          <nav className="p-4 mt-4 pb-6 space-y-1.5 flex-1">
            {navigation.map((item) => {
              if ((item.permission || item.permissions) && !canAccessNavigationItem(item)) return null;

              const hasSubMenu = item.subMenu && item.subMenu.length > 0;
              const allowedSubMenus = item.subMenu?.filter((sub) => canAccessNavigationItem(sub)) || [];

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
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-800/60 bg-[#141C2F]/60 shrink-0 space-y-3">
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
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm sticky top-0 z-[80] shrink-0">
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

            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications((value) => !value);
                  setNotificationsSeen(true);
                  void fetchNotifications();
                }}
                className="w-10 h-10 flex items-center justify-center relative rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-600 transition-colors shrink-0"
                title="Notifications"
              >
                <Bell size={20} />
                {notifications.length > 0 && !notificationsSeen && (
                  <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-rose-500 rounded-full ring-2 ring-white text-[9px] font-black text-white flex items-center justify-center">
                    {Math.min(notifications.length, 9)}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-3 w-[min(340px,calc(100vw-24px))] bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/12 z-[100] overflow-hidden">
                    <div className="p-3.5 border-b border-slate-100 bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                            <Bell size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase tracking-wider">Centre d'alertes</p>
                            <p className="text-[11px] text-white/65 mt-1">
                              Alertes recentes
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-black">
                          {notifications.length}
                        </span>
                      </div>
                    </div>

                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Priorites recentes
                      </div>
                      <button onClick={() => void fetchNotifications()} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors">
                        Actualiser
                      </button>
                    </div>

                    <div className="max-h-[255px] overflow-y-auto p-2.5 space-y-2">
                      {notificationsLoading && (
                        <div className="p-6 text-xs text-slate-400 font-semibold text-center">Chargement...</div>
                      )}
                      {!notificationsLoading && notifications.slice(0, 3).length === 0 && (
                        <div className="p-6 text-center">
                          <p className="text-xs font-black text-slate-700">Aucune alerte importante</p>
                          <p className="text-[11px] text-slate-400 mt-1">La boutique ne signale rien de critique pour le moment.</p>
                        </div>
                      )}
                      {!notificationsLoading && notifications.slice(0, 3).map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={() => setShowNotifications(false)}
                          className={`block rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                            item.type === "danger"
                              ? "bg-rose-50/80 border-rose-100 hover:bg-rose-50"
                              : item.type === "warning"
                                ? "bg-amber-50/80 border-amber-100 hover:bg-amber-50"
                                : item.type === "success"
                                  ? "bg-emerald-50/80 border-emerald-100 hover:bg-emerald-50"
                                  : "bg-white border-slate-100 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${item.type === "danger" ? "bg-rose-500" : item.type === "warning" ? "bg-amber-500" : item.type === "success" ? "bg-emerald-500" : "bg-indigo-500"}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[11px] font-black text-slate-950 leading-snug">{item.title}</p>
                                <span className="shrink-0 px-2 py-0.5 rounded-lg bg-white/70 border border-white text-[9px] font-black uppercase tracking-wide text-slate-500">
                                  {item.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-600 mt-1 leading-relaxed line-clamp-2">{item.message}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-2">
                                {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt))}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <Link href="/dashboard/notifications" onClick={() => setShowNotifications(false)} className="block p-3 text-center text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-t border-indigo-100">
                      Afficher toutes les notifications
                    </Link>
                  </div>
                </>
              )}
            </div>

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
                  <div className="fixed inset-0 z-[90]" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl shadow-slate-900/10 py-2 z-[100]">
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#F1F5F9]">
          {canRenderCurrentRoute ? children : <EmptyPermissionState />}
        </main>
      </div>
    </div>
  );
}


