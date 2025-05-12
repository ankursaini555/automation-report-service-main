import { Result } from "../types/result";
import { ApiResponse } from "../types/utilityResponse";
import { logInfo } from "../utils/logger";

export function generateReportHTML(
  flowReports: { flowId: string; results: Result }[]
): string {
  logInfo({
    message: "Entering generateReportHTML function. Generating HTML report...",
    meta: { flowReports },
  });
  const reportRows = flowReports
    .map(({ flowId, results }) => {
      if (!results.success) {
        return `
            <tr>
              <td>${flowId}</td>
              <td class="failed">FAILED</td>
              <td>${results.error}</td>
              <td>${
                results.details
                  ? formatReportItems(results.details.response?.report)
                  : "N/A"
              }
              </td>
            </tr>
          `;
      }

      const report = results.response?.response?.report;
      if (!report) {
        return `
            <tr>
              <td>${flowId}</td>
              <td class="no-report">NO REPORT</td>
              <td colspan="2">The response did not include a report.</td>
            </tr>
          `;
      }

      const transactions = Object.entries(report).map(
        ([transactionId, transactionResult]) => `
            <tr>
              <td>${transactionId}</td>
              <td class="${
                transactionResult.status === "success" ? "success" : "failed"
              }">
                ${transactionResult.status.toUpperCase()}
              </td>
              <td>${
                transactionResult.details
                  ? JSON.stringify(transactionResult.details)
                  : "N/A"
              }</td>
              <td>${formatReportItems(transactionResult.details?.report)}</td>
            </tr>
          `
      );

      return `
          <tr class="flow-header">
            <td colspan="4">Flow ID: ${flowId}</td>
          </tr>
          ${transactions.join("")}
        `;
    })
    .join("");
  logInfo({
    message: "Exiting generateReportHTML function. Generated HTML report.",
    meta: { reportRows },
  });
  return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Log Validation Utility Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              background-color: #f4f9ff;
              color: #333;
            }
            h1 {
              margin-bottom: 20px;
              color: #0056b3;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              background-color: #ffffff;
              box-shadow: 0px 0px 10px rgba(0, 86, 179, 0.2);
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            th {
              background-color: #0056b3;
              color: white;
            }
            tr:nth-child(even) {
              background-color: #e6f0ff;
            }
            tr:hover {
              background-color: #cce0ff;
            }
            .flow-header {
              font-weight: bold;
              background-color: #d9e8ff;
              text-align: center;
            }
            .success {
              color: green;
              font-weight: bold;
            }
            .failed {
              color: red;
              font-weight: bold;
            }
            .no-report {
              color: orange;
              font-weight: bold;
            }
            .cross-icon {
              color: red;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>Log Validation Utility Report</h1>
          <table>
            <thead>
              <tr>
                <th>Flow ID</th>
                <th>Status</th>
                <th>Error/Details</th>
                <th>Additional Info</th>
              </tr>
            </thead>
            <tbody>
              ${reportRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
}

function formatReportItems(report: Record<string, any>): string {
  logInfo({
    message: 'Entering formatReportItems function. Formatting report items...',
    meta: { report },
  });
  if (!report || typeof report !== "object")
  {
    logInfo({
      message: 'Exiting formatReportItems function. No report items to format.',
    });
    return "N/A";
  } 
  logInfo({
    message: 'Exiting formatReportItems function. Formatted report items.',
  });
  return Object.entries(report)
    .map(([key, value]) => {
      if (typeof value === "object" && !Array.isArray(value)) {
        return `
            <div>
              <strong>${key}:</strong>
              <ul>
                ${Object.entries(value)
                  .map(
                    ([subKey, subValue]) => `
                    <li>
                      <span class="cross-icon">✖</span>
                      <strong>${subKey}:</strong> ${subValue}
                    </li>
                  `
                  )
                  .join("")}
              </ul>
            </div>
          `;
      } else if (Array.isArray(value)) {
        return `
            <div>
              <strong>${key}:</strong>
              <ul>
                ${value
                  .map(
                    (item) => `
                    <li>
                      <span class="cross-icon">✖</span>
                      ${item}
                    </li>
                  `
                  )
                  .join("")}
              </ul>
            </div>
          `;
      } else {
        return `
            <div>
              <strong>${key}:</strong> ${value}
            </div>
          `;
      }
    })
    .join("");
}
