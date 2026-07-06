import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { createDoor, PublicLink, Registry, Room, type ShortLinkContext } from 'hono-door'
import { createDoorUi } from 'hono-door-ui'

import { healthRoutes } from './routes/health'
import { renderSamplePublicPage } from './sample-public-page'
import type { AppBindings } from './types'

export { PublicLink, Registry, Room }

const app = new Hono<AppBindings>()
const door = createDoor<AppBindings>()

app.use('*', secureHeaders())

app.route('/health', healthRoutes)
app.route('/l', door.public(renderSamplePublicPage))
app.route('/admin', door.adminApi())
app.route(
  '/admin',
  createDoorUi(door, {
    renderArchivePreview: ({ c, linkId, room }) =>
      renderSamplePublicPage({
        c,
        link: archiveRoomToPublicLinkContext(linkId, room),
      }),
  }),
)

app.get('/', (c) => c.text('Not found.', 404))
app.notFound((c) => c.text('Not found.', 404))

export default app

function archiveRoomToPublicLinkContext(
  linkId: string,
  room: {
    roomId: string
    title?: string | undefined
    body?: string | undefined
    updatedAt: string
  },
): ShortLinkContext {
  const updatedAt = new Date(room.updatedAt).getTime()
  return {
    linkId,
    tokenHash: 'archive-preview',
    label: 'archive-preview',
    expiresAt: Number.isNaN(updatedAt) ? Date.now() : updatedAt,
    roomId: room.roomId,
    room: {
      title: room.title ?? room.roomId,
      body: room.body ?? '',
      mode: 'plain',
      updatedAt: Number.isNaN(updatedAt) ? Date.now() : updatedAt,
    },
    tokenSource: 'header',
  }
}
