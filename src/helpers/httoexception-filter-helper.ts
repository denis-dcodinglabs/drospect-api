// src/helpers/http-exception-filter-helper.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    // Retrieve the original response message from the exception
    const exceptionResponse = exception.getResponse();
    const message = Array.isArray(exceptionResponse["message"])
      ? exceptionResponse["message"] // If multiple validation messages, take array
      : [exceptionResponse["message"]]; // If it's a single string, wrap in an array

    // Prepare the response body
    const responseBody = {
      status: "Error", // Overall status
      error: {
        type: exceptionResponse["error"]?.type || "Error", // Use the type from the exception response if available
        message: message.length > 0 ? message[0] : "Unknown error", // Only send the first validation error
      },
    };

    // Send the custom response
    response.status(status).json(responseBody);
  }
}
