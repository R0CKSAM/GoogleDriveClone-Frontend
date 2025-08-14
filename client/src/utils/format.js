export function formatBytes(bytes = 0, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ["B","KB","MB","GB","TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
