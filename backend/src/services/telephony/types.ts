export interface CallCargoInfo {
  id: string;
  cargoNumber: number;
  originCity: string;
  destinationCity: string;
  weightTons: number;
  rateKzt: number;
  loadingDate: string;
}

export interface CallDriverInfo {
  id: string;
  fullName: string;
  phone: string;
}

export interface CallInitiateParams {
  attemptId: string;
  loadId: string;
  driverId: string;
  toPhone: string;
  cargo: CallCargoInfo;
  driver: CallDriverInfo;
  attemptNumber: number;
}

export interface CallResult {
  provider: 'twilio' | 'zadarma' | 'mock';
  providerCallId: string;
  status: 'dialing' | 'ringing' | 'failed';
  initiatedAt: Date;
  error?: string;
}

export interface TelephonyProvider {
  readonly name: 'twilio' | 'zadarma' | 'mock';
  isConfigured(): boolean;
  initiateCall(params: CallInitiateParams): Promise<CallResult>;
  verifyWebhookSignature(req: any): boolean;
  generateTtsScript(cargo: CallCargoInfo, driver: CallDriverInfo): string;
}

