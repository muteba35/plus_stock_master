"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Shield,
  Activity,
  ArrowUpRight,
  UserPlus,
  Clock,
  ChevronRight,
  Building2,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import EmployeModal, { EmployeOption } from "./employes/components/EmployeModal";

interface Employe {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: "Actif" | "Suspendu";
  roleId?: string | null;
  departementId?: string | null;
}

interface RoleApi {
  _id: string;
  nom: string;
}

interface DepartementApi {
  _id: string;
  nom: string;
  employeeCount?: number;
}

interface BoutiqueApi {
  id: string;
  _id?: string;
  nom: string;
}

interface TeamStats {
  totalEmployees: number;
  activeNow: number;
  totalRoles: number;
  totalDepartements: number;
}

interface ActivityLog {
  id: string;
  user: string;
  role: string;
  action: string;
  time: string;
  type: "success" | "info" | "warning";
}

interface DistributionItem {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const distributionColors = [
  "bg-indigo-600",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-rose-500",
];

const activities: ActivityLog[] = [
  {
    id: "1",
    user: "Jean-Marc Kabeya",
    role: "Caissier",
    action: "a cloture la caisse principale avec un ecart de 0 FC",
    time: "Il y a 10 min",
    type: "success",
  },
  {
    id: "2",
    user: "Sarah Mwamba",
    role: "Gestionnaire",
    action: "a ajuste le stock du produit 'Huile de table 5L' (+20 unites)",
    time: "Il y a 45 min",
    type: "info",
  },
  {
    id: "3",
    user: "Junior Muteba",
    role: "Proprietaire",
    action: "a modifie les permissions du role 'Gestionnaire de Stock'",
    time: "Il y a 2 heures",
    type: "warning",
  },
  {
    id: "4",
    user: "Alain Mpunga",
    role: "Caissier",
    action: "a imprime la facture globale pour la commande #24098",
    time: "Il y a 3 heures",
    type: "success",
  },
];

const readApiMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    return { data, message: data?.message || fallback };
  } catch {
    return { data: null, message: fallback };
  }
};

export default function TeamOverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [roles, setRoles] = useState<EmployeOption[]>([]);
  const [departements, setDepartements] = useState<(EmployeOption & { employeeCount?: number })[]>([]);
  const [boutiques, setBoutiques] = useState<EmployeOption[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  }, []);

  const fetchReferences = useCallback(async (boutiqueId?: string) => {
    const query = boutiqueId ? `?boutiqueId=${encodeURIComponent(boutiqueId)}` : "";
    const [rolesResponse, departementsResponse] = await Promise.all([
      fetch(`${API_URL}/roles${query}`, { method: "GET", headers: getAuthHeaders() }),
      fetch(`${API_URL}/departements${query}`, { method: "GET", headers: getAuthHeaders() }),
    ]);

    const rolesResult = await readApiMessage(rolesResponse, "Impossible de charger les roles.");
    const departementsResult = await readApiMessage(departementsResponse, "Impossible de charger les departements.");

    if (!rolesResponse.ok || !rolesResult.data?.success) {
      throw new Error(rolesResult.message);
    }

    if (!departementsResponse.ok || !departementsResult.data?.success) {
      throw new Error(departementsResult.message);
    }

    setRoles(
      (rolesResult.data.roles || []).map((role: RoleApi) => ({
        id: role._id,
        name: role.nom,
      }))
    );

    setDepartements(
      (departementsResult.data.data || []).map((departement: DepartementApi) => ({
        id: departement._id,
        name: departement.nom,
        employeeCount: departement.employeeCount || 0,
      }))
    );
  }, [getAuthHeaders]);

  const fetchOverviewData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [employesResponse, rolesResponse, departementsResponse, boutiquesResponse] = await Promise.all([
        fetch(`${API_URL}/employes`, { method: "GET", headers: getAuthHeaders() }),
        fetch(`${API_URL}/roles`, { method: "GET", headers: getAuthHeaders() }),
        fetch(`${API_URL}/departements`, { method: "GET", headers: getAuthHeaders() }),
        fetch(`${API_URL}/boutiques`, { method: "GET", headers: getAuthHeaders() }),
      ]);

      const employesResult = await readApiMessage(employesResponse, "Impossible de charger les employes.");
      const rolesResult = await readApiMessage(rolesResponse, "Impossible de charger les roles.");
      const departementsResult = await readApiMessage(departementsResponse, "Impossible de charger les departements.");
      const boutiquesResult = await readApiMessage(boutiquesResponse, "Impossible de charger les boutiques.");

      if (employesResponse.ok && employesResult.data?.success) {
        setEmployes(employesResult.data.employes || []);
      } else {
        showToast("error", employesResult.message);
      }

      if (rolesResponse.ok && rolesResult.data?.success) {
        setRoles(
          (rolesResult.data.roles || []).map((role: RoleApi) => ({
            id: role._id,
            name: role.nom,
          }))
        );
      } else {
        showToast("error", rolesResult.message);
      }

      if (departementsResponse.ok && departementsResult.data?.success) {
        setDepartements(
          (departementsResult.data.data || []).map((departement: DepartementApi) => ({
            id: departement._id,
            name: departement.nom,
            employeeCount: departement.employeeCount || 0,
          }))
        );
      } else {
        showToast("error", departementsResult.message);
      }

      if (boutiquesResponse.ok && boutiquesResult.data?.success) {
        setBoutiques(
          (boutiquesResult.data.boutiques || []).map((boutique: BoutiqueApi) => ({
            id: boutique.id || boutique._id || "",
            name: boutique.nom,
          }))
        );
      }
    } catch {
      showToast("error", "Erreur de communication avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  const handleCreateEmploye = async (payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    boutiqueId: string;
    roleId: string;
    departementId: string;
    password: string;
    avatar?: string;
  }) => {
    try {
      const response = await fetch(`${API_URL}/employes`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const { data, message } = await readApiMessage(response, "Erreur lors de la creation de l'employe.");
      if (!response.ok || !data?.success) {
        throw new Error(message);
      }

      await fetchOverviewData();
      showToast("success", data.message || "Employe cree avec succes.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de la creation de l'employe.";
      showToast("error", message);
      throw new Error(message);
    }
  };

  const stats: TeamStats = useMemo(
    () => ({
      totalEmployees: employes.length,
      activeNow: employes.filter((employe) => employe.status === "Actif").length,
      totalRoles: roles.length,
      totalDepartements: departements.length,
    }),
    [departements.length, employes, roles.length]
  );

  const roleDistribution: DistributionItem[] = useMemo(() => {
    const baseRoles = roles.length
      ? roles
      : Array.from(new Set(employes.map((employe) => employe.role).filter(Boolean))).map((role) => ({
          id: role,
          name: role,
        }));

    return baseRoles.map((role, index) => {
      const count = employes.filter((employe) => employe.roleId === role.id || employe.role === role.name).length;
      const percentage = employes.length ? Math.round((count / employes.length) * 100) : 0;

      return {
        id: role.id,
        name: role.name,
        count,
        percentage,
        color: distributionColors[index % distributionColors.length],
      };
    });
  }, [employes, roles]);

  const departementDistribution: DistributionItem[] = useMemo(
    () =>
      departements.map((departement, index) => {
        const count =
          employes.filter(
            (employe) => employe.departementId === departement.id || employe.department === departement.name
          ).length || departement.employeeCount || 0;
        const percentage = employes.length ? Math.round((count / employes.length) * 100) : 0;

        return {
          id: departement.id,
          name: departement.name,
          count,
          percentage,
          color: distributionColors[(index + 2) % distributionColors.length],
        };
      }),
    [departements, employes]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f9fafd]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Chargement de la vue d&apos;ensemble...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-6 right-6 z-[100] max-w-md"
          >
            <div
              className={`p-3 text-xs font-semibold rounded-xl border flex items-center gap-2 shadow-sm ${
                toast.type === "success"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-rose-50 text-rose-600 border-rose-100"
              }`}
            >
              {toast.type === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EN-TETE DE LA PAGE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vue d&apos;ensemble de l&apos;Equipe</h1>
          <p className="text-xs text-slate-400 font-medium">
            Supervisez les performances, la repartition et les activites recentes de votre personnel.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <UserPlus size={14} /> Ajouter un employe
        </button>
      </div>

      {/* SECTION 1 : CARTES DE STATISTIQUES (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Effectif Total</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalEmployees}</h3>
            <p className="text-[11px] text-slate-400 font-medium">Employes enregistres</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actifs en Caisse</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.activeNow}</h3>
              <span className="flex h-2 w-2 relative mb-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Comptes actifs
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck size={22} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Structures d&apos;Acces</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalRoles}</h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Roles actifs / {stats.totalDepartements} departement{stats.totalDepartements > 1 ? "s" : ""}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Shield size={22} />
          </div>
        </div>
      </div>

      {/* BLOCS PRINCIPAUX (REPARTITION ET ACTIVITES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 bg-[#fcfdfe]">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Repartition par Metier</h3>
              <p className="text-[11px] text-slate-400 font-medium">Structure du personnel par role</p>
            </div>

            <div className="p-6 space-y-5">
              {roleDistribution.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400">Aucun role configure.</p>
              ) : (
                roleDistribution.map((item) => <DistributionRow key={item.id} item={item} />)
              )}
            </div>

            <div className="px-6 pb-6">
              <div className="pt-5 border-t border-slate-100">
                <div className="flex items-center gap-1.5 mb-4">
                  <Building2 size={14} className="text-sky-600" />
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Departements</h4>
                </div>

                <div className="space-y-4">
                  {departementDistribution.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-400">Aucun departement configure.</p>
                  ) : (
                    departementDistribution.map((item) => <DistributionRow key={item.id} item={item} compact />)
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              href="/dashboard/equipe/roles"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 transition-all"
            >
              Ajuster la matrice des roles <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden lg:col-span-2">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#fcfdfe]">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={15} className="text-indigo-600" /> Journal Operationnel
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Historique en temps reel des actions de l&apos;equipe</p>
            </div>
            <span className="text-[10px] bg-slate-100 font-bold text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Aujourd&apos;hui
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[310px] overflow-y-auto">
            {activities.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      log.type === "success" ? "bg-emerald-500" : log.type === "warning" ? "bg-amber-500" : "bg-indigo-500"
                    }`}
                  />

                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      <span className="font-bold text-slate-900">{log.user}</span>{" "}
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded uppercase tracking-wide mr-1.5">
                        {log.role}
                      </span>
                      {log.action}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Clock size={11} />
                      <span>{log.time}</span>
                    </div>
                  </div>
                </div>

                <button className="text-slate-300 hover:text-slate-500 transition-colors p-1 self-center">
                  <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <EmployeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roles={roles}
        departements={departements}
        boutiques={boutiques}
        onBoutiqueChange={fetchReferences}
        onCreate={handleCreateEmploye}
      />
    </div>
  );
}

function DistributionRow({ item, compact = false }: { item: DistributionItem; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center justify-between text-xs font-bold gap-3">
        <span className="text-slate-700 font-medium truncate">{item.name}</span>
        <span className="text-slate-900 shrink-0">
          {item.count} ({item.percentage}%)
        </span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className={`${item.color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${item.percentage}%` }}
        />
      </div>
    </div>
  );
}
