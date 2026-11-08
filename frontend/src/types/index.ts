export type Role = 'DRIVER' | 'DISPATCHER';
export type WorkStatus = 'FREE' | 'IN_TRIP' | 'RESTING';

export interface Vehicle {
  id: string;
  driverId: string;
  capacityTons: number;
  bodyType: string;
  currentCity: string;
  plateNumber?: string | null;
  model?: string | null;
  updatedAt?: string;
}

export interface User {
  id: string;
  login: string;
  role: Role;
  fullName: string;
  phone: string;
  issuedPassword?: string | null;
  isBlocked?: boolean;
  callConsent?: boolean;
  callConsentAt?: string | null;
  workStatus?: WorkStatus;
  vehicle?: Vehicle | null;
  avgRating?: number;
  reviewsCount?: number;
  activeComplaintsCount?: number;
  latestAutoCall?: CallAttempt | null;
  createdAt?: string;
}

export interface RateChange {
  id: string;
  cargoId: string;
  oldRate: number;
  newRate: number;
  reason: string;
  changedById: string;
  changedBy?: {
    fullName: string;
    role?: string;
  };
  createdAt: string;
}

export interface CallAttempt {
  id: string;
  loadId: string;
  driverId: string;
  provider: 'twilio' | 'zadarma' | 'mock';
  providerCallId?: string | null;
  status:
    | 'queued'
    | 'dialing'
    | 'ringing'
    | 'answered'
    | 'accepted'
    | 'declined'
    | 'no_answer'
    | 'busy'
    | 'failed';
  attemptNumber: number;
  cargoCreatedAt: string;
  callInitiatedAt?: string | null;
  latencyMs?: number | null;
  startedAt?: string | null;
  answeredAt?: string | null;
  endedAt?: string | null;
  dtmfKey?: string | null;
  error?: string | null;
  fallbackUsed?: boolean;
  createdAt: string;
  cargo?: {
    id: string;
    cargoNumber: number;
    originCity: string;
    destinationCity: string;
    weightTons: number;
    rateKzt: number;
    status: string;
  };
  driver?: {
    id: string;
    fullName: string;
    phone: string;
    callConsent: boolean;
    workStatus: WorkStatus;
  };
}

export interface CallMetrics {
  totalCalls: number;
  avgLatencyMs: number;
  targetMetPercentage: number;
  callsBelow3s: number;
  acceptedCalls: number;
  escalationTimeoutMinutes: number;
}

export interface Cargo {
  id: string;
  cargoNumber: number;
  originCity: string;
  destinationCity: string;
  weightTons: number;
  bodyType: string;
  loadingDate: string;
  rateKzt: number;
  rateStatus: 'CONFIRMED' | 'PENDING';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  autoCallEnabled?: boolean;
  reservedDriverId?: string | null;
  reservedUntil?: string | null;
  customerName: string;
  customerPhone: string;
  customerCompany?: string | null;
  description?: string | null;
  assignedDriverId?: string | null;
  assignedDriver?: {
    id: string;
    fullName: string;
    phone: string;
  } | null;
  rateChanges?: RateChange[];
  callAttempts?: CallAttempt[];
  driverRequests?: Array<{
    id: string;
    driverId: string;
    status: string;
    createdAt: string;
    driver?: {
      id: string;
      fullName: string;
      phone: string;
    };
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface MatchingCargoItem {
  cargo: Cargo;
  weightDifferenceTons: number;
  isBestMatch: boolean;
}

export interface MatchingDriverItem {
  driver: User & { vehicle: Vehicle };
  capacityDifferenceTons: number;
  callLog?: {
    id: string;
    outcome: 'AGREED' | 'DECLINED' | 'NO_ANSWER';
    comment?: string | null;
    createdAt: string;
  };
}

export interface Complaint {
  id: string;
  authorId: string;
  author: {
    id: string;
    fullName: string;
    phone: string;
    role: string;
  };
  targetDriverId?: string | null;
  targetDriver?: {
    id: string;
    fullName: string;
    phone: string;
  } | null;
  targetCargoId?: string | null;
  targetCargo?: {
    id: string;
    cargoNumber: number;
    originCity: string;
    destinationCity: string;
  } | null;
  reason: string;
  comment: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
  resolution?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLogItem {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    role: string;
    login: string;
  };
  action: string;
  details: string;
  ip?: string | null;
  createdAt: string;
}

export interface DispatcherNotification {
  id: string;
  type: 'MATCH_FOUND' | 'DRIVER_REQUEST';
  cargoId: string;
  cargoNumber: number;
  driverId: string;
  driverName: string;
  driverPhone: string;
  message: string;
  createdAt: string;
}

export const KZ_CITIES = [
  'Алматы',
  'Астана',
  'Шымкент',
  'Караганда',
  'Актобе',
  'Тараз',
  'Павлодар',
  'Усть-Каменогорск',
  'Семей',
  'Атырау',
  'Костанай',
  'Кызылорда',
  'Уральск',
  'Петропавловск',
  'Актау',
  'Темиртау',
  'Туркестан',
  'Кокшетау',
  'Талдыкорган',
  'Экибастуз',
] as const;

export const BODY_TYPES = [
  'Тент',
  'Рефрижератор',
  'Борт',
  'Контейнеровоз',
  'Самосвал',
  'Изотермический',
  'Цельнометаллический',
  'Цистерна',
] as const;
