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
import { messageErreurGeneration } from "@/lib/generation-erreurs";
import { urlLectureR2 } from "@/lib/r2";
import { utilisateurId } from "@/lib/supabase";
import { formatDateHeure } from "@/lib/format";
import { couleurs, espacement, rayons } from "@/lib/theme";

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

  if (isLoading) return <SqueletteListe lignes={3} hauteur={72} />;

  if (generations.length === 0) {
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
    <View style={{ gap: espacement.sm }}>
      {generations.map((job) => {
        const enCours = job.statut === "queued" || job.statut === "processing";
        const pistes = job.resultat?.pistes ?? [];
        // La pastille n'appartient qu'au demandeur.
        const nonLue = job.user_id === moi && !job.lu_at && job.statut === "completed";

        return (
          <View
            key={job.id}
            style={{
              backgroundColor: couleurs.surfaceCarte,
              borderRadius: rayons.md,
              padding: espacement.md,
              gap: espacement.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.sm }}>
              {enCours ? (
                <ActivityIndicator size="small" color={couleurs.warmGold} />
              ) : (
                <Ionicons
                  name={job.statut === "completed" ? "sparkles" : "alert-circle"}
                  size={18}
                  color={job.statut === "completed" ? couleurs.warmGold : couleurs.danger}
                />
              )}
              <View style={{ flex: 1 }}>
                <Texte variante="petit" poids="semibold" numberOfLines={1}>
                  {titreDe(job)}
                </Texte>
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {job.created_at ? formatDateHeure(job.created_at) : ""}
                </Texte>
              </View>
              {nonLue && (
                <View
                  accessibilityLabel="Pas encore écoutée"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: couleurs.warmGold,
                  }}
                />
              )}
            </View>

            {enCours && (
              <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                Génération en cours — quelques minutes.
              </Texte>
            )}

            {job.statut === "failed" && (
              <Texte variante="micro" couleur={couleurs.danger}>
                {messageErreurGeneration(job.message_erreur)}
              </Texte>
            )}

            {/* Une demande rend deux versions : on les propose toutes les deux
                plutôt que d'en choisir une à la place de l'utilisateur. */}
            {pistes.map((p, i) => (
              <Pressable
                key={p.url}
                onPress={() => void ecouter(job, p.url, i)}
                accessibilityRole="button"
                accessibilityLabel={`Écouter la version ${i + 1}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: espacement.sm,
                  minHeight: 44,
                  paddingHorizontal: espacement.md,
                  borderRadius: rayons.sm,
                  backgroundColor: couleurs.carte,
                }}
              >
                <Ionicons name="play-circle" size={20} color={couleurs.warmGold} />
                <Texte variante="petit" style={{ flex: 1 }}>
                  {`Version ${i + 1}`}
                </Texte>
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {p.duree_secondes ? `${Math.round(p.duree_secondes)} s` : ""}
                </Texte>
              </Pressable>
            ))}
          </View>
        );
      })}

      <LecteurAudioModal piste={piste} visible={!!piste} onFermer={() => setPiste(null)} />
    </View>
  );
}

function titreDe(job: JobGeneration): string {
  return (
    job.input_params?.title?.trim() ||
    job.input_params?.prompt?.trim() ||
    "Génération"
  );
}
