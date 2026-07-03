import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { createDoor, PublicLink, Registry, Room } from 'hono-door'
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
app.route('/admin', createDoorUi(door))

app.get('/', (c) => c.text('Not found.', 404))
app.notFound((c) => c.text('Not found.', 404))

export default app
