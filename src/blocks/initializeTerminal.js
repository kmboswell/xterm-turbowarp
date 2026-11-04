export function initializeTerminal() {
  // init() records the reason in lastError, which the `last terminal error`
  // reporter exposes; swallowing the rejection keeps the project running.
  return init().catch(() => {});
}
