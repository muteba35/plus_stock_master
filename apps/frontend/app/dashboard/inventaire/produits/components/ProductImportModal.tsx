"use client";

import { Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import { InventoryModal, primaryButton, secondaryButton } from "../../components/inventory-ui";
import { formatMoney } from "../../components/currency";

type ImportRow = { line: number; nom: string; sku: string; categorie: string; prixVente: string };
type Props = {
  open: boolean; saving: boolean; rows: ImportRow[]; fileName: string; error: string; currency: string;
  onClose: () => void; onDownloadTemplate: () => void; onFile: (file?: File) => void; onImport: () => void;
};

export default function ProductImportModal({ open, saving, rows, fileName, error, currency, onClose, onDownloadTemplate, onFile, onImport }: Props) {
  return (
    <InventoryModal open={open} onClose={onClose} title="Importer plusieurs produits" subtitle="Import CSV compatible Excel, limitÃ© Ã  500 lignes."
      notice={error ? <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700"><XCircle size={15} className="shrink-0" />{error}</div> : undefined}
      footer={<><button disabled={saving} onClick={onClose} className={secondaryButton}>Annuler</button><button disabled={saving || rows.length === 0} onClick={onImport} className={`${primaryButton} disabled:opacity-40 disabled:cursor-not-allowed`}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Importer {rows.length || ""}</button></>}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
          <div><p className="text-xs font-bold text-indigo-800">ModÃ¨le Excel obligatoire</p><p className="text-[10px] text-indigo-600 mt-1">Les catÃ©gories indiquÃ©es doivent dÃ©jÃ  exister dans la boutique.</p></div>
          <button type="button" onClick={onDownloadTemplate} className={`${secondaryButton} border-indigo-200 text-indigo-700`}><Download size={14} /> TÃ©lÃ©charger le modÃ¨le</button>
        </div>
        <label className="min-h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 p-5 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
          <FileSpreadsheet size={28} className="text-indigo-500" /><span className="text-xs font-bold text-slate-700">Choisir le fichier rempli dans Excel</span><span className="text-[10px] text-slate-400">Enregistrez-le au format CSV UTF-8</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
        </label>
        {fileName && <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"><span className="text-xs font-medium text-slate-600 truncate">{fileName}</span><span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{rows.length} ligne(s)</span></div>}
        {rows.length > 0 && <div className="border border-slate-200 rounded-xl overflow-hidden"><div className="px-3 py-2 bg-slate-50 text-[10px] font-bold uppercase text-slate-400">AperÃ§u des premiÃ¨res lignes</div><div className="divide-y divide-slate-100">{rows.slice(0, 4).map((row) => <div key={row.line} className="px-3 py-2 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{row.nom}</p><p className="text-[10px] text-slate-400 truncate">{row.sku} Â· {row.categorie}</p></div><span className="text-xs font-bold text-slate-600 whitespace-nowrap">{formatMoney(row.prixVente, currency)}</span></div>)}</div></div>}
      </div>
    </InventoryModal>
  );
}
