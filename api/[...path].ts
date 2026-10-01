import type { IncomingMessage, ServerResponse } from 'node:http'
import { getRequestListener } from '@hono/node-server'
import app from '../server/app.ts'

const listener = getRequestListener(app.fetch)

export default function handler(req: IncomingMessage, res: ServerResponse) {
  void listener(req, res)
}
