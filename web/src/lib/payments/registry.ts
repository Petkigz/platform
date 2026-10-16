/**
 * Provider resolution.
 *
 * One place decides which provider is live, so no component ever imports an
 * adapter directly. When MTN or Airtel is chosen, it is added to `ADAPTERS`
 * and nothing else changes.
 */

import {
  PaymentProviderUnavailableError,
  UnconfiguredPaymentProvider,
  type PaymentProvider,
  type ProviderId,
} from './provider';

/**
 * Populated as providers are chosen. Deliberately empty: no provider has been
 * selected, and registering a guessed one would be worse than registering
 * none, because it would look like the decision had been made.
 */
const ADAPTERS = new Map<ProviderId, () => PaymentProvider>();

export function registerPaymentProvider(
  id: ProviderId,
  factory: () => PaymentProvider,
): void {
  ADAPTERS.set(id, factory);
}

export function configuredProviderId(): ProviderId | null {
  const id = process.env.PAYMENT_PROVIDER?.trim();
  if (!id) return null;
  return ADAPTERS.has(id) ? id : null;
}

/**
 * The provider to use. Always returns something, so callers do not branch on
 * null; `provider.available` is the flag to check before offering checkout.
 */
export function getPaymentProvider(): PaymentProvider {
  const id = configuredProviderId();
  if (!id) return new UnconfiguredPaymentProvider();
  return ADAPTERS.get(id)!();
}

/**
 * For the checkout path, where "not configured" must stop the flow rather than
 * render a button that cannot work.
 */
export function requirePaymentProvider(): PaymentProvider {
  const provider = getPaymentProvider();
  if (!provider.available) throw new PaymentProviderUnavailableError(provider.id);
  return provider;
}
