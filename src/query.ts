import { Deque } from '@blakeembrey/deque'
import { ClientError } from './types'

import {
  getDomainBase,
  isSubdomain,
  parseDateISO8601,
  ninetyDaysInMilliseconds,
} from './utils'
import * as Crtsh from './crtsh'
import {
  FILTERED_COMMON_NAMES,
  FILTERED_ISSUER_NAMES,
  REQUEST_LIMIT,
} from './config'

export async function handleQuery(request: Request): Promise<Response> {
  const url = new URL(request.url)

  const initialQ = url.searchParams.get('q')
  if (initialQ === null) {
    throw new ClientError('Query parameter is empty.')
  }

  const startTime = Date.now(); 
  const seenCerts = new Set<number>()
  const seenOrgs = new Set([initialQ])
  const qq = new Deque([initialQ]) // queue of candidate q
  let processedCerts = 0 // number of certs from which domains are related, for diagnositcs
  let requests = 0 // total requests sent, used to avoid triggering the 50 subrequests limit of CF

  const domains = new Set()

  while (qq.size > 0 && domains.size <= 100 && requests < REQUEST_LIMIT) {
    const q = qq.pop()
    console.log('Querying keyword: ', q)

    const entries = await Crtsh.searchCT(q)
    requests += 1
    for (const entry of entries.slice(0, 13)) {
      if (requests >= REQUEST_LIMIT) {
        // This cannot be moved behind
        // O.W. too many irrelevant certs which trigger requests may make it exceed the limit.
        break
      }
      if (seenCerts.has(entry.id)) {
        continue
      }
      seenCerts.add(entry.id)
      console.log(`See cert:`, entry)

      // filter out: certs used by some public CDNs & certs expired more than 6 months
      // There are some rare cases where fresh certs are not uploaded to Comodo's CT.
      // Here make sure at least one cert is processed to avoid empty response.
      if (
        entry.issuer_name.match(FILTERED_ISSUER_NAMES) ||
        (processedCerts > 1 &&
          parseDateISO8601(entry.not_after) + ninetyDaysInMilliseconds <
            new Date().getTime())
      ) {
        continue
      }

      const cert = await Crtsh.fetchCertInfo(entry.id)
      requests += 1
      console.log(cert)
      if (cert === null || cert.commonName.match(FILTERED_COMMON_NAMES)) {
        continue
      }

      // TODO: not all certificates are for domains
      if (
        processedCerts >= 1 &&
        !(
          q === cert.organizationName ||
          isSubdomain(cert.commonName, q) ||
          cert.subjectAlternativeNames.some(san => isSubdomain(san, q))
        )
      ) {
        // The fetched cert has no intersections with the query.
        break
        // TODO: or just continue
      }

      // update related domains & querying queue with CN and SAN
      {
        const base_domain = getDomainBase(cert.commonName)
        if (!domains.has(base_domain)) {
          domains.add(base_domain)
          qq.push(base_domain)
        }
        // TODO: chain this with sans
      }
      for (const san of cert.subjectAlternativeNames) {
        const base_domain = getDomainBase(san)
        if (!domains.has(base_domain)) {
          domains.add(base_domain)
          qq.push(base_domain)
        }
      }

      // add org names as new candidate query keywords
      if (cert.organizationName && !seenOrgs.has(cert.organizationName)) {
        seenOrgs.add(cert.organizationName)
        qq.push(cert.organizationName)
      }
      processedCerts += 1
    }
  }

  const endTime = Date.now() - startTime
  return new Response(
    JSON.stringify({
      domains: Array.from(domains),
      _certs_related: processedCerts,
      _certs_seen: seenCerts.size,
      _requests_sent: requests,
      _time_consumed: endTime / 1000,
      _update_time: new Date(),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}
