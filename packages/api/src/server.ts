import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import { Server } from 'socket.io'
import http from 'http'

const app = fastify().withTypeProvider<ZodTypeProvider>()

// Socket.io setup
const server = http.createServer(app.server)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(cors, { origin: '*' })
app.register(jwt, {
  secret: process.env.JWT_SECRET || 'flowpass-secret-key-change-me'
})
app.register(websocket)

// Register routes
import { authRoutes } from './routes/auth'
import { companyRoutes } from './routes/companies'
import { eventRoutes } from './routes/events'
import { registrationRoutes } from './routes/registrations'
import { userRoutes } from './routes/users'
import { statsRoutes } from './routes/stats'

app.register(authRoutes)
app.register(companyRoutes)
app.register(eventRoutes)
app.register(registrationRoutes)
app.register(userRoutes)
app.register(statsRoutes)

// Health check
app.get('/health', async () => {
  return { status: 'ok' }
})

// Real-time events namespace
const eventsNamespace = io.of(/^\/events\/.+$/)
eventsNamespace.on('connection', (socket) => {
  const eventId = socket.nsp.name.split('/')[2]
  console.log(`User connected to event: ${eventId}`)
  
  socket.on('disconnect', () => {
    console.log(`User disconnected from event: ${eventId}`)
  })
})

// Export IO to be used in routes
export { io }

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 Server running at http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
