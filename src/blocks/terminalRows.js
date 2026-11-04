export function terminalRows() {
  if (!requireTerminal()) return 0;
  return terminal.rows || 0;
}
