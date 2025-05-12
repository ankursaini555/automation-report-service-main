import assert from "assert";
import { TestResult, Payload } from "../../../types/payload";
import { logger } from "../../../utils/logger";
import { fetchData } from "../../../utils/redisUtils";

export async function checkOnUpdate(
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
  const quote = message?.order?.quote;

  if (context?.domain === "ONDC:LOG11") {
    try {
      assert.ok(
        fulfillments.every(
          (fulfillment: any) => fulfillment["@ondc/org/awb_no"]
        ),
        "AWB no is required for P2H2P shipments"
      );
      testResults.passed.push("AWB number for P2H2P validation passed");
    } catch (error: any) {
      logger.error(`Error during ${action} validation: ${error.message}`);
      testResults.failed.push(error.message);
    }
    let shippingLabel;
    fulfillments.every((fulfillment: any) => {
      const tags = fulfillment?.tags;
      shippingLabel = tags?.find((tag: any) => tag.code === "shipping_label");
    });

    try {
      assert.ok(
        shippingLabel,
        "Shipping label is required for P2H2P shipments"
      );
      testResults.passed.push("Shipping label for P2H2P validation passed");
    } catch (error: any) {
      logger.error(`Error during ${action} validation: ${error.message}`);
      testResults.failed.push(error.message);
    }
  }
  try {
    assert.ok(
      fulfillments.every(async (fulfillment: any) => {
        const rts = await fetchData(
          sessionID,
          transactionId,
          `${fulfillment?.id}:rts`
        );
        return rts?.value === "yes" && fulfillment?.start?.time?.range;
      }),
      "Pickup time range (fulfillments/start/time/range) to be provided if ready_to_ship = yes in /update"
    );
    testResults.passed.push("Pickup time range validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(error.message);
  }

  try {
    assert.ok(
      fulfillments.every(async (fulfillment: any) => {
        const ffState = ["Pending", "Agent-assigned", "Searching-for-agent"];
        return (
          ffState.includes(fulfillment?.state?.descriptor?.code) &&
          (fulfillment?.start?.time?.timestamp ||
            fulfillment?.end?.time?.timestamp)
        );
      }),
      "Pickup timestamp (fulfillments/start/time/timestamp) or Delivery timestamp (fulfillments/end/time/timestamp) cannot be provided as the order has not been picked up"
    );
    testResults.passed.push("Pickup/Delivery timestamp validation passed");
  } catch (error: any) {
    logger.error(`Error during ${action} validation: ${error.message}`);
    testResults.failed.push(error.message);
  }
  if (flowId === "WEIGHT_DIFFERENTIAL_FLOW") {
    let diffTagsPresent = false;

    for (const fulfillment of fulfillments) {
      const ffState = fulfillment?.state?.descriptor?.code;
      // Validate presence of 'linked_order_diff'
      const hasDiffTag = fulfillment.tags.some(
        (tag: { code: string }) => tag.code === "linked_order_diff"
      );

      // Validate presence of 'linked_order_diff_proof'
      const hasDiffProofTag = fulfillment.tags.some(
        (tag: { code: string }) => tag.code === "linked_order_diff_proof"
      );

      if (hasDiffTag) diffTagsPresent = true;
      if (ffState !== "Agent-assigned") {
        try {
          assert.ok(
            hasDiffProofTag && hasDiffTag,
            `'linked_order_diff' and 'linked_order_diff_proof' tags are missing in fulfillment.tags`
          );
          testResults.passed.push("diff tags validation passed");
        } catch (error: any) {
          logger.error(`Error during ${action} validation: ${error.message}`);
          testResults.failed.push(error.message);
        }
      }
    }
    if (diffTagsPresent) {
      // Validate presence of 'diff' entry
      const hasDiffBreakup = quote.breakup.some(
        (b: { [x: string]: string }) => b["@ondc/org/title_type"] === "diff"
      );

      // Validate presence of 'tax_diff' entry
      const hasTaxDiffBreakup = quote.breakup.some(
        (b: { [x: string]: string }) => b["@ondc/org/title_type"] === "tax_diff"
      );

      try {
        assert.ok(
          hasDiffBreakup && hasTaxDiffBreakup,
          `'diff' and 'tax_diff' titles are missing in quote.breakup`
        );
        testResults.passed.push(
          "diff items in quote breakup validation passed"
        );
      } catch (error: any) {
        logger.error(`Error during ${action} validation: ${error.message}`);
        testResults.failed.push(error.message);
      }
    }
  }
  if (testResults.passed.length < 1 && testResults.failed.length < 1)
    testResults.passed.push(`Validated ${action}`);
  return testResults;
}
