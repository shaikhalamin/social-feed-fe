interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

const BACKEND_URL = 'https://social-feed-be.alamin-cse15.workers.dev'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      const upstreamPath = url.pathname.replace(/^\/api/, '')
      const upstreamUrl = new URL(upstreamPath + url.search, BACKEND_URL)
      return fetch(new Request(upstreamUrl, request))
    }

    return env.ASSETS.fetch(request)
  },
}
