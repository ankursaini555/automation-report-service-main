import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";

export async function checkOnTrack(
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

  const contextTimestamp = new Date(context?.timestamp || "");
  const locationTimestamp = new Date(message?.tracking?.location?.time?.timestamp || "");
  const updatedTimestamp = new Date(message?.tracking?.location?.updated_at || "");

  try {
    assert.ok(
      locationTimestamp <= contextTimestamp && locationTimestamp <= updatedTimestamp,
      "Location timestamp should not be future dated w.r.t context timestamp and updated timestamp"
    );
    testResults.passed.push("Location timestamp validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(error.message);
  }

  try {
    assert.ok(
      updatedTimestamp <= contextTimestamp,
      "Updated timestamp should not be future dated w.r.t context timestamp"
    );
    testResults.passed.push("Updated timestamp validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(error.message);
  }

  if (testResults.passed.length < 1 && testResults.failed.length < 1)
    testResults.passed.push(`Validated ${action}`);

  return testResults;
}