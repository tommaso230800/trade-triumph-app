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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aziende: {
        Row: {
          citta: string | null
          created_at: string | null
          email: string | null
          id: string
          indirizzo: string | null
          logo_url: string | null
          nome: string
          partita_iva: string | null
          prodotti: number | null
          provvigione_percentuale: number | null
          settore: string | null
          status: Database["public"]["Enums"]["company_status"] | null
          telefono: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          citta?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          logo_url?: string | null
          nome: string
          partita_iva?: string | null
          prodotti?: number | null
          provvigione_percentuale?: number | null
          settore?: string | null
          status?: Database["public"]["Enums"]["company_status"] | null
          telefono?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          citta?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          logo_url?: string | null
          nome?: string
          partita_iva?: string | null
          prodotti?: number | null
          provvigione_percentuale?: number | null
          settore?: string | null
          status?: Database["public"]["Enums"]["company_status"] | null
          telefono?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clienti: {
        Row: {
          azienda: string | null
          cap: string | null
          citta: string | null
          codice_sdi: string | null
          consorzio: string | null
          created_at: string | null
          email: string | null
          email_aggiuntive: string[] | null
          fatturato: number | null
          id: string
          indirizzo: string | null
          nome: string
          ordini_count: number | null
          partita_iva: string | null
          pec: string | null
          provincia: string | null
          status: Database["public"]["Enums"]["client_status"] | null
          telefono: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          azienda?: string | null
          cap?: string | null
          citta?: string | null
          codice_sdi?: string | null
          consorzio?: string | null
          created_at?: string | null
          email?: string | null
          email_aggiuntive?: string[] | null
          fatturato?: number | null
          id?: string
          indirizzo?: string | null
          nome: string
          ordini_count?: number | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          telefono?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          azienda?: string | null
          cap?: string | null
          citta?: string | null
          codice_sdi?: string | null
          consorzio?: string | null
          created_at?: string | null
          email?: string | null
          email_aggiuntive?: string[] | null
          fatturato?: number | null
          id?: string
          indirizzo?: string | null
          nome?: string
          ordini_count?: number | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          telefono?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      eventi: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          data: string
          descrizione: string | null
          id: string
          luogo: string | null
          orario_fine: string | null
          orario_inizio: string | null
          tipo: Database["public"]["Enums"]["event_type"] | null
          titolo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data: string
          descrizione?: string | null
          id?: string
          luogo?: string | null
          orario_fine?: string | null
          orario_inizio?: string | null
          tipo?: Database["public"]["Enums"]["event_type"] | null
          titolo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data?: string
          descrizione?: string | null
          id?: string
          luogo?: string | null
          orario_fine?: string | null
          orario_inizio?: string | null
          tipo?: Database["public"]["Enums"]["event_type"] | null
          titolo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      ordini: {
        Row: {
          azienda_id: string | null
          cliente_id: string | null
          codice: string | null
          created_at: string | null
          data_ordine: string | null
          id: string
          note: string | null
          prodotti: number | null
          provvigione_pagata: boolean
          sconto: number | null
          sconto_merce: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          tipo_pagamento: string | null
          totale: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          azienda_id?: string | null
          cliente_id?: string | null
          codice?: string | null
          created_at?: string | null
          data_ordine?: string | null
          id?: string
          note?: string | null
          prodotti?: number | null
          provvigione_pagata?: boolean
          sconto?: number | null
          sconto_merce?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          tipo_pagamento?: string | null
          totale?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          azienda_id?: string | null
          cliente_id?: string | null
          codice?: string | null
          created_at?: string | null
          data_ordine?: string | null
          id?: string
          note?: string | null
          prodotti?: number | null
          provvigione_pagata?: boolean
          sconto?: number | null
          sconto_merce?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          tipo_pagamento?: string | null
          totale?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordini_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      ordini_righe: {
        Row: {
          created_at: string
          id: string
          ordine_id: string
          prezzo_unitario: number
          prodotto_id: string
          quantita_cartoni: number
          quantita_pezzi: number
          sc1: number
          sc2: number
          sc3: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordine_id: string
          prezzo_unitario?: number
          prodotto_id: string
          quantita_cartoni?: number
          quantita_pezzi?: number
          sc1?: number
          sc2?: number
          sc3?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ordine_id?: string
          prezzo_unitario?: number
          prodotto_id?: string
          quantita_cartoni?: number
          quantita_pezzi?: number
          sc1?: number
          sc2?: number
          sc3?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordini_righe_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_righe_prodotto_id_fkey"
            columns: ["prodotto_id"]
            isOneToOne: false
            referencedRelation: "prodotti"
            referencedColumns: ["id"]
          },
        ]
      }
      prodotti: {
        Row: {
          azienda_id: string
          cartoni_per_strato: number
          codice: string | null
          created_at: string
          id: string
          immagine_url: string | null
          nome: string
          pezzi_per_cartone: number
          prezzo_listino: number
          quantita_pezzi: number
          strati: number
          updated_at: string
          user_id: string
        }
        Insert: {
          azienda_id: string
          cartoni_per_strato?: number
          codice?: string | null
          created_at?: string
          id?: string
          immagine_url?: string | null
          nome: string
          pezzi_per_cartone?: number
          prezzo_listino?: number
          quantita_pezzi?: number
          strati?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          azienda_id?: string
          cartoni_per_strato?: number
          codice?: string | null
          created_at?: string
          id?: string
          immagine_url?: string | null
          nome?: string
          pezzi_per_cartone?: number
          prezzo_listino?: number
          quantita_pezzi?: number
          strati?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prodotti_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      promemoria: {
        Row: {
          completato: boolean | null
          created_at: string | null
          data: string
          descrizione: string | null
          id: string
          orario: string | null
          priorita: Database["public"]["Enums"]["reminder_priority"] | null
          tipo: Database["public"]["Enums"]["reminder_type"] | null
          titolo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completato?: boolean | null
          created_at?: string | null
          data: string
          descrizione?: string | null
          id?: string
          orario?: string | null
          priorita?: Database["public"]["Enums"]["reminder_priority"] | null
          tipo?: Database["public"]["Enums"]["reminder_type"] | null
          titolo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completato?: boolean | null
          created_at?: string | null
          data?: string
          descrizione?: string | null
          id?: string
          orario?: string | null
          priorita?: Database["public"]["Enums"]["reminder_priority"] | null
          tipo?: Database["public"]["Enums"]["reminder_type"] | null
          titolo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      client_status: "premium" | "standard" | "nuovo"
      company_status: "attivo" | "in_pausa"
      event_type: "meeting" | "presentazione" | "visita" | "altro"
      order_status: "in_attesa" | "spedito" | "completato" | "annullato"
      reminder_priority: "alta" | "media" | "bassa"
      reminder_type: "call" | "email" | "documento" | "scadenza"
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
    Enums: {
      client_status: ["premium", "standard", "nuovo"],
      company_status: ["attivo", "in_pausa"],
      event_type: ["meeting", "presentazione", "visita", "altro"],
      order_status: ["in_attesa", "spedito", "completato", "annullato"],
      reminder_priority: ["alta", "media", "bassa"],
      reminder_type: ["call", "email", "documento", "scadenza"],
    },
  },
} as const
