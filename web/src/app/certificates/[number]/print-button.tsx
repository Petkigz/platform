'use client';

export function PrintCertificateButton() {
  return (
    <button type="button" className="btn no-print" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
