import { SmsClient } from "@azure/communication-sms";
import { env } from "./env";

const connectionString = env.AZURE_COMMUNICATION_CONNECTION_STRING;

export const smsClient = new SmsClient(connectionString);
export const SMS_FROM = env.AZURE_SMS_FROM_NUMBER;
