// import { Certificate } from '@fidm/x509';
// Nullish coalescing is not available with webpack currectly,
// ref: https://github.com/webpack/webpack/issues/10227 .
// So we temporarily use es2019, which lacks of `string.MatchAll`.
import 'core-js/features/string/match-all'

export interface CTLogEntry {
  issuer_ca_id: number
  issuer_name: string
  name_value: string
  id: number
  entry_timestamp: Date
  not_before: Date
  not_after: Date
}

export interface CertInfo {
  organizationName: string | null
  commonName: string
  subjectAlternativeNames: string[]
}

const COMMON_INIT = {
  cf: {
    // Tell Cloudflare's CDN to always cache this fetch regardless of content type
    // for a max of 5 seconds before revalidating the resource
    cacheTtl: 86400, // sets TTL to 5 and cacheEverything to true
    //Enterprise only feature, see Cache API for other plans
    cacheEverything: true, // override the default "cacheability" of the asset. For TTL, Cloudflare will still rely on headers set by the origin.
  },
  headers: {
    'User-Agent': 'mdfp-san/0.1 (+https://github.com/Gowee/mdfp-san)',
  },
}

export async function searchCT(q: string): Promise<CTLogEntry[]> {
  const url = `https://crt.sh/?q=${q}&output=json`
  const r = await fetch(url, COMMON_INIT)
  const d = await r.json()
  return d
}

const PATTERN_TEXT_START = '<TD class="text">'
const PATTERN_TEXT_END = '</TD>'
const PATTERN_SUBJECT = /Subject:\s+commonName\s*=\s*(?<commonName>\S+?)\s+(organizationName\s*=\s*(?<organizationName>[^\n]+))?\s/
const PATTERN_SAN_TEXT = /Subject Alternative Name:\s*(?:DNS:\S+\s+)*/
const PATTERN_SAN_DNS = /DNS:\s*(?<dns>\S+)[^\n]*\n/g
const PATTERN_WHITESPACES = /(&nbsp;|<BR>)/g

export async function fetchCertInfo(
  entry_id: number,
): Promise<CertInfo | null> {
  const url = `https://crt.sh/?id=${entry_id}`
  const r = await fetch(url, COMMON_INIT)
  const d = await r.text()

  // extract cert text
  const textStart = d.indexOf(PATTERN_TEXT_START)
  const textEnd = d.indexOf(
    PATTERN_TEXT_END,
    textStart + PATTERN_TEXT_START.length,
  )
  const text = d
    .slice(textStart + PATTERN_TEXT_START.length, textEnd)
    .replace(PATTERN_WHITESPACES, matched => {
      if (matched === '&nbsp;') {
        return ' '
      } else {
        /* <BR> */
        return '\n'
      }
    })
  // console.log(textStart, textEnd, text)
  // text.replace('&nbsp;', ' ')
  // text.replace('<BR>', '\n')
  // console.log(text)

  // extract subject
  const subject = PATTERN_SUBJECT.exec(text)
  // console.log(PATTERN_SUBJECT, text, subject?.groups)
  const commonName = subject?.groups?.commonName ?? ''
  const organizationName = subject?.groups?.organizationName ?? null

  // extract SANs
  const san_text = (PATTERN_SAN_TEXT.exec(text) ?? [''])[0]
  const matches = san_text.matchAll(PATTERN_SAN_DNS)
  // console.log(san_text, PATTERN_SAN_DNS, matches);
  const subjectAlternativeNames: string[] = []
  for (const match of matches) {
    subjectAlternativeNames.push(match?.groups?.dns ?? '')
  }
  // console.log("!!!", commonName, organizationName, JSON.stringify(subjectAlternativeNames));
  return {
    commonName,
    organizationName,
    subjectAlternativeNames,
  }
}
