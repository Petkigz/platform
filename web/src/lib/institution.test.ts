import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  REPORT_NOTICE,
  SSO_NOTICE,
  describeDomainStatus,
  dnsRecord,
  institutionRefusal,
  parseDirectory,
  parseMyInstitution,
  parseReport,
  reportCsv,
  safeLogoUrl,
} from './institution.ts';

describe('the console', () => {
  it('reads an administrator’s institution, with its domains and keys', () => {
    const board = parseMyInstitution({
      joined: true,
      joinable: false,
      institution: { id: 'i1', code: 'alnoor', name: 'Alnoor', type: 'madrasah', status: 'active' },
      role: 'admin',
      joinedAt: '2026-10-26T00:00:00Z',
      branding: { displayName: 'Alnoor', tagline: 'Every evening', accent: 'olive', logoUrl: 'https://alnoor.example/logo.png' },
      domains: [
        { id: 'd1', domain: 'alnoor.example', status: 'claimed', claimToken: 'ayahspring-site-verification=abc' },
      ],
      keys: [{ id: 'k1', name: 'Nightly', prefix: 'a1b2c3d4e5f6', createdAt: '2026-10-26T00:00:00Z' }],
      flags: { branding: true, reporting: true, api: true, sso: true },
    });

    assert.ok(board);
    assert.equal(board.role, 'admin');
    assert.equal(board.branding?.accent, 'olive');
    assert.equal(board.domains[0]?.status, 'claimed');
    assert.equal(board.keys[0]?.prefix, 'a1b2c3d4e5f6');
    assert.equal(board.flags.reporting, true);
  });

  it('never carries a key secret, because the payload never had one', () => {
    const board = parseMyInstitution({
      joined: true,
      keys: [{ id: 'k1', name: 'Nightly', prefix: 'abcdef123456', secret: 'nope' }],
    });
    assert.ok(board);
    assert.deepEqual(Object.keys(board.keys[0]!).sort(), [
      'createdAt', 'id', 'lastUsedAt', 'name', 'prefix', 'revokedAt', 'revokedReason',
    ]);
  });

  it('says “not joined” without inventing an institution', () => {
    const board = parseMyInstitution({ joined: false, joinable: true, flags: { sso: true } });
    assert.ok(board);
    assert.equal(board.institution, null);
    assert.equal(board.role, null);
    assert.equal(board.joinable, true);
    assert.deepEqual(board.domains, []);
  });

  it('drops a domain or key with no id, because a decision needs one', () => {
    const board = parseMyInstitution({
      joined: true,
      domains: [{ domain: 'no-id.example' }, { id: 'd2', domain: 'ok.example' }],
      keys: [{ name: 'no id' }, { id: 'k2', name: 'ok' }],
    });
    assert.ok(board);
    assert.equal(board.domains.length, 1);
    assert.equal(board.keys.length, 1);
  });

  it('refuses a payload that is not an object', () => {
    assert.equal(parseMyInstitution(null), null);
    assert.equal(parseMyInstitution('joined'), null);
  });
});

describe('the report', () => {
  it('reads counts and nothing else', () => {
    const report = parseReport({
      from: '2026-01-01',
      to: '2026-12-31',
      totals: { members: 12, learners: 30, enrolments: 44, completions: 9, certificates: 3 },
      courses: [{ course: 'Arabic letters', learnerProfiles: 4, enrolments: 7, completions: 2 }],
      months: [{ month: '2026-10', enrolments: 7 }],
    });
    assert.ok(report);
    assert.equal(report.totals.learners, 30);
    assert.equal(report.courses[0]?.course, 'Arabic letters');
    assert.equal(report.months[0]?.month, '2026-10');
  });

  it('drops a field the database should never send', () => {
    const report = parseReport({
      totals: { members: 1, learners: 1 },
      courses: [{ course: 'X', learnerProfiles: 1, enrolments: 1, completions: 0, learnerName: 'Amina' }],
    });
    assert.ok(report);
    assert.deepEqual(Object.keys(report.courses[0]!).sort(),
      ['completions', 'course', 'enrolments', 'learnerProfiles']);
    assert.doesNotMatch(JSON.stringify(report), /Amina/);
  });

  it('reads a missing total as zero rather than NaN', () => {
    const report = parseReport({ courses: [{ course: 'X' }] });
    assert.ok(report);
    assert.deepEqual(report.totals, {
      members: 0, learners: 0, enrolments: 0, completions: 0, certificates: 0,
    });
    assert.equal(report.courses[0]?.enrolments, 0);
  });

  it('writes a csv with the numbers it printed, and quotes a comma in a title', () => {
    const csv = reportCsv({
      from: null,
      to: null,
      totals: { members: 0, learners: 0, enrolments: 0, completions: 0, certificates: 0 },
      courses: [{ course: 'Fiqh, book one', learnerProfiles: 2, enrolments: 3, completions: 1 }],
      months: [{ month: '2026-10', enrolments: 3 }],
    });
    assert.match(csv, /"Fiqh, book one","2","3","1"/);
    assert.match(csv, /"2026-10",3/);
  });
});

describe('the directory', () => {
  it('reads institutions and the domains nobody has checked', () => {
    const dir = parseDirectory({
      institutions: [{ id: 'i1', code: 'alnoor', name: 'Alnoor', type: 'madrasah', members: 4, admins: 1, domains: 1, waitingDomains: 0 }],
      waitingDomains: [{ id: 'd1', domain: 'suffah.example', institution: 'Suffah', claimToken: 'ayahspring-site-verification=abc' }],
    });
    assert.ok(dir);
    assert.equal(dir.institutions[0]?.members, 4);
    assert.equal(dir.waitingDomains[0]?.domain, 'suffah.example');
  });

  it('refuses nonsense', () => {
    assert.equal(parseDirectory(42), null);
  });
});

describe('what the words say', () => {
  it('a claim is not a verified domain', () => {
    assert.match(describeDomainStatus('claimed'), /Waiting/);
    assert.match(describeDomainStatus('verified'), /accounts at this domain may join/);
    assert.match(describeDomainStatus('rejected'), /not found/);
  });

  it('prints the DNS record a person can paste', () => {
    assert.equal(dnsRecord('ayahspring-site-verification=abc'), 'TXT  @  ayahspring-site-verification=abc');
  });

  it('says single sign-on is not connected', () => {
    assert.match(SSO_NOTICE, /SAML and OIDC/);
    assert.match(SSO_NOTICE, /no “sign in with your school account”/);
  });

  it('says a report is counts, and that one can still point at somebody', () => {
    assert.match(REPORT_NOTICE, /counts, not records/);
    assert.match(REPORT_NOTICE, /count of one/);
    assert.match(REPORT_NOTICE, /no name, no learner id and no email/);
  });

  it('maps a refusal to a sentence and leaks no raw error', () => {
    assert.match(institutionRefusal('institution:no_verified_domain').message, /no verified domain matches/i);
    assert.equal(institutionRefusal('institution:rate_limited').code, 'rate_limited');
    const unknown = institutionRefusal('some other failure');
    assert.equal(unknown.code, 'unknown');
    assert.doesNotMatch(unknown.message, /some other failure/);
  });
});

describe('a logo address', () => {
  it('accepts https only', () => {
    assert.equal(safeLogoUrl('https://alnoor.example/logo.png'), 'https://alnoor.example/logo.png');
    assert.equal(safeLogoUrl('http://alnoor.example/logo.png'), null);
    assert.equal(safeLogoUrl('javascript:alert(1)'), null);
    assert.equal(safeLogoUrl(null), null);
  });
});
