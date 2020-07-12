import { cached } from './utils'
import { ClientError } from './types'
import { handleQuery } from './query'
import { PROJECT_HOMEPAGE } from './config'

export async function handleEvent(event: FetchEvent): Promise<Response> {
  const request = event.request
  const url = new URL(request.url)
  try {
    switch (url.pathname) {
      case '/':
        return new Response(`See ${PROJECT_HOMEPAGE} for more info.`, {
          status: 302,
          headers: { Location: PROJECT_HOMEPAGE },
        })
        break
      case '/query':
        return await cached(handleQuery)(event)
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
