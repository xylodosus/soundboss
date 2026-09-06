import { useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Texte } from "@/components/ui/texte";
import { EtatVide } from "@/components/ui/etat-vide";
import { useDemanderGeneration, useGenerations } from "@/lib/queries/generation";
import { messageErreurGeneration } from "@/lib/generation-erreurs";
import { couleurs, espacement, rayons } from "@/lib/theme";

const DUREES: { secondes: number; libelle: string }[] = [
  { secondes: 30, libelle: "30 s" },
  { secondes: 60, libelle: "1 mn" },
  { secondes: 120, libelle: "2 mn" },
  { secondes: 180, libelle: "3 mn" },
];

/**
 * Onglet Création : génération musicale par Suno.
 *
 * La fin d'une génération n'arrive pas ici mais sur le conteneur, que Kie.ai
 * rappelle. L'écran scrute donc la base tant qu'un job tourne — sans quoi il
 * resterait muet plusieurs minutes.
 */
export function OngletCreation({
  actif,
  groupeId,
  source,
}: {
  actif: boolean;
  /** Génération de groupe : visible par tous ses membres. */
  groupeId?: string;
  /** Morceau ouvert dans le labo, proposé comme point de départ d'une reprise. */
  source?: { cle: string; titre: string } | null;
}) {
  const [invite, setInvite] = useState("");
  const [style, setStyle] = useState("");
  const [titre, setTitre] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [duree, setDuree] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reprise, setReprise] = useState(false);
  /**
   * Empreinte de la demande envoyée. Le bouton reste inactif tant que rien n'a
   * changé : deux appuis de suite lanceraient deux générations facturées pour
   * une seule intention.
   */
  const [derniereEnvoyee, setDerniereEnvoyee] = useState<string | null>(null);

  const { data: generations = [] } = useGenerations(groupeId ?? null, actif);
  const uneTourne = generations.some((g) => g.statut === "queued" || g.statut === "processing");
  const { mutate: demander, isPending } = useDemanderGeneration();

  const personnalise = style.trim().length > 0 || titre.trim().length > 0;
  const empreinte = JSON.stringify({
    invite: invite.trim(),
    style: style.trim(),
    titre: titre.trim(),
    instrumental,
    duree,
    reprise,
  });
  const dejaEnvoyee = empreinte === derniereEnvoyee;
  // Une reprise part d'un audio : le style seul peut suffire à la décrire.
  const aDeQuoiPartir = invite.trim().length > 0 || (personnalise && instrumental) || reprise;
  const peutLancer = !isPending && !dejaEnvoyee && aDeQuoiPartir;

  function lancer() {
    setMessage(null);
    demander(
      {
        prompt: invite.trim(),
        // Le mode personnalisé s'active de lui-même dès qu'un style ou un titre
        // est saisi : un interrupteur de plus n'aurait rien expliqué.
        customMode: personnalise,
        instrumental,
        style: style.trim() || null,
        titre: titre.trim() || null,
        duree,
        groupeId,
        sourceUrl: reprise && source ? source.cle : null,
      },
      {
        onSuccess: (r) => {
          setMessage(r.message);
          if (r.success) setDerniereEnvoyee(empreinte);
        },
        onError: (e) => setMessage(e instanceof Error ? e.message : String(e)),
      }
    );
  }

  return (
    <View style={{ gap: espacement.lg }}>
      {source && (
        <Pressable
          onPress={() => setReprise((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: reprise }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: espacement.md,
            minHeight: 56,
            paddingHorizontal: espacement.md,
            borderRadius: rayons.md,
            backgroundColor: reprise ? couleurs.warmGold15 : couleurs.surfaceCarte,
            borderWidth: 1,
            borderColor: reprise ? "rgba(251,191,36,0.35)" : couleurs.bordure,
          }}
        >
          <Ionicons
            name="repeat-outline"
            size={20}
            color={reprise ? couleurs.warmGold : couleurs.texteSecondaire}
          />
          <View style={{ flex: 1 }}>
            <Texte variante="petit" poids="semibold" couleur={reprise ? couleurs.warmGold : couleurs.texte}>
              {reprise ? "Reprise de ce morceau" : "Partir de ce morceau"}
            </Texte>
            <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={1}>
              {source.titre}
            </Texte>
          </View>
          <Ionicons
            name={reprise ? "checkmark-circle" : "ellipse-outline"}
            size={20}
            color={reprise ? couleurs.warmGold : couleurs.texteSecondaire}
          />
        </Pressable>
      )}

      {/* Informatif et non dissuasif : un rejet n'est pas facturé, l'essai ne
          coûte donc rien. */}
      {reprise && (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: espacement.sm }}>
          <Ionicons name="information-circle-outline" size={16} color={couleurs.texteSecondaire} />
          <Texte variante="micro" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
            {"En vertu du respect des droits d'auteur, l'audio proposé pourrait être rejeté."}
          </Texte>
        </View>
      )}

      <Champ
        valeur={invite}
        surChanger={setInvite}
        placeholder={
          reprise
            ? "Dans quel style le réarranger ? « version afrobeat, batterie et cuivres »"
            : "Décris le morceau : « gospel joyeux en si bémol, chœur et orgue Hammond »"
        }
        multiligne
        label="Description"
      />

      <View style={{ flexDirection: "row", gap: espacement.sm }}>
        <View style={{ flex: 1 }}>
          <Champ valeur={style} surChanger={setStyle} placeholder="Gospel, afrobeat…" label="Style" />
        </View>
        <View style={{ flex: 1 }}>
          <Champ valeur={titre} surChanger={setTitre} placeholder="Titre" label="Titre" />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.sm }}>
        <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
          Instrumental
        </Texte>
        <Puce
          libelle={instrumental ? "Sans voix" : "Avec voix"}
          actif={instrumental}
          onPress={() => setInstrumental((v) => !v)}
        />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.sm }}>
        <Texte variante="petit" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
          Durée
        </Texte>
        {DUREES.map((d) => (
          <Puce
            key={d.secondes}
            libelle={d.libelle}
            actif={duree === d.secondes}
            onPress={() => setDuree((v) => (v === d.secondes ? null : d.secondes))}
          />
        ))}
      </View>

      <Pressable
        onPress={lancer}
        disabled={!peutLancer}
        accessibilityRole="button"
        accessibilityLabel="Lancer la génération"
        style={{
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: rayons.pill,
          backgroundColor: couleurs.warmGold,
          opacity: peutLancer ? 1 : 0.4,
        }}
      >
        <Texte variante="petit" poids="bold" couleur={couleurs.charcoal}>
          {isPending ? "Envoi…" : "Générer"}
        </Texte>
      </Pressable>

      {/* « Elle prend quelques minutes » n'a plus de sens une fois la génération
          terminée : le message s'efface avec elle. */}
      {message && (dejaEnvoyee ? uneTourne : true) && (
        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
          {message}
        </Texte>
      )}

      <View style={{ height: 1, backgroundColor: couleurs.bordure }} />

      {generations.length === 0 ? (
        <EtatVide
          icone="sparkles-outline"
          titre="Aucune génération"
          message="Décris un morceau et lance la génération : elle prend quelques minutes et deux versions te seront proposées."
        />
      ) : (
        <View style={{ gap: espacement.sm }}>
          {generations.map((g) => {
            const enCours = g.statut === "queued" || g.statut === "processing";
            const pistes = g.resultat?.pistes ?? [];
            return (
              <View
                key={g.id}
                style={{
                  backgroundColor: couleurs.surfaceCarte,
                  borderRadius: rayons.md,
                  padding: espacement.md,
                  gap: espacement.xs,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: espacement.sm }}>
                  {enCours ? (
                    <ActivityIndicator size="small" color={couleurs.warmGold} />
                  ) : (
                    <Ionicons
                      name={g.statut === "completed" ? "checkmark-circle" : "alert-circle"}
                      size={16}
                      color={g.statut === "completed" ? couleurs.success : couleurs.danger}
                    />
                  )}
                  <Texte variante="petit" poids="semibold" numberOfLines={1} style={{ flex: 1 }}>
                    {g.input_params?.title || g.input_params?.prompt || "Génération"}
                  </Texte>
                </View>
                <Texte
                  variante="micro"
                  couleur={g.statut === "failed" ? couleurs.danger : couleurs.texteSecondaire}
                >
                  {enCours
                    ? "En cours — quelques minutes."
                    : g.statut === "completed"
                      ? `${pistes.length} version${pistes.length > 1 ? "s" : ""} disponible${
                          pistes.length > 1 ? "s" : ""
                        }`
                      : messageErreurGeneration(g.message_erreur)}
                </Texte>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function Champ({
  valeur,
  surChanger,
  placeholder,
  label,
  multiligne = false,
}: {
  valeur: string;
  surChanger: (v: string) => void;
  placeholder: string;
  label: string;
  multiligne?: boolean;
}) {
  return (
    <View style={{ gap: espacement.xs }}>
      <Texte variante="micro" couleur={couleurs.texteSecondaire}>
        {label}
      </Texte>
      <TextInput
        value={valeur}
        onChangeText={surChanger}
        placeholder={placeholder}
        placeholderTextColor={couleurs.texteSecondaire}
        multiline={multiligne}
        accessibilityLabel={label}
        style={{
          backgroundColor: couleurs.surfaceCarte,
          borderRadius: rayons.md,
          paddingHorizontal: espacement.md,
          paddingVertical: espacement.md,
          minHeight: multiligne ? 88 : 44,
          textAlignVertical: multiligne ? "top" : "center",
          color: couleurs.texte,
        }}
      />
    </View>
  );
}

function Puce({
  libelle,
  actif,
  onPress,
}: {
  libelle: string;
  actif: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: actif }}
      accessibilityLabel={libelle}
      style={{
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: espacement.lg,
        borderRadius: rayons.pill,
        backgroundColor: actif ? couleurs.warmGold15 : couleurs.surfaceCarte,
      }}
    >
      <Texte variante="petit" poids="semibold" couleur={actif ? couleurs.warmGold : couleurs.texte}>
        {libelle}
      </Texte>
    </Pressable>
  );
}
