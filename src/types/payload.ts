export interface Payload {
  id: number;
  messageId: string;
  transactionId: string;
  flowId: string;
  action: string; // e.g., "SEARCH"
  bppId: string | null; // Can be null
  bapId: string;
  payloadId: string;
  jsonRequest: Record<string, any>;
  jsonResponse: Record<string, any>;
  httpStatus: number;
  createdAt: string; // ISO 8601 formatted timestamp
  updatedAt: string; // ISO 8601 formatted timestamp
  sessionDetails: Record<string, any>;
}

// Interface for the outer wrapper in the new format
export interface WrappedPayload {
  npType: string; // e.g., "BPP"
  domain: string; // e.g., "ONDC:TRV11"
  payload: Payload; // The actual payload object
}

export interface JsonRequest {
  context: Context;
  message: Record<string, any>;
  error: Record<string, any>;
}

// contextTypes.ts

export interface Country {
  code: string;
}

export interface City {
  code: string;
}

export interface Location {
  country: Country;
  city: City;
}

export interface Context {
  location: Location;
  domain: string;
  action: string;
  version: string;
  bpp_id: string;
  bap_uri: string;
  bap_id: string;
  transaction_id: string;
  message_id: string;
  timestamp: string;
  ttl: string;
}
export interface TestResult {
  response: object;
  passed: string[];
  failed: string[];
}

export interface Report {
  finalReport: Record<string,string>;
  flowErrors: Record<string, FlowValidationResult>;
}
export interface FlowValidationResult {
  valid_flow: boolean;
  errors: string[];
  messages: Record<string, string>;
}

export type ParsedMessage = {
  ackStatus: "ACK" | "NACK" | null;
  errorCode?: string;
  errorMessage?: string;
  passed: string[];
  failed: string[];
};
