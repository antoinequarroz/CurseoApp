export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      allergenes: {
        Row: {
          code: string
          id: string
          libelle: string
        }
        Insert: {
          code: string
          id?: string
          libelle: string
        }
        Update: {
          code?: string
          id?: string
          libelle?: string
        }
        Relationships: []
      }
      commandes: {
        Row: {
          created_at: string | null
          economies: number | null
          id: string
          liste_id: string | null
          montant_total: number | null
          paniers: Json | null
          profil_id: string | null
          statut: string | null
        }
        Insert: {
          created_at?: string | null
          economies?: number | null
          id?: string
          liste_id?: string | null
          montant_total?: number | null
          paniers?: Json | null
          profil_id?: string | null
          statut?: string | null
        }
        Update: {
          created_at?: string | null
          economies?: number | null
          id?: string
          liste_id?: string | null
          montant_total?: number | null
          paniers?: Json | null
          profil_id?: string | null
          statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commandes_liste_id_fkey"
            columns: ["liste_id"]
            isOneToOne: false
            referencedRelation: "listes_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils_actifs"
            referencedColumns: ["id"]
          },
        ]
      }
      enseignes: {
        Row: {
          code: string
          id: string
          nom: string
        }
        Insert: {
          code: string
          id?: string
          nom: string
        }
        Update: {
          code?: string
          id?: string
          nom?: string
        }
        Relationships: []
      }
      favoris: {
        Row: {
          profil_id: string
          recette_id: string
        }
        Insert: {
          profil_id: string
          recette_id: string
        }
        Update: {
          profil_id?: string
          recette_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoris_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favoris_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils_actifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favoris_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favoris_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes_a_moderer"
            referencedColumns: ["id"]
          },
        ]
      }
      foyers: {
        Row: {
          created_at: string
          id: string
          responsable_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          responsable_id: string
        }
        Update: {
          created_at?: string
          id?: string
          responsable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foyers_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: true
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foyers_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: true
            referencedRelation: "profils_actifs"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_allergenes: {
        Row: {
          allergene_id: string
          certitude: string
          ingredient_id: string
        }
        Insert: {
          allergene_id: string
          certitude: string
          ingredient_id: string
        }
        Update: {
          allergene_id?: string
          certitude?: string
          ingredient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_allergenes_allergene_id_fkey"
            columns: ["allergene_id"]
            isOneToOne: false
            referencedRelation: "allergenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_allergenes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          created_at: string
          id: string
          nom: string
          rayon: string | null
          unite_defaut: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          rayon?: string | null
          unite_defaut?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          rayon?: string | null
          unite_defaut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_unite_defaut_fkey"
            columns: ["unite_defaut"]
            isOneToOne: false
            referencedRelation: "unites_mesure"
            referencedColumns: ["code"]
          },
        ]
      }
      listes_courses: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          planning_id: string | null
          profil_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items?: Json
          planning_id?: string | null
          profil_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          planning_id?: string | null
          profil_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listes_courses_planning_id_fkey"
            columns: ["planning_id"]
            isOneToOne: false
            referencedRelation: "planning_repas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listes_courses_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listes_courses_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils_actifs"
            referencedColumns: ["id"]
          },
        ]
      }
      membres_foyer: {
        Row: {
          age: number | null
          allergies: string[]
          created_at: string
          est_responsable: boolean
          foyer_id: string
          gouts_frequence_poisson: string | null
          gouts_frequence_viande: string | null
          gouts_produits_favoris: string[]
          id: string
          objectifs: string[]
          prenom: string
          profil_id: string | null
          regime: string[]
        }
        Insert: {
          age?: number | null
          allergies?: string[]
          created_at?: string
          est_responsable?: boolean
          foyer_id: string
          gouts_frequence_poisson?: string | null
          gouts_frequence_viande?: string | null
          gouts_produits_favoris?: string[]
          id?: string
          objectifs?: string[]
          prenom: string
          profil_id?: string | null
          regime?: string[]
        }
        Update: {
          age?: number | null
          allergies?: string[]
          created_at?: string
          est_responsable?: boolean
          foyer_id?: string
          gouts_frequence_poisson?: string | null
          gouts_frequence_viande?: string | null
          gouts_produits_favoris?: string[]
          id?: string
          objectifs?: string[]
          prenom?: string
          profil_id?: string | null
          regime?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "membres_foyer_foyer_id_fkey"
            columns: ["foyer_id"]
            isOneToOne: false
            referencedRelation: "foyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membres_foyer_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: true
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membres_foyer_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: true
            referencedRelation: "profils_actifs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          lue: boolean | null
          message: string
          profil_id: string | null
          titre: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lue?: boolean | null
          message: string
          profil_id?: string | null
          titre: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lue?: boolean | null
          message?: string
          profil_id?: string | null
          titre?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils_actifs"
            referencedColumns: ["id"]
          },
        ]
      }
      offres_magasin: {
        Row: {
          actif: boolean
          code_barre: string | null
          enseigne_id: string
          format: string
          id: string
          produit_canonique_id: string
          quantite: number
          unite: string
        }
        Insert: {
          actif?: boolean
          code_barre?: string | null
          enseigne_id: string
          format: string
          id?: string
          produit_canonique_id: string
          quantite: number
          unite: string
        }
        Update: {
          actif?: boolean
          code_barre?: string | null
          enseigne_id?: string
          format?: string
          id?: string
          produit_canonique_id?: string
          quantite?: number
          unite?: string
        }
        Relationships: [
          {
            foreignKeyName: "offres_magasin_enseigne_id_fkey"
            columns: ["enseigne_id"]
            isOneToOne: false
            referencedRelation: "enseignes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offres_magasin_produit_canonique_id_fkey"
            columns: ["produit_canonique_id"]
            isOneToOne: false
            referencedRelation: "produits_canoniques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offres_magasin_unite_fkey"
            columns: ["unite"]
            isOneToOne: false
            referencedRelation: "unites_mesure"
            referencedColumns: ["code"]
          },
        ]
      }
      planning_repas: {
        Row: {
          created_at: string | null
          id: string
          profil_id: string | null
          repas: Json
          semaine_debut: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profil_id?: string | null
          repas: Json
          semaine_debut: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profil_id?: string | null
          repas?: Json
          semaine_debut?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_repas_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_repas_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils_actifs"
            referencedColumns: ["id"]
          },
        ]
      }
      prix_historique: {
        Row: {
          collecte_le: string
          id: string
          offre_id: string
          prix: number
          prix_unitaire: number
          promotion: string | null
          source: string
        }
        Insert: {
          collecte_le?: string
          id?: string
          offre_id: string
          prix: number
          prix_unitaire: number
          promotion?: string | null
          source: string
        }
        Update: {
          collecte_le?: string
          id?: string
          offre_id?: string
          prix?: number
          prix_unitaire?: number
          promotion?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "prix_historique_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres_magasin"
            referencedColumns: ["id"]
          },
        ]
      }
      produits_canoniques: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string | null
          nom: string
          rayon: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          nom: string
          rayon?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          nom?: string
          rayon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produits_canoniques_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      profils: {
        Row: {
          abonnement: string | null
          allergies: string[] | null
          apparence: string | null
          budget_hebdo: number | null
          cgvu_acceptee_le: string | null
          cgvu_version_acceptee: string | null
          created_at: string | null
          deleted_at: string | null
          enseignes_favorites: string[] | null
          est_admin: boolean | null
          id: string
          nb_enfants: number | null
          nb_personnes: number | null
          notifications_activees: boolean | null
          notifications_bilan: boolean | null
          notifications_budget: boolean | null
          notifications_planning: boolean | null
          notifications_promos: boolean | null
          objectifs: string[] | null
          prenom: string | null
          regime: string[] | null
        }
        Insert: {
          abonnement?: string | null
          allergies?: string[] | null
          apparence?: string | null
          budget_hebdo?: number | null
          cgvu_acceptee_le?: string | null
          cgvu_version_acceptee?: string | null
          created_at?: string | null
          deleted_at?: string | null
          enseignes_favorites?: string[] | null
          est_admin?: boolean | null
          id: string
          nb_enfants?: number | null
          nb_personnes?: number | null
          notifications_activees?: boolean | null
          notifications_bilan?: boolean | null
          notifications_budget?: boolean | null
          notifications_planning?: boolean | null
          notifications_promos?: boolean | null
          objectifs?: string[] | null
          prenom?: string | null
          regime?: string[] | null
        }
        Update: {
          abonnement?: string | null
          allergies?: string[] | null
          apparence?: string | null
          budget_hebdo?: number | null
          cgvu_acceptee_le?: string | null
          cgvu_version_acceptee?: string | null
          created_at?: string | null
          deleted_at?: string | null
          enseignes_favorites?: string[] | null
          est_admin?: boolean | null
          id?: string
          nb_enfants?: number | null
          nb_personnes?: number | null
          notifications_activees?: boolean | null
          notifications_bilan?: boolean | null
          notifications_budget?: boolean | null
          notifications_planning?: boolean | null
          notifications_promos?: boolean | null
          objectifs?: string[] | null
          prenom?: string | null
          regime?: string[] | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          endpoint: string
          requests: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          endpoint: string
          requests?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          endpoint?: string
          requests?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      recette_allergenes: {
        Row: {
          allergene_id: string
          recette_id: string
        }
        Insert: {
          allergene_id: string
          recette_id: string
        }
        Update: {
          allergene_id?: string
          recette_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recette_allergenes_allergene_id_fkey"
            columns: ["allergene_id"]
            isOneToOne: false
            referencedRelation: "allergenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recette_allergenes_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recette_allergenes_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes_a_moderer"
            referencedColumns: ["id"]
          },
        ]
      }
      recette_etapes: {
        Row: {
          id: string
          instruction: string
          numero: number
          recette_id: string
        }
        Insert: {
          id?: string
          instruction: string
          numero: number
          recette_id: string
        }
        Update: {
          id?: string
          instruction?: string
          numero?: number
          recette_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recette_etapes_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recette_etapes_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes_a_moderer"
            referencedColumns: ["id"]
          },
        ]
      }
      recette_ingredients: {
        Row: {
          id: string
          ingredient_id: string
          optionnel: boolean
          ordre: number
          quantite: number
          recette_id: string
          unite: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          optionnel?: boolean
          ordre?: number
          quantite: number
          recette_id: string
          unite: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          optionnel?: boolean
          ordre?: number
          quantite?: number
          recette_id?: string
          unite?: string
        }
        Relationships: [
          {
            foreignKeyName: "recette_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recette_ingredients_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recette_ingredients_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes_a_moderer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recette_ingredients_unite_fkey"
            columns: ["unite"]
            isOneToOne: false
            referencedRelation: "unites_mesure"
            referencedColumns: ["code"]
          },
        ]
      }
      recette_regimes: {
        Row: {
          recette_id: string
          regime_id: string
        }
        Insert: {
          recette_id: string
          regime_id: string
        }
        Update: {
          recette_id?: string
          regime_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recette_regimes_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recette_regimes_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes_a_moderer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recette_regimes_regime_id_fkey"
            columns: ["regime_id"]
            isOneToOne: false
            referencedRelation: "regimes"
            referencedColumns: ["id"]
          },
        ]
      }
      recettes: {
        Row: {
          auteur_id: string | null
          blurhash: string | null
          calories: number | null
          cle_externe: string | null
          cout_estime: number | null
          created_at: string | null
          description: string | null
          difficulte: string | null
          est_communautaire: boolean | null
          glucides_g: number | null
          id: string
          image_url: string | null
          lipides_g: number | null
          portions: number | null
          proteines_g: number | null
          source: string | null
          statut_publication: string
          temps_preparation: number | null
          titre: string
          updated_at: string
        }
        Insert: {
          auteur_id?: string | null
          blurhash?: string | null
          calories?: number | null
          cle_externe?: string | null
          cout_estime?: number | null
          created_at?: string | null
          description?: string | null
          difficulte?: string | null
          est_communautaire?: boolean | null
          glucides_g?: number | null
          id?: string
          image_url?: string | null
          lipides_g?: number | null
          portions?: number | null
          proteines_g?: number | null
          source?: string | null
          statut_publication?: string
          temps_preparation?: number | null
          titre: string
          updated_at?: string
        }
        Update: {
          auteur_id?: string | null
          blurhash?: string | null
          calories?: number | null
          cle_externe?: string | null
          cout_estime?: number | null
          created_at?: string | null
          description?: string | null
          difficulte?: string | null
          est_communautaire?: boolean | null
          glucides_g?: number | null
          id?: string
          image_url?: string | null
          lipides_g?: number | null
          portions?: number | null
          proteines_g?: number | null
          source?: string | null
          statut_publication?: string
          temps_preparation?: number | null
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recettes_auteur_id_fkey"
            columns: ["auteur_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recettes_auteur_id_fkey"
            columns: ["auteur_id"]
            isOneToOne: false
            referencedRelation: "profils_actifs"
            referencedColumns: ["id"]
          },
        ]
      }
      regimes: {
        Row: {
          code: string
          id: string
          libelle: string
        }
        Insert: {
          code: string
          id?: string
          libelle: string
        }
        Update: {
          code?: string
          id?: string
          libelle?: string
        }
        Relationships: []
      }
      regles_fraicheur_prix: {
        Row: {
          description: string
          duree_validite_jours: number
          source: string
        }
        Insert: {
          description: string
          duree_validite_jours: number
          source: string
        }
        Update: {
          description?: string
          duree_validite_jours?: number
          source?: string
        }
        Relationships: []
      }
      signalements: {
        Row: {
          created_at: string | null
          detail: string | null
          id: string
          raison: string
          recette_id: string | null
          signale_par: string | null
          statut: string | null
        }
        Insert: {
          created_at?: string | null
          detail?: string | null
          id?: string
          raison: string
          recette_id?: string | null
          signale_par?: string | null
          statut?: string | null
        }
        Update: {
          created_at?: string | null
          detail?: string | null
          id?: string
          raison?: string
          recette_id?: string | null
          signale_par?: string | null
          statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signalements_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signalements_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes_a_moderer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signalements_signale_par_fkey"
            columns: ["signale_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signalements_signale_par_fkey"
            columns: ["signale_par"]
            isOneToOne: false
            referencedRelation: "profils_actifs"
            referencedColumns: ["id"]
          },
        ]
      }
      swipes: {
        Row: {
          aime: boolean
          created_at: string | null
          profil_id: string
          recette_id: string
        }
        Insert: {
          aime: boolean
          created_at?: string | null
          profil_id: string
          recette_id: string
        }
        Update: {
          aime?: boolean
          created_at?: string | null
          profil_id?: string
          recette_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils_actifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_recette_id_fkey"
            columns: ["recette_id"]
            isOneToOne: false
            referencedRelation: "recettes_a_moderer"
            referencedColumns: ["id"]
          },
        ]
      }
      synonymes_allergenes: {
        Row: {
          allergene_id: string
          id: string
          terme: string
        }
        Insert: {
          allergene_id: string
          id?: string
          terme: string
        }
        Update: {
          allergene_id?: string
          id?: string
          terme?: string
        }
        Relationships: [
          {
            foreignKeyName: "synonymes_allergenes_allergene_id_fkey"
            columns: ["allergene_id"]
            isOneToOne: false
            referencedRelation: "allergenes"
            referencedColumns: ["id"]
          },
        ]
      }
      unites_mesure: {
        Row: {
          code: string
          libelle: string
        }
        Insert: {
          code: string
          libelle: string
        }
        Update: {
          code?: string
          libelle?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      prix_anomalies: {
        Row: {
          collecte_le: string | null
          id: string | null
          offre_id: string | null
          prix: number | null
          prix_unitaire: number | null
          prix_unitaire_precedent: number | null
          variation_extreme: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "prix_historique_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres_magasin"
            referencedColumns: ["id"]
          },
        ]
      }
      prix_courant: {
        Row: {
          collecte_le: string | null
          enseigne_id: string | null
          expire: boolean | null
          format: string | null
          offre_id: string | null
          prix: number | null
          prix_unitaire: number | null
          produit_canonique_id: string | null
          promotion: string | null
          quantite: number | null
          source: string | null
          unite: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offres_magasin_enseigne_id_fkey"
            columns: ["enseigne_id"]
            isOneToOne: false
            referencedRelation: "enseignes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offres_magasin_produit_canonique_id_fkey"
            columns: ["produit_canonique_id"]
            isOneToOne: false
            referencedRelation: "produits_canoniques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offres_magasin_unite_fkey"
            columns: ["unite"]
            isOneToOne: false
            referencedRelation: "unites_mesure"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "prix_historique_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres_magasin"
            referencedColumns: ["id"]
          },
        ]
      }
      prix_doublons_suspects: {
        Row: {
          jour: string | null
          nb_observations: number | null
          offre_id: string | null
          prix: number | null
          prix_unitaire: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prix_historique_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres_magasin"
            referencedColumns: ["id"]
          },
        ]
      }
      profils_actifs: {
        Row: {
          abonnement: string | null
          allergies: string[] | null
          apparence: string | null
          budget_hebdo: number | null
          cgvu_acceptee_le: string | null
          cgvu_version_acceptee: string | null
          created_at: string | null
          deleted_at: string | null
          enseignes_favorites: string[] | null
          est_admin: boolean | null
          id: string | null
          nb_enfants: number | null
          nb_personnes: number | null
          notifications_activees: boolean | null
          notifications_bilan: boolean | null
          notifications_budget: boolean | null
          notifications_planning: boolean | null
          notifications_promos: boolean | null
          objectifs: string[] | null
          prenom: string | null
          regime: string[] | null
        }
        Insert: {
          abonnement?: string | null
          allergies?: string[] | null
          apparence?: string | null
          budget_hebdo?: number | null
          cgvu_acceptee_le?: string | null
          cgvu_version_acceptee?: string | null
          created_at?: string | null
          deleted_at?: string | null
          enseignes_favorites?: string[] | null
          est_admin?: boolean | null
          id?: string | null
          nb_enfants?: number | null
          nb_personnes?: number | null
          notifications_activees?: boolean | null
          notifications_bilan?: boolean | null
          notifications_budget?: boolean | null
          notifications_planning?: boolean | null
          notifications_promos?: boolean | null
          objectifs?: string[] | null
          prenom?: string | null
          regime?: string[] | null
        }
        Update: {
          abonnement?: string | null
          allergies?: string[] | null
          apparence?: string | null
          budget_hebdo?: number | null
          cgvu_acceptee_le?: string | null
          cgvu_version_acceptee?: string | null
          created_at?: string | null
          deleted_at?: string | null
          enseignes_favorites?: string[] | null
          est_admin?: boolean | null
          id?: string | null
          nb_enfants?: number | null
          nb_personnes?: number | null
          notifications_activees?: boolean | null
          notifications_bilan?: boolean | null
          notifications_budget?: boolean | null
          notifications_planning?: boolean | null
          notifications_promos?: boolean | null
          objectifs?: string[] | null
          prenom?: string | null
          regime?: string[] | null
        }
        Relationships: []
      }
      rapport_fraicheur_prix_par_enseigne: {
        Row: {
          age_max_jours: number | null
          age_moyen_jours: number | null
          enseigne: string | null
          nb_offres: number | null
          nb_offres_avec_prix: number | null
          nb_offres_expirees: number | null
        }
        Relationships: []
      }
      recette_allergenes_effectifs: {
        Row: {
          allergene_id: string | null
          certitude: string | null
          code: string | null
          libelle: string | null
          recette_id: string | null
          source: string | null
        }
        Relationships: []
      }
      recettes_a_moderer: {
        Row: {
          auteur_id: string | null
          blurhash: string | null
          calories: number | null
          cout_estime: number | null
          created_at: string | null
          description: string | null
          difficulte: string | null
          est_communautaire: boolean | null
          id: string | null
          image_url: string | null
          nb_signalements: number | null
          portions: number | null
          statut_publication: string | null
          temps_preparation: number | null
          titre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recettes_auteur_id_fkey"
            columns: ["auteur_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recettes_auteur_id_fkey"
            columns: ["auteur_id"]
            isOneToOne: false
            referencedRelation: "profils_actifs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fn_importer_recettes_csv: {
        Args: { dry_run?: boolean; lignes: Json }
        Returns: Json
      }
      fn_normaliser_terme: { Args: { terme: string }; Returns: string }
      fn_resoudre_allergene: {
        Args: { terme: string }
        Returns: {
          allergene_id: string
          code: string
          libelle: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

