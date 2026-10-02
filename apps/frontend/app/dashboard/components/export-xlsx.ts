"use client";
import { dashboardUi as du, dashboardLocale } from "../../../src/i18n/catalog";


import * as XLSX from "xlsx";
import { getStoredLanguage, translateValue } from "../../../src/i18n/catalog";

export type XlsxSheet = {
  branding?: { name: string; details: string };
  name: string;
  columns: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
};

const sanitizeSheetName = (name: string) => name.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || "Feuille";

const normalizeCell = (value: string | number | boolean | null | undefined) => value ?? "";

const generatedAt = (locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date());

export const exportXlsxWorkbook = (fileName: string, sheets: XlsxSheet[]) => {
  const workbook = XLSX.utils.book_new();
  const language = getStoredLanguage();
  const locale = language === "en" ? "en-GB" : dashboardLocale();
  const exportedOn = language === "en" ? "Exported on" : "Export du";

  sheets.forEach((sheet) => {
    const translatedName = translateValue(sheet.name, language);
    const translatedColumns = sheet.columns.map((column) => translateValue(column, language));
    const data = [[sheet.branding?.name || "Movoora"], [translatedName], [sheet.branding?.details || exportedOn + " " + generatedAt(locale)], [], translatedColumns, ...sheet.rows].map((row) => row.map(normalizeCell));
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet["!cols"] = sheet.columns.map((column, index) => {
      const values = data.map((row) => String(row[index] ?? ""));
      return { wch: Math.min(42, Math.max(12, column.length + 2, ...values.map((value) => value.length + 2))) };
    });
    worksheet["!merges"] = [0, 1, 2].map((r) => ({ s: { r, c: 0 }, e: { r, c: Math.max(0, sheet.columns.length - 1) } }));
    worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 4, c: 0 }, e: { r: Math.max(4, data.length - 1), c: Math.max(0, sheet.columns.length - 1) } }) };
    for (let r = 5; r < data.length; r++) {
      for (let c = 0; c < sheet.columns.length; c++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
        if (cell?.t === "n") cell.z = Number.isInteger(cell.v) ? "#,##0" : "#,##0.00";
      }
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(translatedName));
  });

  XLSX.writeFile(workbook, fileName.endsWith(".xlsx") ? fileName : fileName + ".xlsx", { compression: true });
};

