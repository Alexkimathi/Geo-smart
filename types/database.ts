// ============================================================
// TYPES MATCHING THE REAL SUPABASE SCHEMA
// survey_jobs and construction_jobs are standalone tables (no parent jobs table)
// ============================================================

export type UserRole = 'admin' | 'manager' | 'surveyor' | 'site_engineer' | 'accountant'
export type SurveyType = 'Topo' | 'Cadastral' | 'Control' | 'Setting Out'
export type ConstructionType = 'House' | 'Commercial' | 'Road' | 'Tender'
export type JobStatusSurvey = 'New' | 'In Progress' | 'QA' | 'Delivered' | 'Paid' | 'On Hold'
export type JobStatusConstruction = 'Ongoing' | 'Completed' | 'Handover' | 'Tender' | 'On Hold'
export type EquipmentType = 'total_station' | 'gps' | 'level' | 'drone' | 'vehicle' | 'material' | 'tool' | 'other'
export type EquipmentCondition = 'good' | 'fair' | 'poor' | 'under_maintenance' | 'retired'
export type FinanceDocType = 'Invoice' | 'Quotation'
export type FinanceDocStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue'

export interface Profile {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  phone: string | null
  email: string | null
  company: string | null
  site_location: string | null
  gps_lat: number | null
  gps_lng: number | null
  pin: string | null
  contact_person: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SurveyJob {
  id: string
  job_no: string
  client_id: string | null
  site_name: string
  county: string | null
  survey_type: SurveyType
  equipment_ids: string[]
  team_ids: string[]
  start_date: string | null
  end_date: string | null
  status: JobStatusSurvey
  report_file_url: string | null
  drawing_file_url: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ConstructionJob {
  id: string
  job_no: string
  client_id: string | null
  project_name: string
  project_type: ConstructionType
  boq_total: number
  contract_value: number
  progress_pct: number
  start_date: string | null
  end_date: string | null
  status: JobStatusConstruction
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Equipment {
  id: string
  name: string
  serial_no: string | null
  type: EquipmentType
  purchase_date: string | null
  condition: EquipmentCondition
  assigned_to_user_id: string | null
  last_calibration_date: string | null
  stock_qty: number
  min_stock_qty: number
  created_at: string
  updated_at: string
}

export interface MaintenanceLog {
  id: string
  equipment_id: string
  date: string
  description: string
  done_by: string | null
  next_due_date: string | null
  created_at: string
}

export interface Timesheet {
  id: string
  user_id: string
  job_type: 'survey' | 'construction'
  job_id: string | null
  date: string
  hours: number | null
  notes: string | null
  site_photo_url: string | null
  created_at: string
}

export interface FinanceDocument {
  id: string
  type: FinanceDocType
  job_type: 'survey' | 'construction' | null
  job_id: string | null
  client_id: string | null
  doc_no: string
  amount: number
  tax: number
  total: number
  status: FinanceDocStatus
  due_date: string | null
  paid_date: string | null
  line_items: LineItem[]
  file_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LineItem {
  description: string
  quantity: number
  unit: string
  unit_price: number
  amount: number
}

export interface Document {
  id: string
  job_type: 'survey' | 'construction' | null
  job_id: string | null
  client_id: string | null
  name: string
  category: string | null
  file_url: string
  version: number
  uploaded_by: string | null
  created_at: string
}

export interface ServiceRate {
  id: string
  service_name: string
  description: string | null
  unit: string | null
  unit_price: number
  category: string | null
  created_at: string
}

export interface JobNote {
  id: string
  job_id: string
  job_type: 'survey' | 'construction'
  content: string
  created_by: string | null
  created_at: string
}

// With client join
export type SurveyJobWithClient = SurveyJob & { clients: Pick<Client, 'id' | 'name' | 'company' | 'phone' | 'email'> | null }
export type ConstructionJobWithClient = ConstructionJob & { clients: Pick<Client, 'id' | 'name' | 'company' | 'phone' | 'email'> | null }
export type JobNoteWithProfile = JobNote & { profiles: Pick<Profile, 'full_name'> | null }
