import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import {
  compareDates,
  LBNPfeatureFlow,
  rules,
  validateLBNPFeaturesForFlows,
} from "../../../utils/constants";

export async function checkSearch(
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
  const holidays = message?.intent?.provider?.time?.schedule?.holidays;
  const intentTags = message?.intent?.tags;

  try {
    assert.ok(
      Array.isArray(holidays) && holidays.length > 0
        ? holidays.every((holiday: string | number | Date) => {
            const holidayDate = new Date(holiday);
            return compareDates(holidayDate, contextTimestamp);
          })
        : true, // If no holidays, the check should pass
      "provider/holidays should not be past dated"
    );

    testResults.passed.push("provider/holidays date check validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(`${error.message}`);
  }

  if (LBNPfeatureFlow.includes(flowId)) {
    const isValid = validateLBNPFeaturesForFlows(flowId, rules, intentTags);
    try {
      assert.ok(
        isValid,
        `Feature code needs to be published in the catalog/tags`
      );
      testResults.passed.push(
        `Feature code in catalog/tags validation passed `
      );
    } catch (error: any) {
      testResults.failed.push(error.message);
    }
  }

  if (flowId === "PREPAID_PAYMENT_FLOW") {
    try {
      assert.ok(
        message?.intent?.payment?.type === "ON-ORDER",
        `Payment type should be ON-ORDER for prepaid payment flow`
      );
      testResults.passed.push(`Payment type validation passed`);
    } catch (error: any) {
      testResults.failed.push(error.message);
    }
  }

  if (flowId === "CASH_ON_DELIVERY_FLOW") {
    const fulfillmentTags = message?.intent?.fulfillment?.tags;

    const linkedOrderTag = fulfillmentTags?.find(
      (tag: { code: string }) => tag.code === "linked_order"
    );

    try {
      const codOrderTag = linkedOrderTag?.list?.find?.(
        (tag: { code: string; value: string }) =>
          tag.code === "cod_order" && tag.value.toLowerCase() === "yes"
      );

      assert.ok(
        codOrderTag,
        `cod_order tag with value "yes" should be present inside linked_order tag list`
      );

      testResults.passed.push(`cod_order tag validation passed`);
    } catch (error: any) {
      testResults.failed.push(error.message);
    }

    try {
      const collectionTag = linkedOrderTag?.list?.find?.(
        (tag: { code: string; value: string }) =>
          tag.code === "collection_amount"
      );

      assert.ok(
        collectionTag,
        `collection_amount tag should be present inside linked_order tag list`
      );

      testResults.passed.push(`collection_amount tag validation passed`);
    } catch (error: any) {
      testResults.failed.push(error.message);
    }
  }
  if (testResults.passed.length < 1 && testResults.failed.length < 1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
