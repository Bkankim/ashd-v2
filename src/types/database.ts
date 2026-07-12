export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      product: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          product_category: string | null;
          purchase_date: string | null;
          amount: number | null;
          store: string | null;
          order_id: string | null;
          refund_deadline: string | null;
          warranty_end_date: string | null;
          as_contact: string | null;
          source: Database["public"]["Enums"]["source_type"];
          image_path: string | null;
          raw_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          product_category?: string | null;
          purchase_date?: string | null;
          amount?: number | null;
          store?: string | null;
          order_id?: string | null;
          refund_deadline?: string | null;
          warranty_end_date?: string | null;
          as_contact?: string | null;
          source?: Database["public"]["Enums"]["source_type"];
          image_path?: string | null;
          raw_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          product_category?: string | null;
          purchase_date?: string | null;
          amount?: number | null;
          store?: string | null;
          order_id?: string | null;
          refund_deadline?: string | null;
          warranty_end_date?: string | null;
          as_contact?: string | null;
          source?: Database["public"]["Enums"]["source_type"];
          image_path?: string | null;
          raw_text?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      document: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          title: string | null;
          image_path: string | null;
          raw_text: string;
          parsed_fields: Json;
          evidence: string | null;
          source: Database["public"]["Enums"]["source_type"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id?: string | null;
          title?: string | null;
          image_path?: string | null;
          raw_text?: string;
          parsed_fields?: Json;
          evidence?: string | null;
          source?: Database["public"]["Enums"]["source_type"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string | null;
          title?: string | null;
          image_path?: string | null;
          raw_text?: string;
          parsed_fields?: Json;
          evidence?: string | null;
          source?: Database["public"]["Enums"]["source_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      document_processing_job: {
        Row: {
          id: string;
          user_id: string;
          document_id: string | null;
          product_id: string | null;
          status: string;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id?: string | null;
          product_id?: string | null;
          status?: string;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string | null;
          product_id?: string | null;
          status?: string;
          error?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_settings: {
        Row: {
          id: string;
          user_id: string;
          email_enabled: boolean;
          telegram_enabled: boolean;
          warranty_days_before: number[];
          refund_days_before: number[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_enabled?: boolean;
          telegram_enabled?: boolean;
          warranty_days_before?: number[];
          refund_days_before?: number[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email_enabled?: boolean;
          telegram_enabled?: boolean;
          warranty_days_before?: number[];
          refund_days_before?: number[];
          updated_at?: string;
        };
        Relationships: [];
      };
      telegram_account: {
        Row: {
          id: string;
          user_id: string;
          chat_id: string;
          username: string | null;
          linked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          chat_id: string;
          username?: string | null;
          linked_at?: string;
        };
        Update: {
          chat_id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      alert_log: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          type: "warranty" | "refund";
          threshold_days: number;
          channel: "email" | "telegram";
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          type: "warranty" | "refund";
          threshold_days: number;
          channel: "email" | "telegram";
          sent_at?: string;
        };
        Update: {
          sent_at?: string;
        };
        Relationships: [];
      };
      consent_log: {
        Row: {
          id: string;
          user_id: string;
          consent_type: "privacy" | "cross_border";
          policy_version: string;
          consented_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          consent_type: "privacy" | "cross_border";
          policy_version: string;
          consented_at?: string;
        };
        Update: {
          policy_version?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      source_type: "manual" | "screenshot" | "kakao_share" | "email";
    };
    CompositeTypes: Record<string, never>;
  };
};
