export function hideTerminal() {
  if (!requireTerminal()) return;
  hide();
}
