import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  TZ: Env.schema.string(),
  PORT: Env.schema.number(),
  HOST: Env.schema.string(),
  LOG_LEVEL: Env.schema.string(),
  APP_KEY: Env.schema.string(),
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),

  DB_CONNECTION: Env.schema.string(),

  FRONTEND_URL: Env.schema.string(),

  AMQP_URL: Env.schema.string.optional(),
  AMQP_QUEUE: Env.schema.string.optional(),

  PDF_EXPORT_RELATIVE_PATH: Env.schema.string.optional(),

  DEV_MODE: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),
})
