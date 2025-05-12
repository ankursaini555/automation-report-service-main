export interface ApiResponse {
    success: boolean;
    response: {
      message: string;
      report: Record<string, any>; // Define the structure of 'report' if known
    };
    signature?: string;
    signTimestamp?: string;
  }