import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import { saveData } from "../../../utils/redisUtils";

export async function checkConfirm(
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
  const transactionId = context?.transactionId;
  const createdAt = message?.order?.created_at;
  const updatedAt = message?.order?.updated_at;
  const fulfillments = message?.order?.fulfillments;

  saveData(sessionID, transactionId, "createdAt", createdAt);
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
      "order.updated_at cannot be future dated w.r.t context/timestamp"
    );
    testResults.passed.push("order.updated_at timestamp validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }

  try {
    fulfillments.every(
      (fulfillment: { type: string; id: string; tags?: any[] }) => {
        if (
          fulfillment.type === "Delivery" &&
          Array.isArray(fulfillment.tags)
        ) {
          return fulfillment.tags.some((tag) => {
            if (tag.code === "state" && Array.isArray(tag.list)) {
              return tag.list.some((list: { code: string; value: any }) => {
                if (list.code === "ready_to_ship") {
                  const rts = list.value;
                  saveData(
                    sessionID,
                    transactionId,
                    `${fulfillment.id}:rts`,
                    rts
                  );
                  return true;
                }
                return false;
              });
            }
            return false;
          });
        }
        return true; // Ensuring `every` can continue checking other fulfillments
      }
    );
  } catch (error: any) {
    logger.error(error.message);
  }
  if (flowId === "CASH_ON_DELIVERY_FLOW") {
    try {
      const fulfillments = message?.order?.fulfillments || [];

      let allFulfillmentsHaveTag = true;

      for (const fulfillment of fulfillments) {
        const tags = fulfillment?.tags || [];
        const hasCodSettlementTag = tags.some(
          (tag: { code: string }) => tag.code === "cod_settlement_detail"
        );

        if (!hasCodSettlementTag) {
          allFulfillmentsHaveTag = false;
          break;
        }
      }

      assert.ok(
        allFulfillmentsHaveTag,
        `message.order.fulfillments must have a tag with code "cod_settlement_detail"`
      );

      testResults.passed.push(
        `fulfillments have the "cod_settlement_detail" tag`
      );
    } catch (error: any) {
      testResults.failed.push(error.message);
    }
  }
  if (testResults.passed.length < 1 && testResults.failed.length < 1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
