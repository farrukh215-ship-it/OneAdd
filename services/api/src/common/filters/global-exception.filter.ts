import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";
    const details = getErrorDetails(errorResponse);

    response.status(status).json({
      statusCode: status,
      message: getErrorMessage(errorResponse),
      error: HttpStatus[status] ?? "Error",
      details,
      timestamp: new Date().toISOString(),
      path: request.url
    });
  }
}

function getErrorMessage(errorResponse: string | object) {
  if (typeof errorResponse === "string") {
    return errorResponse;
  }

  if ("message" in errorResponse) {
    return errorResponse.message;
  }

  return "Unexpected error";
}

function getErrorDetails(errorResponse: string | object) {
  if (typeof errorResponse === "string") {
    return null;
  }

  if ("message" in errorResponse && Array.isArray(errorResponse.message)) {
    return errorResponse.message;
  }

  if ("error" in errorResponse) {
    return errorResponse.error;
  }

  return null;
}
