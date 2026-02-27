export type SmsMessage = {
  to: string;
  message: string;
};

export interface SmsProvider {
  send(message: SmsMessage): Promise<void>;
}

export const SMS_PROVIDER = Symbol("SMS_PROVIDER");
