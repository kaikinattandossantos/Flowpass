import './load-env.js'
import { buildApp, createSocketServer } from './app.js'
import { setSocketIo } from './lib/socket.js'

const start = async () => {
  try {
    const app = await buildApp()
    const { io } = createSocketServer(app)
    setSocketIo(io)

    const port = Number(process.env.PORT) || 3333
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 Server running at http://localhost:${port}`)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

start()
