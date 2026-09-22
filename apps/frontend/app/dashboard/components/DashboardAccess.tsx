"use client";
import { createContext, useContext } from "react";
export const DashboardAccessContext = createContext({ isOwner: false, permissions: [] as string[], boutiqueId: "" });
export const useDashboardAccess = () => useContext(DashboardAccessContext);
