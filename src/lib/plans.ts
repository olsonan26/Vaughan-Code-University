import type { SubscriptionPlan, SubscriptionTier } from '../types';
import { SUBSCRIPTION_PLANS } from '../data/initialData';

/**
 * Single source of truth for plan lookups and price labels.
 * Components must not hardcode prices; final commercial pricing may change.
 * NOTE: billing is currently simulated. No real payment processor is connected.
 */
export function getPlan(tier: SubscriptionTier, plans: SubscriptionPlan[] = SUBSCRIPTION_PLANS) {
  return plans.find((p) => p.id === tier);
}

export function monthlyPrice(tier: SubscriptionTier, plans: SubscriptionPlan[] = SUBSCRIPTION_PLANS): number {
  return getPlan(tier, plans)?.priceMonthly ?? 0;
}

/** e.g. "$29/mo". Returns "" for free or unknown plans. */
export function priceLabel(tier: SubscriptionTier, plans: SubscriptionPlan[] = SUBSCRIPTION_PLANS): string {
  const price = monthlyPrice(tier, plans);
  return price > 0 ? `$${price}/mo` : '';
}
