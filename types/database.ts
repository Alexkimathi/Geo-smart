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
  quoted_amount: number
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
  notes: string | null
  created_at: string
  updated_at: string
}

export type EquipmentWithUser = Equipment & {
  profiles: Pick<Profile, 'full_name'> | null
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
  job_type: 'survey' | 'construction' | null
  job_id: string | null
  date: string
  clock_in_time: string | null
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_out_time: string | null
  clock_out_lat: number | null
  clock_out_lng: number | null
  hours: number | null
  notes: string | null
  site_photo_url: string | null
  created_at: string
}

export type TimesheetWithProfile = Timesheet & {
  profiles: Pick<Profile, 'full_name' | 'role'> | null
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
  converted_to: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  method: 'Cash' | 'Bank Transfer' | 'M-Pesa' | 'Cheque' | 'Other'
  payment_date: string
  reference: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface Expense {
  id: string
  job_type: 'survey' | 'construction' | null
  job_id: string | null
  category: 'Labour' | 'Materials' | 'Transport' | 'Fuel' | 'Equipment' | 'Other'
  description: string
  amount: number
  expense_date: string
  receipt_url: string | null
  recorded_by: string | null
  created_at: string
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
  category: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  version: number
  uploaded_by: string | null
  created_at: string
}

export type DocumentWithUploader = Document & {
  profiles: Pick<Profile, 'full_name'> | null
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
export type FinanceDocumentWithClient = FinanceDocument & { clients: Pick<Client, 'id' | 'name' | 'company' | 'phone' | 'email'> | null }
export type PaymentWithInvoice = Payment & { finance_documents: Pick<FinanceDocument, 'id' | 'doc_no' | 'client_id'> & { clients: Pick<Client, 'id' | 'name'> | null } | null }

export interface BoqItem {
  id: string
  job_id: string
  job_type: 'survey' | 'construction'
  description: string
  unit: string
  quantity: number
  unit_rate: number
  amount: number
  sort_order: number
  created_at: string
}

export interface Lpo {
  id: string
  lpo_no: string
  supplier_name: string
  job_type: 'survey' | 'construction' | null
  job_id: string | null
  items: LpoLineItem[]
  subtotal: number
  tax: number
  total: number
  status: 'Draft' | 'Sent' | 'Received' | 'Cancelled'
  issued_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LpoLineItem {
  description: string
  quantity: number
  unit: string
  unit_price: number
  amount: number
}

export type LpoWithJob = Lpo & {
  survey_jobs?: Pick<SurveyJob, 'job_no' | 'site_name'> | null
  construction_jobs?: Pick<ConstructionJob, 'job_no' | 'project_name'> | null
}
