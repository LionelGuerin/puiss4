import env from '#start/env'
import { defineConfig } from '@adonisjs/transmit'

const transmitConfig = defineConfig({
  pingInterval: 10000,
  transport: null,
})

export default transmitConfig
