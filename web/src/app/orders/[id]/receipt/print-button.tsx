'use client';

/**
 * The one button on the receipt. Its word is handed to it by the page, in
 * the reader's language: no catalogue sentence is in this script.
 */
export function PrintReceiptButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}
