/**
 * Export types — shared between API and mobile.
 * Used for the monthly Excel export feature.
 */

/** Filter for monthly export requests */
export interface ExportFilter {
  year: number;
  month: number;
}

/** Metadata returned alongside the export binary */
export interface ExportMeta {
  filename: string;
  rows: number;
  year: number;
  month: number;
  generatedAt: string;
}
