import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import { fetchData, saveData } from "../../../utils/redisUtils";

export async function checkUpdate(
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
  const updatedAt = message?.order?.updated_at;
  const fulfillments = message?.order?.fulfillments;

  try {
    assert.ok(
      contextTimestamp > updatedAt || contextTimestamp === updatedAt,
      "order.updated_at timestamp should be less than or equal to context/timestamp"
    );
    testResults.passed.push("order.updated_at timestamp validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }
  try {
    for (const fulfillment of fulfillments) {
      if (fulfillment.type === "Delivery") {
        let rts;

        fulfillment.tags.some(
          (tag: { code: string; list: { code: string; value: any }[] }) => {
            if (tag.code === "state" && Array.isArray(tag.list)) {
              return tag.list.some((list: { code: string; value: any }) => {
                if (list.code === "ready_to_ship") {
                  rts = list.value;
                  saveData(
                    sessionID,
                    transactionId,
                    `${fulfillment?.id}:rts`,
                    rts
                  );
                  return true; // Stop iteration once found
                }
                return false;
              });
            }
            return false;
          }
        );

        assert.ok(
          rts === "yes" ? fulfillment?.start?.instructions : true,
          `Pickup instructions (fulfillments/start/instructions) should be provided if ready_to_ship = yes`
        );
      }
    }

    testResults.passed.push("Pickup instructions validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }

  if (testResults.passed.length < 1 && testResults.failed.length<1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
