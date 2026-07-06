export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_events: {
        Row: {
          actor_name: string | null
          company_id: string
          created_at: string
          event_source: string
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          resident_id: string | null
          site_id: string
          unit_id: string | null
        }
        Insert: {
          actor_name?: string | null
          company_id: string
          created_at?: string
          event_source: string
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          resident_id?: string | null
          site_id: string
          unit_id?: string | null
        }
        Update: {
          actor_name?: string | null
          company_id?: string
          created_at?: string
          event_source?: string
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          resident_id?: string | null
          site_id?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_events_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      access_handoff_requests: {
        Row: {
          action: string
          approval_required: boolean
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          credential_type: string
          id: string
          provider_code: string
          provider_response: Json
          reservation_id: string | null
          site_id: string
          status: string
          unit_id: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          action: string
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          credential_type: string
          id?: string
          provider_code?: string
          provider_response?: Json
          reservation_id?: string | null
          site_id: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          action?: string
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          credential_type?: string
          id?: string
          provider_code?: string
          provider_response?: Json
          reservation_id?: string | null
          site_id?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_handoff_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_handoff_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_handoff_requests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_handoff_requests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_handoff_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_logs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          confidence: number | null
          created_at: string
          entity_id: string | null
          entity_table: string | null
          id: string
          module: string
          prompt_hash: string | null
          recommendation: string
          requested_by: string | null
          site_id: string | null
          sources: Json
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          module: string
          prompt_hash?: string | null
          recommendation: string
          requested_by?: string | null
          site_id?: string | null
          sources?: Json
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          module?: string
          prompt_hash?: string | null
          recommendation?: string
          requested_by?: string | null
          site_id?: string | null
          sources?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_logs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_logs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_image_workflows: {
        Row: {
          ai_use: string
          company_id: string
          created_at: string
          guardrail: string
          id: string
          metadata: Json
          output_description: string | null
          source_type: string
          status: string
          title: string
          updated_at: string
          workflow_code: string
        }
        Insert: {
          ai_use: string
          company_id: string
          created_at?: string
          guardrail: string
          id?: string
          metadata?: Json
          output_description?: string | null
          source_type: string
          status?: string
          title: string
          updated_at?: string
          workflow_code: string
        }
        Update: {
          ai_use?: string
          company_id?: string
          created_at?: string
          guardrail?: string
          id?: string
          metadata?: Json
          output_description?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          workflow_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_image_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          audience: string
          company_id: string
          confidence: number
          created_at: string
          human_approval: string
          id: string
          language_support: string[]
          metadata: Json
          mode: string
          model_fit: string | null
          recommendation: string
          recommendation_code: string
          source_records: string[]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience: string
          company_id: string
          confidence?: number
          created_at?: string
          human_approval: string
          id?: string
          language_support?: string[]
          metadata?: Json
          mode: string
          model_fit?: string | null
          recommendation: string
          recommendation_code: string
          source_records?: string[]
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          company_id?: string
          confidence?: number
          created_at?: string
          human_approval?: string
          id?: string
          language_support?: string[]
          metadata?: Json
          mode?: string
          model_fit?: string | null
          recommendation?: string
          recommendation_code?: string
          source_records?: string[]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_profile_id: string | null
          after_data: Json | null
          before_data: Json | null
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_readiness: {
        Row: {
          blocker: string | null
          company_id: string
          id: string
          next_action: string | null
          readiness_score: number
          reservation_id: string | null
          risk_level: string
          site_id: string
          steps: Json
          updated_at: string
        }
        Insert: {
          blocker?: string | null
          company_id: string
          id?: string
          next_action?: string | null
          readiness_score?: number
          reservation_id?: string | null
          risk_level?: string
          site_id: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          blocker?: string | null
          company_id?: string
          id?: string
          next_action?: string | null
          readiness_score?: number
          reservation_id?: string | null
          risk_level?: string
          site_id?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_readiness_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_readiness_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_readiness_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      client_action_requests: {
        Row: {
          action_type: string
          company_id: string
          created_at: string
          entity_external_id: string | null
          entity_id: string | null
          entity_table: string | null
          id: string
          metadata: Json
          requested_by: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          action_type: string
          company_id: string
          created_at?: string
          entity_external_id?: string | null
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          metadata?: Json
          requested_by?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          company_id?: string
          created_at?: string
          entity_external_id?: string | null
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          metadata?: Json
          requested_by?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_action_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_action_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          primary_locale: string
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          primary_locale?: string
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          primary_locale?: string
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      deposit_settlements: {
        Row: {
          approval_owner: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          deposit_amount_cents: number
          evidence_count: number
          final_statement_document_id: string | null
          id: string
          proposed_deduction_cents: number
          refund_amount_cents: number
          reservation_id: string | null
          settlement_items: Json
          site_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_owner?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          deposit_amount_cents?: number
          evidence_count?: number
          final_statement_document_id?: string | null
          id?: string
          proposed_deduction_cents?: number
          refund_amount_cents?: number
          reservation_id?: string | null
          settlement_items?: Json
          site_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approval_owner?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          deposit_amount_cents?: number
          evidence_count?: number
          final_statement_document_id?: string | null
          id?: string
          proposed_deduction_cents?: number
          refund_amount_cents?: number
          reservation_id?: string | null
          settlement_items?: Json
          site_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_settlements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_settlements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_settlements_final_statement_document_id_fkey"
            columns: ["final_statement_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_settlements_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_settlements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      document_packets: {
        Row: {
          audience: string
          company_id: string
          completed_documents: number
          created_at: string
          id: string
          metadata: Json
          next_action: string | null
          related_entity_id: string | null
          related_entity_table: string | null
          required_documents: number
          retention_class: string
          signature_status: string
          site_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience: string
          company_id: string
          completed_documents?: number
          created_at?: string
          id?: string
          metadata?: Json
          next_action?: string | null
          related_entity_id?: string | null
          related_entity_table?: string | null
          required_documents?: number
          retention_class: string
          signature_status?: string
          site_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          company_id?: string
          completed_documents?: number
          created_at?: string
          id?: string
          metadata?: Json
          next_action?: string | null
          related_entity_id?: string | null
          related_entity_table?: string | null
          required_documents?: number
          retention_class?: string
          signature_status?: string
          site_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_packets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_packets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      document_upload_requests: {
        Row: {
          category: string
          checksum_sha256: string
          company_id: string
          created_at: string
          document_id: string | null
          file_path: string
          id: string
          metadata: Json
          mime_type: string
          original_filename: string
          requested_by: string | null
          requester_role: string
          resident_id: string | null
          retention_class: string
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          safe_filename: string
          site_id: string | null
          size_bytes: number
          storage_bucket: string
          storage_provider: string
          title: string
          unit_id: string | null
          updated_at: string
          upload_status: string
          virus_scan_status: string
        }
        Insert: {
          category: string
          checksum_sha256: string
          company_id: string
          created_at?: string
          document_id?: string | null
          file_path: string
          id?: string
          metadata?: Json
          mime_type: string
          original_filename: string
          requested_by?: string | null
          requester_role: string
          resident_id?: string | null
          retention_class?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          safe_filename: string
          site_id?: string | null
          size_bytes: number
          storage_bucket?: string
          storage_provider?: string
          title: string
          unit_id?: string | null
          updated_at?: string
          upload_status?: string
          virus_scan_status?: string
        }
        Update: {
          category?: string
          checksum_sha256?: string
          company_id?: string
          created_at?: string
          document_id?: string | null
          file_path?: string
          id?: string
          metadata?: Json
          mime_type?: string
          original_filename?: string
          requested_by?: string | null
          requester_role?: string
          resident_id?: string | null
          retention_class?: string
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          safe_filename?: string
          site_id?: string | null
          size_bytes?: number
          storage_bucket?: string
          storage_provider?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
          upload_status?: string
          virus_scan_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_upload_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_upload_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_upload_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_upload_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_upload_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_upload_requests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_upload_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          checksum_sha256: string | null
          company_id: string
          created_at: string
          expires_at: string | null
          file_path: string
          id: string
          metadata: Json
          mime_type: string | null
          resident_id: string | null
          retention_class: string
          review_status: string
          search_vector: unknown
          site_id: string | null
          size_bytes: number | null
          status: string
          storage_bucket: string | null
          storage_provider: string
          title: string
          unit_id: string | null
          updated_at: string
          uploaded_by: string | null
          uploaded_original_name: string | null
          visibility: string
        }
        Insert: {
          category: string
          checksum_sha256?: string | null
          company_id: string
          created_at?: string
          expires_at?: string | null
          file_path: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          resident_id?: string | null
          retention_class?: string
          review_status?: string
          search_vector?: unknown
          site_id?: string | null
          size_bytes?: number | null
          status?: string
          storage_bucket?: string | null
          storage_provider?: string
          title: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          uploaded_original_name?: string | null
          visibility?: string
        }
        Update: {
          category?: string
          checksum_sha256?: string | null
          company_id?: string
          created_at?: string
          expires_at?: string | null
          file_path?: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          resident_id?: string | null
          retention_class?: string
          review_status?: string
          search_vector?: unknown
          site_id?: string | null
          size_bytes?: number | null
          status?: string
          storage_bucket?: string | null
          storage_provider?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
          uploaded_original_name?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_ledger_entries: {
        Row: {
          amount_cents: number
          company_id: string
          created_at: string
          currency: string
          description: string | null
          due_date: string | null
          entry_type: string
          id: string
          idempotency_key: string | null
          metadata: Json
          paid_at: string | null
          period: string | null
          posted_at: string | null
          resident_id: string | null
          reversal_of: string | null
          site_id: string
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          entry_type: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          paid_at?: string | null
          period?: string | null
          posted_at?: string | null
          resident_id?: string | null
          reversal_of?: string | null
          site_id: string
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          entry_type?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          paid_at?: string | null
          period?: string | null
          posted_at?: string | null
          resident_id?: string | null
          reversal_of?: string | null
          site_id?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_ledger_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_entries_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_entries_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "finance_ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_entries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_ledger_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          applied_at: string | null
          checked_at: string
          company_id: string
          created_at: string
          entity_type: string
          id: string
          imported_by: string | null
          metadata: Json
          rejected_rows: number
          source_name: string
          status: string
          total_rows: number
          updated_at: string
          valid_rows: number
          warning_rows: number
        }
        Insert: {
          applied_at?: string | null
          checked_at?: string
          company_id: string
          created_at?: string
          entity_type: string
          id?: string
          imported_by?: string | null
          metadata?: Json
          rejected_rows?: number
          source_name: string
          status?: string
          total_rows?: number
          updated_at?: string
          valid_rows?: number
          warning_rows?: number
        }
        Update: {
          applied_at?: string | null
          checked_at?: string
          company_id?: string
          created_at?: string
          entity_type?: string
          id?: string
          imported_by?: string | null
          metadata?: Json
          rejected_rows?: number
          source_name?: string
          status?: string
          total_rows?: number
          updated_at?: string
          valid_rows?: number
          warning_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_findings: {
        Row: {
          affected_rows: number
          area: string
          company_id: string
          created_at: string
          id: string
          import_batch_id: string | null
          message: string
          recommended_action: string | null
          severity: string
        }
        Insert: {
          affected_rows?: number
          area: string
          company_id: string
          created_at?: string
          id?: string
          import_batch_id?: string | null
          message: string
          recommended_action?: string | null
          severity: string
        }
        Update: {
          affected_rows?: number
          area?: string
          company_id?: string
          created_at?: string
          id?: string
          import_batch_id?: string | null
          message?: string
          recommended_action?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_findings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_findings_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_outbox: {
        Row: {
          action_type: string
          attempts: number
          available_at: string
          company_id: string
          created_at: string
          entity_id: string | null
          entity_table: string | null
          id: string
          integration_key: string
          last_error: string | null
          payload: Json
          status: string
          updated_at: string
        }
        Insert: {
          action_type: string
          attempts?: number
          available_at?: string
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          integration_key: string
          last_error?: string | null
          payload?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          attempts?: number
          available_at?: string
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          integration_key?: string
          last_error?: string | null
          payload?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_outbox_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          category: string
          company_id: string
          created_at: string
          data_handled: string | null
          fallback: string | null
          id: string
          ideal_now: string
          metadata: Json
          mode: string
          provider_code: string
          provider_name: string
          required_from_client: string | null
          risk_level: string
          scale_path: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          data_handled?: string | null
          fallback?: string | null
          id?: string
          ideal_now: string
          metadata?: Json
          mode: string
          provider_code: string
          provider_name: string
          required_from_client?: string | null
          risk_level?: string
          scale_path?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          data_handled?: string | null
          fallback?: string | null
          id?: string
          ideal_now?: string
          metadata?: Json
          mode?: string
          provider_code?: string
          provider_name?: string
          required_from_client?: string | null
          risk_level?: string
          scale_path?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_providers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      media_reports: {
        Row: {
          caption: string | null
          company_id: string
          created_at: string
          id: string
          media_type: string
          metadata: Json
          site_id: string | null
          storage_path: string | null
          ticket_id: string | null
          uploaded_by_staff_member_id: string | null
          verification_status: string
          workforce_task_id: string | null
        }
        Insert: {
          caption?: string | null
          company_id: string
          created_at?: string
          id?: string
          media_type: string
          metadata?: Json
          site_id?: string | null
          storage_path?: string | null
          ticket_id?: string | null
          uploaded_by_staff_member_id?: string | null
          verification_status?: string
          workforce_task_id?: string | null
        }
        Update: {
          caption?: string | null
          company_id?: string
          created_at?: string
          id?: string
          media_type?: string
          metadata?: Json
          site_id?: string | null
          storage_path?: string | null
          ticket_id?: string | null
          uploaded_by_staff_member_id?: string | null
          verification_status?: string
          workforce_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_reports_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_reports_uploaded_by_staff_member_id_fkey"
            columns: ["uploaded_by_staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_reports_workforce_task_id_fkey"
            columns: ["workforce_task_id"]
            isOneToOne: false
            referencedRelation: "workforce_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          approval_status: string
          body_by_language: Json
          channel: string
          company_id: string
          created_at: string
          id: string
          languages: string[]
          owner_team: string
          preview: string | null
          title: string
          updated_at: string
          use_case: string
          variables: string[]
        }
        Insert: {
          approval_status?: string
          body_by_language?: Json
          channel: string
          company_id: string
          created_at?: string
          id?: string
          languages?: string[]
          owner_team: string
          preview?: string | null
          title: string
          updated_at?: string
          use_case: string
          variables?: string[]
        }
        Update: {
          approval_status?: string
          body_by_language?: Json
          channel?: string
          company_id?: string
          created_at?: string
          id?: string
          languages?: string[]
          owner_team?: string
          preview?: string | null
          title?: string
          updated_at?: string
          use_case?: string
          variables?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          audience: string
          channel: string
          company_id: string
          consent_status: string
          created_at: string
          id: string
          language: string
          last_message: string | null
          metadata: Json
          next_action: string | null
          owner_team: string
          priority: string
          related_entity_id: string | null
          related_entity_table: string | null
          sentiment: string
          site_id: string | null
          status: string
          subject: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          audience: string
          channel: string
          company_id: string
          consent_status?: string
          created_at?: string
          id?: string
          language?: string
          last_message?: string | null
          metadata?: Json
          next_action?: string | null
          owner_team: string
          priority?: string
          related_entity_id?: string | null
          related_entity_table?: string | null
          sentiment?: string
          site_id?: string | null
          status?: string
          subject: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string
          channel?: string
          company_id?: string
          consent_status?: string
          created_at?: string
          id?: string
          language?: string
          last_message?: string | null
          metadata?: Json
          next_action?: string | null
          owner_team?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_table?: string | null
          sentiment?: string
          site_id?: string | null
          status?: string
          subject?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_web_capabilities: {
        Row: {
          audience: string
          capability_code: string
          company_id: string
          created_at: string
          description: string
          evidence: string | null
          id: string
          metadata: Json
          priority: string
          qa_signal: string | null
          status: string
          surface: string
          title: string
          updated_at: string
        }
        Insert: {
          audience: string
          capability_code: string
          company_id: string
          created_at?: string
          description: string
          evidence?: string | null
          id?: string
          metadata?: Json
          priority?: string
          qa_signal?: string | null
          status?: string
          surface: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          capability_code?: string
          company_id?: string
          created_at?: string
          description?: string
          evidence?: string | null
          id?: string
          metadata?: Json
          priority?: string
          qa_signal?: string | null
          status?: string
          surface?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_web_capabilities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempts: number
          channel: string
          company_id: string
          created_at: string
          id: string
          idempotency_key: string | null
          last_attempt_at: string | null
          next_retry_at: string | null
          notification_rule_id: string | null
          provider_mode: string
          provider_response: Json
          recipient_ref: string
          related_entity_id: string | null
          related_entity_table: string | null
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel: string
          company_id: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          next_retry_at?: string | null
          notification_rule_id?: string | null
          provider_mode?: string
          provider_response?: Json
          recipient_ref: string
          related_entity_id?: string | null
          related_entity_table?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          company_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          last_attempt_at?: string | null
          next_retry_at?: string | null
          notification_rule_id?: string | null
          provider_mode?: string
          provider_response?: Json
          recipient_ref?: string
          related_entity_id?: string | null
          related_entity_table?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_notification_rule_id_fkey"
            columns: ["notification_rule_id"]
            isOneToOne: false
            referencedRelation: "notification_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          approval_required: boolean
          channel_mix: string
          company_id: string
          created_at: string
          failover: string | null
          id: string
          language_mode: string
          metadata: Json
          owner_team: string
          site_id: string | null
          status: string
          target_expression: string
          trigger_key: string
          updated_at: string
        }
        Insert: {
          approval_required?: boolean
          channel_mix: string
          company_id: string
          created_at?: string
          failover?: string | null
          id?: string
          language_mode?: string
          metadata?: Json
          owner_team: string
          site_id?: string | null
          status?: string
          target_expression: string
          trigger_key: string
          updated_at?: string
        }
        Update: {
          approval_required?: boolean
          channel_mix?: string
          company_id?: string
          created_at?: string
          failover?: string | null
          id?: string
          language_mode?: string
          metadata?: Json
          owner_team?: string
          site_id?: string | null
          status?: string
          target_expression?: string
          trigger_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_rules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      offices: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_sync_jobs: {
        Row: {
          action_label: string
          company_id: string
          created_at: string
          data_scope: string | null
          device_label: string | null
          guardrail: string
          id: string
          job_code: string
          last_sync_at: string | null
          module_key: string
          payload: Json
          retry_policy: string | null
          role_key: string
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_label: string
          company_id: string
          created_at?: string
          data_scope?: string | null
          device_label?: string | null
          guardrail: string
          id?: string
          job_code: string
          last_sync_at?: string | null
          module_key: string
          payload?: Json
          retry_policy?: string | null
          role_key: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_label?: string
          company_id?: string
          created_at?: string
          data_scope?: string | null
          device_label?: string | null
          guardrail?: string
          id?: string
          job_code?: string
          last_sync_at?: string | null
          module_key?: string
          payload?: Json
          retry_policy?: string | null
          role_key?: string
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_sync_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_sync_jobs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_search_documents: {
        Row: {
          company_id: string
          created_at: string
          embedding: string | null
          entity_external_id: string | null
          entity_id: string | null
          entity_table: string
          id: string
          language: string
          metadata: Json
          search_vector: unknown
          site_id: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          embedding?: string | null
          entity_external_id?: string | null
          entity_id?: string | null
          entity_table: string
          id?: string
          language?: string
          metadata?: Json
          search_vector?: unknown
          site_id?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          embedding?: string | null
          entity_external_id?: string | null
          entity_id?: string | null
          entity_table?: string
          id?: string
          language?: string
          metadata?: Json
          search_vector?: unknown
          site_id?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_search_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_search_documents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          company_id: string
          created_at: string
          currency: string
          id: string
          ledger_entry_id: string | null
          paid_at: string | null
          provider: string
          provider_reference: string | null
          raw_payload: Json
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          ledger_entry_id?: string | null
          paid_at?: string | null
          provider: string
          provider_reference?: string | null
          raw_payload?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          ledger_entry_id?: string | null
          paid_at?: string | null
          provider?: string
          provider_reference?: string | null
          raw_payload?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "finance_ledger_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          language: string | null
          office_id: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          language?: string | null
          office_id?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          office_id?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_availability_blocks: {
        Row: {
          block_type: string
          company_id: string
          created_at: string
          ends_at: string
          id: string
          metadata: Json
          reason: string | null
          site_id: string
          source_reservation_id: string | null
          starts_at: string
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          block_type: string
          company_id: string
          created_at?: string
          ends_at: string
          id?: string
          metadata?: Json
          reason?: string | null
          site_id: string
          source_reservation_id?: string | null
          starts_at: string
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          block_type?: string
          company_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          site_id?: string
          source_reservation_id?: string | null
          starts_at?: string
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_availability_blocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_availability_blocks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_availability_blocks_source_reservation_id_fkey"
            columns: ["source_reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_availability_blocks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          access_code_status: string
          check_in_at: string
          check_out_at: string
          cleaning_status: string
          company_id: string
          created_at: string
          deposit_status: string
          guest_name: string | null
          id: string
          resident_id: string | null
          site_id: string
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          access_code_status?: string
          check_in_at: string
          check_out_at: string
          cleaning_status?: string
          company_id: string
          created_at?: string
          deposit_status?: string
          guest_name?: string | null
          id?: string
          resident_id?: string | null
          site_id: string
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          access_code_status?: string
          check_in_at?: string
          check_out_at?: string
          cleaning_status?: string
          company_id?: string
          created_at?: string
          deposit_status?: string
          guest_name?: string | null
          id?: string
          resident_id?: string | null
          site_id?: string
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          identity_status: string
          phone: string | null
          preferred_channel: string
          preferred_language: string
          risk_score: number
          search_vector: unknown
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          identity_status?: string
          phone?: string | null
          preferred_channel?: string
          preferred_language?: string
          risk_score?: number
          search_vector?: unknown
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          identity_status?: string
          phone?: string | null
          preferred_channel?: string
          preferred_language?: string
          risk_score?: number
          search_vector?: unknown
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_coverage: {
        Row: {
          can_approve_finance: boolean
          can_export_data: boolean
          can_manage_users: boolean
          can_restrict_access: boolean
          company_id: string
          created_at: string
          id: string
          role_label: string
          updated_at: string
          users_count: number
        }
        Insert: {
          can_approve_finance?: boolean
          can_export_data?: boolean
          can_manage_users?: boolean
          can_restrict_access?: boolean
          company_id: string
          created_at?: string
          id?: string
          role_label: string
          updated_at?: string
          users_count?: number
        }
        Update: {
          can_approve_finance?: boolean
          can_export_data?: boolean
          can_manage_users?: boolean
          can_restrict_access?: boolean
          company_id?: string
          created_at?: string
          id?: string
          role_label?: string
          updated_at?: string
          users_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_coverage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          active: boolean
          base_price_cents: number
          category: string
          code: string
          company_id: string
          created_at: string
          currency: string
          debt_policy: string
          description: string | null
          id: string
          metadata: Json
          name: string
          popularity_score: number
          provider_type: string
          requires_deposit: boolean
          requires_payment: boolean
          service_level: string
          site_id: string | null
          sla_hours: number
          team: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price_cents?: number
          category: string
          code: string
          company_id: string
          created_at?: string
          currency?: string
          debt_policy?: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          popularity_score?: number
          provider_type?: string
          requires_deposit?: boolean
          requires_payment?: boolean
          service_level?: string
          site_id?: string | null
          sla_hours: number
          team: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price_cents?: number
          category?: string
          code?: string
          company_id?: string
          created_at?: string
          currency?: string
          debt_policy?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          popularity_score?: number
          provider_type?: string
          requires_deposit?: boolean
          requires_payment?: boolean
          service_level?: string
          site_id?: string | null
          sla_hours?: number
          team?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_catalog_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          debt_check_status: string
          id: string
          metadata: Json
          next_action: string | null
          order_no: string
          payment_decision: string
          quoted_price_cents: number
          requested_for_at: string | null
          resident_id: string | null
          service_catalog_id: string | null
          site_id: string
          status: string
          ticket_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          debt_check_status?: string
          id?: string
          metadata?: Json
          next_action?: string | null
          order_no: string
          payment_decision?: string
          quoted_price_cents?: number
          requested_for_at?: string | null
          resident_id?: string | null
          service_catalog_id?: string | null
          site_id: string
          status?: string
          ticket_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          debt_check_status?: string
          id?: string
          metadata?: Json
          next_action?: string | null
          order_no?: string
          payment_decision?: string
          quoted_price_cents?: number
          requested_for_at?: string | null
          resident_id?: string | null
          service_catalog_id?: string | null
          site_id?: string
          status?: string
          ticket_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_service_catalog_id_fkey"
            columns: ["service_catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      service_ticket_events: {
        Row: {
          actor_profile_id: string | null
          body: string | null
          company_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          ticket_id: string
        }
        Insert: {
          actor_profile_id?: string | null
          body?: string | null
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          ticket_id: string
        }
        Update: {
          actor_profile_id?: string | null
          body?: string | null
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_ticket_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ticket_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tickets: {
        Row: {
          approved_cost_cents: number | null
          assigned_to: string | null
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          estimated_cost_cents: number | null
          id: string
          priority: string
          requires_finance_approval: boolean
          resident_id: string | null
          search_vector: unknown
          site_id: string
          sla_due_at: string | null
          status: string
          ticket_no: string
          title: string
          unit_id: string | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          approved_cost_cents?: number | null
          assigned_to?: string | null
          category?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_cost_cents?: number | null
          id?: string
          priority?: string
          requires_finance_approval?: boolean
          resident_id?: string | null
          search_vector?: unknown
          site_id: string
          sla_due_at?: string | null
          status?: string
          ticket_no: string
          title: string
          unit_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          approved_cost_cents?: number | null
          assigned_to?: string | null
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_cost_cents?: number | null
          id?: string
          priority?: string
          requires_finance_approval?: boolean
          resident_id?: string | null
          search_vector?: unknown
          site_id?: string
          sla_due_at?: string | null
          status?: string
          ticket_no?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      site_blocks: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          site_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          site_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          site_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_blocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_blocks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_floors: {
        Row: {
          block_id: string | null
          company_id: string
          created_at: string
          id: string
          label: string
          level: number
          site_id: string
          updated_at: string
        }
        Insert: {
          block_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          label: string
          level?: number
          site_id: string
          updated_at?: string
        }
        Update: {
          block_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          label?: string
          level?: number
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_floors_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "site_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_floors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_floors_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          city: string
          code: string
          company_id: string
          created_at: string
          district: string | null
          id: string
          manager_profile_id: string | null
          name: string
          office_id: string | null
          search_vector: unknown
          status: string
          total_units: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string
          code: string
          company_id: string
          created_at?: string
          district?: string | null
          id?: string
          manager_profile_id?: string | null
          name: string
          office_id?: string | null
          search_vector?: unknown
          status?: string
          total_units?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          code?: string
          company_id?: string
          created_at?: string
          district?: string | null
          id?: string
          manager_profile_id?: string | null
          name?: string
          office_id?: string | null
          search_vector?: unknown
          status?: string
          total_units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_manager_profile_id_fkey"
            columns: ["manager_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          access_scope: string
          active_tasks: number
          approval_limit_cents: number
          company_id: string
          created_at: string
          id: string
          language: string
          name: string
          phone: string | null
          profile_id: string | null
          role: string
          status: string
          team: string
          updated_at: string
        }
        Insert: {
          access_scope?: string
          active_tasks?: number
          approval_limit_cents?: number
          company_id: string
          created_at?: string
          id?: string
          language?: string
          name: string
          phone?: string | null
          profile_id?: string | null
          role: string
          status?: string
          team: string
          updated_at?: string
        }
        Update: {
          access_scope?: string
          active_tasks?: number
          approval_limit_cents?: number
          company_id?: string
          created_at?: string
          id?: string
          language?: string
          name?: string
          phone?: string | null
          profile_id?: string | null
          role?: string
          status?: string
          team?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      turnover_work_items: {
        Row: {
          checklist: Json
          company_id: string
          created_at: string
          dependency: string | null
          due_at: string | null
          evidence_required: boolean
          id: string
          metadata: Json
          owner_team: string
          priority: string
          progress: number
          reservation_id: string | null
          site_id: string
          status: string
          title: string
          updated_at: string
          workforce_task_id: string | null
        }
        Insert: {
          checklist?: Json
          company_id: string
          created_at?: string
          dependency?: string | null
          due_at?: string | null
          evidence_required?: boolean
          id?: string
          metadata?: Json
          owner_team: string
          priority?: string
          progress?: number
          reservation_id?: string | null
          site_id: string
          status?: string
          title: string
          updated_at?: string
          workforce_task_id?: string | null
        }
        Update: {
          checklist?: Json
          company_id?: string
          created_at?: string
          dependency?: string | null
          due_at?: string | null
          evidence_required?: boolean
          id?: string
          metadata?: Json
          owner_team?: string
          priority?: string
          progress?: number
          reservation_id?: string | null
          site_id?: string
          status?: string
          title?: string
          updated_at?: string
          workforce_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnover_work_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_work_items_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_work_items_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnover_work_items_workforce_task_id_fkey"
            columns: ["workforce_task_id"]
            isOneToOne: false
            referencedRelation: "workforce_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_residents: {
        Row: {
          company_id: string
          created_at: string
          end_date: string | null
          id: string
          is_primary: boolean
          relationship: string
          resident_id: string
          start_date: string | null
          unit_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean
          relationship: string
          resident_id: string
          start_date?: string | null
          unit_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_primary?: boolean
          relationship?: string
          resident_id?: string
          start_date?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_residents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_residents_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_residents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          bedrooms: number | null
          block_id: string | null
          company_id: string
          created_at: string
          floor_id: string | null
          id: string
          list_price_eur_cents: number | null
          next_price_eur_cents: number[]
          numbering_source: string | null
          occupancy_status: string
          ownership_status: string
          price_source: string | null
          sale_status: string
          search_vector: unknown
          site_id: string
          size_sqm: number | null
          source_metadata: Json
          source_notes: string | null
          unit_no: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          bedrooms?: number | null
          block_id?: string | null
          company_id: string
          created_at?: string
          floor_id?: string | null
          id?: string
          list_price_eur_cents?: number | null
          next_price_eur_cents?: number[]
          numbering_source?: string | null
          occupancy_status?: string
          ownership_status?: string
          price_source?: string | null
          sale_status?: string
          search_vector?: unknown
          site_id: string
          size_sqm?: number | null
          source_metadata?: Json
          source_notes?: string | null
          unit_no: string
          unit_type?: string
          updated_at?: string
        }
        Update: {
          bedrooms?: number | null
          block_id?: string | null
          company_id?: string
          created_at?: string
          floor_id?: string | null
          id?: string
          list_price_eur_cents?: number | null
          next_price_eur_cents?: number[]
          numbering_source?: string | null
          occupancy_status?: string
          ownership_status?: string
          price_source?: string | null
          sale_status?: string
          search_vector?: unknown
          site_id?: string
          size_sqm?: number | null
          source_metadata?: Json
          source_notes?: string | null
          unit_no?: string
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "site_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "site_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_tasks: {
        Row: {
          assigned_staff_member_id: string | null
          checklist: Json
          company_id: string
          completion_readiness: number
          created_at: string
          field_note: string | null
          id: string
          manager_approval_required: boolean
          media_count: number
          metadata: Json
          priority: string
          requires_media: boolean
          route_slot: string | null
          service_order_id: string | null
          site_id: string
          sla_due_at: string | null
          status: string
          task_no: string
          team: string
          ticket_id: string | null
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_staff_member_id?: string | null
          checklist?: Json
          company_id: string
          completion_readiness?: number
          created_at?: string
          field_note?: string | null
          id?: string
          manager_approval_required?: boolean
          media_count?: number
          metadata?: Json
          priority?: string
          requires_media?: boolean
          route_slot?: string | null
          service_order_id?: string | null
          site_id: string
          sla_due_at?: string | null
          status?: string
          task_no: string
          team: string
          ticket_id?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_staff_member_id?: string | null
          checklist?: Json
          company_id?: string
          completion_readiness?: number
          created_at?: string
          field_note?: string | null
          id?: string
          manager_approval_required?: boolean
          media_count?: number
          metadata?: Json
          priority?: string
          requires_media?: boolean
          route_slot?: string | null
          service_order_id?: string | null
          site_id?: string
          sla_due_at?: string | null
          status?: string
          task_no?: string
          team?: string
          ticket_id?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_tasks_assigned_staff_member_id_fkey"
            columns: ["assigned_staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_tasks_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_tasks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_tasks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_company_id: { Args: never; Returns: string }
      current_user_profile_role: { Args: never; Returns: string }
      current_user_role_level: { Args: never; Returns: number }
      current_user_role_meets: { Args: { min_level: number }; Returns: boolean }
      default_company_id: { Args: never; Returns: string }
      get_phase4_site_data: {
        Args: { p_limit?: number; p_query?: string }
        Returns: Json
      }
      get_site_dashboard_snapshot: { Args: never; Returns: Json }
      is_admin_role: { Args: { p_role: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      kbs_identity_retention_days: { Args: never; Returns: number }
      log_client_action: {
        Args: {
          p_action_type: string
          p_entity_external_id?: string
          p_entity_id?: string
          p_entity_table?: string
          p_metadata?: Json
          p_title?: string
        }
        Returns: string
      }
      role_level: { Args: { p_role: string }; Returns: number }
      role_scope: { Args: { p_role: string }; Returns: string }
      search_operational_records: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          entity_external_id: string
          entity_id: string
          entity_table: string
          metadata: Json
          rank: number
          summary: string
          title: string
        }[]
      }
      submit_public_intake: {
        Args: { p_action_type: string; p_metadata?: Json; p_title?: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
