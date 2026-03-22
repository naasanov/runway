export type AlertSentiment = 'light' | 'medium' | 'heavy';

export interface AlertMessageResponse {
  message: string;
  sentiment: AlertSentiment;
}

// TODO: Replace with Gemini-generated message + sentiment based on financial data
/** Generate the alert call message and sentiment. */
export async function getAlertMessage(): Promise<AlertMessageResponse> {
  return {
    message:
      'Your business cash runway needs attention. ' +
      'Please log in to your Runway dashboard to review your latest financial alerts.',
    sentiment: 'medium',
  };
}
