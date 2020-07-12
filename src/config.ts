declare const PACKAGE_NAME: string
declare const PACKAGE_VERSION: string

export const FILTERED_ISSUER_NAMES = /CloudFlare/
export const FILTERED_COMMON_NAMES = /^(tls\.automattic\.com|sni[^.]*.cloudflaressl.com)$/
export const REQUEST_LIMIT = 49
export const PROJECT_HOMEPAGE = 'https://github.com/Gowee/mdfp-san'
export const USER_AGENT = `${PACKAGE_NAME}/${PACKAGE_VERSION} (+${PROJECT_HOMEPAGE})`
