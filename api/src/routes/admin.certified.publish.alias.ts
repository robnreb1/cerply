import { FastifyPluginAsync, FastifyRequest } from 'fastify'

type PublishBody = { lockHash?: string }
type Params = { itemId: string }

// This plugin ONLY provides the exact path the test hits and forwards
// to your existing publish logic (whatever path you already have working).
const plugin: FastifyPluginAsync = async (fastify) => {
  // Try to locate your existing handler. Adjust the URL below to match
  // the route that already passes the "existing admin certified routes" test.
  const forwardTo = '/api/admin/certified/publish' // <-- change if needed

  fastify.post<{
    Params: Params; Body: PublishBody
  }>('/certified/items/:itemId/publish', async (req, reply) => {
    // Enforce lockHash shape here so the test gets the exact error code
    if (!req.body || !req.body.lockHash) {
      return reply.code(400).send({ error: { code: 'NO_LOCK_HASH' } })
    }

    // Forward the call to your existing route so the core logic stays single-sourced.
    const res = await fastify.inject({
      method: 'POST',
      url: forwardTo,
      headers: {
        // forward auth headers so 401/200/409 behavior matches your existing route
        authorization: req.headers.authorization as string,
        'x-admin-token': (req.headers['x-admin-token'] as string) || ''
      },
      payload: {
        // Keep the body shape your existing route expects:
        // if it wants itemId in path or body, include both — harmless.
        itemId: req.params.itemId,
        lockHash: req.body.lockHash,
      },
    })

    // Mirror the downstream response (status, headers, body)
    // and ensure CORS header is present (your CORS plugin usually does this already).
    reply.code(res.statusCode)

    // Copy over Location header (needed for the 409 test)
    const location = res.headers['location']
    if (location) reply.header('Location', location as string)

    // Send JSON body through verbatim
    try {
      const json = res.json()
      return reply.send(json)
    } catch {
      return reply.send(res.body) // if downstream didn’t return JSON
    }
  })
}

export default plugin