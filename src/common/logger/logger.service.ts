import { Injectable, Logger } from "@nestjs/common";
import { LOGGING_CONFIG, getEffectiveLogLevel } from "./logger.config";

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

export interface LogContext {
  service?: string;
  method?: string;
  userId?: string;
  projectId?: number;
  taskId?: string;
  [key: string]: any;
}

@Injectable()
export class AppLogger {
  private readonly logger = new Logger(AppLogger.name);

  private formatMessage(message: string, context?: LogContext): string {
    if (!LOGGING_CONFIG.ENABLE_STRUCTURED_LOGGING || !context) return message;

    const contextParts = Object.entries(context)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join(" ");

    return contextParts ? `${message} [${contextParts}]` : message;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!LOGGING_CONFIG.ENABLE_CONSOLE_OUTPUT) return false;

    const currentLevel = getEffectiveLogLevel();
    const levels = [
      LogLevel.ERROR,
      LogLevel.WARN,
      LogLevel.INFO,
      LogLevel.DEBUG,
    ];
    const currentLevelIndex = levels.indexOf(currentLevel as LogLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex <= currentLevelIndex;
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const formattedMessage = this.formatMessage(message, context);
    if (error) {
      this.logger.error(`${formattedMessage}: ${error.message}`, error.stack);
    } else {
      this.logger.error(formattedMessage);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const formattedMessage = this.formatMessage(message, context);
    this.logger.warn(formattedMessage);
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const formattedMessage = this.formatMessage(message, context);
    this.logger.log(formattedMessage);
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const formattedMessage = this.formatMessage(message, context);
    this.logger.debug(formattedMessage);
  }

  // Convenience methods for common patterns
  logApiCall(
    method: string,
    url: string,
    statusCode?: number,
    context?: LogContext,
  ): void {
    if (!LOGGING_CONFIG.ENABLE_API_LOGGING) return;

    const message = `API ${method} ${url}${
      statusCode ? ` - ${statusCode}` : ""
    }`;
    this.info(message, context);
  }

  logTaskProgress(
    taskId: string,
    progress: number,
    status: string,
    context?: LogContext,
  ): void {
    const message = `Task ${taskId} progress: ${progress}% - ${status}`;
    this.info(message, { ...context, taskId, progress, status });
  }

  logImageProcessing(
    imageId: number,
    action: string,
    context?: LogContext,
  ): void {
    const message = `Image processing: ${action}`;
    this.info(message, { ...context, imageId, action });
  }

  logPaymentEvent(event: string, amount?: number, context?: LogContext): void {
    if (!LOGGING_CONFIG.ENABLE_PAYMENT_LOGGING) return;

    const message = `Payment event: ${event}${amount ? ` - ${amount}` : ""}`;
    this.info(message, { ...context, event, amount });
  }

  logSecurityEvent(event: string, userId?: string, context?: LogContext): void {
    if (!LOGGING_CONFIG.ENABLE_SECURITY_LOGGING) return;

    const message = `Security event: ${event}`;
    this.warn(message, { ...context, userId, event });
  }
}
