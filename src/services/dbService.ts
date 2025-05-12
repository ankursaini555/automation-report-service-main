import axios from "axios";
import { Payload, WrappedPayload } from "../types/payload";
import dotenv from "dotenv";
import { logError, logInfo } from "../utils/logger";

// Load environment variables
dotenv.config();

const API_URL = `${process.env.STORAGE_URL}/payload/ids`;

export async function fetchPayloads(requestBody: Record<string, string[]>): Promise<Record<string, Payload[]>> {
  logInfo({
    message: `Entering fetchPayloads function. Fetching payloads...`,
    meta: {
      requestBody,
    },
  });

  try {
    const results = await Promise.all(
      Object.entries(requestBody).map(async ([flowId, payloadIds]) => {
        try {
          const response = await axios.post<{ payloads: Payload[] }>(API_URL, { payload_ids: payloadIds }, {
            headers: { "Content-Type": "application/json" },
          });
          logInfo({
            message: `Fetched payloads for flow ID ${flowId}`,
            meta: {
              flowId,
              payloads: response.data.payloads,
            },
          });
          return { [flowId]: response.data.payloads };
        } catch (error) {
          // console.error(`Error fetching payloads for flow ID ${flowId}:`, error);
          logError({
            message: `Error fetching payloads for flow ID ${flowId}`,
            error,
            meta: {
              flowId,
              error,
            },
          });
          return { [flowId]: [] }; // Return an empty array in case of an error
        }
      })
    );
    logInfo({
      message: "Exiting fetchPayloads function. Fetched payloads.",
      meta: {
        results,
      },
    });
    return Object.assign({}, ...results);
  } catch (error) {
    // console.error("Error fetching data:", error);
    logError({
      message: "Error in fetchPayloads function",
      error: new Error("Failed to fetch payloads"),
      meta: {
        error,
      },
    });
    throw new Error("Failed to fetch payloads");
  }
}

export async function fetchSessionDetails(sessionID: string): Promise<any> {
  logInfo({
    message: `Entering fetchSessionDetails function. Fetching session details for session ID: ${sessionID}`,
    meta: {
      sessionID,
    },
  });
  try {
    const storageUrl = `${process.env.STORAGE_URL}/api/sessions/${sessionID}`;
    const response = await axios.get<WrappedPayload[]>(storageUrl);
    logInfo({
      message: `Exiting fetchSessionDetails function. Fetched session details.`,
      meta: {
        sessionID,
        response: response.data,
      },
    });
    return response.data;
  } catch (error) {
    let errorDetails = "Unknown error";
    
    if (axios.isAxiosError(error) && error.response) {
      errorDetails = JSON.stringify(error.response.data);
    }
    
    // console.error(`Failed to fetch details for session ID ${sessionID}:`, errorDetails);
    logError({
      message: `Failed to fetch details for session ID ${sessionID}`,
      error: new Error(errorDetails),
      meta: {
        sessionID,
        errorDetails,
      },
    });
    throw new Error(`Failed to fetch details for session ID ${sessionID}, Details: ${errorDetails}`);
  }
}
