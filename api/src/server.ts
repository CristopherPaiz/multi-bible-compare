import dotenv from 'dotenv'
dotenv.config()

import { validateEnv } from '@config/env.validator.js'
validateEnv()

import { Server } from 'node:http'
import app from './app.js'
import { DatabaseService } from '@database/connection.js'
import { configureCloudinary } from '@config/cloudinary.config.js'
import { formatGuatemala } from '@utils/datetime.helper.js'

const PORT = Number(process.env.PORT ?? 3000)

configureCloudinary()

let serverInstance: Server | undefined

const startServer = async (): Promise<void> => {
  try {
    await DatabaseService.getInstance().connect()
    console.log('Turso conectado.')

    serverInstance = app.listen(PORT, () => {
      console.log(`Biblian API escuchando en el puerto ${PORT}`)
      console.log(`Entorno: ${process.env.NODE_ENV}`)
      console.log(`Hora Guatemala: ${formatGuatemala()}`)
    })
  } catch (error) {
    console.error('Error fatal al iniciar el servidor:', error)
    process.exit(1)
  }
}

const gracefulShutdown = (signal: string): void => {
  console.log(`${signal} recibido. Cerrando servidor...`)
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('Servidor HTTP cerrado.')
      process.exit(0)
    })
    // Si alguna conexión se queda colgada, no bloquear el deploy indefinidamente.
    setTimeout(() => process.exit(0), 10_000).unref()
  } else {
    process.exit(0)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

startServer()
