export type UserRole = 'admin' | 'manager' | 'surveyor' | 'site_engineer' | 'accountant'
export type JobType = 'survey' | 'construction'
export type SurveyType = 'topographic' | 'cadastral' | 'control' | 'setting_out'
export type ConstructionType = 'house' | 'commercial' | 'road' | 'tender' | 'renovation'
export type JobStatusSurvey = 'new' | 'in_progress' | 'qa' | 'delivered' | 'paid'
export type JobStatusConstruction = 'ongoing' | 'completed' | 'handover' | 'tender'
export type EquipmentType = 'total_station' | 'gps' | 'level' | 'drone' | 'vehicle' | 'material' | 'tool' | 'other'
export type EquipmentCondition = 'good' | 'fair' | 'poor' | 'under_maintenance' | 'retired'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'mpesa' | 'cheque' | 'other'
export type DocumentType = 'survey_report' | 'drawing' | 'contract' | 'photo' | 'certificate' | 'boq' | 'receipt' | 'other'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          role: UserRole
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      clients: {
        Row: {
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
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      jobs: {
        Row: {
          id: string
          job_number: string
          type: JobType
          client_id: string | null
          start_date: string | null
          end_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'job_number' | 'created_at' | 'updated_at'> & { job_number?: string }
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>
      }
      survey_jobs: {
        Row: {
          id: string
          job_id: string
          site_name: string
          county: string | null
          survey_type: SurveyType
          status: JobStatusSurvey
          report_file_url: string | null
          drawing_file_url: string | null
          notes: string | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['survey_jobs']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['survey_jobs']['Insert']>
      }
      construction_jobs: {
        Row: {
          id: string
          job_id: string
          project_name: string
          project_type: ConstructionType
          status: JobStatusConstruction
          boq_total: number
          contract_value: number
          progress_percent: number
          notes: string | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['construction_jobs']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['construction_jobs']['Insert']>
      }
      equipment: {
        Row: {
          id: string
          name: string
          serial_no: string | null
          type: EquipmentType
          purchase_date: string | null
          condition: EquipmentCondition
          assigned_to: string | null
          calibration_due: string | null
          quantity: number
          min_stock_level: number
          unit: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['equipment']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['equipment']['Insert']>
      }
      timesheets: {
        Row: {
          id: string
          job_id: string | null
          user_id: string
          date: string
          clock_in: string | null
          clock_out: string | null
          hours_worked: number | null
          site_photo_url: string | null
          notes: string | null
          synced_at: string
          offline_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['timesheets']['Row'], 'id' | 'created_at' | 'synced_at'> & { synced_at?: string }
        Update: Partial<Database['public']['Tables']['timesheets']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          job_id: string | null
          client_id: string | null
          quotation_id: string | null
          status: InvoiceStatus
          issue_date: string
          due_date: string | null
          notes: string | null
          subtotal: number
          tax_percent: number
          tax_amount: number
          total: number
          amount_paid: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'invoice_number' | 'created_at' | 'updated_at'> & { invoice_number?: string }
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      quotations: {
        Row: {
          id: string
          quotation_number: string
          job_id: string | null
          client_id: string | null
          status: QuotationStatus
          valid_until: string | null
          notes: string | null
          subtotal: number
          tax_percent: number
          tax_amount: number
          total: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['quotations']['Row'], 'id' | 'quotation_number' | 'created_at' | 'updated_at'> & { quotation_number?: string }
        Update: Partial<Database['public']['Tables']['quotations']['Insert']>
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          method: PaymentMethod
          payment_date: string
          reference: string | null
          notes: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      expenses: {
        Row: {
          id: string
          job_id: string | null
          category: string
          amount: number
          description: string
          receipt_url: string | null
          expense_date: string
          recorded_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
      }
      documents: {
        Row: {
          id: string
          job_id: string | null
          client_id: string | null
          name: string
          type: DocumentType
          file_url: string
          file_size: number | null
          mime_type: string | null
          version: number
          tags: string[]
          uploaded_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      boq_items: {
        Row: {
          id: string
          job_id: string
          section: string | null
          item_no: string | null
          description: string
          unit: string | null
          quantity: number | null
          rate: number | null
          amount: number
          actual_quantity: number
          sort_order: number
        }
        Insert: Omit<Database['public']['Tables']['boq_items']['Row'], 'id' | 'amount'>
        Update: Partial<Database['public']['Tables']['boq_items']['Insert']>
      }
    }
    Functions: {
      get_user_role: {
        Args: Record<never, never>
        Returns: UserRole
      }
    }
  }
}

// Convenience join types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type SurveyJob = Database['public']['Tables']['survey_jobs']['Row']
export type ConstructionJob = Database['public']['Tables']['construction_jobs']['Row']
export type Equipment = Database['public']['Tables']['equipment']['Row']
export type Timesheet = Database['public']['Tables']['timesheets']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type Quotation = Database['public']['Tables']['quotations']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type BoqItem = Database['public']['Tables']['boq_items']['Row']

// Extended types with joins
export type SurveyJobWithJob = SurveyJob & { jobs: Job & { clients: Client | null } }
export type ConstructionJobWithJob = ConstructionJob & { jobs: Job & { clients: Client | null } }
export type InvoiceWithClient = Invoice & { clients: Client | null; jobs: Job | null }
