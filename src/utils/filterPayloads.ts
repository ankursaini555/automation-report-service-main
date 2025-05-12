import { WrappedPayload } from "../types/payload";
import { logger } from "./logger";

export async function filterPayloads(
  payloads: WrappedPayload[],
  flowIdToPayloadIdsMap: Record<string, string[]>
): Promise<WrappedPayload[]> {
  const filteredPayloads: WrappedPayload[] = [];

  logger.info("Starting payload filtering...");

  for (const wrappedPayload of payloads) {
    const { flowId, payloadId } = wrappedPayload.payload;

    // Check if the flowId is present in the map
    if (!(flowId in flowIdToPayloadIdsMap)) {
      logger.info(
        `FlowId ${flowId} not found in map, skipping payload with ID ${payloadId}`
      );
      continue;
    }

    const validPayloadIds = flowIdToPayloadIdsMap[flowId];

    // Check if the payloadId matches the valid ones for the flowId
    if (validPayloadIds.includes(payloadId)) {
      filteredPayloads.push(wrappedPayload);
    }
  }

  logger.info(`Filtering complete.`);
  return filteredPayloads;
}
