import { cached } from './utils';

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
  
}
