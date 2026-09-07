export interface EventsMetrics {
  total: number;
  published: number;
  upcoming: number;
  draft: number;
}

export interface RegistrationsMetrics {
  total: number;
  active: number;
  totalParticipants: number;
  activeTeams: number;
}

export interface PaymentsMetrics {
  pending: number;
  verified: number;
  rejected: number;
}

export interface RecruitmentMetrics {
  isOpen: boolean;
  total: number;
  active: number;
  selected: number;
  rejected: number;
}

export interface DashboardMetrics {
  events: EventsMetrics;
  registrations: RegistrationsMetrics;
  payments: PaymentsMetrics;
  recruitment: RecruitmentMetrics;
}

export interface DashboardAlert {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "success" | "neutral";
  actionUrl?: string;
  actionLabel?: string;
}

export interface RecentActivityItem {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string; // ISO 8601 UTC
}

export interface RecentRegistrationItem {
  id: string;
  eventName: string;
  registrationCode: string;
  registrationType: "INDIVIDUAL" | "TEAM";
  status: "ACTIVE" | "CANCELLED";
  participantType: "CRESCENT" | "EXTERNAL";
  paymentStatus: string | null;
  createdAt: string; // ISO 8601 UTC
}

export interface AdminDashboardData {
  success: true;
  metrics: DashboardMetrics;
  alerts: DashboardAlert[];
  recentActivities: RecentActivityItem[];
  recentRegistrations: RecentRegistrationItem[];
  generatedAt: string;
}

export interface AdminDashboardError {
  success: false;
  error: string;
  generatedAt: string;
}

export type AdminDashboardResult = AdminDashboardData | AdminDashboardError;
