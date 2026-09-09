"use client";

import { getStoredLanguage, translateValue } from "../../../src/i18n/catalog";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] || char));

export const exportPdfTable = (title: string, columns: string[], rows: Array<Array<string | number | boolean | null | undefined>>) => {
  const popup = window.open("", "_blank", "width=1200,height=800");
  if (!popup) return;
  const language = getStoredLanguage();
  const locale = language === "en" ? "en-GB" : "fr-FR";
  const translatedTitle = translateValue(title, language);
  const header = columns.map((column) => "<th>" + escapeHtml(translateValue(column, language)) + "</th>").join("");
  const body = rows.map((row) => "<tr>" + row.map((cell) => "<td>" + escapeHtml(cell) + "</td>").join("") + "</tr>").join("");
  const exportedOn = language === "en" ? "Exported on" : "Export du";
  const footer = language === "en" ? "Automatically generated document" : "Document généré automatiquement";
  popup.document.write("<!doctype html><html lang='" + language + "'><head><meta charset='utf-8'><title>" + escapeHtml(translatedTitle) + "</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{font-size:20px;margin:0 0 4px}p{font-size:11px;color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#f1f5f9;text-align:left;text-transform:uppercase;color:#64748b}th,td{padding:7px;border:1px solid #e2e8f0;vertical-align:top}.footer{margin-top:12px;font-size:9px;color:#94a3b8}</style></head><body><h1>" + escapeHtml(translatedTitle) + "</h1><p>" + exportedOn + " " + escapeHtml(new Date().toLocaleString(locale)) + "</p><table><thead><tr>" + header + "</tr></thead><tbody>" + body + "</tbody></table><div class='footer'>Movoora - " + footer + "</div><script>window.onload=()=>window.print();</script></body></html>");
  popup.document.close();
};

