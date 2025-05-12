import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import { updateApiMap } from "../../../utils/redisUtils";

export async function checkOnSelect(
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
  const items = message?.order?.items;
  let itemQuantity: number = 0;
  for (const item of items) {
    itemQuantity = item?.quantity?.selected?.count;
  }
  const fulfillments = message?.order?.fulfillments;
  try {
    logger.info(`Checking number of fulfillments in ${action}`);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const count = item?.quantity?.selected?.count;
      const expectedLength = count ;

      // Assertion: Check if fulfillment_ids.length matches count 
      assert.ok(
        item?.fulfillment_ids?.length === expectedLength,
        `In /items, expected fulfillment_ids.length to be ${expectedLength}, but got ${item.fulfillment_ids.length}`
      );
      testResults.passed.push(
        `Number of fulfillments are expected as per the selected quantity for item ${item?.id}`
      );

      // Assertion: Check if all fulfillment_ids exist in the fulfillments array
      for (let j = 0; j < item.fulfillment_ids.length; j++) {
        const id = item?.fulfillment_ids[j];
        const fulfillmentExists = fulfillments.some(
          (fulfillment: any) => fulfillment.id === id
        );

        assert.ok(
          fulfillmentExists,
          `In /items, Fulfillment ID '${id}' not found in fulfillments array`
        );
      }
      testResults.passed.push(
        `All fulfillment ids in /items for ${item?.id} are correctly mapped to the fulfillments array`
      );
    }
  } catch (error: any) {
    testResults.failed.push(`${error.message}`);
  }

  if (testResults.passed.length < 1 && testResults.failed.length<1)
    testResults.passed.push(`Validated ${action}`);

  return testResults;
}
