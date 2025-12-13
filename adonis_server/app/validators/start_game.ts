import vine from '@vinejs/vine'

export const startGameValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(20),
  })
)
