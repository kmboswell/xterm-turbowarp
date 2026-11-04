export function setTimestampStyle(args) {
  timestampStyle = String(args.STYLE) === "uptime" ? "uptime" : "clock";
}
