import { Payload, WrappedPayload } from "../types/payload";
import { logInfo } from "./logger";

// Function to group payloads by flowId and sort within each group by createdAt
// export function groupAndSortPayloadsByFlowId(flowID: string, payloads: Payload[]): Record<string, WrappedPayload[]> {
//   return payloads.reduce((grouped, element) => {
//     const { flowId } = element;

//     // Initialize the group if not already present
//     if (!grouped[flowId]) {
//       grouped[flowId] = [];
//     }

//     // Push payload to the respective flowId group
//     grouped[flowId].push(element);

//     // Sort the group by createdAt timestamp
//     grouped[flowId].sort(
//       (a, b) => new Date(a.payload.createdAt).getTime() - new Date(b.payload.createdAt).getTime()
//     );

//     return grouped;
//   }, {} as Record<string, WrappedPayload[]>);
// }

// Function to sort payloads within each flowId group by createdAt
export function sortPayloadsByCreatedAt(
  grouped: Record<string, Payload[]>
): Record<string, Payload[]> {
  logInfo({
    message: "Entering sortPayloadsByCreatedAt function. Sorting payloads by createdAt...",
    meta: {
      grouped,
    },
  });
  Object.keys(grouped).forEach((key) => {
    if (Array.isArray(grouped[key])) {
      grouped[key].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
  });
  logInfo({
    message: "Exiting sortPayloadsByCreatedAt function. Sorted payloads by createdAt.",
    meta: {
      grouped,
    },
  });
  return grouped;
}
