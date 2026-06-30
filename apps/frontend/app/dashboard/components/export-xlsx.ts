"use client";

import * as XLSX from "xlsx";

export type XlsxSheet = {
  name: string;
  columns: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
};

const sanitizeSheetName = (name: string) => name.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || "Feuille";

const normalizeCell = (value: string | number | boolean | null | undefined) => value ?? "";

const generatedAt = () => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date());

export const exportXlsxWorkbook = (fileName: string, sheets: XlsxSheet[]) => {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const data = [["Boutiqo", sheet.name, "Export du " + generatedAt()], [], sheet.columns, ...sheet.rows].map((row) => row.map(normalizeCell));
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet["!cols"] = sheet.columns.map((column, index) => {
      const values = data.map((row) => String(row[index] ?? ""));
      return { wch: Math.min(42, Math.max(12, column.length + 2, ...values.map((value) => value.length + 2))) };
    });
    worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, sheet.columns.length - 1) } }];
    worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: Math.max(2, data.length - 1), c: Math.max(0, sheet.columns.length - 1) } }) };
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheet.name));
  });

  XLSX.writeFile(workbook, fileName.endsWith(".xlsx") ? fileName : fileName + ".xlsx", { compression: true });
};
