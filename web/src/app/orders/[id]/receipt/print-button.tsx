'use client';

export function PrintReceiptButton() {
  return (
    <button type="button" className="btn no-print" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
