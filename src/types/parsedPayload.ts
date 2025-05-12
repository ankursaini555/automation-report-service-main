export interface ParsedPayload {
    domain: string; // Fixed domain identifier
    version: string; // Fixed version number
    flow: string; // Flow name (e.g., "RIDER_CANCEL")
    payload: {
      [key: string]: Record<string, any>; // A map of payload types to their respective data objects
    };
  }