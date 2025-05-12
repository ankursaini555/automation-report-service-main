import { RedisService } from "ondc-automation-cache-lib";
import { logger } from "./logger";

// Function to save data under sessionId and transactionId

/**
 * Saves key value pairs under sessionId and transactionId.
 * @param {string} sessionId - The session ID.
 * @param {string} transactionId - The transaction ID.
 * @param {string} key - The key to add.
 * @param {string} value - The value to add.
 */
export const saveData = async (
  sessionId: string,
  transactionId: string,
  key: string,
  value: Record<string, any> // Accept JSON object
): Promise<void> => {
  try {
    // Create a unique key in the format sessionId:transactionId:key
    const redisKey = `${sessionId}:${transactionId}:${key}`;

    // Serialize the JSON object to a string
    const serializedValue = JSON.stringify(value);

    // Save the serialized value with optional TTL
    await RedisService.setKey(redisKey, serializedValue, 3600);
  } catch (error) {
    logger.error("Error saving data:", error);
  }
};

// Function to fetch data for a specific key under sessionId and transactionId
export const fetchData = async (
  sessionId: string,
  transactionId: string,
  key: string
): Promise<Record<string, any> | null> => {
  try {
    const redisKey = `${sessionId}:${transactionId}:${key}`;

    // Fetch the serialized value
    const serializedValue = await RedisService.getKey(redisKey);

    if (!serializedValue) {
      logger.error(`No data found for key: ${redisKey}`);
      return null;
    }
    // Deserialize the JSON object
    const value = JSON.parse(serializedValue);

    return value;
  } catch (error) {
    logger.error("Error fetching data:", error);
    return null;
  }
};

const sessionTransactionMap = new Map<
  string,
  Map<string, { transactionId: string }[]>
>();

/**
 * Add a transaction ID to a session's flow.
 * @param {string} sessionId - The session ID.
 * @param {string} flowId - The flow ID.
 * @param {string} transactionId - The transaction ID to add.
 */
export const addTransactionId = async (
  sessionId: string,
  flowId: string,
  transactionId: string
) => {
  // Check if the sessionId exists; initialize with a new Map containing the flowId if it doesn't

  try {
    if (!sessionTransactionMap.has(sessionId)) {
      const flowMap = new Map<string, { transactionId: string }[]>();
      flowMap.set(flowId, []);
      sessionTransactionMap.set(sessionId, flowMap);
    }

    // Get the flow map for the session
    const flowMap = sessionTransactionMap.get(sessionId);

    if (!flowMap?.has(flowId)) {
      flowMap?.set(flowId, []);
    }

    const transactions = flowMap?.get(flowId) ?? [];

    // Check if the transactionId already exists
    const isDuplicate = transactions.some(
      (t) => t.transactionId === transactionId
    );

    if (!isDuplicate) {
      transactions.push({ transactionId });
    }

    flowMap?.set(flowId, transactions); // Ensure the updated list is stored

    // Convert the nested structure to an object for storage in Redis
    const sessionData = Object.fromEntries(flowMap?.entries() || []);

    await RedisService.setKey(
      `${sessionId}:transactionMap`,
      JSON.stringify(sessionData)
    );
  } catch (error) {
    logger.error(error);
  }
};

/**
 * Get all transaction IDs for a specific session and flow.
 * @param {string} sessionId - The session ID.
 * @param {string} flowId - The flow ID.
 * @returns {Promise<string[]>} - Array of transaction IDs for the session and flow.
 */
export const getTransactionIds = async (
  sessionId: string,
  flowId: string
): Promise<string[]> => {
  // Retrieve session data from Redis
  const sessionTransactionData = await RedisService.getKey(
    `${sessionId}:transactionMap`
  );

  if (!sessionTransactionData) {
    logger.error(`No transaction data found for session "${sessionId}".`);
    return [];
  }

  // Parse the data as a nested object structure
  const sessionData: Record<string, { transactionId: string }[]> = JSON.parse(
    sessionTransactionData
  );

  // Check if the flowId exists in the session data
  const transactions = sessionData[flowId];

  if (!transactions) {
    logger.error(
      `No transactions found for flow "${flowId}" in session "${sessionId}".`
    );
    return [];
  }

  // Extract only the transactionId values and return them
  return transactions.map((transaction) => transaction.transactionId);
};

export async function updateApiMap(
  sessionID: string,
  transactionId: string,
  action: string
) {
  // Fetch the current apiMap
  try {
    let apiMap = await fetchData(sessionID, transactionId, "apiMap");

    // Extract the `value` field
    apiMap = apiMap?.value;
    // If apiMap exists, push the new action
    if (apiMap && apiMap.length > 0) {
      apiMap.push(action);
    } else {
      // If apiMap does not exist, initialize it with the new action
      apiMap = [action];
    }
    // Save the updated apiMap
    await saveData(sessionID, transactionId, "apiMap", { value: apiMap });
  } catch (error: any) {
    logger.error(`${error.message}`);
  }
}
