import { Tags } from "lucide-react";

export default function CategoriesInventairePage() {
  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Categories</h1>
        <p className="text-xs text-slate-400 font-medium">Organisation des familles de produits.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
          <Tags size={22} />
        </div>
        <p className="text-sm font-bold text-slate-900">Interface categories en preparation</p>
      </div>
    </div>
  );
}
