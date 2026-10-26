/**
 * Which shelf a sellable feature needs.
 *
 * The rule used to be a CASE statement in SQL: offline downloads needed Plus,
 * and changing that needed a developer. It is a table now, edited on
 * /admin/plans — because the owner decides what the VIP package contains, and
 * "ask a developer to change a constant" is not a decision anybody can make.
 *
 * The rule the screen has to explain is one-directional: a feature may always
 * move **down** to Basic, but moving it **up** to Plus is refused while a Basic
 * plan is still handing it out — otherwise the catalogue would say "Plus only"
 * while a Basic plan kept giving it away.
 */

export type PlanTier = 'basic' | 'plus';

export type FeatureTierRule = {
  featureCode: string;
  minTier: PlanTier;
  /** Plans on the Basic shelf whose terms still grant this feature. */
  blockingPlans: string | null;
};

/** What a person reads instead of a database code. */
export function featureLabel(code: string): string {
  if (code === 'offline_downloads') return 'Offline downloads';
  // Any future code has no label yet. Showing the code is honest; inventing a
  // title-case version of it would be a guess printed as a name.
  return code;
}

/**
 * Whether the save button should be offered at all.
 *
 * A choice that the database is going to refuse is shown as refused *before*
 * the click, with the reason next to it. This is the same courtesy the family
 * seat rule gets: a refusal a screen could have predicted is a surprise, and a
 * surprise is what makes people distrust the button that did work.
 */
export function tierChangeBlocked(row: FeatureTierRule, nextTier: PlanTier): string | null {
  if (nextTier !== 'plus' || row.minTier === 'plus') return null;
  if (!row.blockingPlans) return null;

  const plans = row.blockingPlans.split(',').map((p) => p.trim()).filter(Boolean);
  const named = plans.length === 1 ? `plan ${plans[0]}` : `plans ${plans.join(', ')}`;

  return `A Basic ${named} already grants ${featureLabel(row.featureCode).toLowerCase()}. Move that plan to Plus, or remove the feature from its terms, before requiring Plus for everybody.`;
}

/** One line under the row, saying what the current rule means in practice. */
export function tierRuleExplanation(row: FeatureTierRule): string {
  const feature = featureLabel(row.featureCode).toLowerCase();
  if (row.minTier === 'plus') {
    return `Only a Plus plan can carry ${feature}. A Basic plan that tries to add it is refused.`;
  }
  if (row.blockingPlans) {
    return `Any plan may carry ${feature} today. Moving the requirement to Plus would be refused while ${row.blockingPlans} still grants it.`;
  }
  return `Any plan may carry ${feature}. Nothing restricts it to Plus.`;
}

/** The outcome line after a save, in the words of the person who made it. */
export function tierSavedMessage(result: {
  featureCode: string;
  minTier: PlanTier;
  changed: boolean;
}): string {
  const feature = featureLabel(result.featureCode).toLowerCase();
  if (!result.changed) return `${capitalise(feature)} already needed ${label(result.minTier)}.`;
  return `${capitalise(feature)} now needs ${label(result.minTier)}.`;
}

function label(tier: PlanTier): string {
  return tier === 'plus' ? 'Plus' : 'Basic';
}

function capitalise(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

/** The tiers a person can choose between, in the order the form shows them. */
export const TIER_CHOICES: { value: PlanTier; label: string }[] = [
  { value: 'basic', label: 'Basic — any plan may carry it' },
  { value: 'plus', label: 'Plus — the VIP shelf only' },
];
