// Hardcoded logging configuration
// Change these values to control logging behavior without environment variables

export const LOGGING_CONFIG = {
  // Set this to control what gets logged
  // Options: 'error', 'warn', 'info', 'debug'
  // 'error' = only errors
  // 'warn' = warnings and errors
  // 'info' = info, warnings, and errors (default)
  // 'debug' = all log levels
  LOG_LEVEL: "info" as "error" | "warn" | "info" | "debug",

  // Enable/disable debug logs in production
  // Set to false to disable debug logs in production builds
  ENABLE_DEBUG_IN_PRODUCTION: false,

  // Enable/disable console output
  // Set to false to disable all console output (useful for testing)
  ENABLE_CONSOLE_OUTPUT: true,

  // Enable structured logging context
  // Set to false to disable context in log messages
  ENABLE_STRUCTURED_LOGGING: true,

  // Enable performance logging
  // Set to true to log performance metrics
  ENABLE_PERFORMANCE_LOGGING: false,

  // Enable API call logging
  // Set to true to log all API calls
  ENABLE_API_LOGGING: true,

  // Enable payment event logging
  // Set to true to log payment events
  ENABLE_PAYMENT_LOGGING: true,

  // Enable security event logging
  // Set to true to log security events
  ENABLE_SECURITY_LOGGING: true,
};

// Helper function to check if we're in production
export const isProduction = (): boolean => {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.NODE_ENV === "prod" ||
    process.env.ENVIRONMENT === "production" ||
    process.env.ENVIRONMENT === "prod"
  );
};

// Helper function to get effective log level
export const getEffectiveLogLevel = (): "error" | "warn" | "info" | "debug" => {
  // In production, respect the ENABLE_DEBUG_IN_PRODUCTION setting
  if (isProduction() && !LOGGING_CONFIG.ENABLE_DEBUG_IN_PRODUCTION) {
    if (LOGGING_CONFIG.LOG_LEVEL === "debug") {
      return "info"; // Downgrade debug to info in production
    }
  }
  return LOGGING_CONFIG.LOG_LEVEL;
};
