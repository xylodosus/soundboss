/* ============================================================
 * SoundBoss - Types générés depuis la base Supabase (MCP)
 * (supabase gen types typescript -format enums)
 * ============================================================ */

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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      device_token: {
        Row: {
          app_version: string | null
          created_at: string | null
          device_label: string | null
          est_actif: boolean | null
          expo_token: string
          id: number
          last_seen_at: string | null
          platform: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          device_label?: string | null
          est_actif?: boolean | null
          expo_token: string
          id?: never
          last_seen_at?: string | null
          platform: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          device_label?: string | null
          est_actif?: boolean | null
          expo_token?: string
          id?: never
          last_seen_at?: string | null
          platform?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_token_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers_personnels: {
        Row: {
          created_at: string | null
          id: string
          nom: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nom: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nom?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_personnels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bibliotheque_ressources: {
        Row: {
          cree_par: string | null
          created_at: string | null
          description: string | null
          fichier_nom: string | null
          fichier_url: string | null
          id: string
          tags: string[]
          titre: string
          type: Database["public"]["Enums"]["bibliotheque_type"]
        }
        Insert: {
          cree_par?: string | null
          created_at?: string | null
          description?: string | null
          fichier_nom?: string | null
          fichier_url?: string | null
          id?: string
          tags?: string[]
          titre: string
          type: Database["public"]["Enums"]["bibliotheque_type"]
        }
        Update: {
          cree_par?: string | null
          created_at?: string | null
          description?: string | null
          fichier_nom?: string | null
          fichier_url?: string | null
          id?: string
          tags?: string[]
          titre?: string
          type?: Database["public"]["Enums"]["bibliotheque_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bibliotheque_ressources_cree_par_fkey"
            columns: ["cree_par"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_creations: {
        Row: {
          audio_url: string | null
          bpm: number | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          duree_secondes: number | null
          est_favori: boolean | null
          id: string
          job_id: string | null
          licence_commerciale: boolean | null
          nombre_ecoutes: number | null
          nombre_telechargements: number | null
          paroles: string | null
          partage_groupe_id: string | null
          partage_projet_id: string | null
          prompt: string | null
          provider: string | null
          statut: Database["public"]["Enums"]["ai_creation_statut"] | null
          style_tags: string[] | null
          titre: string
          tonalite: string | null
          type: Database["public"]["Enums"]["ai_job_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          audio_url?: string | null
          bpm?: number | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          duree_secondes?: number | null
          est_favori?: boolean | null
          id?: string
          job_id?: string | null
          licence_commerciale?: boolean | null
          nombre_ecoutes?: number | null
          nombre_telechargements?: number | null
          paroles?: string | null
          partage_groupe_id?: string | null
          partage_projet_id?: string | null
          prompt?: string | null
          provider?: string | null
          statut?: Database["public"]["Enums"]["ai_creation_statut"] | null
          style_tags?: string[] | null
          titre: string
          tonalite?: string | null
          type: Database["public"]["Enums"]["ai_job_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          audio_url?: string | null
          bpm?: number | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          duree_secondes?: number | null
          est_favori?: boolean | null
          id?: string
          job_id?: string | null
          licence_commerciale?: boolean | null
          nombre_ecoutes?: number | null
          nombre_telechargements?: number | null
          paroles?: string | null
          partage_groupe_id?: string | null
          partage_projet_id?: string | null
          prompt?: string | null
          provider?: string | null
          statut?: Database["public"]["Enums"]["ai_creation_statut"] | null
          style_tags?: string[] | null
          titre?: string
          tonalite?: string | null
          type?: Database["public"]["Enums"]["ai_job_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_creations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vue_ai_jobs_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creations_partage_groupe_id_fkey"
            columns: ["partage_groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creations_partage_groupe_id_fkey"
            columns: ["partage_groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_dashboard_chef"
            referencedColumns: ["groupe_id"]
          },
          {
            foreignKeyName: "ai_creations_partage_groupe_id_fkey"
            columns: ["partage_groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_groupes_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creations_partage_projet_id_fkey"
            columns: ["partage_projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_creations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_job_resultats: {
        Row: {
          created_at: string | null
          duree_secondes: number | null
          format: string | null
          id: string
          job_id: string | null
          metadata: Json | null
          nom: string
          taille_bytes: number | null
          url: string
        }
        Insert: {
          created_at?: string | null
          duree_secondes?: number | null
          format?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          nom: string
          taille_bytes?: number | null
          url: string
        }
        Update: {
          created_at?: string | null
          duree_secondes?: number | null
          format?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          nom?: string
          taille_bytes?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_job_resultats_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_job_resultats_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "vue_ai_jobs_complets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_jobs: {
        Row: {
          code_erreur: string | null
          completed_at: string | null
          cout_api_reel: number | null
          created_at: string | null
          credits_cout: number
          id: string
          input_fichier_url: string | null
          input_params: Json
          message_erreur: string | null
          progression_pct: number | null
          projet_id: string | null
          provider: string | null
          provider_job_id: string | null
          ressource_id: string | null
          resultat: Json | null
          started_at: string | null
          statut: Database["public"]["Enums"]["ai_job_statut"] | null
          tentatives: number | null
          type: Database["public"]["Enums"]["ai_job_type"]
          updated_at: string | null
          user_id: string | null
          worker_id: string | null
        }
        Insert: {
          code_erreur?: string | null
          completed_at?: string | null
          cout_api_reel?: number | null
          created_at?: string | null
          credits_cout?: number
          id?: string
          input_fichier_url?: string | null
          input_params?: Json
          message_erreur?: string | null
          progression_pct?: number | null
          projet_id?: string | null
          provider?: string | null
          provider_job_id?: string | null
          ressource_id?: string | null
          resultat?: Json | null
          started_at?: string | null
          statut?: Database["public"]["Enums"]["ai_job_statut"] | null
          tentatives?: number | null
          type: Database["public"]["Enums"]["ai_job_type"]
          updated_at?: string | null
          user_id?: string | null
          worker_id?: string | null
        }
        Update: {
          code_erreur?: string | null
          completed_at?: string | null
          cout_api_reel?: number | null
          created_at?: string | null
          credits_cout?: number
          id?: string
          input_fichier_url?: string | null
          input_params?: Json
          message_erreur?: string | null
          progression_pct?: number | null
          projet_id?: string | null
          provider?: string | null
          provider_job_id?: string | null
          ressource_id?: string | null
          resultat?: Json | null
          started_at?: string | null
          statut?: Database["public"]["Enums"]["ai_job_statut"] | null
          tentatives?: number | null
          type?: Database["public"]["Enums"]["ai_job_type"]
          updated_at?: string | null
          user_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_jobs_ressource_id_fkey"
            columns: ["ressource_id"]
            isOneToOne: false
            referencedRelation: "ressources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      avis_studios: {
        Row: {
          commentaire: string | null
          created_at: string | null
          date_reponse: string | null
          id: string
          note: number
          note_accueil: number | null
          note_equipement: number | null
          note_proprete: number | null
          note_rapport_qualite_prix: number | null
          reponse_proprietaire: string | null
          reservation_id: string | null
          studio_id: string | null
          user_id: string | null
        }
        Insert: {
          commentaire?: string | null
          created_at?: string | null
          date_reponse?: string | null
          id?: string
          note: number
          note_accueil?: number | null
          note_equipement?: number | null
          note_proprete?: number | null
          note_rapport_qualite_prix?: number | null
          reponse_proprietaire?: string | null
          reservation_id?: string | null
          studio_id?: string | null
          user_id?: string | null
        }
        Update: {
          commentaire?: string | null
          created_at?: string | null
          date_reponse?: string | null
          id?: string
          note?: number
          note_accueil?: number | null
          note_equipement?: number | null
          note_proprete?: number | null
          note_rapport_qualite_prix?: number | null
          reponse_proprietaire?: string | null
          reservation_id?: string | null
          studio_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avis_studios_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avis_studios_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avis_studios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packs: {
        Row: {
          bonus_credits: number | null
          created_at: string | null
          credits: number
          description: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          est_actif: boolean | null
          id: string
          nom: string
          ordre: number | null
          prix: number
          updated_at: string | null
        }
        Insert: {
          bonus_credits?: number | null
          created_at?: string | null
          credits: number
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          est_actif?: boolean | null
          id?: string
          nom: string
          ordre?: number | null
          prix: number
          updated_at?: string | null
        }
        Update: {
          bonus_credits?: number | null
          created_at?: string | null
          credits?: number
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          est_actif?: boolean | null
          id?: string
          nom?: string
          ordre?: number | null
          prix?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_tarifs: {
        Row: {
          created_at: string | null
          credits_cout: number
          description: string | null
          est_actif: boolean | null
          id: string
          operation: Database["public"]["Enums"]["ai_job_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits_cout: number
          description?: string | null
          est_actif?: boolean | null
          id?: string
          operation: Database["public"]["Enums"]["ai_job_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits_cout?: number
          description?: string | null
          est_actif?: boolean | null
          id?: string
          operation?: Database["public"]["Enums"]["ai_job_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          couleur: string | null
          created_at: string | null
          description: string | null
          icone: string | null
          id: string
          nom: string
          nombre_questions: number | null
          ordre: number | null
          parent_id: string | null
        }
        Insert: {
          couleur?: string | null
          created_at?: string | null
          description?: string | null
          icone?: string | null
          id?: string
          nom: string
          nombre_questions?: number | null
          ordre?: number | null
          parent_id?: string | null
        }
        Update: {
          couleur?: string | null
          created_at?: string | null
          description?: string | null
          icone?: string | null
          id?: string
          nom?: string
          nombre_questions?: number | null
          ordre?: number | null
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_masterclass_recommandations: {
        Row: {
          created_at: string | null
          id: string
          masterclass_id: string | null
          raison: string | null
          reponse_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          masterclass_id?: string | null
          raison?: string | null
          reponse_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          masterclass_id?: string | null
          raison?: string | null
          reponse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_masterclass_recommandations_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "masterclass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_masterclass_recommandations_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "vue_masterclass_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_masterclass_recommandations_reponse_id_fkey"
            columns: ["reponse_id"]
            isOneToOne: false
            referencedRelation: "forum_reponses"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_questions: {
        Row: {
          categorie_id: string | null
          contenu: string
          created_at: string | null
          est_epinglee: boolean | null
          id: string
          nombre_reponses: number | null
          statut: Database["public"]["Enums"]["forum_statut"] | null
          titre: string
          updated_at: string | null
          user_id: string | null
          votes: number | null
          vues: number | null
        }
        Insert: {
          categorie_id?: string | null
          contenu: string
          created_at?: string | null
          est_epinglee?: boolean | null
          id?: string
          nombre_reponses?: number | null
          statut?: Database["public"]["Enums"]["forum_statut"] | null
          titre: string
          updated_at?: string | null
          user_id?: string | null
          votes?: number | null
          vues?: number | null
        }
        Update: {
          categorie_id?: string | null
          contenu?: string
          created_at?: string | null
          est_epinglee?: boolean | null
          id?: string
          nombre_reponses?: number | null
          statut?: Database["public"]["Enums"]["forum_statut"] | null
          titre?: string
          updated_at?: string | null
          user_id?: string | null
          votes?: number | null
          vues?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_questions_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_questions_tags: {
        Row: {
          question_id: string
          tag_id: string
        }
        Insert: {
          question_id: string
          tag_id: string
        }
        Update: {
          question_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_questions_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "forum_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_questions_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags_globaux"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reponses: {
        Row: {
          contenu: string
          created_at: string | null
          est_acceptee: boolean | null
          id: string
          question_id: string | null
          updated_at: string | null
          user_id: string | null
          votes: number | null
        }
        Insert: {
          contenu: string
          created_at?: string | null
          est_acceptee?: boolean | null
          id?: string
          question_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          votes?: number | null
        }
        Update: {
          contenu?: string
          created_at?: string | null
          est_acceptee?: boolean | null
          id?: string
          question_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_reponses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "forum_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reponses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_votes: {
        Row: {
          created_at: string | null
          id: string
          question_id: string | null
          reponse_id: string | null
          user_id: string | null
          valeur: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id?: string | null
          reponse_id?: string | null
          user_id?: string | null
          valeur: number
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string | null
          reponse_id?: string | null
          user_id?: string | null
          valeur?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_votes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "forum_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_votes_reponse_id_fkey"
            columns: ["reponse_id"]
            isOneToOne: false
            referencedRelation: "forum_reponses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groupe_membres: {
        Row: {
          created_at: string | null
          date_adhesion: string | null
          date_sortie: string | null
          est_admin: boolean | null
          groupe_id: string | null
          id: string
          notes_chef: string | null
          role_id: string | null
          statut: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_adhesion?: string | null
          date_sortie?: string | null
          est_admin?: boolean | null
          groupe_id?: string | null
          id?: string
          notes_chef?: string | null
          role_id?: string | null
          statut?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_adhesion?: string | null
          date_sortie?: string | null
          est_admin?: boolean | null
          groupe_id?: string | null
          id?: string
          notes_chef?: string | null
          role_id?: string | null
          statut?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groupe_membres_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupe_membres_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_dashboard_chef"
            referencedColumns: ["groupe_id"]
          },
          {
            foreignKeyName: "groupe_membres_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_groupes_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupe_membres_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles_pupitres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groupe_membres_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groupes: {
        Row: {
          accepte_nouveaux_membres: boolean | null
          chef_id: string | null
          created_at: string | null
          description: string | null
          est_prive: boolean | null
          genre_musical: string | null
          id: string
          is_active: boolean | null
          nom: string
          nombre_membres: number | null
          nombre_projets: number | null
          nombre_seances: number | null
          pays: string | null
          photo_url: string | null
          type_groupe: Database["public"]["Enums"]["groupe_type"]
          updated_at: string | null
          video_presentation_url: string | null
          ville: string | null
        }
        Insert: {
          accepte_nouveaux_membres?: boolean | null
          chef_id?: string | null
          created_at?: string | null
          description?: string | null
          est_prive?: boolean | null
          genre_musical?: string | null
          id?: string
          is_active?: boolean | null
          nom: string
          nombre_membres?: number | null
          nombre_projets?: number | null
          nombre_seances?: number | null
          pays?: string | null
          photo_url?: string | null
          type_groupe: Database["public"]["Enums"]["groupe_type"]
          updated_at?: string | null
          video_presentation_url?: string | null
          ville?: string | null
        }
        Update: {
          accepte_nouveaux_membres?: boolean | null
          chef_id?: string | null
          created_at?: string | null
          description?: string | null
          est_prive?: boolean | null
          genre_musical?: string | null
          id?: string
          is_active?: boolean | null
          nom?: string
          nombre_membres?: number | null
          nombre_projets?: number | null
          nombre_seances?: number | null
          pays?: string | null
          photo_url?: string | null
          type_groupe?: Database["public"]["Enums"]["groupe_type"]
          updated_at?: string | null
          video_presentation_url?: string | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groupes_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_achats: {
        Row: {
          acheteur_id: string | null
          commission_plateforme: number | null
          created_at: string | null
          date_achat: string | null
          dernier_telechargement: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          expire_le: string | null
          id: string
          limite_telechargements: number | null
          nombre_telechargements: number | null
          paiement_statut: Database["public"]["Enums"]["paiement_statut"] | null
          prix_paye: number
          produit_id: string | null
          transaction_id: string | null
        }
        Insert: {
          acheteur_id?: string | null
          commission_plateforme?: number | null
          created_at?: string | null
          date_achat?: string | null
          dernier_telechargement?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          expire_le?: string | null
          id?: string
          limite_telechargements?: number | null
          nombre_telechargements?: number | null
          paiement_statut?:
            | Database["public"]["Enums"]["paiement_statut"]
            | null
          prix_paye: number
          produit_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          acheteur_id?: string | null
          commission_plateforme?: number | null
          created_at?: string | null
          date_achat?: string | null
          dernier_telechargement?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          expire_le?: string | null
          id?: string
          limite_telechargements?: number | null
          nombre_telechargements?: number | null
          paiement_statut?:
            | Database["public"]["Enums"]["paiement_statut"]
            | null
          prix_paye?: number
          produit_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_achats_acheteur_id_fkey"
            columns: ["acheteur_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_achats_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "marketplace_produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_achats_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "vue_marketplace_catalogue"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_avis: {
        Row: {
          acheteur_id: string | null
          commentaire: string | null
          created_at: string | null
          date_reponse: string | null
          id: string
          note: number
          note_qualite: number | null
          note_rapport_qualite_prix: number | null
          note_utilite: number | null
          produit_id: string | null
          reponse_vendeur: string | null
        }
        Insert: {
          acheteur_id?: string | null
          commentaire?: string | null
          created_at?: string | null
          date_reponse?: string | null
          id?: string
          note: number
          note_qualite?: number | null
          note_rapport_qualite_prix?: number | null
          note_utilite?: number | null
          produit_id?: string | null
          reponse_vendeur?: string | null
        }
        Update: {
          acheteur_id?: string | null
          commentaire?: string | null
          created_at?: string | null
          date_reponse?: string | null
          id?: string
          note?: number
          note_qualite?: number | null
          note_rapport_qualite_prix?: number | null
          note_utilite?: number | null
          produit_id?: string | null
          reponse_vendeur?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_avis_acheteur_id_fkey"
            columns: ["acheteur_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_avis_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "marketplace_produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_avis_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "vue_marketplace_catalogue"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_collection_produits: {
        Row: {
          collection_id: string | null
          created_at: string | null
          id: string
          ordre: number | null
          produit_id: string | null
        }
        Insert: {
          collection_id?: string | null
          created_at?: string | null
          id?: string
          ordre?: number | null
          produit_id?: string | null
        }
        Update: {
          collection_id?: string | null
          created_at?: string | null
          id?: string
          ordre?: number | null
          produit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_collection_produits_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "marketplace_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_collection_produits_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "marketplace_produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_collection_produits_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "vue_marketplace_catalogue"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_collections: {
        Row: {
          created_at: string | null
          description: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          economie_pct: number | null
          id: string
          image_couverture: string | null
          nom_collection: string
          nombre_produits: number | null
          nombre_ventes: number | null
          prix_bundle: number
          updated_at: string | null
          vendeur_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          economie_pct?: number | null
          id?: string
          image_couverture?: string | null
          nom_collection: string
          nombre_produits?: number | null
          nombre_ventes?: number | null
          prix_bundle: number
          updated_at?: string | null
          vendeur_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          economie_pct?: number | null
          id?: string
          image_couverture?: string | null
          nom_collection?: string
          nombre_produits?: number | null
          nombre_ventes?: number | null
          prix_bundle?: number
          updated_at?: string | null
          vendeur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_collections_vendeur_id_fkey"
            columns: ["vendeur_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_produit_fichiers: {
        Row: {
          created_at: string | null
          format: string | null
          id: string
          nom_fichier: string
          ordre: number | null
          produit_id: string | null
          taille_bytes: number | null
          type: string | null
          url_stockage: string
        }
        Insert: {
          created_at?: string | null
          format?: string | null
          id?: string
          nom_fichier: string
          ordre?: number | null
          produit_id?: string | null
          taille_bytes?: number | null
          type?: string | null
          url_stockage: string
        }
        Update: {
          created_at?: string | null
          format?: string | null
          id?: string
          nom_fichier?: string
          ordre?: number | null
          produit_id?: string | null
          taille_bytes?: number | null
          type?: string | null
          url_stockage?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_produit_fichiers_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "marketplace_produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_produit_fichiers_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "vue_marketplace_catalogue"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_produits: {
        Row: {
          ai_creation_id: string | null
          categorie: string | null
          commission_plateforme_pct: number | null
          compatible_daw: string[] | null
          conditions_utilisation: string | null
          created_at: string | null
          date_debut_promo: string | null
          date_fin_promo: string | null
          date_publication: string | null
          description: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          fichier_preview_url: string | null
          formats_fichiers: string[] | null
          id: string
          image_couverture: string | null
          licence: Database["public"]["Enums"]["licence_type"]
          nombre_avis: number | null
          nombre_fichiers: number | null
          nombre_ventes: number | null
          nombre_vues: number | null
          note_moyenne: number | null
          prix: number
          prix_promo: number | null
          statut: Database["public"]["Enums"]["produit_statut"] | null
          taille_totale_mb: number | null
          titre: string
          type_produit: Database["public"]["Enums"]["produit_type"]
          updated_at: string | null
          vendeur_id: string | null
        }
        Insert: {
          ai_creation_id?: string | null
          categorie?: string | null
          commission_plateforme_pct?: number | null
          compatible_daw?: string[] | null
          conditions_utilisation?: string | null
          created_at?: string | null
          date_debut_promo?: string | null
          date_fin_promo?: string | null
          date_publication?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          fichier_preview_url?: string | null
          formats_fichiers?: string[] | null
          id?: string
          image_couverture?: string | null
          licence: Database["public"]["Enums"]["licence_type"]
          nombre_avis?: number | null
          nombre_fichiers?: number | null
          nombre_ventes?: number | null
          nombre_vues?: number | null
          note_moyenne?: number | null
          prix: number
          prix_promo?: number | null
          statut?: Database["public"]["Enums"]["produit_statut"] | null
          taille_totale_mb?: number | null
          titre: string
          type_produit: Database["public"]["Enums"]["produit_type"]
          updated_at?: string | null
          vendeur_id?: string | null
        }
        Update: {
          ai_creation_id?: string | null
          categorie?: string | null
          commission_plateforme_pct?: number | null
          compatible_daw?: string[] | null
          conditions_utilisation?: string | null
          created_at?: string | null
          date_debut_promo?: string | null
          date_fin_promo?: string | null
          date_publication?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          fichier_preview_url?: string | null
          formats_fichiers?: string[] | null
          id?: string
          image_couverture?: string | null
          licence?: Database["public"]["Enums"]["licence_type"]
          nombre_avis?: number | null
          nombre_fichiers?: number | null
          nombre_ventes?: number | null
          nombre_vues?: number | null
          note_moyenne?: number | null
          prix?: number
          prix_promo?: number | null
          statut?: Database["public"]["Enums"]["produit_statut"] | null
          taille_totale_mb?: number | null
          titre?: string
          type_produit?: Database["public"]["Enums"]["produit_type"]
          updated_at?: string | null
          vendeur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_marketplace_produits_creation"
            columns: ["ai_creation_id"]
            isOneToOne: false
            referencedRelation: "ai_creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_produits_vendeur_id_fkey"
            columns: ["vendeur_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_tags: {
        Row: {
          created_at: string | null
          id: string
          produit_id: string | null
          tag: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          produit_id?: string | null
          tag: string
        }
        Update: {
          created_at?: string | null
          id?: string
          produit_id?: string | null
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_tags_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "marketplace_produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_tags_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "vue_marketplace_catalogue"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations_groupe: {
        Row: {
          code_hash: string
          cree_par: string
          created_at: string | null
          est_actif: boolean | null
          expire_at: string
          groupe_id: string
          id: string
          utilisations: number | null
        }
        Insert: {
          code_hash: string
          cree_par: string
          created_at?: string | null
          est_actif?: boolean | null
          expire_at: string
          groupe_id: string
          id?: string
          utilisations?: number | null
        }
        Update: {
          code_hash?: string
          cree_par?: string
          created_at?: string | null
          est_actif?: boolean | null
          expire_at?: string
          groupe_id?: string
          id?: string
          utilisations?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_groupe_cree_par_fkey"
            columns: ["cree_par"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_groupe_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
        ]
      }
      masterclass: {
        Row: {
          categorie: string | null
          commission_plateforme_pct: number | null
          created_at: string | null
          date_debut_promo: string | null
          date_fin_promo: string | null
          date_publication: string | null
          description: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          duree_totale_minutes: number | null
          formateur_id: string | null
          id: string
          image_couverture: string | null
          langue: string | null
          niveau: Database["public"]["Enums"]["niveau"]
          nombre_avis: number | null
          nombre_completions: number | null
          nombre_inscrits: number | null
          nombre_ressources: number | null
          nombre_videos: number | null
          note_moyenne: number | null
          objectifs: string | null
          prerequis: string | null
          prix: number
          prix_promo: number | null
          sous_categorie: string | null
          statut: Database["public"]["Enums"]["masterclass_statut"] | null
          titre: string
          updated_at: string | null
          video_trailer_url: string | null
        }
        Insert: {
          categorie?: string | null
          commission_plateforme_pct?: number | null
          created_at?: string | null
          date_debut_promo?: string | null
          date_fin_promo?: string | null
          date_publication?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          duree_totale_minutes?: number | null
          formateur_id?: string | null
          id?: string
          image_couverture?: string | null
          langue?: string | null
          niveau: Database["public"]["Enums"]["niveau"]
          nombre_avis?: number | null
          nombre_completions?: number | null
          nombre_inscrits?: number | null
          nombre_ressources?: number | null
          nombre_videos?: number | null
          note_moyenne?: number | null
          objectifs?: string | null
          prerequis?: string | null
          prix: number
          prix_promo?: number | null
          sous_categorie?: string | null
          statut?: Database["public"]["Enums"]["masterclass_statut"] | null
          titre: string
          updated_at?: string | null
          video_trailer_url?: string | null
        }
        Update: {
          categorie?: string | null
          commission_plateforme_pct?: number | null
          created_at?: string | null
          date_debut_promo?: string | null
          date_fin_promo?: string | null
          date_publication?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          duree_totale_minutes?: number | null
          formateur_id?: string | null
          id?: string
          image_couverture?: string | null
          langue?: string | null
          niveau?: Database["public"]["Enums"]["niveau"]
          nombre_avis?: number | null
          nombre_completions?: number | null
          nombre_inscrits?: number | null
          nombre_ressources?: number | null
          nombre_videos?: number | null
          note_moyenne?: number | null
          objectifs?: string | null
          prerequis?: string | null
          prix?: number
          prix_promo?: number | null
          sous_categorie?: string | null
          statut?: Database["public"]["Enums"]["masterclass_statut"] | null
          titre?: string
          updated_at?: string | null
          video_trailer_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      masterclass_assignations: {
        Row: {
          assignee_par: string | null
          created_at: string | null
          date_echeance: string | null
          groupe_id: string | null
          id: string
          masterclass_id: string | null
          message: string | null
          module_id: string | null
        }
        Insert: {
          assignee_par?: string | null
          created_at?: string | null
          date_echeance?: string | null
          groupe_id?: string | null
          id?: string
          masterclass_id?: string | null
          message?: string | null
          module_id?: string | null
        }
        Update: {
          assignee_par?: string | null
          created_at?: string | null
          date_echeance?: string | null
          groupe_id?: string | null
          id?: string
          masterclass_id?: string | null
          message?: string | null
          module_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_assignations_assignee_par_fkey"
            columns: ["assignee_par"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_assignations_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_assignations_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_dashboard_chef"
            referencedColumns: ["groupe_id"]
          },
          {
            foreignKeyName: "masterclass_assignations_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_groupes_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_assignations_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "masterclass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_assignations_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "vue_masterclass_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_assignations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "masterclass_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      masterclass_avis: {
        Row: {
          commentaire: string | null
          created_at: string | null
          date_reponse: string | null
          id: string
          masterclass_id: string | null
          note: number
          note_contenu: number | null
          note_pedagogie: number | null
          note_qualite_video: number | null
          note_rapport_qualite_prix: number | null
          reponse_formateur: string | null
          user_id: string | null
        }
        Insert: {
          commentaire?: string | null
          created_at?: string | null
          date_reponse?: string | null
          id?: string
          masterclass_id?: string | null
          note: number
          note_contenu?: number | null
          note_pedagogie?: number | null
          note_qualite_video?: number | null
          note_rapport_qualite_prix?: number | null
          reponse_formateur?: string | null
          user_id?: string | null
        }
        Update: {
          commentaire?: string | null
          created_at?: string | null
          date_reponse?: string | null
          id?: string
          masterclass_id?: string | null
          note?: number
          note_contenu?: number | null
          note_pedagogie?: number | null
          note_qualite_video?: number | null
          note_rapport_qualite_prix?: number | null
          reponse_formateur?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_avis_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "masterclass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_avis_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "vue_masterclass_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_avis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      masterclass_inscriptions: {
        Row: {
          certificat_obtenu: boolean | null
          certificat_url: string | null
          commission_plateforme: number | null
          created_at: string | null
          date_achat: string | null
          date_certification: string | null
          derniere_video_vue: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          expire_le: string | null
          id: string
          masterclass_id: string | null
          prix_paye: number
          progression_pct: number | null
          updated_at: string | null
          user_id: string | null
          videos_completees: string[] | null
        }
        Insert: {
          certificat_obtenu?: boolean | null
          certificat_url?: string | null
          commission_plateforme?: number | null
          created_at?: string | null
          date_achat?: string | null
          date_certification?: string | null
          derniere_video_vue?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          expire_le?: string | null
          id?: string
          masterclass_id?: string | null
          prix_paye: number
          progression_pct?: number | null
          updated_at?: string | null
          user_id?: string | null
          videos_completees?: string[] | null
        }
        Update: {
          certificat_obtenu?: boolean | null
          certificat_url?: string | null
          commission_plateforme?: number | null
          created_at?: string | null
          date_achat?: string | null
          date_certification?: string | null
          derniere_video_vue?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          expire_le?: string | null
          id?: string
          masterclass_id?: string | null
          prix_paye?: number
          progression_pct?: number | null
          updated_at?: string | null
          user_id?: string | null
          videos_completees?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_inscriptions_derniere_video_vue_fkey"
            columns: ["derniere_video_vue"]
            isOneToOne: false
            referencedRelation: "masterclass_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_inscriptions_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "masterclass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_inscriptions_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "vue_masterclass_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_inscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      masterclass_modules: {
        Row: {
          created_at: string | null
          description: string | null
          duree_totale_minutes: number | null
          id: string
          masterclass_id: string | null
          nombre_videos: number | null
          ordre: number
          titre: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duree_totale_minutes?: number | null
          id?: string
          masterclass_id?: string | null
          nombre_videos?: number | null
          ordre: number
          titre: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duree_totale_minutes?: number | null
          id?: string
          masterclass_id?: string | null
          nombre_videos?: number | null
          ordre?: number
          titre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_modules_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "masterclass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_modules_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "vue_masterclass_catalogue"
            referencedColumns: ["id"]
          },
        ]
      }
      masterclass_questions: {
        Row: {
          created_at: string | null
          id: string
          question: string
          timestamp_video: number | null
          updated_at: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          question: string
          timestamp_video?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          question?: string
          timestamp_video?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_questions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "masterclass_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      masterclass_reponses: {
        Row: {
          created_at: string | null
          est_reponse_formateur: boolean | null
          id: string
          question_id: string | null
          reponse: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          est_reponse_formateur?: boolean | null
          id?: string
          question_id?: string | null
          reponse: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          est_reponse_formateur?: boolean | null
          id?: string
          question_id?: string | null
          reponse?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_reponses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "masterclass_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_reponses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      masterclass_ressources: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          module_id: string | null
          nom: string
          taille_bytes: number | null
          type: Database["public"]["Enums"]["ressource_type"]
          url: string
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          module_id?: string | null
          nom: string
          taille_bytes?: number | null
          type: Database["public"]["Enums"]["ressource_type"]
          url: string
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          module_id?: string | null
          nom?: string
          taille_bytes?: number | null
          type?: Database["public"]["Enums"]["ressource_type"]
          url?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_ressources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "masterclass_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_ressources_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "masterclass_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      masterclass_tags: {
        Row: {
          masterclass_id: string
          tag_id: string
        }
        Insert: {
          masterclass_id: string
          tag_id: string
        }
        Update: {
          masterclass_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_tags_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "masterclass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_tags_masterclass_id_fkey"
            columns: ["masterclass_id"]
            isOneToOne: false
            referencedRelation: "vue_masterclass_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masterclass_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags_globaux"
            referencedColumns: ["id"]
          },
        ]
      }
      masterclass_videos: {
        Row: {
          created_at: string | null
          description: string | null
          duree_secondes: number
          est_preview: boolean | null
          id: string
          module_id: string | null
          ordre: number
          titre: string
          updated_at: string | null
          url_video: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duree_secondes: number
          est_preview?: boolean | null
          id?: string
          module_id?: string | null
          ordre: number
          titre: string
          updated_at?: string | null
          url_video: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duree_secondes?: number
          est_preview?: boolean | null
          id?: string
          module_id?: string | null
          ordre?: number
          titre?: string
          updated_at?: string | null
          url_video?: string
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_videos_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "masterclass_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          contenu: string | null
          created_at: string | null
          est_epingle: boolean | null
          est_modifie: boolean | null
          est_supprime: boolean | null
          fichier_nom: string | null
          fichier_taille: number | null
          fichier_url: string | null
          groupe_id: string | null
          id: string
          mentions: string[] | null
          parent_message_id: string | null
          pupitre_id: string | null
          type: Database["public"]["Enums"]["message_type"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contenu?: string | null
          created_at?: string | null
          est_epingle?: boolean | null
          est_modifie?: boolean | null
          est_supprime?: boolean | null
          fichier_nom?: string | null
          fichier_taille?: number | null
          fichier_url?: string | null
          groupe_id?: string | null
          id?: string
          mentions?: string[] | null
          parent_message_id?: string | null
          pupitre_id?: string | null
          type?: Database["public"]["Enums"]["message_type"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contenu?: string | null
          created_at?: string | null
          est_epingle?: boolean | null
          est_modifie?: boolean | null
          est_supprime?: boolean | null
          fichier_nom?: string | null
          fichier_taille?: number | null
          fichier_url?: string | null
          groupe_id?: string | null
          id?: string
          mentions?: string[] | null
          parent_message_id?: string | null
          pupitre_id?: string | null
          type?: Database["public"]["Enums"]["message_type"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_dashboard_chef"
            referencedColumns: ["groupe_id"]
          },
          {
            foreignKeyName: "messages_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_groupes_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_pupitre_id_fkey"
            columns: ["pupitre_id"]
            isOneToOne: false
            referencedRelation: "roles_pupitres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_lus: {
        Row: {
          id: string
          lu_at: string | null
          message_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          lu_at?: string | null
          message_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          lu_at?: string | null
          message_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_lus_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_lus_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          contenu: string | null
          created_at: string | null
          date_lecture: string | null
          est_lue: boolean | null
          id: string
          lien_url: string | null
          lien_id: string | null
          lien_type: string | null
          titre: string
          type: string
          user_id: string | null
        }
        Insert: {
          contenu?: string | null
          created_at?: string | null
          date_lecture?: string | null
          est_lue?: boolean | null
          id?: string
          lien_id?: string | null
          lien_type?: string | null
          lien_url?: string | null
          titre: string
          type: string
          user_id?: string | null
        }
        Update: {
          contenu?: string | null
          created_at?: string | null
          date_lecture?: string | null
          est_lue?: boolean | null
          id?: string
          lien_id?: string | null
          lien_type?: string | null
          lien_url?: string | null
          titre?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          beneficiaire_id: string | null
          commission_plateforme: number | null
          created_at: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          id: string
          metadata: Json | null
          methode_paiement: string | null
          montant_total: number
          montant_vendeur: number | null
          payeur_id: string | null
          reference_id: string | null
          statut: Database["public"]["Enums"]["paiement_statut"] | null
          transaction_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          beneficiaire_id?: string | null
          commission_plateforme?: number | null
          created_at?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          metadata?: Json | null
          methode_paiement?: string | null
          montant_total: number
          montant_vendeur?: number | null
          payeur_id?: string | null
          reference_id?: string | null
          statut?: Database["public"]["Enums"]["paiement_statut"] | null
          transaction_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          beneficiaire_id?: string | null
          commission_plateforme?: number | null
          created_at?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          metadata?: Json | null
          methode_paiement?: string | null
          montant_total?: number
          montant_vendeur?: number | null
          payeur_id?: string | null
          reference_id?: string | null
          statut?: Database["public"]["Enums"]["paiement_statut"] | null
          transaction_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_beneficiaire_id_fkey"
            columns: ["beneficiaire_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_payeur_id_fkey"
            columns: ["payeur_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projets: {
        Row: {
          affiche_url: string | null
          categorie: Database["public"]["Enums"]["projet_categorie"]
          created_at: string | null
          date_debut: string | null
          date_evenement: string | null
          date_fin: string | null
          date_realisation: string | null
          description: string | null
          groupe_id: string | null
          id: string
          lieu_evenement: string | null
          nom: string
          nombre_seances: number | null
          nombre_taches: number | null
          progression: number | null
          statut: Database["public"]["Enums"]["projet_statut"] | null
          type_evenement: Database["public"]["Enums"]["type_evenement"] | null
          type_production: Database["public"]["Enums"]["type_production"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          affiche_url?: string | null
          categorie?: Database["public"]["Enums"]["projet_categorie"]
          created_at?: string | null
          date_debut?: string | null
          date_evenement?: string | null
          date_fin?: string | null
          date_realisation?: string | null
          description?: string | null
          groupe_id?: string | null
          id?: string
          lieu_evenement?: string | null
          nom: string
          nombre_seances?: number | null
          nombre_taches?: number | null
          progression?: number | null
          statut?: Database["public"]["Enums"]["projet_statut"] | null
          type_evenement?: Database["public"]["Enums"]["type_evenement"] | null
          type_production?:
            | Database["public"]["Enums"]["type_production"]
            | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          affiche_url?: string | null
          categorie?: Database["public"]["Enums"]["projet_categorie"]
          created_at?: string | null
          date_debut?: string | null
          date_evenement?: string | null
          date_fin?: string | null
          date_realisation?: string | null
          description?: string | null
          groupe_id?: string | null
          id?: string
          lieu_evenement?: string | null
          nom?: string
          nombre_seances?: number | null
          nombre_taches?: number | null
          progression?: number | null
          statut?: Database["public"]["Enums"]["projet_statut"] | null
          type_evenement?: Database["public"]["Enums"]["type_evenement"] | null
          type_production?:
            | Database["public"]["Enums"]["type_production"]
            | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projets_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projets_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_dashboard_chef"
            referencedColumns: ["groupe_id"]
          },
          {
            foreignKeyName: "projets_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_groupes_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rappels: {
        Row: {
          cible_id: string
          cible_type: Database["public"]["Enums"]["rappel_cible_type"]
          created_at: string | null
          date_rappel: string
          est_envoye: boolean | null
          id: string
          message: string | null
          user_id: string
        }
        Insert: {
          cible_id: string
          cible_type: Database["public"]["Enums"]["rappel_cible_type"]
          created_at?: string | null
          date_rappel: string
          est_envoye?: boolean | null
          id?: string
          message?: string | null
          user_id: string
        }
        Update: {
          cible_id?: string
          cible_type?: Database["public"]["Enums"]["rappel_cible_type"]
          created_at?: string | null
          date_rappel?: string
          est_envoye?: boolean | null
          id?: string
          message?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rappels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      repertoire: {
        Row: {
          accords_detectes: Json | null
          analyse_job_id: string | null
          arrangeur: string | null
          audio_reference_url: string | null
          avancement: number
          compositeur: string | null
          created_at: string | null
          duree_minutes: number | null
          genre: string | null
          id: string
          notes: string | null
          ordre_setlist: number | null
          partition_url: string | null
          projet_id: string | null
          tempo: number | null
          titre_morceau: string
          tonalite: string | null
          updated_at: string | null
        }
        Insert: {
          accords_detectes?: Json | null
          analyse_job_id?: string | null
          arrangeur?: string | null
          audio_reference_url?: string | null
          avancement?: number
          compositeur?: string | null
          created_at?: string | null
          duree_minutes?: number | null
          genre?: string | null
          id?: string
          notes?: string | null
          ordre_setlist?: number | null
          partition_url?: string | null
          projet_id?: string | null
          tempo?: number | null
          titre_morceau: string
          tonalite?: string | null
          updated_at?: string | null
        }
        Update: {
          accords_detectes?: Json | null
          analyse_job_id?: string | null
          arrangeur?: string | null
          audio_reference_url?: string | null
          avancement?: number
          compositeur?: string | null
          created_at?: string | null
          duree_minutes?: number | null
          genre?: string | null
          id?: string
          notes?: string | null
          ordre_setlist?: number | null
          partition_url?: string | null
          projet_id?: string | null
          tempo?: number | null
          titre_morceau?: string
          tonalite?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_repertoire_analyse_job"
            columns: ["analyse_job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_repertoire_analyse_job"
            columns: ["analyse_job_id"]
            isOneToOne: false
            referencedRelation: "vue_ai_jobs_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repertoire_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          annulee_par: string | null
          caution: number | null
          client_id: string | null
          quantite: number
          service_id: string | null
          commission_plateforme: number | null
          created_at: string | null
          date_annulation: string | null
          date_debut: string
          date_fin: string
          devise: Database["public"]["Enums"]["devise"] | null
          duree_heures: number | null
          equipements_supplementaires: string[] | null
          groupe_id: string | null
          id: string
          nombre_personnes: number | null
          notes_client: string | null
          paiement_statut: Database["public"]["Enums"]["paiement_statut"] | null
          prix_total: number
          raison_annulation: string | null
          statut: string | null
          studio_id: string | null
          updated_at: string | null
        }
        Insert: {
          annulee_par?: string | null
          caution?: number | null
          client_id?: string | null
          commission_plateforme?: number | null
          quantite?: number
          service_id?: string | null
          created_at?: string | null
          date_annulation?: string | null
          date_debut: string
          date_fin: string
          devise?: Database["public"]["Enums"]["devise"] | null
          duree_heures?: number | null
          equipements_supplementaires?: string[] | null
          groupe_id?: string | null
          id?: string
          nombre_personnes?: number | null
          notes_client?: string | null
          paiement_statut?:
            | Database["public"]["Enums"]["paiement_statut"]
            | null
          prix_total: number
          raison_annulation?: string | null
          statut?: string | null
          studio_id?: string | null
          updated_at?: string | null
        }
        Update: {
          annulee_par?: string | null
          caution?: number | null
          client_id?: string | null
          commission_plateforme?: number | null
          quantite?: number
          service_id?: string | null
          created_at?: string | null
          date_annulation?: string | null
          date_debut?: string
          date_fin?: string
          devise?: Database["public"]["Enums"]["devise"] | null
          duree_heures?: number | null
          equipements_supplementaires?: string[] | null
          groupe_id?: string | null
          id?: string
          nombre_personnes?: number | null
          notes_client?: string | null
          paiement_statut?:
            | Database["public"]["Enums"]["paiement_statut"]
            | null
          prix_total?: number
          raison_annulation?: string | null
          statut?: string | null
          studio_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_annulee_par_fkey"
            columns: ["annulee_par"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_dashboard_chef"
            referencedColumns: ["groupe_id"]
          },
          {
            foreignKeyName: "reservations_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_groupes_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      ressources: {
        Row: {
          created_at: string | null
          description: string | null
          duree_secondes: number | null
          dossier_id: string | null
          format: string | null
          id: string
          nom: string
          nombre_telechargements: number | null
          nombre_vues: number | null
          partage_groupe_id: string | null
          partage_membre_id: string | null
          partage_projet_id: string | null
          partage_role_id: string | null
          partage_type: Database["public"]["Enums"]["partage_type"]
          partage_user_id: string | null
          seance_id: string | null
          taille_bytes: number | null
          type: Database["public"]["Enums"]["ressource_type"]
          updated_at: string | null
          uploaded_by: string | null
          url: string
          visibilite: Database["public"]["Enums"]["ressource_visibilite"]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dossier_id?: string | null
          duree_secondes?: number | null
          format?: string | null
          id?: string
          nom: string
          nombre_telechargements?: number | null
          nombre_vues?: number | null
          partage_groupe_id?: string | null
          partage_membre_id?: string | null
          partage_projet_id?: string | null
          partage_role_id?: string | null
          partage_type: Database["public"]["Enums"]["partage_type"]
          partage_user_id?: string | null
          seance_id?: string | null
          taille_bytes?: number | null
          type: Database["public"]["Enums"]["ressource_type"]
          updated_at?: string | null
          uploaded_by?: string | null
          url: string
          visibilite?: Database["public"]["Enums"]["ressource_visibilite"]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duree_secondes?: number | null
          dossier_id?: string | null
          format?: string | null
          id?: string
          nom?: string
          nombre_telechargements?: number | null
          nombre_vues?: number | null
          partage_groupe_id?: string | null
          partage_membre_id?: string | null
          partage_projet_id?: string | null
          partage_role_id?: string | null
          partage_type?: Database["public"]["Enums"]["partage_type"]
          partage_user_id?: string | null
          seance_id?: string | null
          taille_bytes?: number | null
          type?: Database["public"]["Enums"]["ressource_type"]
          updated_at?: string | null
          uploaded_by?: string | null
          url?: string
          visibilite?: Database["public"]["Enums"]["ressource_visibilite"]
        }
        Relationships: [
          {
            foreignKeyName: "ressources_partage_groupe_id_fkey"
            columns: ["partage_groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressources_partage_groupe_id_fkey"
            columns: ["partage_groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_dashboard_chef"
            referencedColumns: ["groupe_id"]
          },
          {
            foreignKeyName: "ressources_partage_groupe_id_fkey"
            columns: ["partage_groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_groupes_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressources_partage_membre_id_fkey"
            columns: ["partage_membre_id"]
            isOneToOne: false
            referencedRelation: "groupe_membres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressources_partage_projet_id_fkey"
            columns: ["partage_projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressources_partage_role_id_fkey"
            columns: ["partage_role_id"]
            isOneToOne: false
            referencedRelation: "roles_pupitres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressources_partage_user_id_fkey"
            columns: ["partage_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressources_seance_id_fkey"
            columns: ["seance_id"]
            isOneToOne: false
            referencedRelation: "seances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ressources_traitees: {
        Row: {
          ai_job_id: string | null
          cout_traitement: number | null
          created_at: string | null
          format: string | null
          id: string
          nom_piste: string | null
          parametres: Json | null
          ressource_originale_id: string | null
          taille_bytes: number | null
          traite_par: string | null
          type_traitement: Database["public"]["Enums"]["traitement_type"]
          url: string
        }
        Insert: {
          ai_job_id?: string | null
          cout_traitement?: number | null
          created_at?: string | null
          format?: string | null
          id?: string
          nom_piste?: string | null
          parametres?: Json | null
          ressource_originale_id?: string | null
          taille_bytes?: number | null
          traite_par?: string | null
          type_traitement: Database["public"]["Enums"]["traitement_type"]
          url: string
        }
        Update: {
          ai_job_id?: string | null
          cout_traitement?: number | null
          created_at?: string | null
          format?: string | null
          id?: string
          nom_piste?: string | null
          parametres?: Json | null
          ressource_originale_id?: string | null
          taille_bytes?: number | null
          traite_par?: string | null
          type_traitement?: Database["public"]["Enums"]["traitement_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ressources_traitees_job"
            columns: ["ai_job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ressources_traitees_job"
            columns: ["ai_job_id"]
            isOneToOne: false
            referencedRelation: "vue_ai_jobs_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ressources_traitees_ressource_originale_id_fkey"
            columns: ["ressource_originale_id"]
            isOneToOne: false
            referencedRelation: "ressources"
            referencedColumns: ["id"]
          },
        ]
      }
      revenus_plateforme: {
        Row: {
          annee: number | null
          created_at: string | null
          date_transaction: string
          devise: Database["public"]["Enums"]["devise"] | null
          id: string
          mois: number | null
          montant: number
          paiement_id: string | null
          source: string
        }
        Insert: {
          annee?: number | null
          created_at?: string | null
          date_transaction: string
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          mois?: number | null
          montant: number
          paiement_id?: string | null
          source: string
        }
        Update: {
          annee?: number | null
          created_at?: string | null
          date_transaction?: string
          devise?: Database["public"]["Enums"]["devise"] | null
          id?: string
          mois?: number | null
          montant?: number
          paiement_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenus_plateforme_paiement_id_fkey"
            columns: ["paiement_id"]
            isOneToOne: false
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
        ]
      }
      roles_pupitres: {
        Row: {
          couleur: string | null
          created_at: string | null
          description: string | null
          groupe_id: string | null
          id: string
          nom: string
          ordre: number | null
        }
        Insert: {
          couleur?: string | null
          created_at?: string | null
          description?: string | null
          groupe_id?: string | null
          id?: string
          nom: string
          ordre?: number | null
        }
        Update: {
          couleur?: string | null
          created_at?: string | null
          description?: string | null
          groupe_id?: string | null
          id?: string
          nom?: string
          ordre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_pupitres_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_pupitres_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_dashboard_chef"
            referencedColumns: ["groupe_id"]
          },
          {
            foreignKeyName: "roles_pupitres_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_groupes_complets"
            referencedColumns: ["id"]
          },
        ]
      }
      seance_enregistrements: {
        Row: {
          created_at: string | null
          duree_secondes: number | null
          id: string
          seance_id: string
          titre: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          duree_secondes?: number | null
          id?: string
          seance_id: string
          titre?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          duree_secondes?: number | null
          id?: string
          seance_id?: string
          titre?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "seance_enregistrements_seance_id_fkey"
            columns: ["seance_id"]
            isOneToOne: false
            referencedRelation: "seances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seance_enregistrements_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seance_notes: {
        Row: {
          audio_url: string | null
          contenu: string | null
          created_at: string | null
          id: string
          seance_id: string
          timestamp_secondes: number | null
          type: Database["public"]["Enums"]["note_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          contenu?: string | null
          created_at?: string | null
          id?: string
          seance_id: string
          timestamp_secondes?: number | null
          type?: Database["public"]["Enums"]["note_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          contenu?: string | null
          created_at?: string | null
          id?: string
          seance_id?: string
          timestamp_secondes?: number | null
          type?: Database["public"]["Enums"]["note_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seance_notes_seance_id_fkey"
            columns: ["seance_id"]
            isOneToOne: false
            referencedRelation: "seances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seance_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seance_setlist: {
        Row: {
          created_at: string | null
          duree_minutes: number | null
          id: string
          ordre: number
          repertoire_id: string | null
          seance_id: string
          tempo: number | null
          titre: string
          tonalite: string | null
        }
        Insert: {
          created_at?: string | null
          duree_minutes?: number | null
          id?: string
          ordre?: number
          repertoire_id?: string | null
          seance_id: string
          tempo?: number | null
          titre: string
          tonalite?: string | null
        }
        Update: {
          created_at?: string | null
          duree_minutes?: number | null
          id?: string
          ordre?: number
          repertoire_id?: string | null
          seance_id?: string
          tempo?: number | null
          titre?: string
          tonalite?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seance_setlist_repertoire_id_fkey"
            columns: ["repertoire_id"]
            isOneToOne: false
            referencedRelation: "repertoire"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seance_setlist_seance_id_fkey"
            columns: ["seance_id"]
            isOneToOne: false
            referencedRelation: "seances"
            referencedColumns: ["id"]
          },
        ]
      }
      seances: {
        Row: {
          compte_rendu: string | null
          created_at: string | null
          date_seance: string
          description: string | null
          duree_minutes: number | null
          enregistrement_url: string | null
          groupe_id: string | null
          heure_debut: string
          heure_fin: string
          id: string
          lieu: string | null
          presence_obligatoire: boolean | null
          programme: string | null
          projet_id: string | null
          reservation_id: string | null
          roles_concernes: string[] | null
          statut: Database["public"]["Enums"]["seance_statut"] | null
          titre: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          compte_rendu?: string | null
          created_at?: string | null
          date_seance: string
          description?: string | null
          duree_minutes?: number | null
          enregistrement_url?: string | null
          groupe_id?: string | null
          heure_debut: string
          heure_fin: string
          id?: string
          lieu?: string | null
          presence_obligatoire?: boolean | null
          programme?: string | null
          projet_id?: string | null
          reservation_id?: string | null
          roles_concernes?: string[] | null
          statut?: Database["public"]["Enums"]["seance_statut"] | null
          titre?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          compte_rendu?: string | null
          created_at?: string | null
          date_seance?: string
          description?: string | null
          duree_minutes?: number | null
          enregistrement_url?: string | null
          groupe_id?: string | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          lieu?: string | null
          presence_obligatoire?: boolean | null
          programme?: string | null
          projet_id?: string | null
          reservation_id?: string | null
          roles_concernes?: string[] | null
          statut?: Database["public"]["Enums"]["seance_statut"] | null
          titre?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seances_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "groupes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seances_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_dashboard_chef"
            referencedColumns: ["groupe_id"]
          },
          {
            foreignKeyName: "seances_groupe_id_fkey"
            columns: ["groupe_id"]
            isOneToOne: false
            referencedRelation: "vue_groupes_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seances_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seances_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seances_presences: {
        Row: {
          created_at: string | null
          heure_arrivee: string | null
          id: string
          membre_id: string | null
          notes: string | null
          seance_id: string | null
          statut: Database["public"]["Enums"]["presence_statut"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          heure_arrivee?: string | null
          id?: string
          membre_id?: string | null
          notes?: string | null
          seance_id?: string | null
          statut?: Database["public"]["Enums"]["presence_statut"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          heure_arrivee?: string | null
          id?: string
          membre_id?: string | null
          notes?: string | null
          seance_id?: string | null
          statut?: Database["public"]["Enums"]["presence_statut"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seances_presences_membre_id_fkey"
            columns: ["membre_id"]
            isOneToOne: false
            referencedRelation: "groupe_membres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seances_presences_seance_id_fkey"
            columns: ["seance_id"]
            isOneToOne: false
            referencedRelation: "seances"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_services: {
        Row: {
          actif: boolean
          est_vedette: boolean
          created_at: string | null
          id: string
          prix: number
          studio_id: string
          type_service: Database["public"]["Enums"]["studio_service_type"]
          unite: Database["public"]["Enums"]["service_unite"]
        }
        Insert: {
          actif?: boolean
          created_at?: string | null
          est_vedette?: boolean
          id?: string
          prix: number
          studio_id: string
          type_service: Database["public"]["Enums"]["studio_service_type"]
          unite: Database["public"]["Enums"]["service_unite"]
        }
        Update: {
          actif?: boolean
          created_at?: string | null
          est_vedette?: boolean
          id?: string
          prix?: number
          studio_id?: string
          type_service?: Database["public"]["Enums"]["studio_service_type"]
          unite?: Database["public"]["Enums"]["service_unite"]
        }
        Relationships: [
          {
            foreignKeyName: "studio_services_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          adresse: string
          capacite_personnes: number | null
          caution: number | null
          created_at: string | null
          description: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          equipements: string[] | null
          est_actif: boolean | null
          est_verifie: boolean | null
          horaires_ouverture: Json | null
          id: string
          jours_fermeture: string[] | null
          latitude: number | null
          longitude: number | null
          nom: string
          nombre_avis: number | null
          nombre_reservations: number | null
          note_moyenne: number | null
          pays: string | null
          photos_urls: string[] | null
          proprietaire_id: string | null
          services: string[] | null
          surface_m2: number | null
          tarif_demi_journee: number | null
          tarif_heure: number | null
          tarif_journee: number | null
          type_studio: Database["public"]["Enums"]["studio_type"] | null
          updated_at: string | null
          video_visite_url: string | null
          ville: string
        }
        Insert: {
          adresse: string
          capacite_personnes?: number | null
          caution?: number | null
          created_at?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          equipements?: string[] | null
          est_actif?: boolean | null
          est_verifie?: boolean | null
          horaires_ouverture?: Json | null
          id?: string
          jours_fermeture?: string[] | null
          latitude?: number | null
          longitude?: number | null
          nom: string
          nombre_avis?: number | null
          nombre_reservations?: number | null
          note_moyenne?: number | null
          pays?: string | null
          photos_urls?: string[] | null
          proprietaire_id?: string | null
          services?: string[] | null
          surface_m2?: number | null
          tarif_demi_journee?: number | null
          tarif_heure?: number | null
          tarif_journee?: number | null
          type_studio?: Database["public"]["Enums"]["studio_type"] | null
          updated_at?: string | null
          video_visite_url?: string | null
          ville: string
        }
        Update: {
          adresse?: string
          capacite_personnes?: number | null
          caution?: number | null
          created_at?: string | null
          description?: string | null
          devise?: Database["public"]["Enums"]["devise"] | null
          equipements?: string[] | null
          est_actif?: boolean | null
          est_verifie?: boolean | null
          horaires_ouverture?: Json | null
          id?: string
          jours_fermeture?: string[] | null
          latitude?: number | null
          longitude?: number | null
          nom?: string
          nombre_avis?: number | null
          nombre_reservations?: number | null
          note_moyenne?: number | null
          pays?: string | null
          photos_urls?: string[] | null
          proprietaire_id?: string | null
          services?: string[] | null
          surface_m2?: number | null
          tarif_demi_journee?: number | null
          tarif_heure?: number | null
          tarif_journee?: number | null
          type_studio?: Database["public"]["Enums"]["studio_type"] | null
          updated_at?: string | null
          video_visite_url?: string | null
          ville?: string
        }
        Relationships: [
          {
            foreignKeyName: "studios_proprietaire_id_fkey"
            columns: ["proprietaire_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      taches: {
        Row: {
          assignation_membre_id: string | null
          assignation_role_id: string | null
          assignation_type: Database["public"]["Enums"]["assignation_type"]
          completee_par: string | null
          created_at: string | null
          creee_par: string | null
          date_completion: string | null
          date_echeance: string | null
          description: string | null
          id: string
          priorite: Database["public"]["Enums"]["priorite"] | null
          projet_id: string | null
          statut: Database["public"]["Enums"]["tache_statut"] | null
          titre: string
          updated_at: string | null
        }
        Insert: {
          assignation_membre_id?: string | null
          assignation_role_id?: string | null
          assignation_type: Database["public"]["Enums"]["assignation_type"]
          completee_par?: string | null
          created_at?: string | null
          creee_par?: string | null
          date_completion?: string | null
          date_echeance?: string | null
          description?: string | null
          id?: string
          priorite?: Database["public"]["Enums"]["priorite"] | null
          projet_id?: string | null
          statut?: Database["public"]["Enums"]["tache_statut"] | null
          titre: string
          updated_at?: string | null
        }
        Update: {
          assignation_membre_id?: string | null
          assignation_role_id?: string | null
          assignation_type?: Database["public"]["Enums"]["assignation_type"]
          completee_par?: string | null
          created_at?: string | null
          creee_par?: string | null
          date_completion?: string | null
          date_echeance?: string | null
          description?: string | null
          id?: string
          priorite?: Database["public"]["Enums"]["priorite"] | null
          projet_id?: string | null
          statut?: Database["public"]["Enums"]["tache_statut"] | null
          titre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taches_assignation_membre_id_fkey"
            columns: ["assignation_membre_id"]
            isOneToOne: false
            referencedRelation: "groupe_membres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taches_assignation_role_id_fkey"
            columns: ["assignation_role_id"]
            isOneToOne: false
            referencedRelation: "roles_pupitres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taches_completee_par_fkey"
            columns: ["completee_par"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taches_creee_par_fkey"
            columns: ["creee_par"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taches_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
        ]
      }
      tags_globaux: {
        Row: {
          created_at: string | null
          id: string
          nom: string
          type: string | null
          usage_forum: number | null
          usage_masterclass: number | null
          usage_produits: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nom: string
          type?: string | null
          usage_forum?: number | null
          usage_masterclass?: number | null
          usage_produits?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nom?: string
          type?: string | null
          usage_forum?: number | null
          usage_masterclass?: number | null
          usage_produits?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          annees_experience: number | null
          avatar_url: string | null
          badges_forum: string[] | null
          bio: string | null
          certifications: string[] | null
          created_at: string | null
          date_naissance: string | null
          devise_preferee: Database["public"]["Enums"]["devise"] | null
          email: string
          est_verifie: boolean | null
          genres_musicaux: string[] | null
          id: string
          instruments: string[] | null
          is_active: boolean | null
          is_deleted: boolean | null
          langue: string | null
          last_login: string | null
          niveau_global: Database["public"]["Enums"]["niveau"] | null
          nom: string | null
          notifications_email: boolean | null
          notifications_push: boolean | null
          pays: string | null
          prenom: string | null
          reputation_forum: number | null
          specialites: string[] | null
          telephone: string | null
          type: Database["public"]["Enums"]["user_type"]
          updated_at: string | null
          ville: string | null
        }
        Insert: {
          annees_experience?: number | null
          avatar_url?: string | null
          badges_forum?: string[] | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string | null
          date_naissance?: string | null
          devise_preferee?: Database["public"]["Enums"]["devise"] | null
          email: string
          est_verifie?: boolean | null
          genres_musicaux?: string[] | null
          id: string
          instruments?: string[] | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          langue?: string | null
          last_login?: string | null
          niveau_global?: Database["public"]["Enums"]["niveau"] | null
          nom?: string | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          pays?: string | null
          prenom?: string | null
          reputation_forum?: number | null
          specialites?: string[] | null
          telephone?: string | null
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string | null
          ville?: string | null
        }
        Update: {
          annees_experience?: number | null
          avatar_url?: string | null
          badges_forum?: string[] | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string | null
          date_naissance?: string | null
          devise_preferee?: Database["public"]["Enums"]["devise"] | null
          email?: string
          est_verifie?: boolean | null
          genres_musicaux?: string[] | null
          id?: string
          instruments?: string[] | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          langue?: string | null
          last_login?: string | null
          niveau_global?: Database["public"]["Enums"]["niveau"] | null
          nom?: string | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          pays?: string | null
          prenom?: string | null
          reputation_forum?: number | null
          specialites?: string[] | null
          telephone?: string | null
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          ai_job_id: string | null
          created_at: string | null
          credits: number
          description: string | null
          id: string
          pack_id: string | null
          paiement_id: string | null
          solde_apres: number
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_id: string | null
        }
        Insert: {
          ai_job_id?: string | null
          created_at?: string | null
          credits: number
          description?: string | null
          id?: string
          pack_id?: string | null
          paiement_id?: string | null
          solde_apres: number
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_id?: string | null
        }
        Update: {
          ai_job_id?: string | null
          created_at?: string | null
          credits?: number
          description?: string | null
          id?: string
          pack_id?: string | null
          paiement_id?: string | null
          solde_apres?: number
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_wallet_transactions_job"
            columns: ["ai_job_id"]
            isOneToOne: false
            referencedRelation: "ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wallet_transactions_job"
            columns: ["ai_job_id"]
            isOneToOne: false
            referencedRelation: "vue_ai_jobs_complets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "credit_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_paiement_id_fkey"
            columns: ["paiement_id"]
            isOneToOne: false
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          created_at: string | null
          id: string
          solde_credits: number | null
          total_achete: number | null
          total_bonus: number | null
          total_depense: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          solde_credits?: number | null
          total_achete?: number | null
          total_bonus?: number | null
          total_depense?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          solde_credits?: number | null
          total_achete?: number | null
          total_bonus?: number | null
          total_depense?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vue_ai_couts_marge: {
        Row: {
          mois: string | null
          nombre_jobs: number | null
          statut: Database["public"]["Enums"]["ai_job_statut"] | null
          total_cout_api: number | null
          total_credits_factures: number | null
          type: Database["public"]["Enums"]["ai_job_type"] | null
        }
        Relationships: []
      }
      vue_ai_jobs_complets: {
        Row: {
          code_erreur: string | null
          completed_at: string | null
          cout_api_reel: number | null
          created_at: string | null
          credits_cout: number | null
          id: string | null
          input_fichier_url: string | null
          input_params: Json | null
          message_erreur: string | null
          progression_pct: number | null
          projet_id: string | null
          provider: string | null
          provider_job_id: string | null
          ressource_id: string | null
          resultat: Json | null
          resultats: Json | null
          started_at: string | null
          statut: Database["public"]["Enums"]["ai_job_statut"] | null
          tentatives: number | null
          type: Database["public"]["Enums"]["ai_job_type"] | null
          updated_at: string | null
          user_id: string | null
          worker_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_jobs_ressource_id_fkey"
            columns: ["ressource_id"]
            isOneToOne: false
            referencedRelation: "ressources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vue_calendrier_groupe: {
        Row: {
          cible_id: string | null
          date_debut: string | null
          date_fin: string | null
          groupe_id: string | null
          lieu: string | null
          seance_id: string | null
          titre: string | null
          type_calendrier: string | null
        }
        Relationships: []
      }
      vue_dashboard_chef: {
        Row: {
          groupe_id: string | null
          membres_actifs: number | null
          nom_groupe: string | null
          nouveaux_messages_7j: number | null
          projets_en_cours: number | null
          seances_a_venir: number | null
          taches_actives: number | null
        }
        Relationships: []
      }
      vue_groupes_complets: {
        Row: {
          accepte_nouveaux_membres: boolean | null
          avatar_chef: string | null
          chef_id: string | null
          created_at: string | null
          description: string | null
          est_prive: boolean | null
          genre_musical: string | null
          id: string | null
          is_active: boolean | null
          nom: string | null
          nom_chef: string | null
          nombre_membres: number | null
          nombre_membres_actifs: number | null
          nombre_projets: number | null
          nombre_projets_actifs: number | null
          nombre_seances: number | null
          nombre_seances_planifiees: number | null
          pays: string | null
          photo_url: string | null
          type_groupe: Database["public"]["Enums"]["groupe_type"] | null
          updated_at: string | null
          video_presentation_url: string | null
          ville: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groupes_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vue_marketplace_catalogue: {
        Row: {
          ai_creation_id: string | null
          avatar_vendeur: string | null
          categorie: string | null
          commission_plateforme_pct: number | null
          compatible_daw: string[] | null
          conditions_utilisation: string | null
          created_at: string | null
          date_debut_promo: string | null
          date_fin_promo: string | null
          date_publication: string | null
          description: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          fichier_preview_url: string | null
          formats_fichiers: string[] | null
          id: string | null
          image_couverture: string | null
          licence: Database["public"]["Enums"]["licence_type"] | null
          nom_vendeur: string | null
          nombre_avis: number | null
          nombre_fichiers: number | null
          nombre_ventes: number | null
          nombre_vues: number | null
          note_moyenne: number | null
          prix: number | null
          prix_actuel: number | null
          prix_promo: number | null
          statut: Database["public"]["Enums"]["produit_statut"] | null
          tags: string[] | null
          taille_totale_mb: number | null
          titre: string | null
          type_produit: Database["public"]["Enums"]["produit_type"] | null
          updated_at: string | null
          vendeur_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_marketplace_produits_creation"
            columns: ["ai_creation_id"]
            isOneToOne: false
            referencedRelation: "ai_creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_produits_vendeur_id_fkey"
            columns: ["vendeur_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vue_masterclass_catalogue: {
        Row: {
          avatar_formateur: string | null
          categorie: string | null
          commission_plateforme_pct: number | null
          created_at: string | null
          date_debut_promo: string | null
          date_fin_promo: string | null
          date_publication: string | null
          description: string | null
          devise: Database["public"]["Enums"]["devise"] | null
          duree_totale_minutes: number | null
          formateur_id: string | null
          formateur_verifie: boolean | null
          id: string | null
          image_couverture: string | null
          langue: string | null
          niveau: Database["public"]["Enums"]["niveau"] | null
          nom_formateur: string | null
          nombre_avis: number | null
          nombre_completions: number | null
          nombre_inscrits: number | null
          nombre_ressources: number | null
          nombre_videos: number | null
          note_moyenne: number | null
          objectifs: string | null
          prerequis: string | null
          prix: number | null
          prix_actuel: number | null
          prix_promo: number | null
          sous_categorie: string | null
          statut: Database["public"]["Enums"]["masterclass_statut"] | null
          tags: string[] | null
          titre: string | null
          updated_at: string | null
          video_trailer_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "masterclass_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      a_achete_produit: { Args: { p_produit_id: string }; Returns: boolean }
      a_le_role_dans_groupe: { Args: { p_role_id: string }; Returns: boolean }
      ajouter_enregistrement_seance: {
        Args: {
          p_duree_secondes?: number
          p_seance_id: string
          p_titre?: string
          p_url: string
        }
        Returns: Json
      }
      ajouter_morceau_projet: {
        Args: {
          p_arrangeur?: string
          p_compositeur?: string
          p_duree_minutes?: number
          p_genre?: string
          p_ordre_setlist?: number
          p_projet_id: string
          p_tempo?: number
          p_titre_morceau: string
          p_tonalite?: string
        }
        Returns: Json
      }
      ajouter_morceau_setlist: {
        Args: {
          p_duree_minutes?: number
          p_ordre?: number
          p_repertoire_id?: string
          p_seance_id: string
          p_titre: string
        }
        Returns: Json
      }
      ajouter_note_seance: {
        Args: {
          p_audio_url?: string
          p_contenu?: string
          p_seance_id: string
          p_timestamp_secondes?: number
          p_type?: Database["public"]["Enums"]["note_type"]
        }
        Returns: Json
      }
      crediter_wallet: {
        Args: {
          p_credits: number
          p_description?: string
          p_pack_id?: string
          p_paiement_id?: string
          p_type: Database["public"]["Enums"]["wallet_transaction_type"]
          p_user_id: string
        }
        Returns: number
      }
      creer_ai_job: {
        Args: {
          p_input_fichier_url?: string
          p_input_params?: Json
          p_projet_id?: string
          p_ressource_id?: string
          p_type: Database["public"]["Enums"]["ai_job_type"]
          p_user_id: string
        }
        Returns: string
      }
      creer_projet: {
        Args: {
          p_affiche_url?: string
          p_categorie: Database["public"]["Enums"]["projet_categorie"]
          p_date_debut?: string
          p_date_fin?: string
          p_date_realisation?: string
          p_description?: string
          p_groupe_id?: string
          p_lieu_evenement?: string
          p_nom: string
          p_type_evenement?: Database["public"]["Enums"]["type_evenement"]
          p_type_production?: Database["public"]["Enums"]["type_production"]
        }
        Returns: Json
      }
      creer_rappel: {
        Args: {
          p_cible_id: string
          p_cible_type: Database["public"]["Enums"]["rappel_cible_type"]
          p_date_rappel: string
          p_message?: string
        }
        Returns: Json
      }
      creer_seance: {
        Args: {
          p_date_seance: string
          p_description?: string
          p_groupe_id?: string
          p_heure_debut: string
          p_heure_fin: string
          p_lieu?: string
          p_presence_obligatoire?: boolean
          p_projet_id?: string
          p_roles_concernes?: string[]
          p_titre?: string
        }
        Returns: Json
      }
      est_admin_plateforme: { Args: never; Returns: boolean }
      est_chef_groupe: { Args: { p_groupe_id: string }; Returns: boolean }
      est_chef_ou_admin_du_projet: {
        Args: { p_projet_id: string }
        Returns: boolean
      }
      est_chef_ou_admin_groupe: {
        Args: { p_groupe_id: string }
        Returns: boolean
      }
      est_formateur_du_module: {
        Args: { p_module_id: string }
        Returns: boolean
      }
      est_formateur_masterclass: {
        Args: { p_masterclass_id: string }
        Returns: boolean
      }
      est_gestionnaire_seance: {
        Args: { p_seance_id: string }
        Returns: boolean
      }
      est_inscrit_masterclass: {
        Args: { p_masterclass_id: string }
        Returns: boolean
      }
      est_le_membre: { Args: { p_membre_id: string }; Returns: boolean }
      est_membre_du_projet: { Args: { p_projet_id: string }; Returns: boolean }
      est_membre_groupe: { Args: { p_groupe_id: string }; Returns: boolean }
      est_membre_pupitre: { Args: { p_pupitre_id: string }; Returns: boolean }
      generer_code_invitation: { Args: { p_groupe_id: string }; Returns: Json }
      rejoindre_par_code: { Args: { p_code: string }; Returns: Json }
      retirer_invitation: { Args: { p_invitation_id: string }; Returns: Json }
      maj_avancement_morceau: {
        Args: { p_avancement: number; p_morceau_id: string }
        Returns: Json
      }
      maj_presence: {
        Args: {
          p_heure_arrivee?: string
          p_notes?: string
          p_presence_id: string
          p_statut: Database["public"]["Enums"]["presence_statut"]
        }
        Returns: Json
      }
      modifier_projet: {
        Args: {
          p_affiche_url?: string
          p_categorie?: Database["public"]["Enums"]["projet_categorie"]
          p_date_debut?: string
          p_date_fin?: string
          p_date_realisation?: string
          p_description?: string
          p_lieu_evenement?: string
          p_nom?: string
          p_projet_id: string
          p_type_evenement?: Database["public"]["Enums"]["type_evenement"]
          p_type_production?: Database["public"]["Enums"]["type_production"]
        }
        Returns: Json
      }
      nommer_admin: {
        Args: { p_est_admin?: boolean; p_membre_id: string }
        Returns: Json
      }
      peut_voir_ressource: {
        Args: { r: Database["public"]["Tables"]["ressources"]["Row"] }
        Returns: boolean
      }
      peut_voir_seance: { Args: { p_seance_id: string }; Returns: boolean }
      rembourser_ai_job: { Args: { p_job_id: string }; Returns: boolean }
      reponse_erreur: { Args: { p_message: string }; Returns: Json }
      reponse_succes: {
        Args: { p_data?: Json; p_message: string }
        Returns: Json
      }
      rsvp_seance: {
        Args: {
          p_heure_arrivee?: string
          p_seance_id: string
          p_statut: Database["public"]["Enums"]["presence_statut"]
        }
        Returns: Json
      }
      statistiques_presences_groupe: {
        Args: { p_groupe_id: string }
        Returns: Json
      }
      statistiques_presences_membre: {
        Args: { p_membre_id: string }
        Returns: Json
      }
      supprimer_enregistrement_seance: {
        Args: { p_enregistrement_id: string }
        Returns: Json
      }
      supprimer_note_seance: { Args: { p_note_id: string }; Returns: Json }
      supprimer_projet: { Args: { p_projet_id: string }; Returns: Json }
    }
    Enums: {
      ai_creation_statut: "privee" | "publique" | "archivee"
      bibliotheque_type:
        | "contrat"
        | "loop"
        | "style"
        | "backing_track"
        | "partition"
        | "opportunite"
      ai_job_statut:
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      ai_job_type:
        | "generation_musique"
        | "generation_musique_paroles"
        | "generation_instrumental"
        | "generation_paroles"
        | "cover_ia"
        | "extension_morceau"
        | "cover_art"
        | "separation_stems"
        | "pitch_change"
        | "time_stretch"
        | "detection_accords"
        | "analyse_bpm_tonalite"
        | "audio_vers_midi"
        | "mastering"
      assignation_type: "membre" | "role"
      devise: "XOF" | "EUR" | "USD" | "GNF" | "MAD" | "autre"
      forum_statut: "ouverte" | "resolue" | "fermee"
      groupe_type:
        | "orchestre"
        | "choeur"
        | "band"
        | "ensemble"
        | "duo"
        | "autre"
      licence_type:
        | "usage_personnel"
        | "usage_commercial"
        | "royalty_free"
        | "creative_commons"
      masterclass_statut: "brouillon" | "en_review" | "publiee" | "archivee"
      message_type: "texte" | "audio" | "fichier" | "image"
      niveau: "debutant" | "intermediaire" | "avance" | "expert"
      note_type: "texte" | "audio"
      paiement_statut: "pending" | "completed" | "failed" | "refunded"
      partage_type: "groupe" | "role" | "membre" | "projet" | "personnel"
      presence_statut: "en_attente" | "present" | "absent" | "retard" | "excuse"
      priorite: "basse" | "moyenne" | "haute" | "urgente"
      produit_statut: "brouillon" | "en_review" | "publie" | "archive"
      produit_type:
        | "samples"
        | "loops"
        | "presets"
        | "midi"
        | "partitions"
        | "ebook"
        | "template_daw"
        | "cover_art"
        | "autre"
      projet_categorie: "evenement" | "production"
      projet_statut: "en_preparation" | "en_cours" | "termine" | "annule"
      projet_type: "concert" | "album" | "prestation" | "competition" | "autre"
      rappel_cible_type: "projet" | "seance"
      ressource_type:
        | "audio"
        | "video"
        | "pdf"
        | "partition"
        | "image"
        | "autre"
      ressource_visibilite: "publique" | "draft"
      seance_statut: "planifiee" | "en_cours" | "terminee" | "annulee"
      tache_statut: "todo" | "en_cours" | "terminee" | "annulee"
      service_unite: "heure" | "bloc_4h" | "titre"
      studio_service_type:
        | "repetition"
        | "enregistrement"
        | "production_single"
        | "production_album"
        | "mixage"
        | "mastering"
      studio_type: "repetition" | "enregistrement" | "mixte"
      traitement_type:
        | "separation_pistes"
        | "transposition"
        | "tempo_change"
        | "detection_accords"
        | "analyse_bpm_tonalite"
        | "audio_vers_midi"
        | "mastering"
        | "autre"
      type_evenement:
        | "culte"
        | "concert"
        | "showcase"
        | "mariage"
        | "obseques"
        | "ceremonie"
        | "autre"
      type_production: "ep" | "album" | "single" | "autre"
      user_type: "musicien" | "chef_groupe" | "studio" | "formateur" | "admin"
      wallet_transaction_type:
        | "achat"
        | "debit"
        | "remboursement"
        | "bonus"
        | "ajustement_admin"
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
      ai_creation_statut: ["privee", "publique", "archivee"],
      bibliotheque_type: [
        "contrat",
        "loop",
        "style",
        "backing_track",
        "partition",
        "opportunite",
      ],
      ai_job_statut: [
        "queued",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      ai_job_type: [
        "generation_musique",
        "generation_musique_paroles",
        "generation_instrumental",
        "generation_paroles",
        "cover_ia",
        "extension_morceau",
        "cover_art",
        "separation_stems",
        "pitch_change",
        "time_stretch",
        "detection_accords",
        "analyse_bpm_tonalite",
        "audio_vers_midi",
        "mastering",
      ],
      assignation_type: ["membre", "role"],
      devise: ["XOF", "EUR", "USD", "GNF", "MAD", "autre"],
      forum_statut: ["ouverte", "resolue", "fermee"],
      groupe_type: ["orchestre", "choeur", "band", "ensemble", "duo", "autre"],
      licence_type: [
        "usage_personnel",
        "usage_commercial",
        "royalty_free",
        "creative_commons",
      ],
      masterclass_statut: ["brouillon", "en_review", "publiee", "archivee"],
      message_type: ["texte", "audio", "fichier", "image"],
      niveau: ["debutant", "intermediaire", "avance", "expert"],
      note_type: ["texte", "audio"],
      paiement_statut: ["pending", "completed", "failed", "refunded"],
      partage_type: ["groupe", "role", "membre", "projet", "personnel"],
      presence_statut: ["en_attente", "present", "absent", "retard", "excuse"],
      priorite: ["basse", "moyenne", "haute", "urgente"],
      produit_statut: ["brouillon", "en_review", "publie", "archive"],
      produit_type: [
        "samples",
        "loops",
        "presets",
        "midi",
        "partitions",
        "ebook",
        "template_daw",
        "cover_art",
        "autre",
      ],
      projet_categorie: ["evenement", "production"],
      projet_statut: ["en_preparation", "en_cours", "termine", "annule"],
      projet_type: ["concert", "album", "prestation", "competition", "autre"],
      rappel_cible_type: ["projet", "seance"],
      ressource_type: ["audio", "video", "pdf", "partition", "image", "autre"],
      ressource_visibilite: ["publique", "draft"],
      seance_statut: ["planifiee", "en_cours", "terminee", "annulee"],
      tache_statut: ["todo", "en_cours", "terminee", "annulee"],
      service_unite: ["heure", "bloc_4h", "titre"],
      studio_service_type: [
        "repetition",
        "enregistrement",
        "production_single",
        "production_album",
        "mixage",
        "mastering",
      ],
      studio_type: ["repetition", "enregistrement", "mixte"],
      traitement_type: [
        "separation_pistes",
        "transposition",
        "tempo_change",
        "detection_accords",
        "analyse_bpm_tonalite",
        "audio_vers_midi",
        "mastering",
        "autre",
      ],
      type_evenement: [
        "culte",
        "concert",
        "showcase",
        "mariage",
        "obseques",
        "ceremonie",
        "autre",
      ],
      type_production: ["ep", "album", "single", "autre"],
      user_type: ["musicien", "chef_groupe", "studio", "formateur", "admin"],
      wallet_transaction_type: [
        "achat",
        "debit",
        "remboursement",
        "bonus",
        "ajustement_admin",
      ],
    },
  },
} as const
