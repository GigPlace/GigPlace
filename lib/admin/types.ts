export type AdminRole = "admin" | "super_admin";
export type AdminStatus = "pending" | "active" | "suspended";

export interface AdminProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  nationality: string;
  state: string;
  lga: string;
  role: AdminRole;
  status: AdminStatus;
  created_at: string;
  updated_at: string;
}

export interface SignupFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  nationality: string;
  state: string;
  lga: string;
  password: string;
  confirm_password: string;
  terms: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}