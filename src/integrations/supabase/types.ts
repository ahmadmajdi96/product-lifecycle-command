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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit: {
        Row: {
          action: string
          actor: string
          actor_id: string | null
          at: string
          detail: string | null
          entity: string
          id: string
          signature: string | null
        }
        Insert: {
          action: string
          actor: string
          actor_id?: string | null
          at?: string
          detail?: string | null
          entity: string
          id?: string
          signature?: string | null
        }
        Update: {
          action?: string
          actor?: string
          actor_id?: string | null
          at?: string
          detail?: string | null
          entity?: string
          id?: string
          signature?: string | null
        }
        Relationships: []
      }
      boms: {
        Row: {
          id: string
          kind: string
          lines: Json
          rev: string
          root: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          kind: string
          lines?: Json
          rev: string
          root: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kind?: string
          lines?: Json
          rev?: string
          root?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      changes: {
        Row: {
          affected: Json
          approvals: Json
          category: string | null
          created_at: string
          disposition: string
          id: string
          kind: string
          number: string
          origin: string | null
          parent: string | null
          priority: string
          problem: string | null
          solution: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected?: Json
          approvals?: Json
          category?: string | null
          created_at?: string
          disposition: string
          id?: string
          kind: string
          number: string
          origin?: string | null
          parent?: string | null
          priority: string
          problem?: string | null
          solution?: string | null
          status: string
          title: string
          updated_at?: string
        }
        Update: {
          affected?: Json
          approvals?: Json
          category?: string | null
          created_at?: string
          disposition?: string
          id?: string
          kind?: string
          number?: string
          origin?: string | null
          parent?: string | null
          priority?: string
          problem?: string | null
          solution?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      docs: {
        Row: {
          checked_out_by: string | null
          file_name: string | null
          file_path: string | null
          id: string
          kind: string
          linked_item: string | null
          mime_type: string | null
          number: string
          rev: string
          size_kb: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          checked_out_by?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          kind: string
          linked_item?: string | null
          mime_type?: string | null
          number: string
          rev?: string
          size_kb?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          checked_out_by?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          linked_item?: string | null
          mime_type?: string | null
          number?: string
          rev?: string
          size_kb?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          on_hand: number
        }
        Insert: {
          id: string
          on_hand?: number
        }
        Update: {
          id?: string
          on_hand?: number
        }
        Relationships: []
      }
      items: {
        Row: {
          cost: number
          ctq: string | null
          effective_from: string
          effective_to: string | null
          id: string
          name: string
          number: string
          owner: string | null
          rev: string
          status: string
          type: string
          uom: string
          updated_at: string
        }
        Insert: {
          cost?: number
          ctq?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          name: string
          number: string
          owner?: string | null
          rev?: string
          status?: string
          type: string
          uom?: string
          updated_at?: string
        }
        Update: {
          cost?: number
          ctq?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          name?: string
          number?: string
          owner?: string | null
          rev?: string
          status?: string
          type?: string
          uom?: string
          updated_at?: string
        }
        Relationships: []
      }
      plm_action_authorizations: {
        Row: {
          action: string
          candidate_hash: string
          expires_at: string
          id: string
          organization_id: string
          revision_id: string
          site_id: string | null
          used_at: string | null
          user_id: string
          verified_at: string
        }
        Insert: {
          action: string
          candidate_hash: string
          expires_at: string
          id?: string
          organization_id: string
          revision_id: string
          site_id?: string | null
          used_at?: string | null
          user_id: string
          verified_at?: string
        }
        Update: {
          action?: string
          candidate_hash?: string
          expires_at?: string
          id?: string
          organization_id?: string
          revision_id?: string
          site_id?: string | null
          used_at?: string | null
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      plm_applicability_decisions: {
        Row: {
          authorized_by: string
          candidate_hash: string
          created_at: string
          id: string
          organization_id: string
          reason: string
          requirement: string
          revision_id: string
          site_id: string | null
          valid_from: string
          valid_to: string
        }
        Insert: {
          authorized_by: string
          candidate_hash: string
          created_at?: string
          id?: string
          organization_id: string
          reason: string
          requirement: string
          revision_id: string
          site_id?: string | null
          valid_from: string
          valid_to: string
        }
        Update: {
          authorized_by?: string
          candidate_hash?: string
          created_at?: string
          id?: string
          organization_id?: string
          reason?: string
          requirement?: string
          revision_id?: string
          site_id?: string | null
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "plm_applicability_decisions_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "plm_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_audit_events: {
        Row: {
          action: string
          actor_id: string
          after_value: Json | null
          before_value: Json | null
          content_hash: string | null
          correlation_id: string
          id: string
          occurred_at: string
          organization_id: string
          reason: string
          revision_id: string | null
          site_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          after_value?: Json | null
          before_value?: Json | null
          content_hash?: string | null
          correlation_id?: string
          id?: string
          occurred_at?: string
          organization_id: string
          reason: string
          revision_id?: string | null
          site_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          after_value?: Json | null
          before_value?: Json | null
          content_hash?: string | null
          correlation_id?: string
          id?: string
          occurred_at?: string
          organization_id?: string
          reason?: string
          revision_id?: string | null
          site_id?: string | null
        }
        Relationships: []
      }
      plm_decisions: {
        Row: {
          candidate_hash: string
          decided_at: string
          decision: string
          id: string
          meaning: string
          organization_id: string
          reason: string
          reauthenticated_at: string
          review_id: string
          reviewer_id: string
          revision_id: string
          site_id: string | null
        }
        Insert: {
          candidate_hash: string
          decided_at?: string
          decision: string
          id?: string
          meaning: string
          organization_id: string
          reason: string
          reauthenticated_at: string
          review_id: string
          reviewer_id: string
          revision_id: string
          site_id?: string | null
        }
        Update: {
          candidate_hash?: string
          decided_at?: string
          decision?: string
          id?: string
          meaning?: string
          organization_id?: string
          reason?: string
          reauthenticated_at?: string
          review_id?: string
          reviewer_id?: string
          revision_id?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plm_decisions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "plm_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plm_decisions_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "plm_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_delivery_attempts: {
        Row: {
          attempted_at: string
          consumer: string
          detail: string | null
          event_id: string
          id: string
          organization_id: string
          site_id: string | null
          status: string
        }
        Insert: {
          attempted_at?: string
          consumer: string
          detail?: string | null
          event_id: string
          id?: string
          organization_id: string
          site_id?: string | null
          status?: string
        }
        Update: {
          attempted_at?: string
          consumer?: string
          detail?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          site_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "plm_delivery_attempts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "plm_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_document_files: {
        Row: {
          created_at: string
          id: string
          mime_type: string
          organization_id: string
          original_name: string
          retained: boolean
          revision_id: string
          sha256: string
          site_id: string | null
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type: string
          organization_id: string
          original_name: string
          retained?: boolean
          revision_id: string
          sha256: string
          site_id?: string | null
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string
          organization_id?: string
          original_name?: string
          retained?: boolean
          revision_id?: string
          sha256?: string
          site_id?: string | null
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "plm_document_files_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: true
            referencedRelation: "plm_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_document_locks: {
        Row: {
          acquired_at: string
          entity_id: string
          organization_id: string
          owner_id: string
          site_id: string | null
        }
        Insert: {
          acquired_at?: string
          entity_id: string
          organization_id: string
          owner_id: string
          site_id?: string | null
        }
        Update: {
          acquired_at?: string
          entity_id?: string
          organization_id?: string
          owner_id?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plm_document_locks_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "plm_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_entities: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          kind: string
          name: string
          normalized_code: string | null
          organization_id: string
          site_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          id?: string
          kind: string
          name: string
          normalized_code?: string | null
          organization_id: string
          site_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          name?: string
          normalized_code?: string | null
          organization_id?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plm_entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "plm_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plm_entities_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "plm_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_external_references: {
        Row: {
          content_hash: string
          deep_link: string | null
          evidence: Json
          id: string
          operation_id: string | null
          organization_id: string
          resource_revision_id: string | null
          revision_id: string
          site_id: string | null
          source_object_id: string
          source_revision_id: string
          source_system: string
          source_updated_at: string
          status: string
          verified_at: string | null
        }
        Insert: {
          content_hash: string
          deep_link?: string | null
          evidence?: Json
          id?: string
          operation_id?: string | null
          organization_id: string
          resource_revision_id?: string | null
          revision_id: string
          site_id?: string | null
          source_object_id: string
          source_revision_id: string
          source_system: string
          source_updated_at: string
          status?: string
          verified_at?: string | null
        }
        Update: {
          content_hash?: string
          deep_link?: string | null
          evidence?: Json
          id?: string
          operation_id?: string | null
          organization_id?: string
          resource_revision_id?: string | null
          revision_id?: string
          site_id?: string | null
          source_object_id?: string
          source_revision_id?: string
          source_system?: string
          source_updated_at?: string
          status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plm_external_references_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "plm_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_inbound_attempts: {
        Row: {
          consumer: string
          content_hash: string
          event_id: string
          id: string
          organization_id: string
          outcome: string
          reason: string
          received_at: string
          site_id: string | null
        }
        Insert: {
          consumer: string
          content_hash: string
          event_id: string
          id?: string
          organization_id: string
          outcome: string
          reason: string
          received_at?: string
          site_id?: string | null
        }
        Update: {
          consumer?: string
          content_hash?: string
          event_id?: string
          id?: string
          organization_id?: string
          outcome?: string
          reason?: string
          received_at?: string
          site_id?: string | null
        }
        Relationships: []
      }
      plm_inbox: {
        Row: {
          consumer: string
          content_hash: string
          event_id: string
          id: string
          organization_id: string
          reason: string
          received_at: string
          revision_id: string
          site_id: string | null
          source_timestamp: string
          status: string
        }
        Insert: {
          consumer: string
          content_hash: string
          event_id: string
          id?: string
          organization_id: string
          reason: string
          received_at?: string
          revision_id: string
          site_id?: string | null
          source_timestamp: string
          status: string
        }
        Update: {
          consumer?: string
          content_hash?: string
          event_id?: string
          id?: string
          organization_id?: string
          reason?: string
          received_at?: string
          revision_id?: string
          site_id?: string | null
          source_timestamp?: string
          status?: string
        }
        Relationships: []
      }
      plm_memberships: {
        Row: {
          active: boolean
          id: string
          organization_id: string
          site_ids: string[]
          user_id: string
        }
        Insert: {
          active?: boolean
          id?: string
          organization_id: string
          site_ids?: string[]
          user_id: string
        }
        Update: {
          active?: boolean
          id?: string
          organization_id?: string
          site_ids?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plm_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "plm_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_organizations: {
        Row: {
          created_at: string
          created_by: string
          environment: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          environment?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          environment?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      plm_outbox: {
        Row: {
          content_hash: string
          correlation_id: string
          envelope: Json
          event_type: string
          id: string
          occurred_at: string
          organization_id: string
          revision_id: string
          schema_version: string
          site_id: string | null
          source_module: string
        }
        Insert: {
          content_hash: string
          correlation_id: string
          envelope: Json
          event_type: string
          id?: string
          occurred_at?: string
          organization_id: string
          revision_id: string
          schema_version?: string
          site_id?: string | null
          source_module?: string
        }
        Update: {
          content_hash?: string
          correlation_id?: string
          envelope?: Json
          event_type?: string
          id?: string
          occurred_at?: string
          organization_id?: string
          revision_id?: string
          schema_version?: string
          site_id?: string | null
          source_module?: string
        }
        Relationships: [
          {
            foreignKeyName: "plm_outbox_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "plm_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_reviews: {
        Row: {
          candidate_hash: string
          id: string
          invalidated_at: string | null
          organization_id: string
          requested_at: string
          requested_by: string
          revision_id: string
          site_id: string | null
        }
        Insert: {
          candidate_hash: string
          id?: string
          invalidated_at?: string | null
          organization_id: string
          requested_at?: string
          requested_by: string
          revision_id: string
          site_id?: string | null
        }
        Update: {
          candidate_hash?: string
          id?: string
          invalidated_at?: string | null
          organization_id?: string
          requested_at?: string
          requested_by?: string
          revision_id?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plm_reviews_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "plm_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_revisions: {
        Row: {
          author_id: string
          content_hash: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          entity_id: string
          id: string
          item_revision_id: string | null
          organization_id: string
          parent_revision_id: string | null
          payload: Json
          reason: string
          revision_label: string
          site_id: string | null
          state: string
          updated_at: string
          version: number
        }
        Insert: {
          author_id: string
          content_hash: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          entity_id: string
          id?: string
          item_revision_id?: string | null
          organization_id: string
          parent_revision_id?: string | null
          payload?: Json
          reason: string
          revision_label: string
          site_id?: string | null
          state?: string
          updated_at?: string
          version?: number
        }
        Update: {
          author_id?: string
          content_hash?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          entity_id?: string
          id?: string
          item_revision_id?: string | null
          organization_id?: string
          parent_revision_id?: string | null
          payload?: Json
          reason?: string
          revision_label?: string
          site_id?: string | null
          state?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "plm_revisions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "plm_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plm_revisions_item_revision_id_fkey"
            columns: ["item_revision_id"]
            isOneToOne: false
            referencedRelation: "plm_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plm_revisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "plm_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plm_revisions_parent_revision_id_fkey"
            columns: ["parent_revision_id"]
            isOneToOne: false
            referencedRelation: "plm_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plm_revisions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "plm_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_sites: {
        Row: {
          code: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          code: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plm_sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "plm_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plm_unit_conversions: {
        Row: {
          approved_by: string
          basis: string
          created_at: string
          factor: number
          from_unit: string
          id: string
          item_entity_id: string | null
          organization_id: string
          to_unit: string
          version: number
        }
        Insert: {
          approved_by: string
          basis: string
          created_at?: string
          factor: number
          from_unit: string
          id?: string
          item_entity_id?: string | null
          organization_id: string
          to_unit: string
          version?: number
        }
        Update: {
          approved_by?: string
          basis?: string
          created_at?: string
          factor?: number
          from_unit?: string
          id?: string
          item_entity_id?: string | null
          organization_id?: string
          to_unit?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "plm_unit_conversions_item_entity_id_fkey"
            columns: ["item_entity_id"]
            isOneToOne: false
            referencedRelation: "plm_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          job_title: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      routings: {
        Row: {
          id: string
          item: string
          kind: string
          number: string
          ops: Json
          rev: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          item: string
          kind: string
          number: string
          ops?: Json
          rev: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item?: string
          kind?: string
          number?: string
          ops?: Json
          rev?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      syncs: {
        Row: {
          at: string
          entity: string
          id: string
          payload: string
          status: string
          target: string
        }
        Insert: {
          at?: string
          entity: string
          id?: string
          payload: string
          status: string
          target: string
        }
        Update: {
          at?: string
          entity?: string
          id?: string
          payload?: string
          status?: string
          target?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_centers: {
        Row: {
          area: string | null
          capacity_hrs: number | null
          code: string
          id: string
          name: string
          status: string
        }
        Insert: {
          area?: string | null
          capacity_hrs?: number | null
          code: string
          id: string
          name: string
          status?: string
        }
        Update: {
          area?: string | null
          capacity_hrs?: number | null
          code?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          done: number
          id: string
          item: string
          line: string | null
          qty: number
          wo: string
        }
        Insert: {
          done?: number
          id: string
          item: string
          line?: string | null
          qty: number
          wo: string
        }
        Update: {
          done?: number
          id?: string
          item?: string
          line?: string | null
          qty?: number
          wo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      plm_has_scope: {
        Args: { _org: string; _site?: string }
        Returns: boolean
      }
      plm_sandbox_workspace: { Args: { _name: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "engineer" | "quality" | "manufacturing" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "engineer", "quality", "manufacturing", "viewer"],
    },
  },
} as const
