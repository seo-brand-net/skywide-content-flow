export interface Invitation {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at?: string;
  token: string;
}

export interface InvitationFormData {
  fullName: string;
  email: string;
  role: string;
}