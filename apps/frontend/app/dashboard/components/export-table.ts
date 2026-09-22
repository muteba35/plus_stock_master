"use client";

import { dashboardUi as du, dashboardLocale } from "../../../src/i18n/catalog";
import { exportXlsxWorkbook, type XlsxSheet } from "./export-xlsx";

export type ExportFormat = "xlsx" | "docx" | "pdf";

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
};

export async function exportTable(format: ExportFormat, filename: string, sheet: XlsxSheet) {
  const title = du(sheet.name);
  const columns = sheet.columns.map((column) => du(column));
  const rows = sheet.rows.map((row) => row.map((cell) => String(cell ?? "")));
  const date = new Date().toLocaleString(dashboardLocale());
  const name = `${filename}-${new Date().toISOString().slice(0, 10)}.${format}`;
  if (format === "xlsx") return exportXlsxWorkbook(name, [{ ...sheet, name: title, columns }]);
  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const { autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
    doc.setFontSize(17);
    doc.text(`Movoora | ${title}`, 14, 17);
    doc.setFontSize(9);
    doc.text(date, 14, 24);
    autoTable(doc, {
      head: [columns], body: rows, startY: 31, margin: { top: 16, bottom: 18 },
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [30, 64, 175] }, alternateRowStyles: { fillColor: [245, 247, 250] },
      didDrawPage: ({ pageNumber }) => { doc.setFontSize(8); doc.text(`Movoora | ${pageNumber}`, 14, 202); },
    });
    download(doc.output("blob"), name);
    return;
  }
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, PageOrientation } = await import("docx");
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [columns, ...rows].map((row, index) => new TableRow({
      tableHeader: index === 0,
      children: row.map((text) => new TableCell({
        shading: { fill: index === 0 ? "1E40AF" : index % 2 ? "FFFFFF" : "F5F7FA" },
        children: [new Paragraph({ children: [new TextRun({ text, bold: index === 0, color: index === 0 ? "FFFFFF" : "172033", size: 18 })] })],
      })),
    })),
  });
  const doc = new Document({ sections: [{
    properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
    children: [new Paragraph({ children: [new TextRun({ text: `Movoora | ${title}`, bold: true, size: 30 })] }), new Paragraph(date), table],
  }] });
  download(await Packer.toBlob(doc), name);
}

// Fetch again so revoked permissions and own/all scope are checked at export time.
export async function authorizedExportRows<T extends { _id: string }>(url: string, selected: T[]): Promise<T[]> {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}export=1`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || du("Export impossible."));
  const ids = new Set(selected.map((row) => String(row._id)));
  return (Array.isArray(data.data) ? data.data : []).filter((row: T) => ids.has(String(row._id)));
}
