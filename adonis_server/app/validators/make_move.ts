import vine from '@vinejs/vine'

export const makeMoveValidator = vine.compile(
  vine.object({
    roomId: vine.string().uuid({ version: [4] }),
    column: vine.number().min(0).max(6),
  })
)
