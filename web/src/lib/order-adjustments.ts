/**
 * Adjusting an order before it is paid.
 *
 * The database owns every rule that matters — who may adjust an order, what a
 * type implies about its direction, that a paid order's total is history, that
 * the columns have to agree with the rows. `add_order_adjustment()` and
 * `void_order_adjustment()` refuse, and `orders_parts_agree` refuses again when
 * the order is about to be paid.
 *
 * What is left here is the part that only the browser can do: not sending
 * something the writer would refuse, saying why in words a finance admin can
 * act on, and rendering money exactly. Validation here is a courtesy and a
 * better error message; it is never the rule.
 *
 * Amounts are decimal integer strings end to end. `bigint` is what the money
 * path carries, and the one place a total is allowed to become a JavaScript
 * number is a display string produced by `format()`.
 */

export const REASON_MAX = 500;
/** A positive whole amount in minor units. No sign, no decimals, no leading zero. */
export const AMOUNT_RE = /^[1-9][0-9]*$/;
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** The most orders the reader will return, and the most it is asked for. */
export const QUEUE_LIMIT_MAX = 200;

export type AdjustmentDirection = 'debit' | 'credit';

export type AdjustmentTypeOption = {
  value: string;
  label: string;
  /** Null only for `rounding`, which genuinely goes either way and asks. */
  direction: AdjustmentDirection | null;
  /** What the recorder is being told before they choose it. */
  explains: string;
};

/**
 * The types the writer accepts, and where each one lands.
 *
 * `promotion` is absent on purpose: the writer refuses it because
 * `oa_promotion_agrees` needs a redemption id and nothing can write one until
 * the promotions policy is decided. Offering it in a dropdown would offer a
 * button that always fails.
 */
export const ADJUSTMENT_TYPES: AdjustmentTypeOption[] = [
  {
    value: 'manual_discount',
    label: 'Discount',
    direction: 'credit',
    explains: 'Reduces the total. Comes off the platform, not the teacher: earnings are accrued from the order lines.',
  },
  {
    value: 'tax',
    label: 'Tax',
    direction: 'debit',
    explains: 'Adds tax to the total. Shown separately on the invoice because tax may have to be remitted.',
  },
  {
    value: 'fee',
    label: 'Fee',
    direction: 'debit',
    explains: 'Adds a provider or handling charge. Kept by the platform; not part of what the teacher earns.',
  },
  {
    value: 'shipping',
    label: 'Shipping',
    direction: 'debit',
    explains: 'Adds a delivery charge, for a posted certificate. Totals with fees.',
  },
  {
    value: 'rounding',
    label: 'Rounding',
    direction: null,
    explains: 'Moves the total to a round figure. The only type that can go either way, so it asks which.',
  },
];

export const ADJUSTMENT_TYPE_VALUES = ADJUSTMENT_TYPES.map((t) => t.value);

/** Labels for the types that exist in the database, including refused ones. */
export const ADJUSTMENT_LABEL: Record<string, string> = {
  manual_discount: 'Discount',
  promotion: 'Promotion',
  tax: 'Tax',
  fee: 'Fee',
  shipping: 'Shipping',
  rounding: 'Rounding',
};

export type AdjustmentErrorCode = 'invalid' | 'forbidden' | 'conflict' | 'error';

export type AdjustmentFailure = {
  ok: false;
  code: AdjustmentErrorCode;
  message: string;
};

export type AdjustmentOutcome<T> = { ok: true; value: T } | AdjustmentFailure;

export type AdjustmentInput = {
  orderId: string;
  adjustmentType: string;
  amountMinor: string;
  /** Required for `rounding`, and refused if it contradicts any other type. */
  direction: AdjustmentDirection | null;
  reason: string;
  orderItemId: string | null;
};

export type VoidInput = {
  adjustmentId: string;
  reason: string;
};

const trim = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** The direction a type implies, or null for the one type that asks. */
export function directionForType(type: string): AdjustmentDirection | null {
  const found = ADJUSTMENT_TYPES.find((t) => t.value === type);
  return found ? found.direction : null;
}

export function validateAdjustmentInput(input: {
  orderId?: unknown;
  adjustmentType?: unknown;
  amountMinor?: unknown;
  direction?: unknown;
  reason?: unknown;
  orderItemId?: unknown;
}): AdjustmentOutcome<AdjustmentInput> {
  const orderId = trim(input.orderId);
  if (!UUID_RE.test(orderId)) {
    return { ok: false, code: 'invalid', message: 'Which order is being adjusted?' };
  }

  const adjustmentType = trim(input.adjustmentType);
  if (!ADJUSTMENT_TYPE_VALUES.includes(adjustmentType)) {
    return {
      ok: false,
      code: 'invalid',
      message: adjustmentType === 'promotion'
        ? 'Promotions are not recorded yet: the promotions policy is undecided.'
        : 'Choose a supported adjustment type.',
    };
  }

  const amountMinor = trim(input.amountMinor);
  if (!AMOUNT_RE.test(amountMinor)) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Enter a positive whole amount in minor units. The direction is chosen by the type, not by a sign.',
    };
  }

  const implied = directionForType(adjustmentType);
  const asked = trim(input.direction);
  let direction: AdjustmentDirection | null = null;
  if (implied === null) {
    if (asked !== 'debit' && asked !== 'credit') {
      return {
        ok: false,
        code: 'invalid',
        message: 'A rounding adjustment needs a direction: does it add to the total or take from it?',
      };
    }
    direction = asked;
  } else if (asked.length > 0 && asked !== implied) {
    return {
      ok: false,
      code: 'invalid',
      message: `A ${ADJUSTMENT_LABEL[adjustmentType] ?? adjustmentType} is always a ${implied}.`,
    };
  }

  const reason = trim(input.reason);
  if (reason.length === 0) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Give a written reason. An adjustment nobody can explain is an adjustment nobody can defend.',
    };
  }
  if (reason.length > REASON_MAX) {
    return {
      ok: false,
      code: 'invalid',
      message: `The reason must be ${REASON_MAX} characters or fewer.`,
    };
  }

  const orderItemId = trim(input.orderItemId);
  if (orderItemId.length > 0 && !UUID_RE.test(orderItemId)) {
    return { ok: false, code: 'invalid', message: 'That line item id is not valid.' };
  }

  return {
    ok: true,
    value: {
      orderId,
      adjustmentType,
      amountMinor,
      direction,
      reason,
      orderItemId: orderItemId.length > 0 ? orderItemId : null,
    },
  };
}

export function validateVoidInput(input: {
  adjustmentId?: unknown;
  reason?: unknown;
}): AdjustmentOutcome<VoidInput> {
  const adjustmentId = trim(input.adjustmentId);
  if (!UUID_RE.test(adjustmentId)) {
    return { ok: false, code: 'invalid', message: 'Which adjustment is being withdrawn?' };
  }
  const reason = trim(input.reason);
  if (reason.length === 0) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Say why it is being withdrawn. The row stays readable, so the reason stays with it.',
    };
  }
  if (reason.length > REASON_MAX) {
    return {
      ok: false,
      code: 'invalid',
      message: `The reason must be ${REASON_MAX} characters or fewer.`,
    };
  }
  return { ok: true, value: { adjustmentId, reason } };
}

// ---------------------------------------------------------------------------
// Reading the queue
// ---------------------------------------------------------------------------

export type QueueItem = {
  itemId: string;
  title: string | null;
  lineTotalMinor: string;
};

export type QueueAdjustment = {
  adjustmentId: string;
  adjustmentType: string;
  direction: AdjustmentDirection;
  amountMinor: string;
  currencyCode: string;
  description: string | null;
  voidedAt: string | null;
  voidedReason: string | null;
  createdAt: string | null;
};

export type QueueOrder = {
  orderId: string;
  status: string;
  createdAt: string | null;
  billingAccountName: string | null;
  currencyCode: string;
  subtotalMinor: string;
  discountMinor: string;
  taxMinor: string;
  feeMinor: string;
  totalMinor: string;
  items: QueueItem[];
  adjustments: QueueAdjustment[];
};

export type OrdersOverview = {
  orders: QueueOrder[];
  count: number;
  limit: number;
};

const text = (v: unknown): string | null => (typeof v === 'string' ? v : null);
/** A money field: absent, null and 0 are all zero, but it stays a string. */
const minor = (v: unknown): string => {
  if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
  return '0';
};
const rows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Record<string, unknown>[]) : [];

export function normaliseQueueAdjustment(raw: Record<string, unknown>): QueueAdjustment | null {
  const adjustmentId = text(raw.adjustmentId);
  if (!adjustmentId) return null;
  return {
    adjustmentId,
    adjustmentType: text(raw.adjustmentType) ?? 'other',
    direction: raw.direction === 'credit' ? 'credit' : 'debit',
    amountMinor: minor(raw.amountMinor),
    currencyCode: text(raw.currencyCode) ?? '',
    description: text(raw.description),
    voidedAt: text(raw.voidedAt),
    voidedReason: text(raw.voidedReason),
    createdAt: text(raw.createdAt),
  };
}

export function normaliseQueueOrder(raw: Record<string, unknown>): QueueOrder | null {
  const orderId = text(raw.orderId);
  const currencyCode = text(raw.currencyCode);
  // An order with no id or no currency cannot be rendered as money, and
  // guessing a currency is how a total becomes a wrong number rather than a
  // missing one.
  if (!orderId || !currencyCode) return null;
  return {
    orderId,
    status: text(raw.status) ?? 'unknown',
    createdAt: text(raw.createdAt),
    billingAccountName: text(raw.billingAccountName),
    currencyCode,
    subtotalMinor: minor(raw.subtotalMinor),
    discountMinor: minor(raw.discountMinor),
    taxMinor: minor(raw.taxMinor),
    feeMinor: minor(raw.feeMinor),
    totalMinor: minor(raw.totalMinor),
    items: rows(raw.items)
      .map((item) => ({
        itemId: text(item.itemId) ?? '',
        title: text(item.title),
        lineTotalMinor: minor(item.lineTotalMinor),
      }))
      .filter((item) => item.itemId.length > 0),
    adjustments: rows(raw.adjustments)
      .map(normaliseQueueAdjustment)
      .filter((a): a is QueueAdjustment => a !== null),
  };
}

/**
 * Parse the reader's jsonb.
 *
 * Defensive on purpose: `count` is recomputed from the array rather than
 * trusted, because a reader that returns a count and a list that disagree is
 * worse than either alone.
 */
export function normaliseOrdersOverview(raw: unknown): OrdersOverview {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const orders = rows(source.orders)
    .map(normaliseQueueOrder)
    .filter((o): o is QueueOrder => o !== null);
  const limit = typeof source.limit === 'number' && Number.isFinite(source.limit)
    ? Math.trunc(source.limit)
    : 50;
  return { orders, count: orders.length, limit };
}

export type QueueCurrencyTotal = {
  currencyCode: string;
  orders: number;
  totalMinor: string;
};

/**
 * What the queue is worth, per currency.
 *
 * Never one number. Orders on this platform are in whatever currency a family
 * has, and adding a UGX total to a USD total produces a figure that looks like
 * money and is not — the same mistake the money report was built to avoid.
 */
export function summariseQueue(orders: QueueOrder[]): QueueCurrencyTotal[] {
  const byCode = new Map<string, { orders: number; total: bigint }>();
  for (const order of orders) {
    const code = order.currencyCode.trim().toUpperCase();
    const current = byCode.get(code) ?? { orders: 0, total: 0n };
    let amount = 0n;
    try {
      amount = BigInt(order.totalMinor);
    } catch {
      amount = 0n;
    }
    byCode.set(code, { orders: current.orders + 1, total: current.total + amount });
  }
  return [...byCode.entries()]
    .map(([currencyCode, v]) => ({
      currencyCode,
      orders: v.orders,
      totalMinor: v.total.toString(),
    }))
    .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
}

/** True when a row can still be adjusted, which is the whole point of the queue. */
export function isAdjustable(order: QueueOrder): boolean {
  return order.status === 'draft'
    || order.status === 'pending_payment'
    || order.status === 'awaiting_confirmation';
}

/**
 * Turn the writer's refusal into a status and a sentence.
 *
 * Matched on what the writer actually says rather than on a code, because
 * plpgsql raises prose and PostgREST passes it through. Each pattern here is a
 * refusal the writer is tested for, so a change to the wording on either side
 * fails a test rather than silently becoming a 400.
 */
export function mapOrderAdjustmentError(message: string): {
  code: AdjustmentErrorCode;
  status: number;
  message: string;
} {
  const text = message || 'The adjustment could not be recorded.';
  if (/only a finance admin or platform admin/i.test(text)) {
    return { code: 'forbidden', status: 403, message: text };
  }
  if (/sign in to/i.test(text)) {
    return { code: 'forbidden', status: 401, message: text };
  }
  if (/does not exist/i.test(text)) {
    return { code: 'conflict', status: 404, message: text };
  }
  if (/already voided|its total is history/i.test(text)) {
    return { code: 'conflict', status: 409, message: text };
  }
  if (/not on this order|promotions policy is undecided|below zero/i.test(text)) {
    return { code: 'conflict', status: 409, message: text };
  }
  if (/unknown adjustment type|needs a direction|always a|written reason|500 characters|positive whole amount/i.test(text)) {
    return { code: 'invalid', status: 400, message: text };
  }
  return { code: 'error', status: 400, message: text };
}
