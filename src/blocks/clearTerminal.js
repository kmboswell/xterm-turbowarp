export function clearTerminal() {
  if (!requireTerminal()) return;
  terminal.clear();
}
