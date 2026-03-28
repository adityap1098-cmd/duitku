/**
 * useExport — downloads monthly XLSX export from the API and triggers the OS share sheet.
 *
 * Uses expo-file-system's File.downloadFileAsync for binary download (the new SDK 55 API)
 * instead of apiClient which calls .json() on responses.
 */

import { useState, useCallback } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Config } from '../../../constants/config';
import * as auth from '../../../lib/auth';

interface UseExportReturn {
  /** Trigger export for a given year/month. Downloads XLSX and opens share sheet. */
  exportMonth: (year: number, month: number) => Promise<void>;
  /** Whether an export is currently in progress. */
  isExporting: boolean;
  /** Error message from the last export attempt, or null. */
  error: string | null;
}

/**
 * Hook for downloading and sharing monthly transaction exports.
 *
 * Flow:
 * 1. Download binary XLSX from GET /export/monthly?year=X&month=Y via File.downloadFileAsync
 * 2. File is saved to the cache directory as DuitKu-{year}-{month}.xlsx
 * 3. Open OS share sheet via expo-sharing
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportMonth = useCallback(async (year: number, month: number) => {
    setIsExporting(true);
    setError(null);

    try {
      // Get auth token for Authorization header
      const token = await auth.getAccessToken();
      if (!token) {
        throw new ExportError('AUTH_REQUIRED', 'Silakan login terlebih dahulu');
      }

      // Build the download URL
      const url = `${Config.API_URL}/export/monthly?year=${year}&month=${month}`;
      const monthStr = String(month).padStart(2, '0');
      const filename = `DuitKu-${year}-${monthStr}.xlsx`;

      // Create destination file in cache directory
      const destination = new File(Paths.cache, filename);

      // Download the binary XLSX file directly from API
      const downloadedFile = await File.downloadFileAsync(url, destination, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        idempotent: true, // Overwrite if file already exists
      });

      // Check if sharing is available on this device
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        throw new ExportError('SHARING_UNAVAILABLE', 'Fitur share tidak tersedia di perangkat ini');
      }

      // Open OS share sheet
      await Sharing.shareAsync(downloadedFile.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Transaksi',
      });
    } catch (err) {
      const message = err instanceof ExportError
        ? err.message
        : err instanceof TypeError
          ? 'Tidak dapat terhubung ke server. Periksa koneksi internet.'
          : (err instanceof Error && err.message.includes('UnableToDownload'))
            ? 'Gagal mengunduh file. Coba lagi nanti.'
            : 'Terjadi kesalahan saat mengekspor. Coba lagi.';
      setError(message);
      console.error('[export] Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportMonth, isExporting, error };
}

/** Custom error class for export-specific failures. */
class ExportError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ExportError';
    this.code = code;
  }
}
