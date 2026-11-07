import { courseworkFileHref } from '@/lib/coursework';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** References are not proof that the file or stored bytes still exist. */
export function RevisionFiles({ assetIds }: { assetIds: string[] }) {
  if (assetIds.length === 0) return null;
  return <div>
    <p className="muted">Files recorded with this version. Opening a file checks your current access; a file may no longer be available.</p>
    <ul>
      {assetIds.map((id, index) => <li key={`${id}-${index}`}>
        {UUID.test(id)
          ? <a href={courseworkFileHref(id)} target="_blank" rel="noreferrer">Try opening file {index + 1}</a>
          : <span>File reference {index + 1} is invalid and needs individual review.</span>}
      </li>)}
    </ul>
  </div>;
}
