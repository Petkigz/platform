import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  REFERRAL_COOKIE,
  REFERRAL_HONESTY,
  cleanReferralCode,
  describePerson,
  describeReward,
  inviteMessage,
  parseReferralBoard,
  parseReferralOverview,
  referralLink,
  referralLookupError,
  rewardIsLive,
} from './referrals.ts';

const at = (iso: string) => new Date(iso);

describe('reading what the database returned', () => {
  it('reads a board that came back whole', () => {
    const board = parseReferralBoard({
      enabled: true,
      refereePercent: 10,
      rewardPercent: 20,
      maxPerYear: 10,
      expiryDays: 90,
      code: 'AYA-1A2B3C',
      joined: 2,
      rewards: [
        {
          code: 'THANKS-4D5E6F',
          status: 'rewarded',
          percent: 20,
          startsAt: '2026-10-30T00:00:00Z',
          earnedAt: '2026-10-26T00:00:00Z',
          endsAt: '2027-01-28T00:00:00Z',
          campaignStatus: 'active',
        },
      ],
      invited: [{ name: 'Fatima', status: 'rewarded', joinedAt: '2026-10-26T00:00:00Z' }],
    });

    assert.ok(board);
    assert.equal(board.enabled, true);
    assert.equal(board.code, 'AYA-1A2B3C');
    assert.equal(board.joined, 2);
    assert.equal(board.rewards.length, 1);
    assert.equal(board.rewards[0]!.percent, 20);
    assert.equal(board.invited[0]!.name, 'Fatima');
  });

  it('treats a missing list as empty rather than throwing', () => {
    const board = parseReferralBoard({ enabled: false, code: null });
    assert.ok(board);
    assert.deepEqual(board.rewards, []);
    assert.deepEqual(board.invited, []);
    assert.equal(board.joined, 0);
    assert.equal(board.code, null);
  });

  it('refuses a reply that is not an object', () => {
    assert.equal(parseReferralBoard(null), null);
    assert.equal(parseReferralBoard('AYA-1A2B3C'), null);
    assert.equal(parseReferralBoard([{ code: 'AYA-1A2B3C' }]), null);
  });

  it('reads a numeric string as a number, because jsonb reaches the wire as text', () => {
    const board = parseReferralBoard({ refereePercent: '15', rewardPercent: '25', joined: '3' });
    assert.ok(board);
    assert.equal(board.refereePercent, 15);
    assert.equal(board.rewardPercent, 25);
    assert.equal(board.joined, 3);
  });

  it('drops a reward row that is not an object instead of inventing one', () => {
    const board = parseReferralBoard({ rewards: [null, 'nope', { code: 'THANKS-1' }] });
    assert.ok(board);
    assert.equal(board.rewards.length, 1);
  });

  it('reads the staff overview', () => {
    const overview = parseReferralOverview({
      enabled: true,
      terms: { refereePercent: 10, rewardPercent: 20, maxPerYear: 10, expiryDays: 90 },
      codes: 4,
      conversions: 3,
      rewardsMinted: 2,
      rewardsCapped: 1,
      rewardsReversed: 0,
      recent: [{ referrer: 'Yusuf', referee: 'Amina', status: 'rewarded', code: 'THANKS-9', at: '2026-10-26T00:00:00Z' }],
    });
    assert.ok(overview);
    assert.equal(overview.codes, 4);
    assert.equal(overview.terms.rewardPercent, 20);
    assert.equal(overview.recent[0]!.referrer, 'Yusuf');
  });
});

describe('a code arriving from a shared link', () => {
  it('upper-cases and trims a real code', () => {
    assert.equal(cleanReferralCode('  aya-1a2b3c '), 'AYA-1A2B3C');
  });

  it('refuses anything that is not the shape the database mints', () => {
    assert.equal(cleanReferralCode('nope'), null);
    assert.equal(cleanReferralCode('AYA 1A2B3C'), null);
    assert.equal(cleanReferralCode('AYA-1A2B3C; DROP TABLE orders'), null);
    assert.equal(cleanReferralCode(''), null);
    assert.equal(cleanReferralCode(null), null);
    assert.equal(cleanReferralCode(undefined), null);
  });

  it('names the cookie once', () => {
    assert.equal(REFERRAL_COOKIE, 'ayahspring_referral');
  });
});

describe('the link and the message', () => {
  it('builds a link from the code alone', () => {
    assert.equal(referralLink('AYA-1A2B3C', 'https://ayahspring.example'), 'https://ayahspring.example/referral/AYA-1A2B3C');
    assert.equal(referralLink('AYA-1A2B3C', 'https://ayahspring.example/'), 'https://ayahspring.example/referral/AYA-1A2B3C');
    assert.equal(referralLink('AYA-1A2B3C'), '/referral/AYA-1A2B3C');
  });

  it('returns no link when there is no code', () => {
    assert.equal(referralLink(null), null);
    assert.equal(referralLink(''), null);
  });

  it('writes a message a person can paste', () => {
    const message = inviteMessage({
      code: 'AYA-1A2B3C',
      percent: 10,
      link: 'https://ayahspring.example/referral/AYA-1A2B3C',
      inviterName: 'Yusuf',
    });
    assert.match(message, /Yusuf invited you/);
    assert.match(message, /10% off your first course/);
    assert.match(message, /https:\/\/ayahspring\.example\/referral\/AYA-1A2B3C/);
  });

  it('does not promise money anywhere in the message', () => {
    const message = inviteMessage({ code: 'A', percent: 10, link: '/referral/A' });
    assert.doesNotMatch(message, /cash|paid to you|payout|wallet/i);
  });

  it('has nothing to say without a link', () => {
    assert.equal(inviteMessage({ code: null, percent: 10, link: null }), '');
  });
});

describe('what a status means to a person', () => {
  const now = at('2026-10-26T12:00:00Z');

  it('says a reward is waiting when it has not started', () => {
    const sentence = describeReward(
      {
        code: 'THANKS-1',
        status: 'rewarded',
        percent: 20,
        startsAt: '2026-10-29T12:00:00Z',
        earnedAt: '2026-10-26T00:00:00Z',
        endsAt: null,
        campaignStatus: 'active',
      },
      now,
    );
    assert.match(sentence, /usable from 29 Oct 2026/);
  });

  it('says when a live reward ends', () => {
    const sentence = describeReward(
      {
        code: 'THANKS-1',
        status: 'rewarded',
        percent: 20,
        startsAt: '2026-10-20T12:00:00Z',
        earnedAt: '2026-10-17T00:00:00Z',
        endsAt: '2027-01-18T12:00:00Z',
        campaignStatus: 'active',
      },
      now,
    );
    assert.match(sentence, /use it by 18 Jan 2027/);
  });

  it('explains a withdrawn reward instead of hiding it', () => {
    const sentence = describeReward(
      {
        code: 'THANKS-1',
        status: 'reversed',
        percent: 20,
        startsAt: null,
        earnedAt: null,
        endsAt: null,
        campaignStatus: 'archived',
      },
      now,
    );
    assert.match(sentence, /refunded/);
  });

  it('says plainly when the yearly limit stopped a reward', () => {
    const sentence = describeReward(
      {
        code: null,
        status: 'capped',
        percent: null,
        startsAt: null,
        earnedAt: null,
        endsAt: null,
        campaignStatus: null,
      },
      now,
    );
    assert.match(sentence, /yearly limit/);
  });

  it('describes who joined without saying more than that', () => {
    assert.equal(describePerson({ name: 'Amina', status: 'pending', joinedAt: null }), 'Started a purchase');
    assert.equal(describePerson({ name: 'Amina', status: 'rewarded', joinedAt: null }), 'Bought a course');
  });
});

describe('whether a reward can be used now', () => {
  const now = at('2026-10-26T12:00:00Z');
  const base = {
    code: 'THANKS-1',
    status: 'rewarded',
    percent: 20,
    startsAt: null,
    earnedAt: null,
    endsAt: null,
    campaignStatus: 'active',
  };

  it('is live when nothing says otherwise', () => {
    assert.equal(rewardIsLive(base, now), true);
  });

  it('is not live before its start', () => {
    assert.equal(rewardIsLive({ ...base, startsAt: '2026-10-29T00:00:00Z' }, now), false);
  });

  it('is not live after its end', () => {
    assert.equal(rewardIsLive({ ...base, endsAt: '2026-10-25T00:00:00Z' }, now), false);
  });

  it('is not live when the campaign is archived or the reward withdrawn', () => {
    assert.equal(rewardIsLive({ ...base, campaignStatus: 'archived' }, now), false);
    assert.equal(rewardIsLive({ ...base, status: 'reversed' }, now), false);
  });

  it('is not live without a code', () => {
    assert.equal(rewardIsLive({ ...base, code: null }, now), false);
  });
});

describe('the sentence the screens have to carry', () => {
  it('says both rewards are discounts, not money', () => {
    assert.match(REFERRAL_HONESTY, /discounts on a course, not money/);
    assert.match(REFERRAL_HONESTY, /Nothing is paid out/);
  });

  it('turns a closed programme into a useful sentence', () => {
    assert.match(referralLookupError('inviting friends is not switched on for this platform yet'), /not open yet/);
    assert.match(referralLookupError('something else broke'), /could not be read/);
  });
});
