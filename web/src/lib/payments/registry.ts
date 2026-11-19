/**
 * Provider resolution.
 *
 * One place decides which providers are live, so no component ever imports an
 * adapter directly. Adding a provider means writing one file and adding it to
 * `SERVICES` below; nothing else changes, which is the point of P11.
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
 * design — a learner in Kampala wants MTN or Airtel, a learner in Nairobi wants
 * the Kenyan account of whichever service they use, and a learner elsewhere
 * will eventually want a card provider. A registry that can only hold one
 * would force a choice the product does not need to make.
 *
 * **Which countries.** Each service is configured country by country
 * (`markets.ts`): one set of credentials, one currency, one country's
 * numbers. Nothing here is live: no merchant account exists for any of them.
 */

import {
  PaymentProviderUnavailableError,
  UnconfiguredPaymentProvider,
  type PaymentProvider,
  type ProviderId,
} from './provider.ts';
import { MtnMomoProvider, mtnMomoConfigFromEnv } from './mtn-momo.ts';
import { AirtelMoneyProvider, airtelConfigFromEnv } from './airtel.ts';
import { PAWAPAY_CALLBACK_ID, PawaPayProvider, pawaPayConfigFromEnv } from './pawapay.ts';
import { AIRTEL_MARKETS, MTN_MOMO_MARKETS, PAWAPAY_BRANDS } from './markets.ts';
import type { Money } from '../money.ts';

type Factory = () => PaymentProvider;

/**
 * A service, the countries it can be configured for, and how to make its
 * provider for one of them (or, with no country, for the account named
 * without one).
 *
 * **A provider is a service in a country.** Its id is the service's, with the
 * country after it: `mtn_momo_gh`, `airtel_money_ke`. That id is what an
 * attempt is recorded under and what the service's callbacks are pointed at
 * (`/api/payments/webhook/mtn_momo_gh`), so a callback is always answered
 * with the credentials of the account it is about. The ids without a country,
 * `mtn_momo` and `airtel_money`, are the accounts named without one in the
 * environment; they are older than this and keep working.
 */
type Service = {
  countries: readonly string[];
  make: (country: string | undefined, id: ProviderId) => PaymentProvider;
  /**
   * The service that reaches the same operator with an account of its own.
   * Where that one is configured for a country, this one is not offered
   * there (`availableProviders`).
   */
  direct?: string;
};

/**
 * The operators reached through pawaPay, each as a service of its own:
 * `pawapay_mpesa` in `KE` is the provider `pawapay_mpesa_ke`. With no country
 * there is no operator, so the id without one names a provider that is never
 * available.
 *
 * `pawapay` itself, with no operator, is the provider pawaPay's one callback
 * address is answered by. It can ask what happened to a deposit and can start
 * nothing.
 */
const PAWAPAY_SERVICES: Record<string, Service> = {
  ...Object.fromEntries(
    Object.entries(PAWAPAY_BRANDS).map(([brand, known]): [string, Service] => [
      `pawapay_${brand}`,
      {
        countries: Object.keys(known.countries),
        make: (country, id) =>
          new PawaPayProvider(country === undefined ? null : pawaPayConfigFromEnv(brand, country), id),
        direct: known.direct,
      },
    ]),
  ),
  [PAWAPAY_CALLBACK_ID]: {
    countries: [],
    make: (_country, id) => new PawaPayProvider(pawaPayConfigFromEnv(), id),
  },
};

/** Every service with an adapter, in the order a payer is offered them. */
const SERVICES: Record<string, Service> = {
  mtn_momo: {
    countries: Object.keys(MTN_MOMO_MARKETS),
    make: (country, id) => new MtnMomoProvider(mtnMomoConfigFromEnv(country), id),
  },
  airtel_money: {
    countries: Object.keys(AIRTEL_MARKETS),
    make: (country, id) => new AirtelMoneyProvider(airtelConfigFromEnv(country), id),
  },
  // After the two direct services, so an account of this platform's own comes
  // first where both could take an order.
  ...PAWAPAY_SERVICES,
};

/** Extra adapters registered at runtime, e.g. by a plugin or a test. */
const ADAPTERS = new Map<ProviderId, Factory>();

export function registerPaymentProvider(id: ProviderId, factory: Factory): void {
  ADAPTERS.set(id, factory);
}

/** The service and country an id names, or null for an id nobody could have issued. */
function builtin(id: ProviderId): { service: Service; country: string | undefined } | null {
  const whole = SERVICES[id];
  if (whole) return { service: whole, country: undefined };
  const match = /^(.+)_([a-z]{2})$/u.exec(id);
  const service = match ? SERVICES[match[1]!] : undefined;
  const country = match?.[2]?.toUpperCase();
  if (!service || !country || !service.countries.includes(country)) return null;
  return { service, country };
}

function factoryFor(id: ProviderId): Factory | null {
  const registered = ADAPTERS.get(id);
  if (registered) return registered;
  const found = builtin(id);
  return found ? () => found.service.make(found.country, id) : null;
}

/**
 * Every id that names a provider: each service on its own, and each service
 * in each country it can be configured for. Most of them have no credentials.
 */
export function knownProviderIds(): ProviderId[] {
  const ids: ProviderId[] = [];
  for (const [name, service] of Object.entries(SERVICES)) {
    ids.push(name);
    for (const country of service.countries) ids.push(`${name}_${country.toLowerCase()}`);
  }
  return [...new Set([...ids, ...ADAPTERS.keys()])];
}

/**
 * Providers that are configured and usable.
 *
 * This is what the checkout page should render. It is not the same as
 * `knownProviderIds()`, which includes providers that exist in code but have no
 * credentials — offering those would be offering a dead end.
 *
 * One provider for each service in each country. Where a country's account is
 * configured both ways, under its own names and under the names without a
 * country, the one under its own names is the one offered: two buttons for
 * one account would be a choice with nothing to choose.
 */
export function availableProviders(): PaymentProvider[] {
  const all = knownProviderIds()
    .map((id) => factoryFor(id)?.())
    .filter((p): p is PaymentProvider => Boolean(p) && (p as PaymentProvider).available);
  return all.filter((provider) => {
    if (!provider.market) return true;
    const country = provider.market.country;
    // An operator reached through the aggregator, where the same operator has
    // an account of its own in that country: the direct one is offered.
    const direct = builtin(provider.id)?.service.direct;
    if (direct && all.some((other) => isDirect(other, direct, country))) return false;
    if (!(provider.id in SERVICES)) return true;
    const scoped = `${provider.id}_${country.toLowerCase()}`;
    return !all.some((other) => other.id === scoped);
  });
}

/**
 * The second road to the same wallet, or null when there is only one.
 *
 * The owner's decision (2026-11-19): where MTN or Airtel has an account of
 * its own in a country **and** the aggregator reaches that operator there
 * too, keep both, "in case one fails". A payer still sees one button, the
 * direct account's. This is the other one: the aggregator's provider for the
 * same operator, in the same country and currency, if the account has been
 * given it (`PAWAPAY_PROVIDERS`).
 *
 * The checkout turns to it only when the direct account says for certain
 * that it started nothing (`PaymentNotStartedError`). One way only: an
 * operator reached through the aggregator alone has nothing behind it.
 */
export function standInFor(provider: PaymentProvider): PaymentProvider | null {
  const market = provider.market;
  if (!market) return null;
  for (const [brand, known] of Object.entries(PAWAPAY_BRANDS)) {
    if (!known.direct || !known.countries[market.country]) continue;
    if (!isDirect(provider, known.direct, market.country)) continue;
    const second = factoryFor(`pawapay_${brand}_${market.country.toLowerCase()}`)?.();
    if (second?.available && second.market?.currency === market.currency) return second;
  }
  return null;
}

/** Whether a provider is this direct service's account in this country, under either of its names. */
function isDirect(provider: PaymentProvider, service: string, country: string): boolean {
  if (provider.market?.country !== country) return false;
  return provider.id === service || provider.id === `${service}_${country.toLowerCase()}`;
}

/**
 * The providers that can take an order priced in this currency.
 *
 * A mobile-money account collects one currency. An order in another cannot be
 * paid through it, so it is not offered: a button that fails after the number
 * is typed is worse than no button. A provider tied to no country (none
 * exists yet; a card provider would be one) takes any currency.
 */
export function providersForCurrency(currency: string | null | undefined): PaymentProvider[] {
  const wanted = (currency ?? '').toUpperCase();
  return availableProviders().filter(
    (provider) => provider.market === null || provider.market.currency === wanted,
  );
}

/**
 * The providers that can take this amount: its currency, and, for an
 * operator that collects whole amounts only, no fraction (`accepts`).
 */
export function providersForAmount(amount: Money | null | undefined): PaymentProvider[] {
  if (!amount) return [];
  return providersForCurrency(amount.currency).filter((provider) => provider.accepts?.(amount) !== false);
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
