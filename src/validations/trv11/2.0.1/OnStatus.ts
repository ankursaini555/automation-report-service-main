import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import { updateApiMap } from "../../../utils/redisUtils";

export async function checkOnStatus(
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
  await updateApiMap(sessionID, transactionId, action);

  if (jsonResponse?.response) testResults.response = jsonResponse?.response;
  const { context, message } = jsonRequest;
  const contextTimestamp = context?.timestamp;
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
      const expectedLength = count + 1;

      // Assertion: Check if fulfillment_ids.length matches count + 1
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

  try {
    // Log the action being checked for authorization validation
    logger.info(`Checking authorization object in ${action}`);

    // Iterate through each fulfillment to validate authorization timestamps
    for (const fulfillment of fulfillments) {
      // Check if the fulfillment is of type 'TICKET' and has 'stops'
      if (fulfillment.type === "TICKET" && fulfillment.stops) {
        // Validate each stop's authorization timestamp
        const isValid = fulfillment.stops.every((stop: any) => {
          const authorization = stop?.authorization;

          // Ensure 'authorization.valid_upto' is greater than the context timestamp
          assert.ok(
            authorization.valid_upto > contextTimestamp,
            "Authorization.valid_to timestamp should be greater than context.timestamp for fulfillment with type 'TICKET'"
          );

          return true; // Continue if the assertion passes
        });

        // If validation fails, it will throw an error caught in the catch block
        if (!isValid) break;
      }
    }

    // If no error was thrown, mark the test as passed
    testResults.passed.push(
      "Authorization.valid_to timestamp is valid w.r.t context.timestamp for fulfillment with type 'TICKET'"
    );
  } catch (error: any) {
    // Log and record the failure reason
    testResults.failed.push(error.message);
  }

  if (flowId === "DELAYED_CANCELlATION_FLOW") {
    try {
      assert.ok(
        message?.order?.status === "COMPLETED",
        `Order status should be 'COMPLETED'`
      );
      testResults.passed.push(
        `Order status is valid, current status : ${message?.order?.status}`
      );
    } catch (error: any) {
      testResults.failed.push(`${error?.message}`);
    }
  }

  if (testResults.passed.length < 1 && testResults.failed.length<1)
    testResults.passed.push(`Validated ${action}`);

  return testResults;
}
