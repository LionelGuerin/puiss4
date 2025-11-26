import { Module } from '@nestjs/common';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { GameModule } from '../game/game.module'; // <--- NOUVEAU : Importer le Gateway

@Module({
  imports: [GameModule], // <--- Importer le module qui contient GameGateway
  controllers: [PdfController],
  providers: [PdfService],
})
export class PdfModule {}
