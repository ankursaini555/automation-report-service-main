import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import { compareDates } from "../../../utils/constants";

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
  if (testResults.passed.length < 1 && testResults.failed.length < 1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
