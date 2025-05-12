import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import { fetchData, saveData } from "../../../utils/redisUtils";
import { statesAfterPickup } from "../../../utils/constants";

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
  if (jsonResponse?.response) testResults.response = jsonResponse?.response;

  const { context, message } = jsonRequest;
  const transactionId = context?.transaction_id;
  const contextTimestamp = context?.timestamp;
  const fulfillments = message?.order?.fulfillments;
  const orderState = message?.order?.state;
  const paymentStatus = message?.order?.payment?.status;
  const paymentType = message?.order?.payment?.type;
  const paymentTimestamp = message?.order?.payment?.time?.timestamp;

  if (orderState === "Complete" && paymentType === "ON-FULFILLMENT") {
    try {
      assert.ok(
        paymentStatus == "PAID",
        "Payment status should be 'PAID' once the order is complete for payment type 'ON-FULFILLMENT'"
      );
      testResults.passed.push("Payment status validation passed");
    } catch (error: any) {
      logger.error(`Error during ${action} validation: ${error.message}`);
      testResults.failed.push(error.message);
    }
  }
  if (
    orderState === "Complete" &&
    paymentType === "ON-FULFILLMENT" &&
    paymentStatus === "PAID"
  ) {
    try {
      assert.ok(
        paymentTimestamp,
        "Payment timestamp should be provided once the order is complete and payment has been made"
      );
      testResults.passed.push("Payment timestamp validation passed");
    } catch (error: any) {
      logger.error(`Error during ${action} validation: ${error.message}`);
      testResults.failed.push(error.message);
    }
  } else if (paymentType === "POST-FULFILLMENT" && paymentStatus === "PAID") {
    try {
      assert.ok(
        !paymentTimestamp,
        "Payment timestamp should not be provided as payment type is 'POST-FULFILLMENT'"
      );
      testResults.passed.push("Payment timestamp validation passed");
    } catch (error: any) {
      logger.error(`Error during ${action} validation: ${error.message}`);
      testResults.failed.push(error.message);
    }
  } else if (paymentStatus === "NOT-PAID") {
    try {
      assert.ok(
        !paymentTimestamp,
        "Payment timestamp should not be provided if the payment is yet not made"
      );
      testResults.passed.push("Payment timestamp validation passed");
    } catch (error: any) {
      logger.error(`Error during ${action} validation: ${error.message}`);
      testResults.failed.push(error.message);
    }
  }

  try {
    for (const fulfillment of fulfillments) {
      if (fulfillment.type === "Delivery") {
        const ffState = fulfillment?.state?.descriptor?.code;
        const pickupTimestamp = fulfillment?.start?.time?.timestamp;
        const deliveryTimestamp = fulfillment?.end?.time?.timestamp;
        const trackingTag = fulfillment?.tags?.find(
          (tag: { code: string }) => tag.code === "tracking"
        );

        if (context.domain === "ONDC:LOG11") {
          try {
            assert.ok(
              fulfillment["@ondc/org/awb_no"],
              "AWB no is required for P2H2P shipments"
            );
            testResults.passed.push("AWB number validation passed");
          } catch (error: any) {
            logger.error(`Error during ${action} validation: ${error.message}`);
            testResults.failed.push(error.message);
          }
        }

        try {
          const prePickupStates = [
            "Pending",
            "Agent-assigned",
            "Searching-for-agent",
            "At-pickup",
          ].includes(ffState);
          const hasTimestamps = pickupTimestamp || deliveryTimestamp;

          assert.ok(
            !(prePickupStates && hasTimestamps),
            `Pickup/Delivery timestamp should not be provided when fulfillment state is '${ffState}'`
          );

          testResults.passed.push(
            "Pickup/Delivery timestamp requirement validation passed"
          );
        } catch (error: any) {
          logger.error(`Error during ${action} validation: ${error.message}`);
          testResults.failed.push(error.message);
        }

        try {
          assert.ok(
            !(
              [
                "Agent-assigned",
                "Order-picked-up",
                "Out-for-delivery",
              ].includes(ffState) && orderState !== "In-progress"
            ),
            "Order state should be 'In-progress'"
          );
          testResults.passed.push("Order state validation passed");
        } catch (error: any) {
          logger.error(`Error during ${action} validation: ${error.message}`);
          testResults.failed.push(error.message);
        }

        if (ffState === "Order-picked-up" && pickupTimestamp) {
          saveData(
            sessionID,
            transactionId,
            "pickupTimestamp",
            pickupTimestamp
          );
          try {
            assert.ok(
              contextTimestamp >= pickupTimestamp,
              "Pickup timestamp cannot be future-dated w.r.t context timestamp"
            );
            testResults.passed.push("Pickup timestamp validation passed");
          } catch (error: any) {
            logger.error(`Error during ${action} validation: ${error.message}`);
            testResults.failed.push(error.message);
          }
        }
        const pickedTimestamp = await fetchData(
          sessionID,
          transactionId,
          "pickupTimestamp"
        );
        if (
          ["Out-for-delivery", "At-destination-hub", "In-transit"].includes(
            ffState
          ) &&
          pickedTimestamp
        ) {
          try {
            assert.ok(
              pickupTimestamp === pickedTimestamp,
              `Pickup timestamp cannot change once fulfillment state is '${ffState}'`
            );
            testResults.passed.push(
              "Pickup timestamp immutability validation passed"
            );
          } catch (error: any) {
            logger.error(`Error during ${action} validation: ${error.message}`);
            testResults.failed.push(error.message);
          }
        }
        if (ffState === "Order-delivered" && deliveryTimestamp) {
          try {
            assert.ok(
              contextTimestamp >= deliveryTimestamp,
              "Delivery timestamp cannot be future-dated w.r.t context timestamp"
            );
            testResults.passed.push("Delivery timestamp validation passed");
          } catch (error: any) {
            logger.error(`Error during ${action} validation: ${error.message}`);
            testResults.failed.push(error.message);
          }
        }
        const tags = fulfillment?.tags;
        if (ffState === "Pickup-rescheduled") {
          const VALID_REASON_IDS = [
            "001",
            "002",
            "003",
            "004",
            "005",
            "006",
            "007",
            "008",
            "009",
            "010",
            "011",
            "012",
          ]; // example enums

          try {
            const fulfillmentDelayTag = tags.find(
              (tag: { code: string }) => tag.code === "fulfillment_delay"
            );
            assert.ok(fulfillmentDelayTag, "'fulfillment_delay' tag not found");
            testResults.passed.push(
              `fulfillments have the "fulfillment_delay" tag`
            );
          } catch (error: any) {
            console.error("Validation Error [Tag Exists]:", error.message);
            testResults.failed.push(error.message);
          }

          const fulfillmentDelayTag = tags.find(
            (tag: { code: string }) => tag.code === "fulfillment_delay"
          )!;
          const tagList = fulfillmentDelayTag.list;

          try {
            const hasState = tagList.some(
              (item: { code: string; value: string }) =>
                item.code === "state" && item.value === "Order-picked-up"
            );
            assert.ok(
              hasState,
              "Missing or invalid 'state' with value 'Order-picked-up' in fulfillment_delay tag"
            );
            testResults.passed.push(`Valid state in "fulfillment_delay" tag`);
          } catch (error: any) {
            console.error("Validation Error [State]:", error.message);
            testResults.failed.push(error.message);
          }

          try {
            const hasAttempt = tagList.some(
              (item: { code: string; value: string }) =>
                item.code === "attempt" && item.value === "yes"
            );
            assert.ok(
              hasAttempt,
              "Missing or invalid 'attempt' with value 'yes' in fulfillment_delay tag"
            );
            testResults.passed.push(`Valid attempt in "fulfillment_delay" tag`);
          } catch (error: any) {
            console.error("Validation Error [Attempt]:", error.message);
            testResults.failed.push(error.message);
          }

          try {
            const reasonItem = tagList.find(
              (item: { code: string }) => item.code === "reason_id"
            );
            assert.ok(reasonItem, "'reason_id' is missing");
            assert.ok(
              VALID_REASON_IDS.includes(reasonItem.value),
              `Invalid 'reason_id'. Must be one of ${VALID_REASON_IDS.join(
                ", "
              )} in fulfillment_delay tag`
            );
            testResults.passed.push(
              `Valid reason id in "fulfillment_delay" tag`
            );
          } catch (error: any) {
            console.error("Validation Error [Reason ID]:", error.message);
            testResults.failed.push(error.message);
          }
        }
        if (ffState === "Delivery-rescheduled") {
          const VALID_REASON_IDS = [
            "001",
            "002",
            "003",
            "004",
            "005",
            "006",
            "007",
            "008",
          ];

          const fulfillmentDelayTags = tags.filter(
            (tag: { code: string }) => tag.code === "fulfillment_delay"
          );

          try {
            assert.ok(
              fulfillmentDelayTags.length >= 2,
              "Expected two 'fulfillment_delay' tags"
            );
            testResults.passed.push(
              `fulfillments have two "fulfillment_delay" tags`
            );
          } catch (error: any) {
            console.error("Validation Error [Tag Count]:", error.message);
            testResults.failed.push(error.message);
          }

          const requiredStates = ["Order-picked-up", "Order-delivered"];

          for (const state of requiredStates) {
            const tagWithState = fulfillmentDelayTags.find(
              (tag: { list: { code: string; value: string }[] }) =>
                tag.list.some(
                  (item: { code: string; value: string }) =>
                    item.code === "state" && item.value === state
                )
            );

            try {
              assert.ok(
                tagWithState,
                `No 'fulfillment_delay' tag found with state = '${state}'`
              );
              testResults.passed.push(
                `fulfillment (${state}) has "fulfillment_delay" tag`
              );
            } catch (error: any) {
              console.error(
                `Validation Error [${state} - Tag Missing]:`,
                error.message
              );
              testResults.failed.push(error.message);
              continue;
            }

            const list = tagWithState!.list;

            try {
              const hasAttempt = list.some(
                (item: { code: string; value: string }) =>
                  item.code === "attempt" && item.value === "yes"
              );
              assert.ok(
                hasAttempt,
                `Missing or invalid 'attempt' = 'yes' for state '${state}'`
              );
              testResults.passed.push(
                `fulfillment (${state}) has 'attempt' tag in "fulfillment_delay" tag`
              );
            } catch (error: any) {
              console.error(
                `Validation Error [${state} - Attempt]:`,
                error.message
              );
              testResults.failed.push(error.message);
            }

            try {
              const reasonItem = list.find(
                (item: { code: string }) => item.code === "reason_id"
              );
              assert.ok(
                reasonItem,
                `'reason_id' is missing for state '${state}'`
              );
              assert.ok(
                VALID_REASON_IDS.includes(reasonItem!.value),
                `Invalid 'reason_id' for state '${state}'. Must be one of ${VALID_REASON_IDS.join(
                  ", "
                )}`
              );
              testResults.passed.push(
                `fulfillment (${state}) has 'reason_id' tag in "fulfillment_delay" tag`
              );
            } catch (error: any) {
              console.error(
                `Validation Error [${state} - Reason ID]:`,
                error.message
              );
              testResults.failed.push(error.message);
            }
          }
        }
        if (
          ffState === "Order-delivered" &&
          flowId === "CASH_ON_DELIVERY_FLOW"
        ) {
          try {
            const tags = fulfillment?.tags || [];
            const hasCodSettlementTag = tags.some(
              (tag: { code: string }) => tag.code === "cod_collection_detail"
            );

            assert.ok(
              hasCodSettlementTag,
              `fulfillments must have a tag with code "cod_settlement_details"`
            );

            testResults.passed.push(
              `fulfillments have the "cod_settlement_details" tag`
            );
          } catch (error: any) {
            testResults.failed.push(error.message);
          }
        }
        const isOrderPickedUp = statesAfterPickup.includes(ffState);
        const isTrackingEnabled = Boolean(fulfillment.tracking); // Ensure boolean value
        console.log(isTrackingEnabled);
        console.log(isOrderPickedUp);

        const isTrackingTagPresent =
          trackingTag !== undefined && trackingTag !== null;
        // Only check tracking tag if tracking is enabled
        if (isOrderPickedUp && isTrackingEnabled) {
          try {
            assert.ok(
              isTrackingTagPresent,
              "Tracking tag must be provided once order is picked up and tracking is enabled"
            );
            testResults.passed.push("Tracking tag validation passed");
          } catch (error: any) {
            logger.error(`Error during ${action} validation: ${error.message}`);
            testResults.failed.push(error.message);
          }
        } else if (!isTrackingEnabled) {
          testResults.failed.push(
            `tracking should be enabled (true) in fulfillments/tracking`
          );
        }
      }
    }
  } catch (error: any) {
    logger.error(
      `Unexpected error during ${action} validation: ${error.message}`
    );
    testResults.failed.push(`Unexpected error: ${error.message}`);
  }

  if (testResults.passed.length < 1 && testResults.failed.length < 1) {
    testResults.passed.push(`Validated ${action}`);
  }

  return testResults;
}
