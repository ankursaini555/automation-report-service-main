import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import { saveData } from "../../../utils/redisUtils";

export async function checkInit(
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
  const billingCreatedAt = message?.order?.billing?.created_at;
  const billingUpdatedAt = message?.order?.billing?.created_at;
  saveData(sessionID, transactionId, "billingTimestamp", billingCreatedAt);
  try {
  
    assert.ok(
      billingCreatedAt <= contextTimestamp,
      "Billing timestamp cannot be future dated w.r.t context/timestamp"
    );
    testResults.passed.push("Billing created_at timestamp validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }
  try {
  
    assert.ok(
      billingCreatedAt === billingUpdatedAt,
      "Billing created_at timestamp should be equal to updated_at"
    );
    testResults.passed.push("Billing updated_at timestamp validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }

  if (testResults.passed.length < 1 && testResults.failed.length < 1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
