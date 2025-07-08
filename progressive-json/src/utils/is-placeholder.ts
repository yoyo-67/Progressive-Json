export function isPlaceholder(value: string) {
  return /^ref\$\d+$/.test(value);
}
