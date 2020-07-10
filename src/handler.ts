import { cached } from './utils'
import { handleSearch } from './search'

export async function handleEvent(event: FetchEvent): Promise<Response> {
  const request = event.request
  const url = new URL(request.url)
  try {
    switch (url.pathname) {
      case '/':
        return new Response(`request method: ${request.method}`)
        break
      case '/search':
        return await cached(handleSearch)(event)
        break
      default:
        return new Response(
          `Resource Not Found at the endpoint ${url.pathname}`,
          { status: 404 },
        )
    }
  } catch (e) {
    if (e instanceof ClientError) {
      return new Response(e.message, { status: 400 })
    } else {
      return new Response(e, { status: 500 })
    }
  }
}
