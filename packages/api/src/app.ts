import './load-env.js'
import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import multipart from '@fastify/multipart'
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import { Server } from 'socket.io'
import http from 'http'
import { eventSetupRoutes } from './routes/event-setup'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { companyRoutes } from './routes/companies'
import { eventRoutes } from './routes/events'
import { registrationRoutes } from './routes/registrations'
import { userRoutes } from './routes/users'
import { statsRoutes } from './routes/stats'
import { formFieldRoutes } from './routes/form-fields'
import { participantRoutes } from './routes/participants'
import { registrationFormRoutes } from './routes/registration-forms'
import { publicFormRoutes } from './routes/public-forms'
import { publicCredentialingRoutes } from './routes/public-credentialing'
import { formAssetRoutes } from './routes/form-assets'

export async function buildApp() {
  const app = fastify().withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.register(cors, {
    origin: '*',
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
  app.register(jwt, {
    secret: process.env.JWT_SECRET || 'flowpass-secret-key-change-me'
  })
  app.register(websocket)

  app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1
    }
  })

  app.register(eventSetupRoutes)
  app.register(registrationFormRoutes)
  app.register(formFieldRoutes)
  app.register(publicFormRoutes)
  app.register(publicCredentialingRoutes)
  app.register(formAssetRoutes)
  app.register(participantRoutes)
  app.register(adminRoutes)
  app.register(authRoutes)
  app.register(companyRoutes)
  app.register(eventRoutes)
  app.register(registrationRoutes)
  app.register(userRoutes)
  app.register(statsRoutes)

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}

export function createSocketServer(app: Awaited<ReturnType<typeof buildApp>>) {
  const server = http.createServer(app.server)
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  })

  const eventsNamespace = io.of(/^\/events\/.+$/)
  eventsNamespace.on('connection', (socket) => {
    const eventId = socket.nsp.name.split('/')[2]
    console.log(`User connected to event: ${eventId}`)
    socket.on('disconnect', () => {
      console.log(`User disconnected from event: ${eventId}`)
    })
  })

  return { server, io }
}

export type AppInstance = Awaited<ReturnType<typeof buildApp>>
