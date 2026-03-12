import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { SearchController } from './search.controller';

@Module({
  imports: [ListingsModule],
  controllers: [SearchController],
})
export class SearchModule {}

