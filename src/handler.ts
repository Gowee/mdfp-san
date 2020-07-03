import { cached, getDomainBase } from './utils';
import * as Crtsh from './crtsh';

export async function handleEvent(event: FetchEvent): Promise<Response> {
  const request = event.request;
  const url = new URL(request.url);
  switch (url.pathname) {
    case '/':
      return new Response(`request method: ${request.method}`);
      break;
    case '/query':
      return await cached(handleQuery)(event);
      break;
    default:
      return new Response(`Resource Not Found at the endpoint ${url.pathname}`, { status: 404 });
  }
}

async function handleQuery(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  if (q === null) {
    throw Error("");
  }

  const seenCerts = new Set<number>();
  const seenQs = new Set<string>([q]);

  const sans = new Set();

  const entries = await Crtsh.searchCT(q);
  for (const entry of entries.slice(0, 15)) {
    if (seenCerts.has(entry.id)) {
      continue
    }
    seenCerts.add(entry.id);

    const cert = await Crtsh.fetchCertInfo(entry.id);
    console.log(cert);
    if (cert === null) {
      continue;
    }
    sans.add(getDomainBase(cert.commonName));
    for (const san of cert.subjectAlternativeNames) {
      sans.add(getDomainBase(san));
    }
  }

  return new Response(JSON.stringify({ domains: Array.from(sans), _t: new Date() }), { headers: { 'Content-Type': "application/json" } });
}
