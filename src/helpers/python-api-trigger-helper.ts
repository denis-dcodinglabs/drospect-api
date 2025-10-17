import { AppLogger } from "../common/logger/logger.service";

interface ApiResponse {
  status: number;
  data: any;
}

export async function callApi(url: string, data: any): Promise<ApiResponse> {
  const logger = new AppLogger();
  const TIMEOUT_MS = 60000; // 60 seconds timeout

  logger.debug(`Making request to: ${url}`, {
    service: "python-api-trigger",
    method: "callApi",
  });
  logger.debug(`Request data: ${JSON.stringify(data, null, 2)}`, {
    service: "python-api-trigger",
    method: "callApi",
  });

  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.debug(`Request timeout reached (${TIMEOUT_MS}ms), aborting...`, {
        service: "python-api-trigger",
        method: "callApi",
      });
      controller.abort();
    }, TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      logger.debug(`Response status: ${response.status}`, {
        service: "python-api-trigger",
        method: "callApi",
      });
      logger.debug(
        `Response headers: ${JSON.stringify(
          Object.fromEntries(response.headers.entries()),
        )}`,
        { service: "python-api-trigger", method: "callApi" },
      );

      const responseData = await response.json();
      logger.debug(`Response data: ${JSON.stringify(responseData, null, 2)}`, {
        service: "python-api-trigger",
        method: "callApi",
      });

      return {
        status: response.status,
        data: responseData,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      logger.error(`Request timeout after ${TIMEOUT_MS}ms to ${url}`);
      throw new Error(`Request timeout after ${TIMEOUT_MS}ms to ${url}`);
    }

    logger.error(`Error calling ${url}: ${error.message}`, error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(`Network error calling ${url}: ${error.message}`);
    } else if (error.name === "SyntaxError") {
      throw new Error(`Invalid JSON response from ${url}: ${error.message}`);
    } else {
      throw new Error(`Failed to call API ${url}: ${error.message}`);
    }
  }
}
