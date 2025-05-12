import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { checkCommon } from "./commonChecks";
import { logger } from "../../../utils/logger";
import { fetchData, updateApiMap } from "../../../utils/redisUtils";

export async function checkOnCancel(
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

  const transactionId = jsonRequest.context?.transaction_id;

  if (jsonResponse?.response) testResults.response = jsonResponse?.response;
  const { message } = jsonRequest;
  const orderStatus = message?.order?.status;
  const apiMapObject = await fetchData(sessionID, transactionId, "apiMap");
  const apiMap = apiMapObject?.value;
  if (apiMap) {
    if (apiMap[apiMap.length - 1] === "soft_cancel") {
      try {
        assert.ok(
          orderStatus === "SOFT_CANCEL",
          `Order status should be 'SOFT_CANCEL'`
        );
        testResults.passed.push(`Order status is valid : ${orderStatus}`);
      } catch (error: any) {
        testResults.failed.push(`${error?.message}`);
      }
    } else if (apiMap[apiMap.length - 1] === "confirm_cancel") {
      if (flowId === "USER_CANCELLATION_FLOW" || flowId === "TECHNICAL_CANCELLATION_FLOW") {
        try {
          assert.ok(
            orderStatus === "CANCELLED",
            `Order status should be valid, current status:  ${orderStatus}`
          );
          testResults.passed.push(`Order status is valid : ${orderStatus}`);
        } catch (error: any) {
          testResults.failed.push(`${error?.message}`);
        }
      }
      if (
        flowId === "DELAYED_CANCEL_REJECTED_FLOW" ||
        flowId === "DELAYED_CANCEL_ACCEPTED_FLOW"
      ) {
        try {
          assert.ok(
            orderStatus === "CANCELLATION_INITIATED",
            `Order status should be valid, current status:  ${orderStatus}`
          );
          testResults.passed.push(`Order status is valid : ${orderStatus}`);
        } catch (error: any) {
          testResults.failed.push(`${error?.message}`);
        }
      }
    }
  }
  await updateApiMap(sessionID, transactionId, action);
  // Apply common checks for all versions
  const commonResults = await checkCommon(payload, sessionID, flowId);
  testResults.passed.push(...commonResults.passed);
  testResults.failed.push(...commonResults.failed);

  if (testResults.passed.length < 1 && testResults.failed.length<1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
