import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import { fetchData } from "../../../utils/redisUtils";

export async function checkOnConfirm(
  element: Payload,
  sessionID: string,
  flowId: string
): Promise<TestResult> {
  const payload = element;
  const action = payload?.action.toLowerCase();
  logger.info(`Inside ${action} validations`);

  const testResults: TestResult = {
    response: {},
    passed: [],
    failed: [],
  };

  const { jsonRequest, jsonResponse } = payload;
  if (jsonResponse?.response) testResults.response = jsonResponse?.response;

  const { context, message } = jsonRequest;
  const contextTimestamp = context?.timestamp;
  const transactionId = context.transaction_id;
  const createdAt = message?.order?.created_at;
  const updatedAt = message?.order?.updated_at;
  const fulfillments = message?.order?.fulfillments;
  try {
    assert.ok(
      contextTimestamp > createdAt || contextTimestamp === createdAt,
      "order.created_at timestamp cannot be future dated w.r.t context/timestamp"
    );
    testResults.passed.push("order.created_at timestamp validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }

  try {
    assert.ok(
      contextTimestamp > updatedAt || contextTimestamp === updatedAt,
      "order.updated_at timestamp cannot be future dated w.r.t context/timestamp"
    );
    testResults.passed.push("order.updated_at timestamp validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }

  try {
    assert.ok(
      createdAt < updatedAt,
      "order/created_at` cannot be future dated w.r.t `order/updated_at"
    );
    testResults.passed.push(
      "order.created_at is future dated w.r.t order.updated_at"
    );
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }

  try {
    const confirmCreatedAt = await fetchData(sessionID, transactionId, "createdAt");
    assert.ok(
      updatedAt !== confirmCreatedAt,
      "order/updated_at` should be updated w.r.t context/timestamp"
    );
    testResults.passed.push("order.updated_at is updated correctly");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }

  try {
    assert.ok(
      fulfillments.every((fulillment: any) => {
        if (fulillment.type === "Delivery") {
          return !fulillment?.start?.time?.timestamp;
        }
      }),
      "Pickup timestamp (fulfillments/start/time/timestamp cannot be provided before order is picked up"
    );
    testResults.passed.push(
      "Timestamp check in fulfillments/start/time passed"
    );
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }

  try {
    assert.ok(
      fulfillments.every((fulillment: any) => {
        if (fulillment.type === "Delivery") {
          return !fulillment?.end?.time?.timestamp;
        }
      }),
      "Delivery timestamp (fulfillments/end/time/timestamp cannot be provided before order is picked up"
    );
    testResults.passed.push("Timestamp (not required) check in fulfillments/end/time passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }

  try {
    assert.ok(
      fulfillments.every(async (fulillment: any) => {
        const rts = await fetchData(
          sessionID,
          transactionId,
          `${fulillment.id}:rts`
        );
        if (fulillment.type === "Delivery" && rts?.value === "yes") {
          return fulillment?.start?.time?.range;
        }
      }),
      `Pickup time range (fulfillments/start/time/range) should be provided if ready_to_ship = yes in /confirm`
    );
    testResults.passed.push("Pickup time range (not required) validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }
  if (testResults.passed.length < 1 && testResults.failed.length<1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
