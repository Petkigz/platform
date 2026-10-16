import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Putting a course on sale.
 *
 * products, prices and product_course_versions all had zero rows and no writer,
 * so the whole revenue path was dead: no product, no price, nothing to buy, no
 * order, no revenue. checkout.ts and enrolment.ts were both reading tables
 * nothing could ever fill.
 *
 * WHO DOES WHAT — settled by the existing policies, not chosen here
 * ----------------------------------------------------------------
 *   products_insert  = created_by = current_user_id()   a teacher owns it
 *   pcv_write        = the product's owner              they attach their course
 *   prices_write     = is_privileged(current_user_id())  staff set the price
 *
 * So a teacher creates the product and attaches their own published course to
 * it. Pricing and putting it on sale are staff actions. That split is a decision
 * about the marketplace being behind a gate, and it is recorded in DECISIONS.md
 * rather than buried in a helper.
 *
 * Nothing on this page sends an amount from the client. The price lives in the
 * database, and checkout resolves a price id rather than trusting a figure.
 */

export const PRODUCT_TYPES = [
  'course',
  'learning_path',
  'bundle',
  'private_tutoring',
  'certificate_exam',
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  course: 'Course',
  learning_path: 'Learning path',
  bundle: 'Bundle',
  private_tutoring: 'Private tutoring',
  certificate_exam: 'Certificate exam',
};

export type ProductStatus = 'draft' | 'active' | 'retired';

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: 'Not on sale',
  active: 'On sale',
  retired: 'Retired',
};

export type SellableVersion = {
  courseId: string;
  versionId: string;
  courseTitle: string;
  versionNumber: number;
};

export type AuthoredProduct = {
  id: string;
  name: string;
  productType: ProductType;
  status: ProductStatus;
  linkedVersions: SellableVersion[];
  hasActivePrice: boolean;
};

/**
 * The caller's products, with what each one is attached to.
 *
 * The SELECT policy narrows this to what the caller may see, so no filter here:
 * adding one would be re-deciding something RLS already decided, and a second
 * weaker copy of an authorisation rule is how the two drift apart.
 */
export async function fetchProducts(
  client: SupabaseClient,
): Promise<AuthoredProduct[]> {
  const { data, error } = await client
    .from('products')
    .select('id, name, product_type, status')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    name: string;
    product_type: string;
    status: string;
  };
  const rows = (data ?? []) as unknown as Row[];
  const ids = rows.map((r) => r.id);

  // Both follow-ups are batched, because a product list is exactly the shape
  // where an N+1 shows up.
  const [{ data: links, error: lErr }, { data: prices, error: pErr }] =
    await Promise.all([
      client
        .from('product_course_versions')
        .select(
          'product_id, course_id, course_version_id, courses ( id, title ), course_versions ( id, version_number )',
        )
        .in('product_id', ids),
      client
        .from('prices')
        .select('product_id, status, effective_until')
        .in('product_id', ids)
        .eq('status', 'active')
        .is('effective_until', null),
    ]);

  if (lErr) throw new Error(lErr.message);
  if (pErr) throw new Error(pErr.message);

  type LinkRow = {
    product_id: string;
    course_id: string;
    course_version_id: string;
    courses: { id: string; title: string } | null;
    course_versions: { id: string; version_number: number } | null;
  };
  const linkRows = (links ?? []) as unknown as LinkRow[];

  const priced = new Set(
    ((prices ?? []) as unknown as { product_id: string }[]).map((p) =>
      String(p.product_id),
    ),
  );

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    productType: r.product_type as ProductType,
    status: r.status as ProductStatus,
    linkedVersions: linkRows
      .filter((l) => String(l.product_id) === String(r.id))
      .map((l) => ({
        courseId: String(l.course_id),
        versionId: String(l.course_version_id),
        courseTitle: l.courses?.title ?? 'Untitled course',
        versionNumber: Number(l.course_versions?.version_number ?? 0),
      })),
    hasActivePrice: priced.has(String(r.id)),
  }));
}

/**
 * Published versions the caller could sell.
 *
 * Only published versions are offered, because `link_product_course_version()`
 * refuses anything else. Showing a draft here would be inviting a click that is
 * guaranteed to fail.
 */
export async function fetchSellableVersions(
  client: SupabaseClient,
): Promise<SellableVersion[]> {
  const { data, error } = await client
    .from('course_versions')
    .select('id, course_id, version_number, courses ( id, title )')
    .eq('version_status', 'published')
    .order('version_number', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    course_id: string;
    version_number: number;
    courses: { id: string; title: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((v) => ({
    courseId: String(v.course_id),
    versionId: String(v.id),
    courseTitle: v.courses?.title ?? 'Untitled course',
    versionNumber: Number(v.version_number),
  }));
}

// ---------------------------------------------------------------------------
// Creating and attaching
// ---------------------------------------------------------------------------

export type CreateProductInput = {
  name: string;
  productType?: ProductType;
  description?: string;
};

export type CreateProductResult =
  | { ok: true; productId: string }
  | { ok: false; message: string };

export function validateCreateProduct(
  input: CreateProductInput,
): CreateProductResult {
  const name = input.name.trim();

  if (name.length === 0) return { ok: false, message: 'Give the product a name.' };
  if (name.length > 200)
    return { ok: false, message: 'Keep the name under 200 characters.' };

  const type = input.productType ?? 'course';
  if (!PRODUCT_TYPES.includes(type))
    return { ok: false, message: 'That is not a kind of product we support.' };

  return { ok: true, productId: '' };
}

export async function createProduct(
  client: SupabaseClient,
  input: CreateProductInput,
): Promise<CreateProductResult> {
  const check = validateCreateProduct(input);
  if (!check.ok) return check;

  const { data, error } = await client.rpc('create_product', {
    p_name: input.name.trim(),
    p_product_type: input.productType ?? 'course',
    p_description: input.description?.trim() || null,
  });

  if (error) {
    const m = error.message;
    if (/needs a name/i.test(m))
      return { ok: false, message: 'Give the product a name.' };
    if (/unsupported product type/i.test(m))
      return { ok: false, message: 'That is not a kind of product we support.' };
    if (/under 200 characters/i.test(m))
      return { ok: false, message: 'Keep the name under 200 characters.' };
    return { ok: false, message: m };
  }

  return { ok: true, productId: data === null ? '' : String(data) };
}

export type AttachVersionResult = { ok: true } | { ok: false; message: string };

/**
 * Attach a published course version to a product.
 *
 * The database refuses a version that is not published. A draft has never been
 * reviewed, and selling one would put paid-for content on the platform that the
 * scholarly gate has not seen.
 */
export async function attachCourseVersion(
  client: SupabaseClient,
  input: { productId: string; courseId: string; versionId: string },
): Promise<AttachVersionResult> {
  if (!input.productId) return { ok: false, message: 'That product is missing.' };
  if (!input.courseId || !input.versionId)
    return { ok: false, message: 'Pick a course version to attach.' };

  const { error } = await client.rpc('link_product_course_version', {
    p_product_id: input.productId,
    p_course_id: input.courseId,
    p_version_id: input.versionId,
  });

  if (error) {
    const m = error.message;
    if (/only a published version can be sold/i.test(m))
      return {
        ok: false,
        message:
          'Only a published version can be sold. Submit it for review first.',
      };
    if (/only attach courses to your own product/i.test(m))
      return { ok: false, message: 'That product is not yours.' };
    if (/is not part of course/i.test(m))
      return { ok: false, message: 'That version does not belong to that course.' };
    if (/not found/i.test(m))
      return { ok: false, message: 'That product no longer exists.' };
    return { ok: false, message: m };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Staff actions
// ---------------------------------------------------------------------------

export type SetPriceInput = {
  productId: string;
  amountMinor: number;
  currencyCode: string;
  billingInterval?: 'week' | 'month' | 'quarter' | 'year' | 'one_time';
  market?: string | null;
};

export type SetPriceResult =
  | { ok: true; priceId: string }
  | { ok: false; message: string };

/**
 * Staff-only validation for a price.
 *
 * Money is an integer number of minor units all the way to the column, so a
 * fractional amount is refused here rather than being rounded on the way in.
 */
export function validateSetPrice(input: SetPriceInput): SetPriceResult {
  if (!input.productId) return { ok: false, message: 'That product is missing.' };

  if (
    !Number.isFinite(input.amountMinor) ||
    !Number.isInteger(input.amountMinor) ||
    input.amountMinor < 0
  )
    return {
      ok: false,
      message: 'A price is a whole number of minor units, and cannot be negative.',
    };

  if (!/^[A-Z]{3}$/.test(input.currencyCode))
    return {
      ok: false,
      message: 'The currency must be a three-letter uppercase ISO code, like USD.',
    };

  const interval = input.billingInterval ?? 'one_time';
  if (!['week', 'month', 'quarter', 'year', 'one_time'].includes(interval))
    return { ok: false, message: 'That is not a billing interval we support.' };

  if (input.market !== undefined && input.market !== null) {
    if (!/^[A-Z]{2}$/.test(input.market))
      return {
        ok: false,
        message: 'The market must be a two-letter uppercase country code, like UG.',
      };
  }

  return { ok: true, priceId: '' };
}

/**
 * Set a price. Staff only — the database enforces it, and so does this, so the
 * teacher sees a sentence instead of a permission error.
 */
export async function setProductPrice(
  client: SupabaseClient,
  input: SetPriceInput,
): Promise<SetPriceResult> {
  const check = validateSetPrice(input);
  if (!check.ok) return check;

  const { data, error } = await client.rpc('set_product_price', {
    p_product_id: input.productId,
    p_amount_minor: input.amountMinor,
    p_currency_code: input.currencyCode,
    p_billing_interval: input.billingInterval ?? 'one_time',
    p_market: input.market ?? null,
  });

  if (error) {
    const m = error.message;
    if (/only staff may set a price/i.test(m))
      return { ok: false, message: 'Only staff can set a price.' };
    if (/three-letter uppercase ISO code/i.test(m))
      return {
        ok: false,
        message: 'The currency must be a three-letter uppercase ISO code, like USD.',
      };
    if (/two-letter uppercase country code/i.test(m))
      return {
        ok: false,
        message: 'The market must be a two-letter uppercase country code, like UG.',
      };
    if (/cannot be negative/i.test(m))
      return { ok: false, message: 'A price cannot be negative.' };
    if (/not found/i.test(m))
      return { ok: false, message: 'That product no longer exists.' };
    return { ok: false, message: m };
  }

  return { ok: true, priceId: data === null ? '' : String(data) };
}

export type ActivateResult = { ok: true } | { ok: false; message: string };

/**
 * Put a product on sale. Staff only, and it requires both a course and a price,
 * so nothing can be listed that has no content or no price.
 */
export async function activateProduct(
  client: SupabaseClient,
  productId: string,
): Promise<ActivateResult> {
  if (!productId) return { ok: false, message: 'That product is missing.' };

  const { error } = await client.rpc('activate_product', {
    p_product_id: productId,
  });

  if (error) {
    const m = error.message;
    if (/needs a course attached/i.test(m))
      return { ok: false, message: 'Attach a published course before selling it.' };
    if (/needs an active price/i.test(m))
      return { ok: false, message: 'Set a price before selling it.' };
    if (/only staff may put a product on sale/i.test(m))
      return { ok: false, message: 'Only staff can put a product on sale.' };
    if (/not found/i.test(m))
      return { ok: false, message: 'That product no longer exists.' };
    return { ok: false, message: m };
  }

  return { ok: true };
}

export type RetireResult = { ok: true } | { ok: false; message: string };

/** Retire a product. Soft delete per D7 — orders referencing it still resolve. */
export async function retireProduct(
  client: SupabaseClient,
  productId: string,
): Promise<RetireResult> {
  if (!productId) return { ok: false, message: 'That product is missing.' };

  const { error } = await client.rpc('retire_product', { p_product_id: productId });

  if (error) {
    const m = error.message;
    if (/only retire your own product/i.test(m))
      return { ok: false, message: 'That product is not yours.' };
    return { ok: false, message: m };
  }

  return { ok: true };
}
