import psl from './psl'

export function cached(func: (request: Request) => Promise<Response>) {
  // Ref: https://github.com/cloudflare/template-registry/blob/f2a21ff87a4f9c60ce1d426e9e8d2e6807b786fd/templates/javascript/cache_api.js#L9
  const cache = caches.default
  async function cachedFunc(event: FetchEvent) {
    const request = event.request
    let response = await cache.match(request)
    if (!response) {
      response = await func(request)
      event.waitUntil(cache.put(request, response.clone()))
    }
    return response
  }
  return cachedFunc
}

export function getDomainBase(domain: string): string {
  const parts = domain.split('.')
  let l = 0,
    r = 0
  while ((r = domain.indexOf('.', l)) !== -1) {
    if (psl.has(domain.slice(r + 1))) {
      break
    }
    l = r + 1
  }
  return domain.slice(l)
}

export function isSubdomain(sub: string, domain: string): boolean {
  if (sub.length < domain.length) {
    return false
  }
  return (
    sub.endsWith(domain) &&
    (domain.length === sub.length ||
      sub.charAt(sub.length - domain.length - 1) === '.')
  )
}
