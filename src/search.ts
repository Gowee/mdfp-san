import { Deque } from '@blakeembrey/deque'

import { getDomainBase, isSubdomain } from './utils'
import * as Crtsh from './crtsh'

export async function handleSearch(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const initialQ = url.searchParams.get('q')
  if (initialQ === null) {
    throw new ClientError('Query parameter is empty.')
  }

  const seenCerts = new Set<number>()
  const seenOrgs = new Set([initialQ])
  const qq = new Deque([initialQ]) // queue of candidate q

  const domains = new Set()

  while (qq.size > 0 && domains.size <= 150 && seenCerts.size < 52) {
    const q = qq.pop()
    // console.log("querying", q);

    const entries = await Crtsh.searchCT(q)
    for (const entry of entries.slice(0, 18)) {
      if (seenCerts.has(entry.id)) {
        continue
      }
      seenCerts.add(entry.id)

      // filter certs used by some public CDNs
      if (entry.issuer_name.includes("CloudFlare")) {
        continue
      }

      const cert = await Crtsh.fetchCertInfo(entry.id)
      // console.log(q, cert)
      if (cert === null) {
        continue
      }

      // console.log(111);
      if (
        !(
          q === cert.organizationName ||
          isSubdomain(cert.commonName, q) ||
          cert.subjectAlternativeNames.some(san => isSubdomain(san, q))
        )
      ) {
        // The fetched cert has no intersections with the query.
        continue
      }
      // console.log(222);

      {
        const base_domain = getDomainBase(cert.commonName)
        if (!domains.has(base_domain)) {
          domains.add(base_domain)
          qq.push(base_domain)
        }
        // TODO: chain this with sans
      }
      // console.log('CN', cert.commonName)
      for (const san of cert.subjectAlternativeNames) {
        const base_domain = getDomainBase(san)
        if (!domains.has(base_domain)) {
          domains.add(base_domain)
          qq.push(base_domain)
        }
      }

      if (cert.organizationName && !seenOrgs.has(cert.organizationName)) {
        seenOrgs.add(cert.organizationName)
      }
      // console.log('1 done')
    }
  }

  return new Response(
    JSON.stringify({ domains: Array.from(domains), _t: new Date(), _certs_searched: seenCerts.size }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}
