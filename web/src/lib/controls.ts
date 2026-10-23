/**
 * The controls screen's payload, as the page reads it.
 *
 * `platform_controls()` already filters by role in the database, so this file
 * does not decide who sees what — it only refuses a payload it cannot render.
 * An unknown `valueType` is treated as text with no bounds, which is the safe
 * degradation: the writer is still the thing that refuses a bad value.
 */

export type Control = {
  key: string;
  label: string;
  value: string;
  valueType: 'integer' | 'boolean' | 'text' | 'unknown';
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  allowedPrefix: string | null;
  note: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type ControlSet = {
  generatedAt: string;
  controls: Control[];
  totalControls: number;
  mineCount: number;
};

export class ControlError extends Error {}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function bound(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function parseControls(raw: unknown): ControlSet {
  if (!raw || typeof raw !== 'object') {
    throw new ControlError('the controls came back empty');
  }
  const payload = raw as Record<string, unknown>;
  if (!Array.isArray(payload.controls)) {
    throw new ControlError('the controls response has no list');
  }

  return {
    generatedAt: text(payload.generatedAt) ?? '',
    totalControls: bound(payload.totalControls) ?? 0,
    mineCount: bound(payload.mineCount) ?? 0,
    controls: payload.controls.map((rawControl, i) => {
      const c = (rawControl ?? {}) as Record<string, unknown>;
      const key = text(c.key);
      if (!key) throw new ControlError(`control ${i + 1} has no key`);
      const value = c.value;
      if (typeof value !== 'string') {
        throw new ControlError(`${key} has no value`);
      }
      const valueType = c.valueType === 'integer' || c.valueType === 'boolean'
        ? c.valueType
        : c.valueType === 'text' ? 'text' : 'unknown';
      return {
        key,
        label: text(c.label) ?? key,
        value,
        valueType,
        unit: text(c.unit),
        minValue: bound(c.minValue),
        maxValue: bound(c.maxValue),
        allowedPrefix: text(c.allowedPrefix),
        note: text(c.note) ?? '',
        updatedAt: text(c.updatedAt),
        updatedBy: text(c.updatedBy),
      } satisfies Control;
    }),
  };
}

/**
 * The bounds, said the way a person reads them.
 *
 * "1 to 10 devices" is a limit a person can hold in their head. "-2147483648 to
 * 2147483647" is a number that means "we did not think about this", and a screen
 * that printed it would be telling the truth about the wrong thing.
 */
export function describeBounds(control: Control): string {
  if (control.valueType === 'boolean') return 'On or off';
  if (control.valueType !== 'integer') {
    if (control.allowedPrefix) {
      return `Empty, or a value starting ${control.allowedPrefix}`;
    }
    return 'Text';
  }
  const unit = control.unit ? ` ${control.unit}` : '';
  if (control.minValue !== null && control.maxValue !== null) {
    return `${control.minValue} to ${control.maxValue}${unit}`;
  }
  return `A whole number${unit ? ` of${unit}` : ''}`;
}

/** Client-side mirror of the writer's bounds, so a typo costs no round trip. */
export function validateControlValue(control: Control, value: string): string | null {
  const trimmed = value.trim();

  if (control.valueType === 'boolean') {
    return trimmed === 'true' || trimmed === 'false'
      ? null
      : 'This is on or off.';
  }

  if (control.valueType === 'integer') {
    if (!/^-?\d+$/.test(trimmed)) return 'This takes a whole number.';
    const n = Number(trimmed);
    if (control.minValue !== null && n < control.minValue) {
      return `${control.minValue} is the lowest this can be.`;
    }
    if (control.maxValue !== null && n > control.maxValue) {
      return `${control.maxValue} is the highest this can be.`;
    }
    return null;
  }

  if (control.key === 'finance.reporting_currency') {
    return /^[A-Za-z]{3}$/.test(trimmed)
      ? null
      : 'A currency is a three-letter code, like USD.';
  }
  if (control.allowedPrefix && trimmed !== '' && !trimmed.toLowerCase().startsWith(control.allowedPrefix.toLowerCase())) {
    return `Leave this empty, or start it with ${control.allowedPrefix}.`;
  }
  return null;
}
