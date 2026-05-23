"use client";

import React, { useState } from "react";
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
} from "lucide-react";

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

  const [user] = useState({
    prenom: "Propriétaire",
    role: "proprietaire",
    avatar: "",
  });

  const [boutique] = useState({
    nom: "Ma Super Boutique",
    secteur: "Commerce Général",
  });

  const [showUserMenu, setShowUserMenu] = useState(false);

  // Sidebar desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Sidebar mobile
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [darkMode, setDarkMode] = useState(false);

  // ==========================================
  // DARK MODE
  // ==========================================

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove("dark");
      setDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    document.cookie =
      "stockmaster_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    localStorage.removeItem("token");

    router.push("/login");
  };

  // ==========================================
  // NAVIGATION
  // ==========================================

  const navigation = [
    {
      name: "Vue d'ensemble",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Produits & Stock",
      href: "/dashboard/produits",
      icon: Boxes,
    },
    {
      name: "Nouvelle Vente",
      href: "/dashboard/ventes",
      icon: ShoppingCart,
    },
    {
      name: "Mon Équipe",
      href: "/dashboard/equipe",
      icon: Users2,
    },
    {
      name: "Paramètres",
      href: "/dashboard/parametres",
      icon: Settings,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] overflow-hidden relative font-sans antialiased text-slate-800 selection:bg-indigo-100">

      {/* ==========================================
          OVERLAY MOBILE
      ========================================== */}

      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ==========================================
          SIDEBAR
      ========================================== */}

      <aside
        className={`
          fixed lg:static top-0 left-0 z-50 h-screen
          ${isSidebarOpen ? "w-64" : "w-20"}
          bg-[#1C2434]
          text-slate-200
          flex flex-col justify-between
          border-r border-slate-800/60
          shadow-2xl
          transition-all duration-300

          ${
            isMobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div>
          {/* ==========================================
              LOGO
          ========================================== */}

          <div className="p-6 border-b border-slate-800/60 bg-[#141C2F] h-20 flex items-center justify-between">
            
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
                <Boxes size={20} className="-rotate-6" />
              </div>

              {isSidebarOpen && (
                <div className="flex flex-col items-start">
                  <h1 className="text-lg font-black tracking-tight leading-none text-white">
                    STOCK
                    <span className="text-indigo-500">MASTER</span>
                  </h1>

                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">
                    Pro Edition
                  </span>
                </div>
              )}
            </div>

            {/* CLOSE MOBILE */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* ==========================================
              BOUTIQUE
          ========================================== */}

          <div
            className={`mx-4 mt-6 p-3 bg-slate-900/50 rounded-2xl border border-slate-800/40 flex items-center ${
              isSidebarOpen ? "space-x-3" : "justify-center"
            }`}
          >
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
              <Store size={16} />
            </div>

            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">
                  {boutique.nom}
                </p>

                <p className="text-[10px] text-slate-500 truncate font-medium">
                  {boutique.secteur}
                </p>
              </div>
            )}
          </div>

          {/* ==========================================
              NAVIGATION
          ========================================== */}

          <nav className="p-4 mt-4 space-y-1.5">
            {navigation.map((item) => {
              const IconComponent = item.icon;

              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  title={!isSidebarOpen ? item.name : ""}
                  className={`
                    flex items-center px-4 py-3 rounded-xl
                    text-xs font-black uppercase tracking-wider
                    transition-all duration-300 relative group

                    ${
                      isSidebarOpen
                        ? "space-x-3"
                        : "justify-center"
                    }

                    ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                    }
                  `}
                >
                  {isActive && isSidebarOpen && (
                    <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-md" />
                  )}

                  <IconComponent
                    size={18}
                    className={`shrink-0 transition-transform duration-300 ${
                      isActive
                        ? "scale-110"
                        : "group-hover:scale-110 group-hover:text-indigo-400"
                    }`}
                  />

                  {isSidebarOpen && (
                    <span>{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ==========================================
            FOOTER SIDEBAR
        ========================================== */}

        <div className="p-4 border-t border-slate-800/60 bg-[#141C2F]/40">
          <button
            onClick={handleLogout}
            title={!isSidebarOpen ? "Déconnexion" : ""}
            className={`
              w-full flex items-center py-3 rounded-xl
              text-xs font-black uppercase tracking-wider
              text-rose-400 hover:bg-rose-50/10
              transition-all duration-300 group

              ${
                isSidebarOpen
                  ? "space-x-3 px-4"
                  : "justify-center"
              }
            `}
          >
            <LogOut
              size={18}
              className="shrink-0 group-hover:translate-x-1 transition-transform"
            />

            {isSidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ==========================================
          CONTENU PRINCIPAL
      ========================================== */}

      <div className="flex-1 flex flex-col min-w-0">

        {/* ==========================================
            HEADER
        ========================================== */}

        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 shadow-sm sticky top-0 z-30">

          {/* ==========================================
              LEFT
          ========================================== */}

          <div className="flex items-center gap-3 flex-1 min-w-0">

            {/* MOBILE MENU */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 shrink-0"
            >
              <Menu size={18} />
            </button>

            {/* DESKTOP SIDEBAR BUTTON */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200/60 transition-colors shrink-0"
            >
              <Menu size={18} />
            </button>

            {/* SEARCH */}
            <div className="hidden sm:block w-full max-w-[220px] md:max-w-[260px] lg:max-w-[320px]">
              <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 group focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50 transition-all duration-200 shadow-sm">

                <Search
                  size={16}
                  className="text-slate-500 group-focus-within:text-indigo-600 transition-colors shrink-0"
                />

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

          {/* ==========================================
              RIGHT
          ========================================== */}

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">

            {/* DARK MODE */}
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-600 transition-colors shrink-0"
            >
              {darkMode ? (
                <Sun size={20} className="text-amber-500 animate-pulse" />
              ) : (
                <Moon size={20} className="text-slate-600" />
              )}
            </button>

            {/* NOTIFICATIONS */}
            <button className="w-10 h-10 flex items-center justify-center relative rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-600 transition-colors shrink-0">
              <Bell size={20} />

              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            </button>

            {/* SEPARATOR */}
            <div className="hidden sm:block w-px h-8 bg-slate-200" />

            {/* PROFILE */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 sm:gap-3 py-1.5 focus:outline-none group"
              >
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                    {user.prenom}
                  </p>

                  <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5 capitalize">
                    {user.role}
                  </p>
                </div>

                <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-600 font-black shadow-inner shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.prenom}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm text-indigo-600 bg-indigo-50 w-full h-full flex items-center justify-center">
                      {user.prenom.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <ChevronDown
                  size={16}
                  className={`hidden sm:block text-slate-400 group-hover:text-slate-600 transition-transform duration-300 ${
                    showUserMenu
                      ? "rotate-180 text-indigo-600"
                      : ""
                  }`}
                />
              </button>

              {/* USER MENU */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowUserMenu(false)}
                  />

                  <div className="absolute right-0 mt-3 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-30">

                    <Link
                      href="/dashboard/parametres"
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

        {/* ==========================================
            MAIN CONTENT
        ========================================== */}

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 bg-[#F1F5F9]">
          {children}
        </main>
      </div>
    </div>
  );
}