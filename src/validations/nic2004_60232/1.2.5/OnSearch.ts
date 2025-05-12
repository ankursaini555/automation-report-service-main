import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";

export async function checkOnSearch(
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
  const onSearch = message?.catalog;
  let validFulfillmentIDs = new Set<string>();

  const formatDate = (date: Date): string => date.toISOString().split("T")[0];
  const extractTATHours = (duration: string): number | null => {
    if (!duration) return null;

    const daysMatch = duration.match(/P(\d+)D/); // Extracts days (e.g., "P4D")
    const hoursMatch = duration.match(/T(\d+)H/); // Extracts hours (e.g., "T12H")

    const days = daysMatch ? parseInt(daysMatch[1]) * 24 : 0;
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;

    return days + hours;
  };
  function getTimestampFromDuration(
    date: string | Date,
    duration: string
  ): string {
    console.log("duratioN", duration);
    const durationRegex = /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/;
    const match = duration.match(durationRegex);

    if (!match) {
      throw new Error("Invalid ISO 8601 duration format");
    }

    const days = match[1] ? parseInt(match[1], 10) || 0 : 0;
    const hours = match[2] ? parseInt(match[2], 10) || 0 : 0;
    const minutes = match[3] ? parseInt(match[3], 10) || 0 : 0;
    const seconds = match[4] ? parseInt(match[4], 10) || 0 : 0;

    const futureDate = new Date(date);

    futureDate.setDate(futureDate.getDate() + days);
    futureDate.setHours(futureDate.getHours() + hours);
    futureDate.setMinutes(futureDate.getMinutes() + minutes);
    futureDate.setSeconds(futureDate.getSeconds() + seconds);

    return futureDate.toISOString();
  }
  const currentDate = formatDate(contextTimestamp);
  let nextDate: Date = new Date(contextTimestamp); // Ensure it's a Date object
  nextDate.setDate(nextDate.getDate() + 1);
  const formattedNextDate: string = formatDate(nextDate); // Store formatted string separately
  let hasForwardShipment = false;
  let hasBackwardShipment = false;

  onSearch?.["bpp/providers"].forEach(
    (provider: { fulfillments: any[]; categories: any[]; items: any[] }) => {
      provider.fulfillments.forEach((fulfillment) => {
        validFulfillmentIDs.add(fulfillment.id);

        if (fulfillment.type === "Delivery") {
          hasForwardShipment = true;
        }
        if (fulfillment.type === "RTO") {
          hasBackwardShipment = true;
        }
      });

      try {
        assert.ok(
          hasForwardShipment && hasBackwardShipment,
          "Both forward shipment (Delivery) and backward shipment (RTO) should be provided in the catalog"
        );
        testResults.passed.push(
          "Forward and backwardshipment validation passed"
        );
      } catch (error: any) {
        testResults.failed.push(error.message);
      }
      provider.categories.forEach((category) => {
        const tatHours = extractTATHours(category?.time?.duration);
        let expectedDate = new Date(
          getTimestampFromDuration(contextTimestamp, category?.time?.duration)
        )
          .toISOString()
          .split("T")[0]; // Extracts YYYY-MM-DD

        try {
          if (["Standard Delivery", "Express Delivery"].includes(category.id)) {
            assert.ok(
              category.time?.timestamp === expectedDate,
              `In bpp/providers/categories, for ${category.id}, expected TAT date should be ${expectedDate} based on duration (${category?.time?.duration})`
            );

            testResults.passed.push(
              `TAT validation passed for category ${category.id} (Expected: ${expectedDate})`
            );
          }
        } catch (error: any) {
          testResults.failed.push(error.message);
        }
        if (
          [
            "Same Day Delivery",
            "Immediate Delivery",
            "Instant Delivery",
          ].includes(category.id) &&
          category.time?.timestamp !== currentDate
        ) {
          testResults.failed.push(
            `In bpp/providers/categories, for ${category.id}, TAT date should be ${currentDate}`
          );
        }

        if (
          category.id === "Next Day Delivery" &&
          category.time?.timestamp !== nextDate
        ) {
          testResults.failed.push(
            `In bpp/providers/categories, for Next Day Delivery, TAT date should be ${formattedNextDate}`
          );
        }
      });

      provider.items.forEach((item, i) => {
        const tatHours = extractTATHours(item?.time?.duration);

        let expectedDate = tatHours
          ? formatDate(
              new Date(contextTimestamp.getTime() + tatHours * 60 * 60 * 1000)
            )
          : null;

        try {
          if (
            ["Standard Delivery", "Express Delivery"].includes(
              item.category_id
            ) &&
            item?.time
          ) {
            assert.ok(
              item.time?.timestamp === expectedDate,
              `For item ${item.id} (${item.category_id}), expected TAT date should be ${expectedDate} based on duration (${item?.time?.duration})`
            );

            testResults.passed.push(
              `TAT validation passed for item ${item.id} (${item.category_id}) (Expected: ${expectedDate})`
            );
          }
        } catch (error: any) {
          testResults.failed.push(error.message);
        }
        if (
          [
            "Same Day Delivery",
            "Immediate Delivery",
            "Instant Delivery",
          ].includes(item.category_id) &&
          item.time?.timestamp !== currentDate
        ) {
          testResults.failed.push(
            `For ${item.category_id}, TAT date should be ${currentDate} (item ${item.id})`
          );
        }

        if (
          item.category_id === "Next Day Delivery" &&
          item.time?.timestamp !== nextDate
        ) {
          testResults.failed.push(
            `For Next Day Delivery, TAT date should be ${nextDate} - item ${item.id}`
          );
        }

        try {
          assert.ok(
            validFulfillmentIDs.has(item.fulfillment_id || ""),
            `Item ${item.id} and fulfillment_id does not match any fulfillment ID`
          );
          testResults.passed.push(
            `Fulfillment ID mapping validation passed for item ${item.id}`
          );
        } catch (error: any) {
          testResults.failed.push(error.message);
        }
      });
    }
  );

  if (testResults.passed.length < 1 && testResults.failed.length < 1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
