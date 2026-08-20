import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase, utilisateurId } from "@/lib/supabase";
import { couleurs, police, rayons } from "@/lib/theme";
import { Ecran } from "@/components/ui/ecran";
import { Texte } from "@/components/ui/texte";
import { BoutonDore } from "@/components/ui/bouton-dore";
import { AlerteErreur } from "@/components/ui/champ";
import { PAYS_AFRIQUE } from "@/components/auth/pays-card";
import { Drapeau } from "@/components/ui/drapeau";
import { useSession } from "@/lib/session";

const INSTRUMENTS = [
  "Chant",
  "Piano",
  "Guitare",
  "Basse",
  "Batterie",
  "Percussions",
  "Balafon",
  "Djembé",
  "Saxophone",
  "Trompette",
  "Violon",
  "Kora",
  "Clavier / Synthé",
  "Autre",
] as const;

const GENRES = [
  "Gospel",
  "Zouglou",
  "Coupé-décalé",
  "Afrobeat",
  "Mbalax",
  "Rumba",
  "Zouk",
  "Reggae",
  "Soul",
  "Jazz",
  "Hip-hop",
  "Chorale",
  "Fusion",
  "Autre",
] as const;

const NIVEAUX = [
  { valeur: "debutant", label: "Débutant" },
  { valeur: "intermediaire", label: "Intermédiaire" },
  { valeur: "avance", label: "Avancé" },
  { valeur: "expert", label: "Expert" },
] as const;

const ROLES = [
  { valeur: "musicien", label: "Musicien", desc: "pour jouer et créer", icone: "musical-notes" as const },
  { valeur: "chef_groupe", label: "Chef de groupe", desc: "pour gérer un ensemble", icone: "people" as const },
  { valeur: "studio", label: "Studio", desc: "pour proposer tes services", icone: "mic" as const },
  { valeur: "formateur", label: "Formateur", desc: "pour transmettre ton savoir", icone: "school" as const },
] as const;

/**
 * Onboarding 3 étapes (après inscription) :
 *  1. Ton pays    — choix du pays
 *  2. Profil musical — instruments, genres, niveau
 *  3. Ton rôle    — cartes bento verticales
 * Design cohérent avec connexion/inscription (CTA doré, header progressif).
 */
export default function Onboarding() {
  const router = useRouter();
  const { session } = useSession();
  const insets = useSafeAreaInsets();

  const [etape, setEtape] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [pays, setPays] = useState("Côte d'Ivoire");
  const [instruments, setInstruments] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [niveau, setNiveau] = useState<string>("");
  const [type, setType] = useState<string>("musicien");

  function basculer(liste: string[], setListe: (v: string[]) => void, valeur: string) {
    setListe(
      liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur]
    );
  }

  async function continuer() {
    setErreur(null);

    if (etape === 1 && instruments.length === 0) {
      setErreur("Choisis au moins un instrument.");
      return;
    }

    if (etape < 2) {
      setEtape((e) => e + 1);
      return;
    }

    // Sauvegarde finale
    setChargement(true);
    try {
      const userId = await utilisateurId();
      const { error } = await supabase
        .from("users")
        .update({
          pays,
          instruments,
          genres_musicaux: genres,
          niveau_global: niveau ? (niveau as "debutant") : null,
          type: type as "musicien",
        })
        .eq("id", userId);
      if (error) throw error;
      router.replace("/(tabs)");
    } catch {
      setErreur("Impossible d'enregistrer ton profil. Réessaie.");
    } finally {
      setChargement(false);
    }
  }

  // L'onboarding nécessite une session (post-inscription)
  if (!session) return <Redirect href="/connexion" />;

  return (
    <Ecran>
      <View style={{ flex: 1 }}>
        {/* Header / progression */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={() => (etape > 0 ? setEtape((e) => e - 1) : router.back())}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: couleurs.surfaceCarte,
              }}
            >
              <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
            </Pressable>
            <Texte variante="petit" couleur={couleurs.texteSecondaire}>
              Étape {etape + 1} sur 3
            </Texte>
            <View style={{ width: 40 }} />
          </View>

          {/* Barre de progression */}
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${((etape + 1) / 3) * 100}%`,
                height: "100%",
                borderRadius: 3,
                backgroundColor: couleurs.warmGold,
                shadowColor: couleurs.warmGold,
                shadowOpacity: 0.4,
                shadowRadius: 6,
              }}
            />
          </View>
        </View>

        {/* Contenu */}
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {etape === 0 && (
            <View style={{ gap: 8 }}>
              <Texte variante="titre2" poids="extrabold">
                Ton pays
              </Texte>
              <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ lineHeight: 20 }}>
                Pour te connecter aux musiciens près de chez toi.
              </Texte>
              <View style={{ marginTop: 20, gap: 10 }}>
                {PAYS_AFRIQUE.map((p) => {
                  const actif = pays === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setPays(p)}
                      style={[
                        carteSelection(),
                        {
                          borderColor: actif ? couleurs.terracottaLight : "rgba(255,255,255,0.06)",
                          backgroundColor: actif ? "rgba(224,122,86,0.12)" : couleurs.carte,
                        },
                      ]}
                    >
                      <Drapeau pays={p} />
                      <Texte
                        variante="petit"
                        poids={actif ? "bold" : "medium"}
                        couleur={actif ? couleurs.terracottaLight : couleurs.texte}
                        style={{ flex: 1 }}
                      >
                        {p}
                      </Texte>
                      {actif && (
                        <Ionicons name="checkmark-circle" size={20} color={couleurs.terracottaLight} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {etape === 1 && (
            <View style={{ gap: 24 }}>
              <View style={{ gap: 8 }}>
                <Texte variante="titre2" poids="extrabold">
                  Ton profil musical
                </Texte>
                <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ lineHeight: 20 }}>
                  Ça aide les bons groupes à te trouver.
                </Texte>
              </View>

              <SectionPuces
                titre="Tes instruments"
                options={INSTRUMENTS}
                valeurs={instruments}
                surBasculer={(v) => basculer(instruments, setInstruments, v)}
              />

              <SectionPuces
                titre="Tes genres"
                options={GENRES}
                valeurs={genres}
                surBasculer={(v) => basculer(genres, setGenres, v)}
              />

              <View style={{ gap: 12 }}>
                <Texte
                  variante="micro"
                  poids="bold"
                  couleur={couleurs.texteSecondaire}
                  style={{ letterSpacing: 2 }}
                >
                  TON NIVEAU
                </Texte>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {NIVEAUX.map((n) => {
                    const actif = niveau === n.valeur;
                    return (
                      <Pressable
                        key={n.valeur}
                        onPress={() => setNiveau(n.valeur)}
                        style={{
                          width: "48%",
                          minHeight: 52,
                          borderRadius: rayons.md,
                          borderWidth: 1,
                          borderColor: actif ? couleurs.terracottaLight : "rgba(255,255,255,0.06)",
                          backgroundColor: actif ? "rgba(224,122,86,0.12)" : couleurs.carte,
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "row",
                          gap: 8,
                        }}
                      >
                        {actif && (
                          <Ionicons name="checkmark-circle" size={18} color={couleurs.terracottaLight} />
                        )}
                        <Texte
                          variante="petit"
                          poids="bold"
                          couleur={actif ? couleurs.terracottaLight : couleurs.texte}
                        >
                          {n.label}
                        </Texte>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {etape === 2 && (
            <View style={{ gap: 8 }}>
              <Texte variante="titre2" poids="extrabold">
                Quel est ton rôle ?
              </Texte>
              <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ lineHeight: 20 }}>
                Cela nous aidera à personnaliser ton expérience.
              </Texte>

              <View style={{ marginTop: 16, gap: 12 }}>
                {ROLES.map((role) => {
                  const actif = type === role.valeur;
                  return (
                    <Pressable
                      key={role.valeur}
                      onPress={() => setType(role.valeur)}
                      style={[
                        carteSelection(),
                        {
                          borderColor: actif ? couleurs.terracottaLight : "rgba(255,255,255,0.06)",
                          backgroundColor: actif ? "rgba(224,122,86,0.12)" : couleurs.carte,
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: actif
                            ? "rgba(251,191,36,0.2)"
                            : "rgba(255,255,255,0.06)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name={role.icone}
                          size={22}
                          color={actif ? couleurs.warmGold : couleurs.texteSecondaire}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Texte poids="bold" style={{ marginBottom: 2 }}>
                          {role.label}
                        </Texte>
                        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                          {role.desc}
                        </Texte>
                      </View>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: actif ? couleurs.terracottaLight : "transparent",
                          borderWidth: actif ? 0 : 1,
                          borderColor: "rgba(255,255,255,0.2)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {actif && (
                          <Ionicons name="checkmark" size={16} color={couleurs.charcoal} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Actions fixes en bas */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 12),
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.05)",
            backgroundColor: couleurs.fond,
          }}
        >
          <AlerteErreur message={erreur} />
          <BoutonDore
            titre={etape < 2 ? "Continuer" : "Terminer"}
            icone={etape < 2 ? "arrow-forward" : "checkmark"}
            chargement={chargement}
            onPress={continuer}
          />
          {etape < 2 && (
            <Pressable
              onPress={() => setEtape((e) => e + 1)}
              style={{ alignItems: "center", paddingVertical: 10 }}
            >
              <Texte variante="petit" couleur={couleurs.texteSecondaire}>
                Passer pour l&apos;instant
              </Texte>
            </Pressable>
          )}
        </View>
      </View>
    </Ecran>
  );
}

function carteSelection() {
  return {
    minHeight: 56,
    borderRadius: rayons.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  } as const;
}

/** Section de puces (instruments / genres) — sélectionnées en doré. */
function SectionPuces({
  titre,
  options,
  valeurs,
  surBasculer,
}: {
  titre: string;
  options: readonly string[];
  valeurs: string[];
  surBasculer: (valeur: string) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Texte
        variante="micro"
        poids="bold"
        couleur={couleurs.texteSecondaire}
        style={{ letterSpacing: 2 }}
      >
        {titre.toUpperCase()}
      </Texte>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {options.map((option) => {
          const actif = valeurs.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => surBasculer(option)}
              style={{
                minHeight: 44,
                paddingHorizontal: 22,
                borderRadius: 999,
                backgroundColor: actif ? couleurs.terracottaLight : couleurs.carte,
                borderWidth: 1,
                borderColor: actif ? couleurs.terracottaLight : "rgba(255,255,255,0.06)",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: actif ? couleurs.terracottaLight : "transparent",
                shadowOpacity: actif ? 0.25 : 0,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
                elevation: actif ? 6 : 0,
              }}
            >
              <Texte
                variante="petit"
                poids="bold"
                couleur={actif ? couleurs.charcoal : couleurs.texte}
                style={{ fontFamily: actif ? police.bold : police.medium }}
              >
                {option}
              </Texte>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
