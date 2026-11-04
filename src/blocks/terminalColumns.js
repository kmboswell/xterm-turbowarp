export function terminalColumns() {
  if (!requireTerminal()) return 0;
  return terminal.cols || 0;
}
