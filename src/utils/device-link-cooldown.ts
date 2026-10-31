/** Relative server duration anchored to a monotonic clock, independent of the phone's wall clock. */
export function renewalDeadline(seconds: number, now = performance.now()) { return now + seconds * 1000; }
export function remainingRenewalSeconds(deadline: number, now = performance.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
