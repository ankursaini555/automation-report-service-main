import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import { fetchData, updateApiMap } from "../../../utils/redisUtils";
import { BUYER_CANCEL_CODES } from "../../../utils/constants";

export async function checkCancel(
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
  // await updateApiMap(sessionID, transactionId, action);

  if (jsonResponse?.response) testResults.response = jsonResponse?.response;
  const { fulfillments, message } = jsonRequest;
  let apiMapObject = await fetchData(sessionID, transactionId, "apiMap");
  let apiMap = apiMapObject?.value;
  if (apiMap) {
    if (apiMap[apiMap.length - 1] === "on_confirm") {
      try {
        assert.ok(
          message?.descriptor?.code === "SOFT_CANCEL" ||
            message?.descriptor?.code === "CONFIRM_CANCEL",
          `message.descriptor.code should be 'SOFT_CANCEL/CONFIRM_CANCEL`
        );
        testResults.passed.push(
          `Valid message.descriptor.code (${message?.descriptor?.code})`
        );
        assert.ok(
          BUYER_CANCEL_CODES.includes(message?.cancellation_reason_id),
          `Appropriate cancellation reason id to be used for buyer side cancellation`
        );
        testResults.passed.push(
          `Valid cancellation reason id (${message?.cancellation_reason_id})`
        );
      } catch (error: any) {
        testResults.failed.push(`${error?.message}`);
      }
      if (message?.descriptor?.code === "SOFT_CANCEL")
        await updateApiMap(sessionID, transactionId, "soft_cancel");
      else if (message?.descriptor?.code === "CONFIRM_CANCEL") {
        await updateApiMap(sessionID, transactionId, "confirm_cancel");
      }
    } else if (apiMap[apiMap.length - 1] === "on_cancel") {
      try {
        assert.ok(
          message?.descriptor?.code === "CONFIRM_CANCEL",
          `message.descriptor.code should be 'CONFIRM_CANCEL`
        );
        testResults.passed.push(
          `Valid message.descriptor.code (CONFIRM_CANCEL)`
        );
        assert.ok(
          BUYER_CANCEL_CODES.includes(message?.cancellation_reason_id),
          `Appropriate cancellation reason id to be used for buyer side cancellation`
        );
        testResults.passed.push(
          `Valid cancellation reason id (${message?.cancellation_reason_id})`
        );
      } catch (error: any) {
        testResults.failed.push(`${error?.message}`);
      }

      await updateApiMap(sessionID, transactionId, "confirm_cancel");
    } else if (apiMap[apiMap.length - 1] === "on_status") {
      await updateApiMap(sessionID, transactionId, "technical_cancel");
    } else {
      await updateApiMap(sessionID, transactionId, action);
    }
  }

  if (testResults.passed.length < 1 && testResults.failed.length<1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
