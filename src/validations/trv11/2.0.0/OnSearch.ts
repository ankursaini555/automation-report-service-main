import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import {
  getTransactionIds,
  saveData,
  updateApiMap,
} from "../../../utils/redisUtils";
import assert from "assert";

export async function checkOnSearch(
  element: Payload,
  sessionID: string,
  flowId: string
): Promise<TestResult> {
  const payload = element;
  if (!payload) {
    logger.error("Payload is missing");
    return { response: {}, passed: [], failed: ["Payload is missing"] };
  }

  const action = payload?.action?.toLowerCase();
  logger.info(`Inside ${action} validations`);

  const testResults: TestResult = {
    response: {},
    passed: [],
    failed: [],
  };

  const { jsonRequest, jsonResponse } = payload;
  if (jsonResponse?.response) testResults.response = jsonResponse?.response;


  const { message } = jsonRequest;
  const transactionId = jsonRequest.context?.transaction_id;
  await updateApiMap(sessionID, transactionId, action);
  
  const providers = message?.catalog?.providers || [];

  // Iterate over providers
  for (const provider of providers) {
    const fulfillments = provider.fulfillments || [];
    const items = provider.items;

    // Checks for on_search_1
    if (!items) {
      logger.info("Validating fulfillments for on_search");

      try {
        assert.ok(
          fulfillments.every(
            (fulfillment: any) => fulfillment.type === "ROUTE"
          ),
          "Fulfillments.type should be ROUTE"
        );
        testResults.passed.push("Fulfillments.type is ROUTE");
      } catch (error: any) {
        logger.error(`Error during on_search_1 validation: ${error.message}`);
        testResults.failed.push(`${error.message}`);
      }
    }

    // Checks for on_search_2
    if (items) {
      logger.info("Iterating and saving items for on_search");
      try {
        await saveData(sessionID, transactionId, "onSearchItemArr", {
          value: items,
        });
      } catch (error) {
        logger.error(error);
      }

      logger.info("Validating fulfillments for on_search");

      try {
        assert.ok(
          fulfillments.every((fulfillment: any) => fulfillment.type === "TRIP"),
          "Fulfillments.type should be TRIP"
        );
        testResults.passed.push("Fulfillments.type is TRIP");
      } catch (error: any) {
        logger.error(`Error during on_search_2 validation: ${error.message}`);
        testResults.failed.push(`${error.message}`);
      }

      logger.info("Checking minimum and maximum item quantity in items");
      try {
       
        assert.ok(
          items.every(
            (item: any) =>
              item?.quantity?.minimum?.count < item?.quantity?.maximum?.count
          ),
          "Quantity.minimum.count can't be greater than quantity.maximum.count at items"
        );
        
        testResults.passed.push(
          "Valid items/quantity maximum and minimum count"
        );
      } catch (error: any) {
        logger.error(`Error during on_search validation: ${error.message}`);
        testResults.failed.push(`${error.message}`);
      }
    }
  }

  if (testResults.passed.length < 1 && testResults.failed.length<1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
