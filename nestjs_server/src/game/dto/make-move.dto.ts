import { IsString, IsNotEmpty, IsUUID, IsInt, Min, Max } from 'class-validator';

export class MakeMoveDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'roomId doit être un UUID valide.' })
  roomId: string;

  @IsInt({ message: 'La colonne doit être un nombre entier.' })
  @Min(0, { message: 'La colonne doit être entre 0 et 6.' })
  @Max(6, { message: 'La colonne doit être entre 0 et 6.' })
  column: number;
}
