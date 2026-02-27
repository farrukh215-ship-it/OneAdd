import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { SendMessageDto } from "./dto/send-message.dto";
import { UpsertThreadDto } from "./dto/upsert-thread.dto";
import { ChatService } from "./chat.service";

@ApiTags("chat")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("threads")
  upsertThread(@Req() request: Request, @Body() dto: UpsertThreadDto) {
    return this.chatService.upsertThread(String(request.user?.sub), dto.listingId);
  }

  @Get("threads")
  getMyThreads(@Req() request: Request) {
    return this.chatService.getMyThreads(String(request.user?.sub));
  }

  @Get("threads/:id/messages")
  getMessages(@Req() request: Request, @Param("id") threadId: string) {
    return this.chatService.getThreadMessages(String(request.user?.sub), threadId);
  }

  @Post("threads/:id/messages")
  @RateLimit({ max: 30, windowSeconds: 60 })
  sendMessage(
    @Req() request: Request,
    @Param("id") threadId: string,
    @Body() dto: SendMessageDto
  ) {
    return this.chatService.sendMessage(
      String(request.user?.sub),
      threadId,
      dto.content
    );
  }
}
