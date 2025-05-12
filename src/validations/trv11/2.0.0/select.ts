import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import { fetchData, updateApiMap } from "../../../utils/redisUtils";

export async function checkSelect(
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
  const { message } = jsonRequest;

  const transactionId = jsonRequest.context?.transaction_id;
  await updateApiMap(sessionID, transactionId, action);
  logger.info("Validating items in select");
  const items = message?.order?.items;
  const onSearchItems = await fetchData(
    sessionID,
    transactionId,
    "onSearchItemArr"
  );

  if (onSearchItems) {
    // Validate each item's `quantity.selected.count` against the catalog's `quantity.maximum.count`

    for (const item of items) {
      const catalogItem = onSearchItems.value.find(
        (catItem: any) => catItem?.id === item?.id
      );

      if (!catalogItem) {
        console.error(`Catalog item with ID ${item.id} not found.`);
        continue;
      }

      try {
        // Assert that selected count is less than or equal to maximum count
        assert.ok(
          item.quantity.selected.count <= catalogItem.quantity.maximum.count,
          `Item ${item?.id}: Selected count (${item.quantity.selected.count}) exceeds the maximum count (${catalogItem.quantity.maximum.count}) in the catalog.`
        );
        testResults.passed.push(`Valid item quantity for item id: ${item?.id}`);
      } catch (error: any) {
        logger.error(error.message);
        testResults.failed.push(`${error.message}`);
      }
    }
  }

  if (testResults.passed.length < 1 && testResults.failed.length<1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
