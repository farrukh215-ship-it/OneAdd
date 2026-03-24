import { Controller, Get, Query } from '@nestjs/common';
import { HomeInsightsQueryDto } from './dto/home-insights.dto';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('insights')
  getInsights(@Query() query: HomeInsightsQueryDto) {
    return this.homeService.getInsights(query);
  }
}
