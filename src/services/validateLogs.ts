import { ApiResponse } from "../types/utilityResponse";
import axios, { AxiosError } from "axios";
import { ParsedPayload } from "../types/parsedPayload";
import { Result } from "../types/result";
import dotenv from "dotenv";
import { VALIDATION_URL } from "../utils/constants";
import { logError, logger, logInfo } from "../utils/logger";
dotenv.config();

export async function validateFlows(parsedFlows: {
  [flowId: string]: ParsedPayload;
}): Promise<{ flowId: string; results: Result }[]> {
  logInfo({
    message: "Entering validateFlows function. Validating flows...",
    meta: parsedFlows,
  });
  try {
    const validatedFlows = await Promise.all(
      Object.entries(parsedFlows).map(async ([flowId, parsedPayload]) => {
        const results = await validateLogs(flowId, parsedPayload);
        return { flowId, results };
      })
    );
    logInfo({
      message: "Exiting validateFlows function. Validated flows.",
      meta: {validatedFlows},
    });
    return validatedFlows;
  } catch (error) {
    // console.error("Error occurred while validating flows:", error);
    logInfo({
      message: "Error occurred while validating flows",
      error,
      meta: {
        parsedFlows,
      },
    });
    throw error;
  }
}

export async function validateLogs(
  flowId: string,
  parsedPayload: ParsedPayload
): Promise<Result> {
  logInfo({
    message: "Entering validateLogs function. Validating logs...",
    meta: { flowId, parsedPayload },
  });
  const validationUrl =
   VALIDATION_URL[parsedPayload?.domain] ||
    "https://log-validation.ondc.org/api/validate";

  // logger.info(`Utility URL : ${validationUrl}`);
  logInfo({
    message: "Utility URL:",
    meta: { validationUrl },
  });
  try {
    const response = await axios.post<ApiResponse>(
      validationUrl,
      parsedPayload
    );
    logInfo({
      message: "Exiting validateLogs function. Validated logs.",
      meta: { flowId, response: response.data },
    }); 
    // Wrap the successful response in a `ValidationResult`
    return { success: true, response: response.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiResponse>;

      // Capture and return error details
      const statusCode = axiosError.response?.status || "Unknown status code";
      const errorDetails = axiosError.response?.data || {
        message: "No response data",
      };
      logError({
        message: "Error occurred during validation : Axios error",
        error: axiosError,
        meta: {
          flowId,
          statusCode,
          errorDetails,
        },
      });
      return {
        success: false,
        error: `Validation failed with status ${statusCode}`,
        details: errorDetails,
      };
    }
    logError({
      message: "Error occurred during validation : Non-axios error",
      error,
      meta: {
        flowId,
      },
    });
    // Handle unexpected errors
    return {
      success: false,
      error: "Unexpected error during validation",
      details: (error as Error).message,
    };
  }
}
