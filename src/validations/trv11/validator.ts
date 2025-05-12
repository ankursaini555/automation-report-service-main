import { ValidationAction } from "../../types/actions"; // Importing ValidationAction type for valid actions
import { TestResult, Payload, WrappedPayload } from "../../types/payload"; // Importing types for test results and payload
import { logger } from "../../utils/logger"; // Importing logger utility to log errors
import { checkJsonResponse } from "./responseSchemaValidator"; // Importing function to validate JSON response schema
import { saveData } from "../../utils/redisUtils";
// Main validation function that processes the given payload based on the action
export const validate = async (
  element: Payload, // The payload object that contains the data to be validated
  action: ValidationAction, // The action type that specifies which validation test to run
  sessionID: string,
  flowId: string
): Promise<TestResult> => {
  // Extracting version from the JSON request context
  const version = element?.jsonRequest?.context?.version;


  // Initializing an object to store test results (passed, failed, and response data)
  let testResults: TestResult = { response: {}, passed: [], failed: [] };

  try {
    const { jsonResponse } = element;

    // If a JSON response is available, validate its schema
    if (jsonResponse) {
      checkJsonResponse(jsonResponse, testResults); // Check the schema of the response
    }

    // Dynamically import test files based on the version
    try {
      const { checkSearch } = await import(`./${version}/search`); // Importing the 'search' test based on the version
      const { checkOnSearch } = await import(`./${version}/OnSearch`); // Importing the 'on_search' test based on the version
      const { checkSelect } = await import(`./${version}/select`); // Importing the 'select' test based on the version
      const { checkOnSelect } = await import(`./${version}/OnSelect`); // Importing the 'on_select' test based on the version
      const { checkInit } = await import(`./${version}/init`); // Importing the 'init' test based on the version
      const { checkOnInit } = await import(`./${version}/OnInit`); // Importing the 'on_init' test based on the version
      const { checkConfirm } = await import(`./${version}/confirm`); // Importing the 'confirm' test based on the version
      const { checkOnConfirm } = await import(`./${version}/OnConfirm`); // Importing the 'on_confirm' test based on the version
      const { checkOnStatus } = await import(`./${version}/OnStatus`); // Importing the 'on_status' test based on the version
      const { checkCancel } = await import(`./${version}/cancel`);
      const { checkOnCancel } = await import(`./${version}/OnCancel`);
      const { checkStatus } = await import(`./${version}/status`);
      const { checkOnUpdate } = await import(`./${version}/OnUpdate`);

      // Helper function to run a specific test and handle its result
      const runTest = async (
        testFunction: Function, // The specific test function to be executed
        element: Payload, // The payload to be passed to the test function
        testResults: TestResult // The test results object to be updated
      ) => {
        try {
          // Execute the test function and wait for the result
          const testResult = await testFunction(element, sessionID, flowId);

          // Add passed and failed results to the test results
          testResults.passed.push(...testResult.passed);
          testResults.failed.push(...testResult.failed);

          // If the test provides a response, update the response in test results
          if (testResult.response) {
            testResults.response = testResult.response;
          }
        } catch (err: any) {
          // If an error occurs in the test function, add it to the failed results
          testResults.failed.push(`Test function error: ${err.message}`);
          // Log the stack trace for debugging
          logger.error(`Test function error: ${err.stack}`);
        }
      };

      // Switch statement to determine which action test to execute
      switch (action) {
        case "search":
          await runTest(checkSearch, element, testResults);
          break;

        case "on_search":
          await runTest(checkOnSearch, element, testResults);
          break;

        case "select":
          await runTest(checkSelect, element, testResults);
          break;

        case "on_select":
          await runTest(checkOnSelect, element, testResults);
          break;

        case "init":
          await runTest(checkInit, element, testResults);
          break;

        case "on_init":
          await runTest(checkOnInit, element, testResults);
          break;

        case "confirm":
          await runTest(checkConfirm, element, testResults);
          break;

        case "on_confirm":
          await runTest(checkOnConfirm, element, testResults);
          break;

        case "on_status":
          await runTest(checkOnStatus, element, testResults);
          break;

        case "cancel":
          await runTest(checkCancel, element, testResults);
          break;

        case "on_cancel":
          await runTest(checkOnCancel, element, testResults);
          break;

        case "status":
          await runTest(checkStatus, element, testResults);
          break;

        case "on_update":
          await runTest(checkOnUpdate, element, testResults);
          break;
        default:
          // If the action is not recognized, add a failure message
          testResults.failed.push(
            `No matching test function found for ${action}.`
          );
          break;
      }
    } catch (err: any) {
      // If an error occurs during the dynamic import of version-specific tests, log the error and add a failure message
      testResults.failed.push(`Incorrect version for ${action}`);
      logger.error(`Error importing version-specific tests: ${err.stack}`);
    }

    // Return the final test results (response, passed, failed)
    return testResults;
  } catch (error: any) {
    // Log any unexpected errors that occur during validation
    logger.error(`Error during validation: ${error.message}`);
    // Return a result indicating failure in test execution
    return {
      response: {},
      passed: [],
      failed: [`Error during ${action} test execution`],
    };
  }
};
