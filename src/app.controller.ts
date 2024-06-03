import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

class QueryText {
  input: string;
}

@Controller("/")
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Post("/queryText")
  queryText(@Body() question: QueryText) {
    return this.appService.queryText(question.input);
  }
}
