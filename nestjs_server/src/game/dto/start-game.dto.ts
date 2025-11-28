import { IsString, IsNotEmpty, Length } from 'class-validator';

export class StartGameDto {
  @IsString({ message: 'Le nom doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  @Length(2, 20, { message: 'Le nom doit contenir entre 2 et 20 caractères.' })
  name: string;
}
