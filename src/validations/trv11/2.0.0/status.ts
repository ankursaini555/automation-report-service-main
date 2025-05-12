import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { checkCommon } from "./commonChecks";
import { logger } from "../../../utils/logger";
import { updateApiMap } from "../../../utils/redisUtils";

export async function checkStatus(
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

  const transactionId = jsonRequest.context?.transaction_id;
  await updateApiMap(sessionID, transactionId, action);
  const { fulfillments, message } = jsonRequest;

  // Test: Fulfillments array length should be proportional to selected count where each fulfillment obj will refer to an individual TICKET
  // try {
  //   const selectedCount = message.selected_count;
  //   assert.strictEqual(fulfillments.length, selectedCount, "Fulfillments array length should be proportional to selected count");
  //   testResults.passed.push("Fulfillments array length is proportional to selected count");
  // } catch (error: any) {
  //   testResults.failed.push(`Fulfillments array length check: ${error.message}`);
  // }

  // Apply common checks for all versions
  //   const commonResults = await checkCommon(payload, sessionID, flowId);
  //   testResults.passed.push(...commonResults.passed);
  //   testResults.failed.push(...commonResults.failed);

  if (testResults.passed.length < 1 && testResults.failed.length<1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
