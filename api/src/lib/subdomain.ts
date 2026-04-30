export function extractSubdomain(host: string): string | null {
  const clean = host.split(':')[0]
  const parts = clean.split('.')
  if (parts.length >= 3) return parts[0]
  return null
}
