import Stripe from "stripe";
import { env, features } from "./env";

// Make Stripe optional - only initialize if secret key is available
export const stripe = features.stripe
  ? new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
      maxNetworkRetries: 3,
      timeout: 30000,
    })
  : null;

export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.");
  }
  return stripe;
}
