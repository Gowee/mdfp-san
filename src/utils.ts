import psl from './psl';

export function cached(func: (request: Request) => Promise<Response>) {
    // Ref: https://github.com/cloudflare/template-registry/blob/f2a21ff87a4f9c60ce1d426e9e8d2e6807b786fd/templates/javascript/cache_api.js#L9
    const cache = caches.default;
    async function cachedFunc(event: FetchEvent) {
        const request = event.request;
        let response = await cache.match(request);
        if (!response) {
            response = await func(request);
            event.waitUntil(cache.put(request, response.clone()));
        }
        return response;
    }
    return cachedFunc;
}

console.log(psl);

export function getDomainBase(domain: string): string {
    while (domain.startsWith("*.")) { // although *.*. is invalid according to CA/B guidelines
        domain = domain.slice(2);
    }
    let ls = 0; // longest suffix
    for (const suffix of psl) {
        if (domain.endsWith(suffix)) {
            ls = Math.max(suffix.split(".").length, ls);
        }
    }
    const parts = domain.split(".");
    return parts.slice(parts.length - ls - 1).join(".");
}
