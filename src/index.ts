import { handleEvent } from './handler'
import { USER_AGENT } from './config'

addEventListener('fetch', event => {
  event.respondWith(handleEvent(event))
})

console.log(`${USER_AGENT} is up`)
