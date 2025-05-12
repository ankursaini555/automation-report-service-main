import { Payload } from "../types/payload";
import { ParsedPayload } from "../types/parsedPayload";
import { RedisService } from "ondc-automation-cache-lib";
import { FLOW_MAPPINGS } from "./constants";
import { logError, logInfo } from "./logger";

export async function parseFlows(
  flows: {
    [flowId: string]: Payload[];
  },
  sessionID: string
): Promise<{ [flowId: string]: ParsedPayload }> {
  logInfo({
    message: "Entering parseFlows function. Parsing flows...",
    meta: { sessionID, flows },
  });
  const parsedFlows: { [flowId: string]: ParsedPayload } = {};

  let sessionDetails: any = await RedisService.getKey(
    `sessionDetails:${sessionID}`
  );

  sessionDetails = JSON.parse(sessionDetails);

  const domain = sessionDetails?.domain;
  const version = sessionDetails?.version;

  // Parse each flow's payloads and create parsed payloads
  for (const [flowId, flowPayloads] of Object.entries(flows)) {
    const mappedFlowId = FLOW_MAPPINGS[flowId];

    try {
      parsedFlows[flowId] = parsePayloads(
        mappedFlowId,
        flowPayloads,
        domain,
        version
      );
    } catch (error) {
      // console.error(`Error parsing flow ${flowId}:`, error);
      logError({
        message: `Error parsing flow ${flowId}`,
        error,
        meta: {
          flowId,
        },
      });
      // Optionally handle invalid flows by adding an empty or error state.
      parsedFlows[flowId] = {
        domain: domain,
        version: version,
        flow: mappedFlowId,
        payload: {},
      };
    }
  }
  logInfo({
    message: "Exiting parseFlows function. Parsed flows.",
    meta: { sessionID, parsedFlows },
  });
  return parsedFlows;
}

function parsePayloads(
  flowId: string,
  payloads: Payload[],
  domain: string,
  version: string
): ParsedPayload {
  logInfo({
    message: "Entering parsePayloads function. Parsing payloads...",
    meta: { flowId, payloads, domain, version },
  });
  const parsedPayload: ParsedPayload = {
    domain: domain,
    version: version,
    flow: flowId,
    payload: {},
  };

  // Group payloads by action
  const groupedPayloads: { [key: string]: Payload[] } = payloads.reduce(
    (groups, payload) => {
      const action = payload.action?.toLowerCase();
      if (!action) {
        // console.warn(
        //   `Missing action in payload for flow ID ${flowId}`,
        //   payload
        // );
        logInfo({
          message: `Missing action in payload for flow ID ${flowId}`,
          meta: {
            flowId,
            payload,
          },
        });
        return groups;
      }
      if (!groups[action]) {
        groups[action] = [];
      }
      groups[action].push(payload);
      return groups;
    },
    {} as { [key: string]: Payload[] }
  );

  // Sort payloads by createdAt timestamp
  const allPayloads: Payload[] = Object.values(groupedPayloads).flat();
  allPayloads.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  logInfo({
    message: "Sorted payloads by action and createdAt timestamp",
    meta: {
      flowId,
      allPayloads,
    },
    });
  // Counters for numbered actions (search, on_search, cancel, on_cancel)
  const actionCounters: { [key: string]: number } = {
    search: 0,
    on_search: 0,
    cancel: 0,
    on_cancel: 0,
  };

  // Flags for first `cancel` and `on_cancel`
  let firstCancelMapped = false;
  let firstOnCancelMapped = false;

  // Process payloads
  allPayloads.forEach((payload) => {
    const action = payload.action?.toLowerCase();
    if (!action) {
      // console.warn(`Missing action in payload for flow ID ${flowId}`, payload);
      logInfo({
        message: `Missing action in payload for flow ID ${flowId}`,
        meta: {
          flowId,
          payload,
        },
      });
      return;
    }

    // Handling `search` and `on_search` actions with numbering
    if (action === "search" || action === "on_search") {
      actionCounters[action]++;
      const key = `${action}_${actionCounters[action]}`;
      parsedPayload.payload[key] = payload.jsonRequest;
    }
    // Handling `select`, `on_select`, `init`, `on_init`, `confirm`, `on_confirm`, etc.
    else if (
      action === "select" ||
      action === "on_select" ||
      action === "init" ||
      action === "on_init" ||
      action === "confirm" ||
      action === "on_confirm" ||
      action === "status" ||
      action === "on_status"
    ) {
      parsedPayload.payload[action] = payload.jsonRequest;
    }
    // Handling `cancel` actions
    else if (action === "cancel") {
      if (!firstCancelMapped) {
        parsedPayload.payload.soft_cancel = payload.jsonRequest;
        firstCancelMapped = true;
      } else {
        actionCounters.cancel++;
        const key = `cancel_${actionCounters.cancel}`;
        parsedPayload.payload[key] = payload.jsonRequest;
      }
    }
    // Handling `on_cancel` actions
    else if (action === "on_cancel") {
      if (!firstOnCancelMapped) {
        parsedPayload.payload.soft_on_cancel = payload.jsonRequest;
        firstOnCancelMapped = true;
      } else {
        actionCounters.on_cancel++;
        const key = `on_cancel_${actionCounters.on_cancel}`;
        parsedPayload.payload[key] = payload.jsonRequest;
      }
    }
  });

  // Ensure all keys are added (even if empty)
  const actionKeys = [
    "select",
    "on_select",
    "init",
    "on_init",
    "confirm",
    "on_confirm",
    "status",
    "on_status",
    "soft_cancel",
    "soft_on_cancel",
    "cancel",
    "on_cancel",
  ];

  actionKeys.forEach((key) => {
    if (!(key in parsedPayload.payload)) {
      parsedPayload.payload[key] = {};
    }
  });
  logInfo({
    message: "Exiting parsePayloads function. Parsed payloads.",
    meta: { flowId, parsedPayload },
  });
  
  return parsedPayload;
}
