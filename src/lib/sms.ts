import { SmsClient } from "@azure/communication-sms";

const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING!;

export const smsClient = new SmsClient(connectionString);
export const SMS_FROM = process.env.AZURE_SMS_FROM_NUMBER!;
