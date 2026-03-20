"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { Package2, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { scrollY } = useScroll();
  
  // Transformation au scroll : Largeur totale -> Largeur centrée (pill style)
  const width = useTransform(scrollY, [0, 100], ["100%", "auto"]);
  const y = useTransform(scrollY, [0, 100], [0, 20]);
  const borderRadius = useTransform(scrollY, [0, 100], [0, 50]);
  const borderWidth = useTransform(scrollY, [0, 100], [0, 1]);

  return (
    <div className="fixed w-full flex justify-center z-50 pointer-events-none">
      <motion.nav 
        style={{ width, y, borderRadius, borderWidth }}
        className="bg-white/70 backdrop-blur-xl border-slate-200/50 shadow-sm pointer-events-auto"
      >
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between gap-12">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Package2 size={18} />
            </div>
            <span className="text-sm font-bold tracking-tighter text-slate-900 uppercase italic">StockMaster</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {["Fonctionnalités", "Tarifs", "Partenaires"].map((item) => (
              <Link key={item} href="#" className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                {item}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="#" className="hidden sm:block text-xs font-bold uppercase text-slate-900">Login</Link>
            <Link href="#" className="px-5 py-2 bg-slate-900 text-[10px] uppercase font-black text-white rounded-full hover:bg-indigo-600 transition-all">
              Start Free
            </Link>
          </div>
        </div>
      </motion.nav>
    </div>
  );
}