import { ActivityIndicator, Pressable, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";

import { Texte } from "@/components/ui/texte";
import { libelleStem, type EtatMixage } from "@/lib/stems";
import { couleurs, espacement, rayons } from "@/lib/theme";

export type PisteMixeur = {
  id: string;
  type: string;
  duree_secondes: number | null;
};

/**
 * Console de mixage des pistes séparées.
 *
 * Une piste n'est décodée que lorsqu'on l'active : cinq pistes d'un morceau de
 * huit minutes demanderaient 450 Mo, alors que l'usage courant en réclame une
 * ou deux — chanter sur l'instrumental, isoler la basse pour la travailler.
 */
export function Mixeur({
  pistes,
  actives,
  etat,
  chargement,
  telechargementEnCours,
  surBasculer,
  surVolume,
  surMute,
  surSolo,
  surTelecharger,
  surTransferer,
}: {
  pistes: PisteMixeur[];
  actives: string[];
  etat: EtatMixage;
  chargement: string | null;
  telechargementEnCours: string | null;
  surBasculer: (id: string) => void;
  surVolume: (id: string, volume: number) => void;
  surMute: (id: string) => void;
  surSolo: (id: string) => void;
  surTelecharger: (id: string) => void;
  /**
   * Absent quand aucune destination n'existe : le lecteur sert désormais à tous
   * les audios de l'application, y compris hors d'un groupe ou d'une répétition.
   */
  surTransferer?: (id: string) => void;
}) {
  return (
    <View style={{ gap: espacement.md }}>
      {pistes.map((p) => {
        const active = actives.includes(p.id);
        const enChargement = chargement === p.id;
        return (
          <View
            key={p.id}
            style={{
              backgroundColor: couleurs.surfaceCarte,
              borderRadius: rayons.md,
              padding: espacement.md,
              gap: espacement.sm,
              opacity: active ? 1 : 0.6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.sm }}>
              <Pressable
                onPress={() => surBasculer(p.id)}
                accessibilityRole="switch"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${libelleStem(p.type)} : ${active ? "chargée" : "non chargée"}`}
                style={{ flex: 1, minHeight: 44, justifyContent: "center" }}
              >
                <Texte
                  variante="petit"
                  poids="semibold"
                  couleur={active ? couleurs.texte : couleurs.texteSecondaire}
                >
                  {libelleStem(p.type)}
                </Texte>
              </Pressable>

              {enChargement ? (
                <ActivityIndicator color={couleurs.warmGold} />
              ) : (
                <>
                  <BoutonLettre
                    lettre="M"
                    actif={etat.mutes.has(p.id)}
                    couleurActive={couleurs.danger}
                    label={`Sourdine sur ${libelleStem(p.type)}`}
                    desactive={!active}
                    onPress={() => surMute(p.id)}
                  />
                  <BoutonLettre
                    lettre="S"
                    actif={etat.solos.has(p.id)}
                    couleurActive={couleurs.warmGold}
                    label={`Solo sur ${libelleStem(p.type)}`}
                    desactive={!active}
                    onPress={() => surSolo(p.id)}
                  />
                  {surTransferer && (
                    <Pressable
                      onPress={() => surTransferer(p.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Transférer ${libelleStem(p.type)}`}
                      hitSlop={8}
                      style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                    >
                      <Ionicons name="share-outline" size={18} color={couleurs.texteSecondaire} />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => surTelecharger(p.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Télécharger ${libelleStem(p.type)}`}
                    hitSlop={8}
                    style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                  >
                    {telechargementEnCours === p.id ? (
                      <ActivityIndicator size="small" color={couleurs.texteSecondaire} />
                    ) : (
                      <Ionicons
                        name="download-outline"
                        size={18}
                        color={couleurs.texteSecondaire}
                      />
                    )}
                  </Pressable>
                </>
              )}
            </View>

            {/* Le volume ne s'affiche que sur une piste chargée : régler le
                niveau de ce qui ne joue pas n'aurait aucun effet audible. */}
            {active && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.sm }}>
                <Slider
                  style={{ flex: 1 }}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.05}
                  value={etat.volumes[p.id] ?? 1}
                  onValueChange={(v) => surVolume(p.id, v)}
                  minimumTrackTintColor={couleurs.warmGold}
                  maximumTrackTintColor={couleurs.bordureForte}
                  thumbTintColor={couleurs.warmGold}
                  accessibilityLabel={`Volume de ${libelleStem(p.type)}`}
                />
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {`${Math.round((etat.volumes[p.id] ?? 1) * 100)}%`}
                </Texte>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function BoutonLettre({
  lettre,
  actif,
  couleurActive,
  label,
  desactive,
  onPress,
}: {
  lettre: string;
  actif: boolean;
  couleurActive: string;
  label: string;
  desactive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={desactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: actif, disabled: desactive }}
      accessibilityLabel={label}
      hitSlop={6}
      style={{
        width: 36,
        height: 36,
        borderRadius: rayons.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: actif ? couleurActive : couleurs.carte,
        opacity: desactive ? 0.4 : 1,
      }}
    >
      <Texte variante="petit" poids="bold" couleur={actif ? couleurs.charcoal : couleurs.texteSecondaire}>
        {lettre}
      </Texte>
    </Pressable>
  );
}
