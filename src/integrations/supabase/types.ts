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
      ai_activity_log: {
        Row: {
          azioni_confermate: Json | null
          azioni_proposte: Json | null
          created_at: string
          id: string
          input_originale: string
          messaggio_errore: string | null
          risultato_analisi: Json | null
          stato: string
          user_id: string
        }
        Insert: {
          azioni_confermate?: Json | null
          azioni_proposte?: Json | null
          created_at?: string
          id?: string
          input_originale: string
          messaggio_errore?: string | null
          risultato_analisi?: Json | null
          stato?: string
          user_id: string
        }
        Update: {
          azioni_confermate?: Json | null
          azioni_proposte?: Json | null
          created_at?: string
          id?: string
          input_originale?: string
          messaggio_errore?: string | null
          risultato_analisi?: Json | null
          stato?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_attivita: {
        Row: {
          azienda_id: string | null
          cliente_id: string | null
          created_at: string
          data_attivita: string
          id: string
          priorita: string
          prossima_azione: string | null
          riepilogo: string
          stato: string
          tipo_attivita: string
          updated_at: string
          user_id: string
        }
        Insert: {
          azienda_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_attivita?: string
          id?: string
          priorita?: string
          prossima_azione?: string | null
          riepilogo: string
          stato?: string
          tipo_attivita?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          azienda_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_attivita?: string
          id?: string
          priorita?: string
          prossima_azione?: string | null
          riepilogo?: string
          stato?: string
          tipo_attivita?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_attivita_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_attivita_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_promemoria: {
        Row: {
          attivita_id: string | null
          azienda_id: string | null
          cliente_id: string | null
          created_at: string
          data_promemoria: string
          descrizione: string | null
          id: string
          priorita: string
          stato: string
          titolo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attivita_id?: string | null
          azienda_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_promemoria: string
          descrizione?: string | null
          id?: string
          priorita?: string
          stato?: string
          titolo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attivita_id?: string | null
          azienda_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_promemoria?: string
          descrizione?: string | null
          id?: string
          priorita?: string
          stato?: string
          titolo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_promemoria_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "ai_attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_promemoria_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_promemoria_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
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
      client_visits: {
        Row: {
          azioni_future: string | null
          client_id: string
          created_at: string
          data_visita: string
          esito: string | null
          id: string
          note_visita: string | null
          titolo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          azioni_future?: string | null
          client_id: string
          created_at?: string
          data_visita?: string
          esito?: string | null
          id?: string
          note_visita?: string | null
          titolo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          azioni_future?: string | null
          client_id?: string
          created_at?: string
          data_visita?: string
          esito?: string | null
          id?: string
          note_visita?: string | null
          titolo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_visits_client_id_fkey"
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
          fatturato_2025: number | null
          fatturato_target: number | null
          id: string
          indirizzo: string | null
          livello_relazione: number | null
          n_promo_concesse: number | null
          nome: string
          obiezione_principale: string | null
          ordini_count: number | null
          partita_iva: string | null
          pec: string | null
          potenziale_cliente: string | null
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
          fatturato_2025?: number | null
          fatturato_target?: number | null
          id?: string
          indirizzo?: string | null
          livello_relazione?: number | null
          n_promo_concesse?: number | null
          nome: string
          obiezione_principale?: string | null
          ordini_count?: number | null
          partita_iva?: string | null
          pec?: string | null
          potenziale_cliente?: string | null
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
          fatturato_2025?: number | null
          fatturato_target?: number | null
          id?: string
          indirizzo?: string | null
          livello_relazione?: number | null
          n_promo_concesse?: number | null
          nome?: string
          obiezione_principale?: string | null
          ordini_count?: number | null
          partita_iva?: string | null
          pec?: string | null
          potenziale_cliente?: string | null
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
      clienti_alias: {
        Row: {
          azienda_id: string | null
          cliente_id: string
          codice_cliente_aziendale: string | null
          codice_fiscale: string | null
          created_at: string
          denominazione_alternativa: string | null
          id: string
          match_count: number
          note: string | null
          partita_iva: string | null
          source: string
          ultimo_match: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          azienda_id?: string | null
          cliente_id: string
          codice_cliente_aziendale?: string | null
          codice_fiscale?: string | null
          created_at?: string
          denominazione_alternativa?: string | null
          id?: string
          match_count?: number
          note?: string | null
          partita_iva?: string | null
          source?: string
          ultimo_match?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          azienda_id?: string | null
          cliente_id?: string
          codice_cliente_aziendale?: string | null
          codice_fiscale?: string | null
          created_at?: string
          denominazione_alternativa?: string | null
          id?: string
          match_count?: number
          note?: string | null
          partita_iva?: string | null
          source?: string
          ultimo_match?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clienti_alias_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clienti_alias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_products: {
        Row: {
          agente_concorrente: string | null
          categoria: string | null
          cliente_id: string
          condizioni: string | null
          created_at: string
          formato: string | null
          foto_url: string | null
          frequenza: string | null
          id: string
          last_updated_at: string | null
          marca: string | null
          margine_stimato: number | null
          nome: string
          nostro_prezzo: number | null
          nostro_prodotto_id: string | null
          note: string | null
          omaggi: string | null
          pagamento: string | null
          prezzo_acquisto: number | null
          prezzo_vendita: number | null
          priorita: string | null
          punti_deboli: string | null
          punti_forti: string | null
          quantita_abituale: string | null
          sconto: number | null
          soddisfazione: number | null
          stato: string | null
          updated_at: string
          user_id: string
          vantaggio: string | null
        }
        Insert: {
          agente_concorrente?: string | null
          categoria?: string | null
          cliente_id: string
          condizioni?: string | null
          created_at?: string
          formato?: string | null
          foto_url?: string | null
          frequenza?: string | null
          id?: string
          last_updated_at?: string | null
          marca?: string | null
          margine_stimato?: number | null
          nome: string
          nostro_prezzo?: number | null
          nostro_prodotto_id?: string | null
          note?: string | null
          omaggi?: string | null
          pagamento?: string | null
          prezzo_acquisto?: number | null
          prezzo_vendita?: number | null
          priorita?: string | null
          punti_deboli?: string | null
          punti_forti?: string | null
          quantita_abituale?: string | null
          sconto?: number | null
          soddisfazione?: number | null
          stato?: string | null
          updated_at?: string
          user_id: string
          vantaggio?: string | null
        }
        Update: {
          agente_concorrente?: string | null
          categoria?: string | null
          cliente_id?: string
          condizioni?: string | null
          created_at?: string
          formato?: string | null
          foto_url?: string | null
          frequenza?: string | null
          id?: string
          last_updated_at?: string | null
          marca?: string | null
          margine_stimato?: number | null
          nome?: string
          nostro_prezzo?: number | null
          nostro_prodotto_id?: string | null
          note?: string | null
          omaggi?: string | null
          pagamento?: string | null
          prezzo_acquisto?: number | null
          prezzo_vendita?: number | null
          priorita?: string | null
          punti_deboli?: string | null
          punti_forti?: string | null
          quantita_abituale?: string | null
          sconto?: number | null
          soddisfazione?: number | null
          stato?: string | null
          updated_at?: string
          user_id?: string
          vantaggio?: string | null
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
          cumulabile_arretrati: boolean
          id: string
          is_consorzio: boolean
          note: string | null
          percentuale_premio: number
          qta_base: number | null
          qta_omaggio: number | null
          soglia_fatturato: number | null
          unita_omaggio: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anno: number
          azienda_id: string
          cliente_id: string
          consorzio?: string | null
          created_at?: string
          cumulabile_arretrati?: boolean
          id?: string
          is_consorzio?: boolean
          note?: string | null
          percentuale_premio?: number
          qta_base?: number | null
          qta_omaggio?: number | null
          soglia_fatturato?: number | null
          unita_omaggio?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anno?: number
          azienda_id?: string
          cliente_id?: string
          consorzio?: string | null
          created_at?: string
          cumulabile_arretrati?: boolean
          id?: string
          is_consorzio?: boolean
          note?: string | null
          percentuale_premio?: number
          qta_base?: number | null
          qta_omaggio?: number | null
          soglia_fatturato?: number | null
          unita_omaggio?: string
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
      contratti_obbiettivi: {
        Row: {
          contratto_id: string
          created_at: string
          descrizione: string | null
          id: string
          ordine: number
          percentuale_premio: number
          soglia_fatturato: number | null
          tipo: string
          user_id: string
        }
        Insert: {
          contratto_id: string
          created_at?: string
          descrizione?: string | null
          id?: string
          ordine?: number
          percentuale_premio?: number
          soglia_fatturato?: number | null
          tipo?: string
          user_id: string
        }
        Update: {
          contratto_id?: string
          created_at?: string
          descrizione?: string | null
          id?: string
          ordine?: number
          percentuale_premio?: number
          soglia_fatturato?: number | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratti_obbiettivi_contratto_id_fkey"
            columns: ["contratto_id"]
            isOneToOne: false
            referencedRelation: "contratti_clienti"
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
      documenti: {
        Row: {
          classificazione_ai: Json | null
          created_at: string
          dimensione: number | null
          entita: Database["public"]["Enums"]["documento_entita"]
          entita_id: string | null
          hash_sha256: string | null
          id: string
          mime_type: string | null
          nome_file: string
          note: string | null
          storage_path: string
          suggerimenti_ai: Json | null
          tags: string[] | null
          tipo: Database["public"]["Enums"]["documento_tipo"]
          updated_at: string
          user_id: string
          verificato: boolean
        }
        Insert: {
          classificazione_ai?: Json | null
          created_at?: string
          dimensione?: number | null
          entita?: Database["public"]["Enums"]["documento_entita"]
          entita_id?: string | null
          hash_sha256?: string | null
          id?: string
          mime_type?: string | null
          nome_file: string
          note?: string | null
          storage_path: string
          suggerimenti_ai?: Json | null
          tags?: string[] | null
          tipo?: Database["public"]["Enums"]["documento_tipo"]
          updated_at?: string
          user_id: string
          verificato?: boolean
        }
        Update: {
          classificazione_ai?: Json | null
          created_at?: string
          dimensione?: number | null
          entita?: Database["public"]["Enums"]["documento_entita"]
          entita_id?: string | null
          hash_sha256?: string | null
          id?: string
          mime_type?: string | null
          nome_file?: string
          note?: string | null
          storage_path?: string
          suggerimenti_ai?: Json | null
          tags?: string[] | null
          tipo?: Database["public"]["Enums"]["documento_tipo"]
          updated_at?: string
          user_id?: string
          verificato?: boolean
        }
        Relationships: []
      }
      estratti_provvigioni: {
        Row: {
          anno: number
          azienda_id: string | null
          created_at: string
          data_documento: string | null
          data_pagamento: string | null
          file_hash: string | null
          file_name: string | null
          file_path: string | null
          id: string
          note: string | null
          num_righe: number | null
          raw_extraction: Json | null
          stato: string
          tipo_documento: string
          totale_dichiarato: number | null
          trimestre: number
          updated_at: string
          user_id: string
        }
        Insert: {
          anno: number
          azienda_id?: string | null
          created_at?: string
          data_documento?: string | null
          data_pagamento?: string | null
          file_hash?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          note?: string | null
          num_righe?: number | null
          raw_extraction?: Json | null
          stato?: string
          tipo_documento?: string
          totale_dichiarato?: number | null
          trimestre: number
          updated_at?: string
          user_id: string
        }
        Update: {
          anno?: number
          azienda_id?: string | null
          created_at?: string
          data_documento?: string | null
          data_pagamento?: string | null
          file_hash?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          note?: string | null
          num_righe?: number | null
          raw_extraction?: Json | null
          stato?: string
          tipo_documento?: string
          totale_dichiarato?: number | null
          trimestre?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estratti_provvigioni_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      estratti_provvigioni_regole_cliente: {
        Row: {
          azienda_id: string | null
          cliente_id: string | null
          codice_pdf: string | null
          created_at: string
          id: string
          nome_pdf: string
          updated_at: string
          user_id: string
        }
        Insert: {
          azienda_id?: string | null
          cliente_id?: string | null
          codice_pdf?: string | null
          created_at?: string
          id?: string
          nome_pdf: string
          updated_at?: string
          user_id: string
        }
        Update: {
          azienda_id?: string | null
          cliente_id?: string | null
          codice_pdf?: string | null
          created_at?: string
          id?: string
          nome_pdf?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estratti_provvigioni_regole_cliente_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estratti_provvigioni_regole_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      estratti_provvigioni_righe: {
        Row: {
          aliquota: number | null
          anomalia_note: string | null
          anomalia_stato: string | null
          azione_consigliata: string | null
          cliente_codice: string | null
          cliente_id: string | null
          cliente_nome: string | null
          correzioni: Json | null
          created_at: string
          crm_only: boolean
          cross_estratto_candidates: Json | null
          data_riga: string | null
          descrizione: string | null
          esito_economico: string | null
          estratto_id: string
          id: string
          imponibile: number | null
          match_candidates: Json | null
          match_score: number | null
          match_status: string
          motivo: string | null
          note: string | null
          numero_fattura: string | null
          numero_ordine: string | null
          ordine_id: string | null
          ordine_snapshot: Json | null
          pagamento_target_id: string | null
          pagamento_target_type: string | null
          pagata: boolean
          pagata_at: string | null
          pagata_importo: number | null
          provvigione: number | null
          provvigione_attesa: number | null
          riconciliazione_pagamento_id: string | null
          score_breakdown: Json | null
          stato_verifica: string | null
          tipo_movimento: string | null
          updated_at: string
          user_id: string
          verificata: boolean
          verificata_at: string | null
          verificata_by: string | null
          verificata_note: string | null
        }
        Insert: {
          aliquota?: number | null
          anomalia_note?: string | null
          anomalia_stato?: string | null
          azione_consigliata?: string | null
          cliente_codice?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          correzioni?: Json | null
          created_at?: string
          crm_only?: boolean
          cross_estratto_candidates?: Json | null
          data_riga?: string | null
          descrizione?: string | null
          esito_economico?: string | null
          estratto_id: string
          id?: string
          imponibile?: number | null
          match_candidates?: Json | null
          match_score?: number | null
          match_status?: string
          motivo?: string | null
          note?: string | null
          numero_fattura?: string | null
          numero_ordine?: string | null
          ordine_id?: string | null
          ordine_snapshot?: Json | null
          pagamento_target_id?: string | null
          pagamento_target_type?: string | null
          pagata?: boolean
          pagata_at?: string | null
          pagata_importo?: number | null
          provvigione?: number | null
          provvigione_attesa?: number | null
          riconciliazione_pagamento_id?: string | null
          score_breakdown?: Json | null
          stato_verifica?: string | null
          tipo_movimento?: string | null
          updated_at?: string
          user_id: string
          verificata?: boolean
          verificata_at?: string | null
          verificata_by?: string | null
          verificata_note?: string | null
        }
        Update: {
          aliquota?: number | null
          anomalia_note?: string | null
          anomalia_stato?: string | null
          azione_consigliata?: string | null
          cliente_codice?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          correzioni?: Json | null
          created_at?: string
          crm_only?: boolean
          cross_estratto_candidates?: Json | null
          data_riga?: string | null
          descrizione?: string | null
          esito_economico?: string | null
          estratto_id?: string
          id?: string
          imponibile?: number | null
          match_candidates?: Json | null
          match_score?: number | null
          match_status?: string
          motivo?: string | null
          note?: string | null
          numero_fattura?: string | null
          numero_ordine?: string | null
          ordine_id?: string | null
          ordine_snapshot?: Json | null
          pagamento_target_id?: string | null
          pagamento_target_type?: string | null
          pagata?: boolean
          pagata_at?: string | null
          pagata_importo?: number | null
          provvigione?: number | null
          provvigione_attesa?: number | null
          riconciliazione_pagamento_id?: string | null
          score_breakdown?: Json | null
          stato_verifica?: string | null
          tipo_movimento?: string | null
          updated_at?: string
          user_id?: string
          verificata?: boolean
          verificata_at?: string | null
          verificata_by?: string | null
          verificata_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estratti_provvigioni_righe_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estratti_provvigioni_righe_estratto_id_fkey"
            columns: ["estratto_id"]
            isOneToOne: false
            referencedRelation: "estratti_provvigioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estratti_provvigioni_righe_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estratti_provvigioni_righe_riconciliazione_pagamento_id_fkey"
            columns: ["riconciliazione_pagamento_id"]
            isOneToOne: false
            referencedRelation: "riconciliazioni_pagamenti"
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
      movimenti_provvigione: {
        Row: {
          anno: number | null
          azienda_id: string | null
          created_at: string
          data_pagamento: string | null
          descrizione: string | null
          estratto_id: string | null
          estratto_riga_id: string | null
          id: string
          importo: number
          metodo_pagamento: string | null
          note: string | null
          riconciliazione_id: string | null
          riferimento_pagamento: string | null
          stato: string
          tipo: string
          trimestre: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anno?: number | null
          azienda_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descrizione?: string | null
          estratto_id?: string | null
          estratto_riga_id?: string | null
          id?: string
          importo?: number
          metodo_pagamento?: string | null
          note?: string | null
          riconciliazione_id?: string | null
          riferimento_pagamento?: string | null
          stato?: string
          tipo?: string
          trimestre?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anno?: number | null
          azienda_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descrizione?: string | null
          estratto_id?: string | null
          estratto_riga_id?: string | null
          id?: string
          importo?: number
          metodo_pagamento?: string | null
          note?: string | null
          riconciliazione_id?: string | null
          riferimento_pagamento?: string | null
          stato?: string
          tipo?: string
          trimestre?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimenti_provvigione_estratto_id_fkey"
            columns: ["estratto_id"]
            isOneToOne: false
            referencedRelation: "estratti_provvigioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimenti_provvigione_estratto_riga_id_fkey"
            columns: ["estratto_riga_id"]
            isOneToOne: false
            referencedRelation: "estratti_provvigioni_righe"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          azienda_id: string | null
          categoria: string
          checklist: Json
          cliente_id: string | null
          colore: string | null
          completata: boolean
          contenuto: string | null
          created_at: string
          data_promemoria: string | null
          id: string
          pinned: boolean
          priorita: string
          titolo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          azienda_id?: string | null
          categoria?: string
          checklist?: Json
          cliente_id?: string | null
          colore?: string | null
          completata?: boolean
          contenuto?: string | null
          created_at?: string
          data_promemoria?: string | null
          id?: string
          pinned?: boolean
          priorita?: string
          titolo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          azienda_id?: string | null
          categoria?: string
          checklist?: Json
          cliente_id?: string | null
          colore?: string | null
          completata?: boolean
          contenuto?: string | null
          created_at?: string
          data_promemoria?: string | null
          id?: string
          pinned?: boolean
          priorita?: string
          titolo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      omaggi_erogati: {
        Row: {
          cliente_id: string
          contratto_id: string | null
          created_at: string
          data_erogazione: string
          id: string
          note: string | null
          ordine_id: string | null
          ordine_riga_id: string | null
          prodotto_id: string
          promo_id: string | null
          quantita: number
          unita: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          contratto_id?: string | null
          created_at?: string
          data_erogazione?: string
          id?: string
          note?: string | null
          ordine_id?: string | null
          ordine_riga_id?: string | null
          prodotto_id: string
          promo_id?: string | null
          quantita?: number
          unita?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          contratto_id?: string | null
          created_at?: string
          data_erogazione?: string
          id?: string
          note?: string | null
          ordine_id?: string | null
          ordine_riga_id?: string | null
          prodotto_id?: string
          promo_id?: string | null
          quantita?: number
          unita?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ordini: {
        Row: {
          aliquota_prevista: number | null
          azienda_id: string | null
          cliente_id: string | null
          codice: string | null
          condizione_applicata_id: string | null
          created_at: string | null
          data_conferma: string | null
          data_consegna_effettiva: string | null
          data_consegna_prevista: string | null
          data_incasso_provvigione: string | null
          data_ordine: string | null
          destinazione_consegna: string | null
          estratto_riga_id: string | null
          id: string
          importo_provvigione_pagata: number
          metodo_pagamento_provvigione: string | null
          note: string | null
          note_consegna: string | null
          note_provvigione: string | null
          problema_consegna: string | null
          prodotti: number | null
          provvigione_pagata: boolean
          provvigione_prevista: number | null
          provvigione_riconosciuta: number | null
          provvigione_stato: string
          riconciliazione_pagamento_id: string | null
          riferimento_pagamento_provvigione: string | null
          sconto: number | null
          sconto_merce: number | null
          stand_by_data_inizio: string | null
          stand_by_data_prevista: string | null
          stand_by_motivo: string | null
          stand_by_note: string | null
          stand_by_prodotto_bloccato: string | null
          stato_consegna: string
          stato_provvigione: string
          status: Database["public"]["Enums"]["order_status"] | null
          tipo_pagamento: string | null
          totale: number | null
          updated_at: string | null
          user_id: string
          verificato_conferma: boolean
          verificato_conferma_at: string | null
        }
        Insert: {
          aliquota_prevista?: number | null
          azienda_id?: string | null
          cliente_id?: string | null
          codice?: string | null
          condizione_applicata_id?: string | null
          created_at?: string | null
          data_conferma?: string | null
          data_consegna_effettiva?: string | null
          data_consegna_prevista?: string | null
          data_incasso_provvigione?: string | null
          data_ordine?: string | null
          destinazione_consegna?: string | null
          estratto_riga_id?: string | null
          id?: string
          importo_provvigione_pagata?: number
          metodo_pagamento_provvigione?: string | null
          note?: string | null
          note_consegna?: string | null
          note_provvigione?: string | null
          problema_consegna?: string | null
          prodotti?: number | null
          provvigione_pagata?: boolean
          provvigione_prevista?: number | null
          provvigione_riconosciuta?: number | null
          provvigione_stato?: string
          riconciliazione_pagamento_id?: string | null
          riferimento_pagamento_provvigione?: string | null
          sconto?: number | null
          sconto_merce?: number | null
          stand_by_data_inizio?: string | null
          stand_by_data_prevista?: string | null
          stand_by_motivo?: string | null
          stand_by_note?: string | null
          stand_by_prodotto_bloccato?: string | null
          stato_consegna?: string
          stato_provvigione?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          tipo_pagamento?: string | null
          totale?: number | null
          updated_at?: string | null
          user_id: string
          verificato_conferma?: boolean
          verificato_conferma_at?: string | null
        }
        Update: {
          aliquota_prevista?: number | null
          azienda_id?: string | null
          cliente_id?: string | null
          codice?: string | null
          condizione_applicata_id?: string | null
          created_at?: string | null
          data_conferma?: string | null
          data_consegna_effettiva?: string | null
          data_consegna_prevista?: string | null
          data_incasso_provvigione?: string | null
          data_ordine?: string | null
          destinazione_consegna?: string | null
          estratto_riga_id?: string | null
          id?: string
          importo_provvigione_pagata?: number
          metodo_pagamento_provvigione?: string | null
          note?: string | null
          note_consegna?: string | null
          note_provvigione?: string | null
          problema_consegna?: string | null
          prodotti?: number | null
          provvigione_pagata?: boolean
          provvigione_prevista?: number | null
          provvigione_riconosciuta?: number | null
          provvigione_stato?: string
          riconciliazione_pagamento_id?: string | null
          riferimento_pagamento_provvigione?: string | null
          sconto?: number | null
          sconto_merce?: number | null
          stand_by_data_inizio?: string | null
          stand_by_data_prevista?: string | null
          stand_by_motivo?: string | null
          stand_by_note?: string | null
          stand_by_prodotto_bloccato?: string | null
          stato_consegna?: string
          stato_provvigione?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          tipo_pagamento?: string | null
          totale?: number | null
          updated_at?: string | null
          user_id?: string
          verificato_conferma?: boolean
          verificato_conferma_at?: string | null
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
          {
            foreignKeyName: "ordini_condizione_applicata_id_fkey"
            columns: ["condizione_applicata_id"]
            isOneToOne: false
            referencedRelation: "provvigioni_condizioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_estratto_riga_id_fkey"
            columns: ["estratto_riga_id"]
            isOneToOne: false
            referencedRelation: "estratti_provvigioni_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_riconciliazione_pagamento_id_fkey"
            columns: ["riconciliazione_pagamento_id"]
            isOneToOne: false
            referencedRelation: "riconciliazioni_pagamenti"
            referencedColumns: ["id"]
          },
        ]
      }
      ordini_conferme: {
        Row: {
          created_at: string
          documento_id: string | null
          esito: Json
          id: string
          nome_sorgente: string | null
          note: string | null
          ordine_id: string
          righe_diff: number
          righe_extra: number
          righe_mancanti: number
          righe_ok: number
          score: number
          updated_at: string
          user_id: string
          verificato_manualmente: boolean
        }
        Insert: {
          created_at?: string
          documento_id?: string | null
          esito: Json
          id?: string
          nome_sorgente?: string | null
          note?: string | null
          ordine_id: string
          righe_diff?: number
          righe_extra?: number
          righe_mancanti?: number
          righe_ok?: number
          score?: number
          updated_at?: string
          user_id: string
          verificato_manualmente?: boolean
        }
        Update: {
          created_at?: string
          documento_id?: string | null
          esito?: Json
          id?: string
          nome_sorgente?: string | null
          note?: string | null
          ordine_id?: string
          righe_diff?: number
          righe_extra?: number
          righe_mancanti?: number
          righe_ok?: number
          score?: number
          updated_at?: string
          user_id?: string
          verificato_manualmente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ordini_conferme_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordini_conferme_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini"
            referencedColumns: ["id"]
          },
        ]
      }
      ordini_righe: {
        Row: {
          created_at: string
          id: string
          is_omaggio: boolean
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
          is_omaggio?: boolean
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
          is_omaggio?: boolean
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
          costo_acquisto: number
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
          costo_acquisto?: number
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
          costo_acquisto?: number
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
          cumulabile_arretrati: boolean
          data_concessione: string
          descrizione: string | null
          id: string
          note: string | null
          prodotto_nome: string | null
          qta_base: number | null
          qta_omaggio: number | null
          quantita_cartoni: number | null
          quantita_pezzi: number | null
          tipo_promo: string
          unita_omaggio: string
          user_id: string
          valore: number
        }
        Insert: {
          cliente_id: string
          contropartita?: string | null
          costo_stimato?: number | null
          created_at?: string
          cumulabile_arretrati?: boolean
          data_concessione?: string
          descrizione?: string | null
          id?: string
          note?: string | null
          prodotto_nome?: string | null
          qta_base?: number | null
          qta_omaggio?: number | null
          quantita_cartoni?: number | null
          quantita_pezzi?: number | null
          tipo_promo: string
          unita_omaggio?: string
          user_id: string
          valore?: number
        }
        Update: {
          cliente_id?: string
          contropartita?: string | null
          costo_stimato?: number | null
          created_at?: string
          cumulabile_arretrati?: boolean
          data_concessione?: string
          descrizione?: string | null
          id?: string
          note?: string | null
          prodotto_nome?: string | null
          qta_base?: number | null
          qta_omaggio?: number | null
          quantita_cartoni?: number | null
          quantita_pezzi?: number | null
          tipo_promo?: string
          unita_omaggio?: string
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
      provvigioni_condizioni: {
        Row: {
          applica_su_resi: boolean
          arrotondamento: string
          azienda_id: string
          calcolo_su: string
          categoria: string | null
          cliente_id: string | null
          created_at: string
          id: string
          note: string | null
          percentuale: number
          priorita: number
          prodotto_id: string | null
          updated_at: string
          user_id: string
          valido_a: string | null
          valido_da: string
        }
        Insert: {
          applica_su_resi?: boolean
          arrotondamento?: string
          azienda_id: string
          calcolo_su?: string
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          percentuale?: number
          priorita?: number
          prodotto_id?: string | null
          updated_at?: string
          user_id: string
          valido_a?: string | null
          valido_da: string
        }
        Update: {
          applica_su_resi?: boolean
          arrotondamento?: string
          azienda_id?: string
          calcolo_su?: string
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          percentuale?: number
          priorita?: number
          prodotto_id?: string | null
          updated_at?: string
          user_id?: string
          valido_a?: string | null
          valido_da?: string
        }
        Relationships: [
          {
            foreignKeyName: "provvigioni_condizioni_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provvigioni_condizioni_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provvigioni_condizioni_prodotto_id_fkey"
            columns: ["prodotto_id"]
            isOneToOne: false
            referencedRelation: "prodotti"
            referencedColumns: ["id"]
          },
        ]
      }
      provvigioni_premi: {
        Row: {
          attivo: boolean
          azienda_id: string
          condizioni: Json | null
          created_at: string
          id: string
          modalita: string
          nome: string
          note: string | null
          percentuale: number | null
          periodo_a: string | null
          periodo_da: string | null
          scaglioni: Json | null
          tipo: string
          updated_at: string
          user_id: string
          valore: number | null
        }
        Insert: {
          attivo?: boolean
          azienda_id: string
          condizioni?: Json | null
          created_at?: string
          id?: string
          modalita?: string
          nome: string
          note?: string | null
          percentuale?: number | null
          periodo_a?: string | null
          periodo_da?: string | null
          scaglioni?: Json | null
          tipo: string
          updated_at?: string
          user_id: string
          valore?: number | null
        }
        Update: {
          attivo?: boolean
          azienda_id?: string
          condizioni?: Json | null
          created_at?: string
          id?: string
          modalita?: string
          nome?: string
          note?: string | null
          percentuale?: number | null
          periodo_a?: string | null
          periodo_da?: string | null
          scaglioni?: Json | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valore?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provvigioni_premi_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
        ]
      }
      reorder_tracking: {
        Row: {
          azienda_id: string
          cliente_id: string
          created_at: string
          id: string
          media_giorni_riordino: number | null
          numero_ordini: number | null
          penultimo_ordine_data: string | null
          prossimo_riordino_previsto: string | null
          ultimo_ordine_data: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          azienda_id: string
          cliente_id: string
          created_at?: string
          id?: string
          media_giorni_riordino?: number | null
          numero_ordini?: number | null
          penultimo_ordine_data?: string | null
          prossimo_riordino_previsto?: string | null
          ultimo_ordine_data?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          azienda_id?: string
          cliente_id?: string
          created_at?: string
          id?: string
          media_giorni_riordino?: number | null
          numero_ordini?: number | null
          penultimo_ordine_data?: string | null
          prossimo_riordino_previsto?: string | null
          ultimo_ordine_data?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reorder_tracking_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_tracking_cliente_id_fkey"
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
      riconciliazioni_allocazioni: {
        Row: {
          confidence: number
          created_at: string
          estratto_riga_id: string
          id: string
          manuale: boolean
          note: string | null
          ordine_id: string
          percentuale: number
          quota_imponibile: number
          quota_provvigione: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          estratto_riga_id: string
          id?: string
          manuale?: boolean
          note?: string | null
          ordine_id: string
          percentuale?: number
          quota_imponibile?: number
          quota_provvigione?: number
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          estratto_riga_id?: string
          id?: string
          manuale?: boolean
          note?: string | null
          ordine_id?: string
          percentuale?: number
          quota_imponibile?: number
          quota_provvigione?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "riconciliazioni_allocazioni_estratto_riga_id_fkey"
            columns: ["estratto_riga_id"]
            isOneToOne: false
            referencedRelation: "estratti_provvigioni_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riconciliazioni_allocazioni_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini"
            referencedColumns: ["id"]
          },
        ]
      }
      riconciliazioni_pagamenti: {
        Row: {
          created_at: string
          data_pagamento: string
          estratto_id: string
          id: string
          importo_totale: number
          metodo_pagamento: string | null
          note: string | null
          num_righe: number
          riferimento_pagamento: string | null
          righe_ids: Json | null
          snapshot: Json | null
          tipo_pagamento: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_pagamento: string
          estratto_id: string
          id?: string
          importo_totale?: number
          metodo_pagamento?: string | null
          note?: string | null
          num_righe?: number
          riferimento_pagamento?: string | null
          righe_ids?: Json | null
          snapshot?: Json | null
          tipo_pagamento?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          estratto_id?: string
          id?: string
          importo_totale?: number
          metodo_pagamento?: string | null
          note?: string | null
          num_righe?: number
          riferimento_pagamento?: string | null
          righe_ids?: Json | null
          snapshot?: Json | null
          tipo_pagamento?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "riconciliazioni_pagamenti_estratto_id_fkey"
            columns: ["estratto_id"]
            isOneToOne: false
            referencedRelation: "estratti_provvigioni"
            referencedColumns: ["id"]
          },
        ]
      }
      scadenziario_fatture: {
        Row: {
          azienda_id: string | null
          azienda_nome: string
          cliente_id: string | null
          cliente_nome: string
          created_at: string
          data_fattura: string
          data_incasso: string | null
          data_incasso_provvigione: string | null
          data_scadenza: string
          estratto_riga_id: string | null
          id: string
          importo: number
          importo_provvigione_pagata: number
          metodo_pagamento_provvigione: string | null
          note_provvigione: string | null
          numero_fattura: string
          percentuale_provvigione: number
          provvigione_calcolata: number
          provvigione_incassata: boolean
          riconciliazione_pagamento_id: string | null
          riferimento_pagamento_provvigione: string | null
          stato: string
          stato_provvigione: string
          trimestre_provvigione: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          azienda_id?: string | null
          azienda_nome: string
          cliente_id?: string | null
          cliente_nome: string
          created_at?: string
          data_fattura: string
          data_incasso?: string | null
          data_incasso_provvigione?: string | null
          data_scadenza: string
          estratto_riga_id?: string | null
          id?: string
          importo?: number
          importo_provvigione_pagata?: number
          metodo_pagamento_provvigione?: string | null
          note_provvigione?: string | null
          numero_fattura: string
          percentuale_provvigione?: number
          provvigione_calcolata?: number
          provvigione_incassata?: boolean
          riconciliazione_pagamento_id?: string | null
          riferimento_pagamento_provvigione?: string | null
          stato?: string
          stato_provvigione?: string
          trimestre_provvigione?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          azienda_id?: string | null
          azienda_nome?: string
          cliente_id?: string | null
          cliente_nome?: string
          created_at?: string
          data_fattura?: string
          data_incasso?: string | null
          data_incasso_provvigione?: string | null
          data_scadenza?: string
          estratto_riga_id?: string | null
          id?: string
          importo?: number
          importo_provvigione_pagata?: number
          metodo_pagamento_provvigione?: string | null
          note_provvigione?: string | null
          numero_fattura?: string
          percentuale_provvigione?: number
          provvigione_calcolata?: number
          provvigione_incassata?: boolean
          riconciliazione_pagamento_id?: string | null
          riferimento_pagamento_provvigione?: string | null
          stato?: string
          stato_provvigione?: string
          trimestre_provvigione?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scadenziario_fatture_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenziario_fatture_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenziario_fatture_estratto_riga_id_fkey"
            columns: ["estratto_riga_id"]
            isOneToOne: false
            referencedRelation: "estratti_provvigioni_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenziario_fatture_riconciliazione_pagamento_id_fkey"
            columns: ["riconciliazione_pagamento_id"]
            isOneToOne: false
            referencedRelation: "riconciliazioni_pagamenti"
            referencedColumns: ["id"]
          },
        ]
      }
      segnalazioni: {
        Row: {
          azienda_id: string | null
          causa: string | null
          cliente_id: string | null
          created_at: string
          data_apertura: string
          data_emissione_nc: string | null
          data_risoluzione: string | null
          descrizione: string | null
          documento_id: string | null
          id: string
          importo_richiesto: number | null
          importo_riconosciuto: number | null
          meta: Json | null
          numero_nota_credito: string | null
          oggetto: string
          ordine_id: string | null
          priorita: string
          responsabile: string | null
          scadenza: string | null
          soluzione: string | null
          stato: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          azienda_id?: string | null
          causa?: string | null
          cliente_id?: string | null
          created_at?: string
          data_apertura?: string
          data_emissione_nc?: string | null
          data_risoluzione?: string | null
          descrizione?: string | null
          documento_id?: string | null
          id?: string
          importo_richiesto?: number | null
          importo_riconosciuto?: number | null
          meta?: Json | null
          numero_nota_credito?: string | null
          oggetto: string
          ordine_id?: string | null
          priorita?: string
          responsabile?: string | null
          scadenza?: string | null
          soluzione?: string | null
          stato?: string
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          azienda_id?: string | null
          causa?: string | null
          cliente_id?: string | null
          created_at?: string
          data_apertura?: string
          data_emissione_nc?: string | null
          data_risoluzione?: string | null
          descrizione?: string | null
          documento_id?: string | null
          id?: string
          importo_richiesto?: number | null
          importo_riconosciuto?: number | null
          meta?: Json | null
          numero_nota_credito?: string | null
          oggetto?: string
          ordine_id?: string | null
          priorita?: string
          responsabile?: string | null
          scadenza?: string | null
          soluzione?: string | null
          stato?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segnalazioni_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "aziende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segnalazioni_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segnalazioni_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segnalazioni_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "ordini"
            referencedColumns: ["id"]
          },
        ]
      }
      segnalazioni_eventi: {
        Row: {
          created_at: string
          descrizione: string | null
          documento_id: string | null
          id: string
          meta: Json | null
          segnalazione_id: string
          stato_nuovo: string | null
          stato_precedente: string | null
          tipo_evento: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descrizione?: string | null
          documento_id?: string | null
          id?: string
          meta?: Json | null
          segnalazione_id: string
          stato_nuovo?: string | null
          stato_precedente?: string | null
          tipo_evento: string
          user_id: string
        }
        Update: {
          created_at?: string
          descrizione?: string | null
          documento_id?: string | null
          id?: string
          meta?: Json | null
          segnalazione_id?: string
          stato_nuovo?: string | null
          stato_precedente?: string | null
          tipo_evento?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segnalazioni_eventi_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segnalazioni_eventi_segnalazione_id_fkey"
            columns: ["segnalazione_id"]
            isOneToOne: false
            referencedRelation: "segnalazioni"
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
      visit_preparations: {
        Row: {
          analisi_concorrenza: string | null
          argomenti_vendita: string | null
          cliente_id: string
          contenuto_completo: Json | null
          created_at: string
          domande_consigliate: string | null
          id: string
          obiettivo_visita: string | null
          obiezioni_previste: string | null
          proposta_consigliata: string | null
          prossima_azione: string | null
          riepilogo_cliente: string | null
          status: string
          storico_commerciale: string | null
          updated_at: string
          user_id: string
          visit_date: string | null
        }
        Insert: {
          analisi_concorrenza?: string | null
          argomenti_vendita?: string | null
          cliente_id: string
          contenuto_completo?: Json | null
          created_at?: string
          domande_consigliate?: string | null
          id?: string
          obiettivo_visita?: string | null
          obiezioni_previste?: string | null
          proposta_consigliata?: string | null
          prossima_azione?: string | null
          riepilogo_cliente?: string | null
          status?: string
          storico_commerciale?: string | null
          updated_at?: string
          user_id: string
          visit_date?: string | null
        }
        Update: {
          analisi_concorrenza?: string | null
          argomenti_vendita?: string | null
          cliente_id?: string
          contenuto_completo?: Json | null
          created_at?: string
          domande_consigliate?: string | null
          id?: string
          obiettivo_visita?: string | null
          obiezioni_previste?: string | null
          proposta_consigliata?: string | null
          prossima_azione?: string | null
          riepilogo_cliente?: string | null
          status?: string
          storico_commerciale?: string | null
          updated_at?: string
          user_id?: string
          visit_date?: string | null
        }
        Relationships: []
      }
      visit_reports: {
        Row: {
          campioni_lasciati: string | null
          cliente_id: string
          concorrenza_rilevata: Json | null
          created_at: string
          data_follow_up: string | null
          data_visita: string
          esito: string | null
          espositori_richiesti: string | null
          id: string
          interesse_cliente: string | null
          materiale_promozionale: string | null
          note: string | null
          obiezioni: string | null
          ordine_preso: boolean | null
          prodotti_ordinati: Json | null
          prodotti_proposti: Json | null
          prodotti_proposti_non_ordinati: Json | null
          promozioni_discusse: string | null
          prossima_azione: string | null
          risposte_date: string | null
          umore_cliente: string | null
          updated_at: string
          user_id: string
          valore_ordine: number | null
          visit_preparation_id: string | null
        }
        Insert: {
          campioni_lasciati?: string | null
          cliente_id: string
          concorrenza_rilevata?: Json | null
          created_at?: string
          data_follow_up?: string | null
          data_visita?: string
          esito?: string | null
          espositori_richiesti?: string | null
          id?: string
          interesse_cliente?: string | null
          materiale_promozionale?: string | null
          note?: string | null
          obiezioni?: string | null
          ordine_preso?: boolean | null
          prodotti_ordinati?: Json | null
          prodotti_proposti?: Json | null
          prodotti_proposti_non_ordinati?: Json | null
          promozioni_discusse?: string | null
          prossima_azione?: string | null
          risposte_date?: string | null
          umore_cliente?: string | null
          updated_at?: string
          user_id: string
          valore_ordine?: number | null
          visit_preparation_id?: string | null
        }
        Update: {
          campioni_lasciati?: string | null
          cliente_id?: string
          concorrenza_rilevata?: Json | null
          created_at?: string
          data_follow_up?: string | null
          data_visita?: string
          esito?: string | null
          espositori_richiesti?: string | null
          id?: string
          interesse_cliente?: string | null
          materiale_promozionale?: string | null
          note?: string | null
          obiezioni?: string | null
          ordine_preso?: boolean | null
          prodotti_ordinati?: Json | null
          prodotti_proposti?: Json | null
          prodotti_proposti_non_ordinati?: Json | null
          promozioni_discusse?: string | null
          prossima_azione?: string | null
          risposte_date?: string | null
          umore_cliente?: string | null
          updated_at?: string
          user_id?: string
          valore_ordine?: number | null
          visit_preparation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_reports_visit_preparation_id_fkey"
            columns: ["visit_preparation_id"]
            isOneToOne: false
            referencedRelation: "visit_preparations"
            referencedColumns: ["id"]
          },
        ]
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
      calcola_provvigione_prevista: {
        Args: { p_ordine_id: string }
        Returns: number
      }
      trova_condizione_provvigione: {
        Args: {
          p_azienda_id: string
          p_categoria: string
          p_cliente_id: string
          p_data: string
          p_prodotto_id: string
          p_user_id: string
        }
        Returns: {
          applica_su_resi: boolean
          arrotondamento: string
          azienda_id: string
          calcolo_su: string
          categoria: string | null
          cliente_id: string | null
          created_at: string
          id: string
          note: string | null
          percentuale: number
          priorita: number
          prodotto_id: string | null
          updated_at: string
          user_id: string
          valido_a: string | null
          valido_da: string
        }
        SetofOptions: {
          from: "*"
          to: "provvigioni_condizioni"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      client_status: "premium" | "standard" | "nuovo"
      company_status: "attivo" | "in_pausa"
      documento_entita:
        | "ordine"
        | "cliente"
        | "azienda"
        | "provvigione"
        | "segnalazione"
        | "generico"
      documento_tipo:
        | "ordine_originale"
        | "conferma_ordine"
        | "fattura"
        | "nota_credito"
        | "contratto"
        | "listino"
        | "accordo_provv"
        | "promo"
        | "email"
        | "estratto_provv"
        | "altro"
      event_type: "meeting" | "presentazione" | "visita" | "altro"
      order_status:
        | "in_attesa"
        | "spedito"
        | "completato"
        | "annullato"
        | "stand_by"
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
      documento_entita: [
        "ordine",
        "cliente",
        "azienda",
        "provvigione",
        "segnalazione",
        "generico",
      ],
      documento_tipo: [
        "ordine_originale",
        "conferma_ordine",
        "fattura",
        "nota_credito",
        "contratto",
        "listino",
        "accordo_provv",
        "promo",
        "email",
        "estratto_provv",
        "altro",
      ],
      event_type: ["meeting", "presentazione", "visita", "altro"],
      order_status: [
        "in_attesa",
        "spedito",
        "completato",
        "annullato",
        "stand_by",
      ],
      reminder_priority: ["alta", "media", "bassa"],
      reminder_type: ["call", "email", "documento", "scadenza"],
    },
  },
} as const
