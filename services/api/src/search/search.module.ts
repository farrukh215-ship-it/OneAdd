import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [JwtModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService]
})
export class SearchModule {}
