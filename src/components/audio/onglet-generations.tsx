import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Texte } from "@/components/ui/texte";
import { EtatVide, SqueletteListe } from "@/components/ui/etat-vide";
import { LecteurAudioModal, type PisteAudio } from "@/components/ui/lecteur-audio-modal";
import {
  useGenerations,
  useMarquerGenerationLue,
  type JobGeneration,
} from "@/lib/queries/generation";
import {
  type TonGeneration,
  etatGeneration,
  generationsVisibles,
  messageErreurGeneration,
} from "@/lib/generation-erreurs";
import { urlLectureR2 } from "@/lib/r2";
import { utilisateurId } from "@/lib/supabase";
import { formatDateHeure, formatTemps } from "@/lib/format";
import { couleurs, rayons } from "@/lib/theme";

/**
 * Liste des générations musicales.
 *
 * Dans un groupe, elles appartiennent au groupe et tous ses membres les voient
 * — c'est ce qui en fait un objet de conversation plutôt qu'un jouet privé.
 * Dans l'espace personnel, elles restent à leur auteur.
 */
export function OngletGenerations({ groupeId }: { groupeId?: string }) {
  const { data: generations = [], isLoading } = useGenerations(groupeId ?? null, true);
  const { mutate: marquerLue } = useMarquerGenerationLue();
  const [piste, setPiste] = useState<PisteAudio | null>(null);
  const [moi, setMoi] = useState<string | null>(null);

  // L'identité sert à savoir quelles pastilles « non lu » nous concernent : les
  // autres membres voient la génération sans qu'elle leur soit adressée.
  useEffect(() => {
    utilisateurId()
      .then(setMoi)
      .catch(() => setMoi(null));
  }, []);

  async function ecouter(job: JobGeneration, cle: string, indice: number) {
    const url = await urlLectureR2(cle);
    if (!url) return;
    setPiste({
      titre: titreDe(job),
      sousTitre: `Version ${indice + 1}`,
      url,
    });
    if (job.user_id === moi && !job.lu_at) marquerLue(job.id);
  }

  const visibles = generationsVisibles(generations, moi);

  if (isLoading) return <SqueletteListe lignes={3} hauteur={72} />;

  if (visibles.length === 0) {
    return (
      <EtatVide
        icone="sparkles-outline"
        titre="Aucune génération"
        message={
          groupeId
            ? "Les morceaux générés par les membres du groupe apparaîtront ici, écoutables par tous."
            : "Tes morceaux générés apparaîtront ici. Ouvre le labo audio d'un morceau pour en créer un."
        }
      />
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {visibles.map((job) => {
        const enCours = job.statut === "queued" || job.statut === "processing";
        const pistes = job.resultat?.pistes ?? [];
        const etat = etatGeneration(job.statut, pistes.length);
        // La pastille de non-lu n'appartient qu'au demandeur.
        const nonLue = job.user_id === moi && !job.lu_at && job.statut === "completed";

        return (
          <View
            key={job.id}
            style={{
              borderRadius: rayons.md,
              borderWidth: 1,
              borderColor: couleurs.bordure,
              backgroundColor: couleurs.surfaceCarte,
              padding: 14,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: FOND_TON[etat.ton],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {enCours ? (
                  <ActivityIndicator size="small" color={couleurs.warmGold} />
                ) : (
                  <Ionicons
                    name={etat.ton === "succes" ? "sparkles" : "alert-circle-outline"}
                    size={20}
                    color={TEINTE_TON[etat.ton]}
                  />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Texte variante="petit" poids="semibold" numberOfLines={1}>
                  {titreDe(job)}
                </Texte>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <View
                    style={{
                      borderRadius: rayons.pill,
                      backgroundColor: FOND_TON[etat.ton],
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Texte variante="micro" poids="bold" couleur={TEINTE_TON[etat.ton]}>
                      {etat.libelle}
                    </Texte>
                  </View>
                  <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={1}>
                    {job.created_at ? formatDateHeure(job.created_at) : ""}
                  </Texte>
                </View>
              </View>

              {nonLue && (
                <View
                  accessibilityLabel="Pas encore écoutée"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: couleurs.warmGold,
                  }}
                />
              )}
            </View>

            {enCours && (
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                Quelques minutes suffisent, tu peux fermer cet écran.
              </Texte>
            )}

            {job.statut === "failed" && (
              <View style={{ gap: 10 }}>
                <Texte variante="micro" couleur={couleurs.danger}>
                  {messageErreurGeneration(job.message_erreur)}
                </Texte>
                {/* L'échec ne s'affiche qu'à son demandeur, et une seule fois :
                    ce bouton le retire de la liste pour de bon. */}
                <Pressable
                  onPress={() => marquerLue(job.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Retirer cette génération de la liste"
                  style={{
                    alignSelf: "flex-start",
                    minHeight: 36,
                    justifyContent: "center",
                    paddingHorizontal: 14,
                    borderRadius: rayons.pill,
                    borderWidth: 1,
                    borderColor: couleurs.bordure,
                  }}
                >
                  <Texte variante="micro" poids="semibold" couleur={couleurs.texteSecondaire}>
                    Compris
                  </Texte>
                </Pressable>
              </View>
            )}

            {/* Une demande rend deux versions : on les propose toutes les deux
                plutôt que d'en choisir une à la place de l'utilisateur. Elles
                sont séparées par un filet et non encartées — une carte dans une
                carte brouille la hiérarchie. */}
            {pistes.map((p, i) => (
              <View key={p.url}>
                <View
                  style={{
                    height: 1,
                    backgroundColor: couleurs.bordure,
                    marginHorizontal: -14,
                  }}
                />
                <Pressable
                  onPress={() => void ecouter(job, p.url, i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Écouter la version ${i + 1}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 48,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: "rgba(251,191,36,0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(251,191,36,0.35)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="play" size={15} color={couleurs.warmGold} />
                  </View>
                  <Texte variante="petit" poids="medium" style={{ flex: 1 }}>
                    {`Version ${i + 1}`}
                  </Texte>
                  {p.duree_secondes ? (
                    <Texte
                      variante="micro"
                      couleur={couleurs.texteSecondaire}
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {formatTemps(p.duree_secondes)}
                    </Texte>
                  ) : null}
                </Pressable>
              </View>
            ))}
          </View>
        );
      })}

      <LecteurAudioModal piste={piste} visible={!!piste} onFermer={() => setPiste(null)} />
    </View>
  );
}

/** Fond et teinte de la pastille d'état, alignés sur le reste de l'app. */
const FOND_TON: Record<TonGeneration, string> = {
  attente: "rgba(251,191,36,0.12)",
  succes: "rgba(251,191,36,0.12)",
  echec: couleurs.danger15,
};

const TEINTE_TON: Record<TonGeneration, string> = {
  attente: couleurs.warmGold,
  succes: couleurs.warmGold,
  echec: couleurs.danger,
};

function titreDe(job: JobGeneration): string {
  return (
    job.input_params?.title?.trim() ||
    job.input_params?.prompt?.trim() ||
    "Génération"
  );
}
