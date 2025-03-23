export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  try {
    const url = new URL(path)
    if (initial) {
      return path
    }
    if (url.hostname === 'notification.click') {
      return '/player'
    }
    return path
  } catch {
    console.log('Unexpected error:', path)
    return '/unexpected-error'
  }
}
