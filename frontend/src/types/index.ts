export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  phone: string | null;
  monthly_salary: number;
  hourly_rate: number;
  shift_id: number | null;
  active: boolean;
  created_at: string;
}

export interface Shift {
  id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  minimum_hours: number;
  created_at: string;
}

export interface Attendance {
  id: number;
  employee_id: number;
  attendance_date: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number;
  status: 'present' | 'absent' | 'late' | 'incomplete';
  payment: number;
  reason: string | null;
  created_at: string;
  employee_name?: string;
  employee_code?: string;
}

export interface Payroll {
  id: number;
  employee_id: number;
  month: number;
  year: number;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  unpaid_days: number;
  total_salary: number;
  deductions: number;
  final_salary: number;
  generated_at: string;
}

export interface RecognizeResponse {
  matched: boolean;
  employee: Employee | null;
  confidence: number | null;
  message: string;
}

export interface PinVerifyResponse {
  success: boolean;
  token: string | null;
  message: string;
}

export interface DashboardData {
  total_employees: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  incomplete_today: number;
  payroll_total: number;
  recent_attendance: Attendance[];
}

export interface Setting {
  key: string;
  value: string;
}

export interface SystemLog {
  id: number;
  module: string;
  action: string;
  details: string | null;
  created_at: string;
}

export interface AttendanceLog {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  action: string;
  details: string | null;
  created_at: string;
}

export interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
  late: number;
  incomplete: number;
}

export interface PayrollTrend {
  month: number;
  year: number;
  total_salary: number;
  deductions: number;
  final_salary: number;
  employee_count: number;
}

export interface EmployeeSummary {
  employee_id: number;
  employee_code: string;
  full_name: string;
  total_attendance: number;
  present: number;
  late: number;
  absent: number;
  monthly_salary: number;
  hourly_rate: number;
}