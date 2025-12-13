import env from '#start/env'
import { defineConfig, stores } from '@adonisjs/session'

export default defineConfig({
  enabled: true,
  store: 'cookie',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: '2h',
  cookie: {
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  },
  stores: {
    cookie: stores.cookie(),
  },
})
