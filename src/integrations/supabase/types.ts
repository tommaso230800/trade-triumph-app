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
          default_sc1: number
          default_sc2: number
          default_sc3: number
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
          default_sc1?: number
          default_sc2?: number
          default_sc3?: number
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
          default_sc1?: number
          default_sc2?: number
          default_sc3?: number
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
      brands: {
        Row: {
          azienda_id: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          azienda_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          azienda_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      canvass: {
        Row: {
          attivo: boolean
          azienda_id: string
          cartoni_acquisto: number | null
          cartoni_omaggio: number | null
          created_at: string
          data_fine: string
          data_inizio: string
          descrizione: string | null
          id: string
          nome: string
          tipo: string
          tutti_clienti: boolean
          updated_at: string
          user_id: string
          valore: number
        }
        Insert: {
          attivo?: boolean
          azienda_id: string
          cartoni_acquisto?: number | null
          cartoni_omaggio?: number | null
          created_at?: string
          data_fine: string
          data_inizio: string
          descrizione?: string | null
          id?: string
          nome: string
          tipo: string
          tutti_clienti?: boolean
          updated_at?: string
          user_id: string
          valore?: number
        }
        Update: {
          attivo?: boolean
          azienda_id?: string
          cartoni_acquisto?: number | null
          cartoni_omaggio?: number | null
          created_at?: string
          data_fine?: string
          data_inizio?: string
          descrizione?: string | null
          id?: string
          nome?: string
          tipo?: string
          tutti_clienti?: boolean
          updated_at?: string
          user_id?: string
          valore?: number
        }
        Relationships: [
          {
            foreignKeyName: "canvass_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      canvass_clienti: {
        Row: {
          canvass_id: string
          cliente_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          canvass_id: string
          cliente_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          canvass_id?: string
          cliente_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvass_clienti_canvass_id_fkey"
            columns: ["canvass_id"]
            isOneToOne: false
            referencedRelation: "canvass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvass_clienti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      canvass_periodi: {
        Row: {
          canvass_id: string
          created_at: string
          data_fine: string
          data_inizio: string
          id: string
          user_id: string
        }
        Insert: {
          canvass_id: string
          created_at?: string
          data_fine: string
          data_inizio: string
          id?: string
          user_id: string
        }
        Update: {
          canvass_id?: string
          created_at?: string
          data_fine?: string
          data_inizio?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvass_periodi_canvass_id_fkey"
            columns: ["canvass_id"]
            isOneToOne: false
            referencedRelation: "canvass"
            referencedColumns: ["id"]
          },
        ]
      }
      canvass_prodotti: {
        Row: {
          canvass_id: string
          created_at: string
          id: string
          prodotto_id: string
          user_id: string
          valore_override: number | null
        }
        Insert: {
          canvass_id: string
          created_at?: string
          id?: string
          prodotto_id: string
          user_id: string
          valore_override?: number | null
        }
        Update: {
          canvass_id?: string
          created_at?: string
          id?: string
          prodotto_id?: string
          user_id?: string
          valore_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "canvass_prodotti_canvass_id_fkey"
            columns: ["canvass_id"]
            isOneToOne: false
            referencedRelation: "canvass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvass_prodotti_prodotto_id_fkey"
            columns: ["prodotto_id"]
            isOneToOne: false
            referencedRelation: "prodotti"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          category: string
          client_id: string
          created_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          category?: string
          client_id: string
          created_at?: string
          id?: string
          note: string
          user_id: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      clienti: {
        Row: {
          azienda: string | null
          budget_promo_percentuale: number | null
          cap: string | null
          citta: string | null
          codice_sdi: string | null
          condizioni_attive: string[] | null
          consorzio: string | null
          costo_promo_totale: number | null
          created_at: string | null
          email: string | null
          email_aggiuntive: string[] | null
          fatturato: number | null
          fatturato_target: number | null
          id: string
          indirizzo: string | null
          n_promo_concesse: number | null
          nome: string
          ordini_count: number | null
          partita_iva: string | null
          pec: string | null
          provincia: string | null
          sconto_max_policy: number | null
          status: Database["public"]["Enums"]["client_status"] | null
          telefono: string | null
          tipologia_cliente: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          azienda?: string | null
          budget_promo_percentuale?: number | null
          cap?: string | null
          citta?: string | null
          codice_sdi?: string | null
          condizioni_attive?: string[] | null
          consorzio?: string | null
          costo_promo_totale?: number | null
          created_at?: string | null
          email?: string | null
          email_aggiuntive?: string[] | null
          fatturato?: number | null
          fatturato_target?: number | null
          id?: string
          indirizzo?: string | null
          n_promo_concesse?: number | null
          nome: string
          ordini_count?: number | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          sconto_max_policy?: number | null
          status?: Database["public"]["Enums"]["client_status"] | null
          telefono?: string | null
          tipologia_cliente?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          azienda?: string | null
          budget_promo_percentuale?: number | null
          cap?: string | null
          citta?: string | null
          codice_sdi?: string | null
          condizioni_attive?: string[] | null
          consorzio?: string | null
          costo_promo_totale?: number | null
          created_at?: string | null
          email?: string | null
          email_aggiuntive?: string[] | null
          fatturato?: number | null
          fatturato_target?: number | null
          id?: string
          indirizzo?: string | null
          n_promo_concesse?: number | null
          nome?: string
          ordini_count?: number | null
          partita_iva?: string | null
          pec?: string | null
          provincia?: string | null
          sconto_max_policy?: number | null
          status?: Database["public"]["Enums"]["client_status"] | null
          telefono?: string | null
          tipologia_cliente?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contratti_clienti: {
        Row: {
          anno: number
          azienda_id: string
          cliente_id: string
          consorzio: string | null
          created_at: string
          id: string
          is_consorzio: boolean
          note: string | null
          percentuale_premio: number
          soglia_fatturato: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anno: number
          azienda_id: string
          cliente_id: string
          consorzio?: string | null
          created_at?: string
          id?: string
          is_consorzio?: boolean
          note?: string | null
          percentuale_premio?: number
          soglia_fatturato?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anno?: number
          azienda_id?: string
          cliente_id?: string
          consorzio?: string | null
          created_at?: string
          id?: string
          is_consorzio?: boolean
          note?: string | null
          percentuale_premio?: number
          soglia_fatturato?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratti_clienti_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratti_clienti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          campioni_consegnati: boolean | null
          created_at: string
          data_report: string
          id: string
          incassi: boolean | null
          ordini_fatti: boolean | null
          problemi: boolean | null
          promo_proposte: boolean | null
          testo_report: string | null
          titolo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campioni_consegnati?: boolean | null
          created_at?: string
          data_report?: string
          id?: string
          incassi?: boolean | null
          ordini_fatti?: boolean | null
          problemi?: boolean | null
          promo_proposte?: boolean | null
          testo_report?: string | null
          titolo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campioni_consegnati?: boolean | null
          created_at?: string
          data_report?: string
          id?: string
          incassi?: boolean | null
          ordini_fatti?: boolean | null
          problemi?: boolean | null
          promo_proposte?: boolean | null
          testo_report?: string | null
          titolo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_messages: {
        Row: {
          content: string
          created_at: string
          deal_id: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deal_id: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deal_id?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          client_id: string
          company_id: string | null
          created_at: string
          estimated_value: number | null
          goal: string | null
          id: string
          next_action_date: string | null
          next_action_note: string | null
          notes: string | null
          probability: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          company_id?: string | null
          created_at?: string
          estimated_value?: number | null
          goal?: string | null
          id?: string
          next_action_date?: string | null
          next_action_note?: string | null
          notes?: string | null
          probability?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string | null
          created_at?: string
          estimated_value?: number | null
          goal?: string | null
          id?: string
          next_action_date?: string | null
          next_action_note?: string | null
          notes?: string | null
          probability?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
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
      giri_visita: {
        Row: {
          created_at: string
          data: string
          id: string
          nome: string | null
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          nome?: string | null
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          nome?: string | null
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      increase_actions: {
        Row: {
          client_id: string
          created_at: string
          deal_id: string | null
          id: string
          outcome_note: string | null
          planned_contact_date: string | null
          price_increase_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deal_id?: string | null
          id?: string
          outcome_note?: string | null
          planned_contact_date?: string | null
          price_increase_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          outcome_note?: string | null
          planned_contact_date?: string | null
          price_increase_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "increase_actions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "increase_actions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "increase_actions_price_increase_id_fkey"
            columns: ["price_increase_id"]
            isOneToOne: false
            referencedRelation: "price_increases"
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
      price_increases: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          effective_date: string
          id: string
          increase_type: string
          increase_value: number
          notes: string | null
          product_id: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          effective_date: string
          id?: string
          increase_type: string
          increase_value: number
          notes?: string | null
          product_id?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          effective_date?: string
          id?: string
          increase_type?: string
          increase_value?: number
          notes?: string | null
          product_id?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_increases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_increases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "prodotti"
            referencedColumns: ["id"]
          },
        ]
      }
      prodotti: {
        Row: {
          azienda_id: string
          brand_id: string | null
          cartoni_per_strato: number
          codice: string | null
          created_at: string
          formato: string | null
          id: string
          immagine_url: string | null
          nome: string
          pezzi_per_cartone: number
          prezzo_listino: number
          quantita_pezzi: number
          sc1_default: number
          sc2_default: number
          sc3_default: number
          strati: number
          updated_at: string
          user_id: string
        }
        Insert: {
          azienda_id: string
          brand_id?: string | null
          cartoni_per_strato?: number
          codice?: string | null
          created_at?: string
          formato?: string | null
          id?: string
          immagine_url?: string | null
          nome: string
          pezzi_per_cartone?: number
          prezzo_listino?: number
          quantita_pezzi?: number
          sc1_default?: number
          sc2_default?: number
          sc3_default?: number
          strati?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          azienda_id?: string
          brand_id?: string | null
          cartoni_per_strato?: number
          codice?: string | null
          created_at?: string
          formato?: string | null
          id?: string
          immagine_url?: string | null
          nome?: string
          pezzi_per_cartone?: number
          prezzo_listino?: number
          quantita_pezzi?: number
          sc1_default?: number
          sc2_default?: number
          sc3_default?: number
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
          {
            foreignKeyName: "prodotti_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
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
      promo_clienti: {
        Row: {
          cliente_id: string
          contropartita: string | null
          costo_stimato: number | null
          created_at: string
          data_concessione: string
          descrizione: string | null
          id: string
          note: string | null
          prodotto_nome: string | null
          quantita_cartoni: number | null
          quantita_pezzi: number | null
          tipo_promo: string
          user_id: string
          valore: number
        }
        Insert: {
          cliente_id: string
          contropartita?: string | null
          costo_stimato?: number | null
          created_at?: string
          data_concessione?: string
          descrizione?: string | null
          id?: string
          note?: string | null
          prodotto_nome?: string | null
          quantita_cartoni?: number | null
          quantita_pezzi?: number | null
          tipo_promo: string
          user_id: string
          valore?: number
        }
        Update: {
          cliente_id?: string
          contropartita?: string | null
          costo_stimato?: number | null
          created_at?: string
          data_concessione?: string
          descrizione?: string | null
          id?: string
          note?: string | null
          prodotto_nome?: string | null
          quantita_cartoni?: number | null
          quantita_pezzi?: number | null
          tipo_promo?: string
          user_id?: string
          valore?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_clienti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      report_activities: {
        Row: {
          azienda_id: string | null
          cliente_id: string | null
          created_at: string
          descrizione: string | null
          esito: string | null
          id: string
          prossimo_step: string | null
          report_id: string
          tipo_attivita: string
          user_id: string
        }
        Insert: {
          azienda_id?: string | null
          cliente_id?: string | null
          created_at?: string
          descrizione?: string | null
          esito?: string | null
          id?: string
          prossimo_step?: string | null
          report_id: string
          tipo_attivita: string
          user_id: string
        }
        Update: {
          azienda_id?: string | null
          cliente_id?: string | null
          created_at?: string
          descrizione?: string | null
          esito?: string | null
          id?: string
          prossimo_step?: string | null
          report_id?: string
          tipo_attivita?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_activities_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_activities_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_activities_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_clients: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_clients_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_clients_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_orders: {
        Row: {
          created_at: string
          id: string
          ordine_id: string
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordine_id: string
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ordine_id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_orders_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_orders_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      storico_trattative: {
        Row: {
          carta_scelta: string | null
          cliente_id: string | null
          cliente_nome: string
          costo_acquisto: number | null
          created_at: string
          dati_carte: Json | null
          esito: string | null
          id: string
          margine_target: number | null
          note: string | null
          obiettivo: string
          pezzi_per_cartone: number
          prezzo_listino: number
          prodotto_nome: string
          quantita_cartoni: number
          quantita_pezzi: number
          sconto_richiesto: number | null
          tipologia_cliente: string
          user_id: string
        }
        Insert: {
          carta_scelta?: string | null
          cliente_id?: string | null
          cliente_nome: string
          costo_acquisto?: number | null
          created_at?: string
          dati_carte?: Json | null
          esito?: string | null
          id?: string
          margine_target?: number | null
          note?: string | null
          obiettivo: string
          pezzi_per_cartone?: number
          prezzo_listino: number
          prodotto_nome: string
          quantita_cartoni?: number
          quantita_pezzi?: number
          sconto_richiesto?: number | null
          tipologia_cliente?: string
          user_id: string
        }
        Update: {
          carta_scelta?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          costo_acquisto?: number | null
          created_at?: string
          dati_carte?: Json | null
          esito?: string | null
          id?: string
          margine_target?: number | null
          note?: string | null
          obiettivo?: string
          pezzi_per_cartone?: number
          prezzo_listino?: number
          prodotto_nome?: string
          quantita_cartoni?: number
          quantita_pezzi?: number
          sconto_richiesto?: number | null
          tipologia_cliente?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storico_trattative_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      template_trattativa: {
        Row: {
          created_at: string
          extra_default: string | null
          id: string
          nome: string
          note: string | null
          obiettivo_default: string
          omaggio_default: string | null
          sconto_max_percentuale: number | null
          tipologia_cliente: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extra_default?: string | null
          id?: string
          nome: string
          note?: string | null
          obiettivo_default?: string
          omaggio_default?: string | null
          sconto_max_percentuale?: number | null
          tipologia_cliente?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extra_default?: string | null
          id?: string
          nome?: string
          note?: string | null
          obiettivo_default?: string
          omaggio_default?: string | null
          sconto_max_percentuale?: number | null
          tipologia_cliente?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visite: {
        Row: {
          cliente_id: string
          created_at: string
          esito: string | null
          giro_id: string
          id: string
          note: string | null
          orario_effettivo: string | null
          orario_previsto: string | null
          ordine_visita: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          esito?: string | null
          giro_id: string
          id?: string
          note?: string | null
          orario_effettivo?: string | null
          orario_previsto?: string | null
          ordine_visita?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          esito?: string | null
          giro_id?: string
          id?: string
          note?: string | null
          orario_effettivo?: string | null
          orario_previsto?: string | null
          ordine_visita?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visite_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visite_giro_id_fkey"
            columns: ["giro_id"]
            isOneToOne: false
            referencedRelation: "giri_visita"
            referencedColumns: ["id"]
          },
        ]
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
