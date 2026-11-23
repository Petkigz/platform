'use client';

/**
 * The counts on the page, as a file.
 *
 * The file is made on the server from the same report the page drew, and
 * handed here as text: this button only saves it. A byte-order mark goes in
 * front, because a course title is whatever its teacher typed and Excel reads
 * a file without one as Latin-1.
 */
export function ReportFile({ csv, name, label }: { csv: string; name: string; label: string }) {
  function save() {
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="btn ghost" onClick={save} data-inst-file={name}>
      {label}
    </button>
  );
}
