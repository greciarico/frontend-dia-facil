/** Presentation only. Cancellation releases the waiter, never the underlying network operation. */
export function minimumTransition(duration: number, schedule = setTimeout, unschedule = clearTimeout) {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const timer = schedule(release, duration);
  return { wait, cancel() { unschedule(timer); release(); } };
}
