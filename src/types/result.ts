import { ApiResponse } from "./utilityResponse";

export type Result = 
  | { success: true; response: ApiResponse }  // Successful validation
  | { success: false; error: string; details?: any }; // Failed validation


