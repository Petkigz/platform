/**
 * Provider resolution.
 *
 * One place decides which providers are live, so no component ever imports an
 * adapter directly. Adding a provider means writing one file and adding it to
 * `BUILTIN` below; nothing else changes, which is the point of P11.
 *
 * TWO THINGS THIS MODULE DECIDES
 *
 * **Which providers exist** — registered here, in code. Deliberately includes
 * only providers with a real adapter. `stripe`, `paypal`, `flutterwave` and
 * `pesapal` are named in the database's own CHECK constraint on
 * `payment_provider_accounts`, so the schema already anticipates them; they are
 * not registered here because registering a provider with no adapter would make
 * the checkout page offer a button that cannot work.
 *
 * **Which providers are usable right now** — decided by configuration. A
 * registered provider with no credentials is `available === false`, so it can be
 * shipped in code today and switched on by setting environment variables, with
 * no deployment of new code. That is how the ones that are not built yet get
 * turned on later: write the adapter, register it, set the credentials.
 *
 * More than one provider can be live at once. That is not an accident of the
 * design — a learner in Kampala wants MTN or Airtel, and a learner outside East
 * Africa will eventually want a card provider. A registry that can only hold one
 * would force a choice the product does not need to make.
 */

import {
  PaymentProviderUnavailableError,
  UnconfiguredPaymentProvider,
  type PaymentProvider,
  type ProviderId,
} from './provider.ts';
import { MtnMomoProvider, mtnMomoConfigFromEnv } from './mtn-momo.ts';
import { AirtelMoneyProvider, airtelConfigFromEnv } from './airtel.ts';

type Factory = () => PaymentProvider;

/**
 * Every adapter that exists, in the order they should be offered when the
 * caller has no preference. Order matters: it is the order a learner sees.
 */
const BUILTIN: Record<ProviderId, Factory> = {
  mtn_momo: () => new MtnMomoProvider(mtnMomoConfigFromEnv()),
  airtel_money: () => new AirtelMoneyProvider(airtelConfigFromEnv()),
};

/** Extra adapters registered at runtime, e.g. by a plugin or a test. */
const ADAPTERS = new Map<ProviderId, Factory>();

export function registerPaymentProvider(id: ProviderId, factory: Factory): void {
  ADAPTERS.set(id, factory);
}

function factoryFor(id: ProviderId): Factory | null {
  return ADAPTERS.get(id) ?? BUILTIN[id] ?? null;
}

export function knownProviderIds(): ProviderId[] {
  return [...new Set([...Object.keys(BUILTIN), ...ADAPTERS.keys()])];
}

/**
 * Providers that are configured and usable.
 *
 * This is what the checkout page should render. It is not the same as
 * `knownProviderIds()`, which includes providers that exist in code but have no
 * credentials — offering those would be offering a dead end.
 */
export function availableProviders(): PaymentProvider[] {
  return knownProviderIds()
    .map((id) => factoryFor(id)?.())
    .filter((p): p is PaymentProvider => Boolean(p) && (p as PaymentProvider).available);
}

/**
 * A specific provider by id.
 *
 * Always returns something, so callers do not branch on null; check
 * `provider.available` before offering checkout. An id that is not registered
 * returns the unconfigured provider, which fails loudly and with a sentence
 * rather than throwing at an unexpected moment.
 */
export function getPaymentProvider(id?: ProviderId): PaymentProvider {
  if (id) {
    const factory = factoryFor(id);
    return factory ? factory() : new UnconfiguredPaymentProvider();
  }

  // No id given: honour PAYMENT_PROVIDER if it names a real adapter, otherwise
  // fall back to the first available one. The env var is an override for
  // deployments that want to pin a single provider, not a requirement.
  const pinned = process.env.PAYMENT_PROVIDER?.trim();
  if (pinned) return getPaymentProvider(pinned);

  return availableProviders()[0] ?? new UnconfiguredPaymentProvider();
}

export function configuredProviderId(): ProviderId | null {
  const id = process.env.PAYMENT_PROVIDER?.trim();
  if (id && factoryFor(id)) return id;
  return availableProviders()[0]?.id ?? null;
}

/**
 * For the checkout path, where "not available" must stop the flow rather than
 * render a button that cannot work.
 */
export function requirePaymentProvider(id?: ProviderId): PaymentProvider {
  const provider = getPaymentProvider(id);
  if (!provider.available) throw new PaymentProviderUnavailableError(provider.id);
  return provider;
}
