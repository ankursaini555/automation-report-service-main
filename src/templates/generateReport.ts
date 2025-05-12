import { writeFileSync } from "fs";
import { FlowValidationResult, ParsedMessage, Report } from "../types/payload";
import { logInfo } from "../utils/logger";

// Generate the HTML report
export function generateCustomHTMLReport(data: Report) {
  logInfo({
    message: "Entering generateCustomHTMLReport function.  Generating custom HTML report",
    meta: {data},
    });
  const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Flow Validation Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f7f7f7;
            color: #333;
          }
          h1 {
            text-align: center;
            color: #0056a6;
            margin-bottom: 30px;
            font-size: 26px;
          }
          .flow-card {
            background: #fff;
            margin-bottom: 25px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border: 1px solid #ddd;
            margin-top: 15px;
          }
          .flow-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .flow-id {
             max-width: 100%; 
  width: 100%; 
            font-size: 18px;
            font-weight: bold;
            color: #0056a6;
             margin-bottom: 8px;
              overflow: hidden;
  white-space: normal;
   display: block;
    
          }
          .validity {
            font-size: 14px;
            padding: 5px 12px;
            border-radius: 18px;
            color: #fff;
            font-weight: bold;
          }
          .validity.valid {
            background-color: #28a745;
          }
          .validity.invalid {
            background-color: #dc3545;
          }
          .section-title {
            font-size: 15px;
            font-weight: bold;
            margin-top: 15px;
            color: #333;
            margin-bottom: 8px;
          }
          .api-header {
            font-size: 15px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 12px;
            margin-bottom: 10px;
          }
          .api-header .right-section {
            display: flex;
            align-items: center;
          }
          .ack-status {
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 18px;
            color: #fff;
            font-weight: bold;
            margin-left: 10px;
          }
          .ack-status.ack {
            background-color: #4caf50; /* Green for ACK */
          }
          .ack-status.nack {
            background-color: #D9534F; /* Light Red for NACK */
          }
          .ack-status.no-response {
            background-color: #5bc0de; /* Blue for No Response */
          }
          .error-details {
            font-size: 12px;
            color: #721c24;
            background-color: #fce8e6;
            padding: 4px 8px;
            border-radius: 4px;
            margin-left: 10px;
            display: inline-block;
          }
          .result-list {
            max-width: 100%;
            width: 100%;
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .result-item {
            display: flex;
            align-items: center;
            padding: 6px 15px;
            margin-bottom: 8px;
            border-radius: 6px;
            font-size: 14px;
            border: 1px solid #ddd;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
            white-space: normal;
            overflow: hidden;
            max-width: 100%;
          }
          .result-item.passed {
            background-color: #e7f9ed;
            border-color: #28a745;
            color: #155724;
          }
          .result-item.failed {
            background-color: #fce8e6;
            border-color: #dc3545;
            color: #721c24;
          }
          .icon {
            margin-right: 8px;
            font-size: 16px;
          }
          .icon.pass {
            color: #28a745;
          }
          .icon.fail {
            color: #dc3545;
          }
        </style>
      </head>
   <body>
        <h1>Flow Validation Report</h1>
                <div class="flow-card">
          <div class="section">
            <div class="flow-id">Report</div>
            ${
              Object.entries(data?.finalReport).length
                ? `<ul class="result-list">${Object.entries(data?.finalReport)
                    .map(([key, value]) =>
                      key.length > 0
                        ? `<li class="result-item failed"><span class="icon fail">✘</span>${value}</li>`
                        : ""
                    )
                    .join("")}</ul>`
                : "<p>All flows have been tested</p>"
            }
          </div>
        </div>
        ${Object.entries(data?.flowErrors)
          .map(([flowId, { valid_flow, errors, messages }]) => {
            const parsedMessages: Record<string, ParsedMessage> =
              Object.entries(messages).reduce((acc, [api, result]) => {
                try {
                  const parsedResult = JSON.parse(result);

                  acc[api] = {
                    ackStatus:
                      parsedResult.response?.message?.ack?.status ||
                      "invalid response",
                    errorCode:
                      parsedResult.response?.error?.code || "No code available",
                    errorMessage:
                      parsedResult.response?.error?.message ||
                      "No message available",
                    passed: parsedResult.passed || [],
                    failed: parsedResult.failed || [],
                  };
                } catch {
                  acc[api] = {
                    ackStatus: null,
                    errorCode: "Parsing error",
                    errorMessage: "Could not parse response",
                    passed: [],
                    failed: [],
                  };
                }
                return acc;
              }, {} as Record<string, ParsedMessage>);

            return `
              <div class="flow-card">
                <div class="flow-header">
                  <div class="flow-id">Flow ID: ${flowId}</div>
                  <div class="validity ${valid_flow ? "valid" : "invalid"}">
                    ${valid_flow ? "Valid" : "Invalid"}
                  </div>
                </div>
                <div class="section">
                  <div class="section-title">Flow Sequence Errors</div>
                  ${
                    errors.length
                      ? `<ul class="result-list">${errors
                          .map(
                            (err) =>
                              `<li class="result-item failed"><span class="icon fail">✘</span>${err}</li>`
                          )
                          .join("")}</ul>`
                      : "<p>No errors found.</p>"
                  }
                </div>
                <div class="section">
                  <div class="section-title">Validation Errors</div>
                  ${Object.entries(parsedMessages)
                    .map(
                      ([
                        api,
                        { ackStatus, errorCode, errorMessage, passed, failed },
                      ]) => `
                    <div class="api-header">
                      <span>${api}</span>
                      <div class="right-section">
                        ${
                          ackStatus
                            ? `<span class="ack-status ${
                                ackStatus === "ACK"
                                  ? "ack"
                                  : ackStatus === "NACK"
                                  ? "nack"
                                  : "no-response"
                              }">${ackStatus}</span>
                              ${
                                ackStatus === "NACK" &&
                                errorCode &&
                                errorMessage
                                  ? `<span class="error-details">${errorCode}: ${errorMessage}</span>`
                                  : ""
                              }`
                            : ""
                        }
                      </div>
                    </div>
                    <ul class="result-list">
                      ${passed
                        .map(
                          (item) =>
                            `<li class="result-item passed"><span class="icon pass">✔</span>${item}</li>`
                        )
                        .join("")}
                      ${failed
                        .map(
                          (item) =>
                            `<li class="result-item failed"><span class="icon fail">✘</span>${item}</li>`
                        )
                        .join("")}
                    </ul>
                  `
                    )
                    .join("")}
                </div>
              </div>
            `;
          })
          .join("")}
      </body>
      </html>
    `;
  logInfo({
    message: "Exiting generateCustomHTMLReport function. Generated custom HTML report",
    meta: {
      htmlContent,
    },
  });
  return htmlContent;
}
