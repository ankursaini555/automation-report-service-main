import assert from "assert";
import { Payload, TestResult, WrappedPayload } from "../../../types/payload";
import { checkCommon } from "./commonChecks";
import { logger } from "../../../utils/logger";
import { updateApiMap } from "../../../utils/redisUtils";

export async function checkOnUpdate(
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
  const { message } = jsonRequest;

  if (flowId === "DELAYED_CANCELlATION_FLOW") {
    try {
      assert.ok(
        message?.order?.status === "CANCELLED",
        `Order status should be 'CANCELLED'`
      );
      testResults.passed.push(
        `Order status is valid, current status : ${message?.order?.status}`
      );
    } catch (error: any) {
      testResults.failed.push(`${error?.message}`);
    }
  }

  // Apply common checks for all versions
  const commonResults = await checkCommon(payload, sessionID, flowId);
  testResults.passed.push(...commonResults.passed);
  testResults.failed.push(...commonResults.failed);

  if (testResults.passed.length < 1 && testResults.failed.length<1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
