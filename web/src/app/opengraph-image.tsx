import { ImageResponse } from 'next/og';

import { markSvg } from '@/lib/brand';

/**
 * The card a link becomes when this site is shared.
 *
 * Without one, a link posted in WhatsApp or pasted into a chat renders as a
 * bare URL — no title, no image — and for a product whose first contact with
 * most people is a forwarded message, that is the first impression.
 *
 * It is drawn from the same geometry as the favicon and the header (the star
 * comes from `lib/brand.ts` as an SVG data URI, because the card is rendered by
 * a layout engine rather than a browser), and it says only what is settled:
 * the name, who it is for, and the subjects. No price, no learner count, no
 * testimonial — a card is a claim, and this one is only allowed to make claims
 * the product can keep.
 */

export const alt = 'AyahSpring — Islamic learning for children and adults, worldwide';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const star = `data:image/svg+xml;base64,${Buffer.from(
  markSvg({ size: 260 }).replace(/width="\d+" height="\d+"/, 'width="260" height="260"'),
).toString('base64')}`;

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: '64px 80px 56px',
          // A single hairline of green down the left edge: the card should be
          // recognisable in a chat list before a word of it is read.
          borderLeft: '14px solid #0b6b3a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 30,
                letterSpacing: 6,
                textTransform: 'uppercase',
                color: '#0b6b3a',
                fontWeight: 700,
              }}
            >
              AyahSpring
            </div>
            <div style={{ marginTop: 24, fontSize: 70, lineHeight: 1.1, color: '#063d22', letterSpacing: -1.5, maxWidth: 800 }}>
              Islamic learning for children and adults, worldwide.
            </div>
            <div style={{ marginTop: 28, fontSize: 29, lineHeight: 1.45, color: '#3f574b', maxWidth: 820 }}>
              Written by a teacher. Reviewed before it is listed. Frozen once it is published.
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={star} width={220} height={220} alt="" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 2, background: '#dfe8e2', width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, fontSize: 27, color: '#3f574b' }}>
            <span>Qur&rsquo;an &middot; Arabic &middot; Fiqh &middot; Hadith</span>
            <span style={{ color: '#6b7f75' }}>Browse without an account</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
