import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

/**
 * Start a new subscription by redirecting to Stripe Checkout
 */
export async function startSubscription(options?: {
  successUrl?: string;
  cancelUrl?: string;
}) {
  const fn = httpsCallable(functions, "createSubscription");

  // Check if we're in Electron (non-HTTP origin)
  const isElectron = !window.location.origin.startsWith('http');

  const { data } = await fn({
    successUrl: options?.successUrl || (isElectron ? undefined : window.location.origin + "/billing/success"),
    cancelUrl: options?.cancelUrl || (isElectron ? undefined : window.location.origin + "/billing/cancel"),
  });
  const url = (data as any).url;
  if (url) {
    window.location.href = url;
  }
}

/**
 * Open the Stripe billing portal for managing subscription
 */
export async function openBillingPortal(options?: { returnUrl?: string }) {
  const fn = httpsCallable(functions, "createBillingPortal");

  // Check if we're in Electron (non-HTTP origin)
  const isElectron = !window.location.origin.startsWith('http');

  const { data } = await fn({
    returnUrl: options?.returnUrl || (isElectron ? undefined : window.location.origin + "/account"),
  });
  const url = (data as any).url;
  if (url) {
    window.location.href = url;
  }
}

/**
 * Cancel subscription at the end of the current billing period
 */
export async function stopSubscription() {
  const fn = httpsCallable(functions, "stopSubscription");
  await fn();
}

/**
 * Resume a subscription that was set to cancel at period end
 */
export async function resumeSubscription() {
  const fn = httpsCallable(functions, "resumeSubscription");
  await fn();
}
