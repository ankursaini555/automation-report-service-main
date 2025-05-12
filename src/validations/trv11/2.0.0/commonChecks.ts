import { Payload, TestResult } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import assert from "assert";
export async function checkCommon(
  payload: Payload,
  sessionID: string,
  flowId: string
): Promise<TestResult> {
  const testResults: TestResult = {
    response: {},
    passed: [],
    failed: [],
  };

  const { jsonRequest } = payload;
  const { message } = jsonRequest;

  const provider = message?.order?.provider;
  const quote = message?.order?.quote;

  // 1. Process fulfillments only once

  const fulfillments = provider?.fulfillments;

  //   // Validate unique IDs in fulfillments
  //   try {
  //     const ids = fulfillments.map((fulfillment: any) => fulfillment.id);
  //     const uniqueIds = new Set(ids);
  //     assert.strictEqual(ids.length, uniqueIds.size, "Ids must be unique");
  //     testResults.passed.push("Ids are unique");
  //   } catch (error: any) {
  //     testResults.failed.push(`Unique Ids check: ${error.message}`);
  //   }

  // Validate GPS precision and parent_item_id references
  try {
    if (fulfillments) {
      for (const fulfillment of fulfillments) {
        // Check GPS precision
        for (const stop of fulfillment.stops) {
          if (stop.location && stop.location.gps) {
            const gps = stop.location.gps;
            const gpsRegex = /^\d{1,3}\.\d{6}$/; // regex to match 6 decimal precision
            assert.ok(gpsRegex.test(gps), "GPS must have 6 decimal precision");
          }
        }
        const stops = fulfillment.stops;
        for (let i = 1; i < stops.length; i++) {
          const previousStop = stops[i - 1];
          const currentStop = stops[i];
          assert.strictEqual(
            currentStop.parent_item_id,
            previousStop.id,
            "parent_item_id should refer to previous stop id"
          );
          const stop = stops[i];
          if (stop.location && stop.location.gps) {
            const gps = stop.location.gps;
            const gpsRegex = /^\d{1,3}\.\d{6}$/; // regex to match 6 decimal precision
            assert.ok(gpsRegex.test(gps), "GPS must have 6 decimal precision");
          }
        }
        testResults.passed.push("parent_item_id refers to previous stop id");
        testResults.passed.push("Stops.gps has 6 decimal precision");
      }
    }
  } catch (error: any) {
    testResults.failed.push(`${error.message}`);
  }

  //2. Valid titles for quote.breakup
  try {
    if (quote && quote.breakup) {
      for (const breakupItem of quote.breakup) {
        const validTitles = ["BASE_FARE", "REFUND", "CANCELLATION_CHARGES","DISTANCE_FARE"];
        assert.ok(
          validTitles.includes(breakupItem?.title),
          "Invalid title in quote.breakup"
        );

        // Only REFUND & CANCELLATION_CHARGES should be included if cancellation is being made
        if (["REFUND", "CANCELLATION_CHARGES"].includes(breakupItem.title)) {
          assert.ok(
            message?.order?.status === "CANCELLED" ||
              message?.order?.status === "SOFT_CANCEL",
            "REFUND and CANCELLATION_CHARGES should be included only if cancellation is being made"
          );
        }
      }
      testResults.passed.push("Valid titles in quote.breakup");
    }
  } catch (error: any) {
    testResults.failed.push(`Quote.breakup validation: ${error.message}`);
  }

  return testResults;
}
