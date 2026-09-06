import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Texte } from "@/components/ui/texte";
import { OngletGenerations } from "@/components/audio/onglet-generations";
import { ModalChoix } from "@/components/ui/modal-choix";
import { ModalEnregistrement } from "@/components/ui/modal-enregistrement";
import { useDemanderGeneration, useGenerations } from "@/lib/queries/generation";
import { useAjouterAudioPersonnel } from "@/lib/queries/dossiers";
import { useEnregistrementsSeance } from "@/lib/queries/seances";
import { useRessources } from "@/lib/queries/ressources";
import {
  type OrigineSource,
  type SourceGeneration,
  libelleOrigine,
  sourcesDisponibles,
} from "@/lib/sources-generation";
import { formatDateHeure } from "@/lib/format";
import { couleurs, espacement, rayons } from "@/lib/theme";

const ICONE_ORIGINE: Record<OrigineSource, "musical-notes-outline" | "recording-outline" | "folder-open-outline" | "mic-outline"> = {
  labo: "musical-notes-outline",
  repetition: "recording-outline",
  groupe: "folder-open-outline",
  micro: "mic-outline",
};

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
  seanceId,
  source,
}: {
  actif: boolean;
  /** Génération de groupe : visible par tous ses membres. */
  groupeId?: string;
  /** Répétition dont les audios sont proposés comme points de départ. */
  seanceId?: string;
  /** Morceau ouvert dans le labo, proposé comme point de départ d'une reprise. */
  source?: { cle: string; titre: string } | null;
}) {
  const [invite, setInvite] = useState("");
  const [style, setStyle] = useState("");
  const [titre, setTitre] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [duree, setDuree] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  /**
   * Écrire soi-même les paroles, ou laisser Suno les écrire.
   *
   * Le choix ne relève pas du confort : en mode personnalisé, l'API chante
   * `prompt` mot pour mot. Ce mode s'activait auparavant de lui-même dès qu'un
   * style était saisi, et la description se retrouvait chantée telle quelle.
   */
  const [modeParoles, setModeParoles] = useState(false);
  /** Audio affiché sur la carte de départ, sélectionné ou non. */
  const [carte, setCarte] = useState<SourceGeneration | null>(null);
  const [selectionnee, setSelectionnee] = useState(false);
  const [choixOuvert, setChoixOuvert] = useState(false);
  const [microOuvert, setMicroOuvert] = useState(false);
  /**
   * Empreinte de la demande envoyée. Le bouton reste inactif tant que rien n'a
   * changé : deux appuis de suite lanceraient deux générations facturées pour
   * une seule intention.
   */
  const [derniereEnvoyee, setDerniereEnvoyee] = useState<string | null>(null);

  const { data: generations = [] } = useGenerations(groupeId ?? null, actif);
  const { data: enregistrements = [] } = useEnregistrementsSeance(seanceId ?? "", actif);
  // Portée de simple membre : on ne liste que les fichiers partagés au groupe
  // entier ou à soi. Un chef verra donc moins de fichiers ici que dans l'onglet
  // Fichiers — mieux vaut en omettre que d'en exposer.
  const { data: ressources = [] } = useRessources(groupeId ?? "", false, actif);

  const candidats = sourcesDisponibles({
    labo: source ?? null,
    enregistrements,
    ressources,
  });
  const uneTourne = generations.some((g) => g.statut === "queued" || g.statut === "processing");
  const { mutate: demander, isPending } = useDemanderGeneration();
  const { mutate: rangerAudio } = useAjouterAudioPersonnel();

  // Le morceau ouvert dans le labo est proposé d'emblée, mais pas coché : on
  // suggère, on ne décide pas à la place de l'utilisateur.
  const cleSource = source?.cle ?? null;
  useEffect(() => {
    if (!cleSource || !source) return;
    setCarte({ cle: cleSource, titre: source.titre, origine: "labo" });
    setSelectionnee(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleSource]);

  /** Audio réellement envoyé comme point de départ. */
  const depart = selectionnee ? carte : null;

  /**
   * L'audio enregistré au micro est conservé dans « Mes audios » du demandeur.
   * Sans cela il vivrait sur R2 sans ligne en base : hors quota, et impossible
   * à supprimer pour celui qui l'a produit.
   */
  function surEnregistrement(cle: string, dureeSecondes?: number, tailleOctets?: number) {
    const nom = `Enregistrement ${formatDateHeure(new Date().toISOString())}`;
    setCarte({ cle, titre: nom, origine: "micro" });
    setSelectionnee(true);
    rangerAudio({
      nom,
      url: cle,
      dureeSecondes: dureeSecondes ?? null,
      tailleBytes: tailleOctets ?? null,
      format: "m4a",
    });
  }

  const empreinte = JSON.stringify({
    invite: invite.trim(),
    style: style.trim(),
    titre: titre.trim(),
    instrumental,
    duree,
    modeParoles,
    depart: depart?.cle ?? null,
  });
  const dejaEnvoyee = empreinte === derniereEnvoyee;
  const complet = modeParoles
    ? // Le mode personnalisé exige style et titre ; les paroles elles-mêmes ne
      // sont facultatives que si le morceau est instrumental.
      style.trim().length > 0 &&
      titre.trim().length > 0 &&
      (instrumental || invite.trim().length > 0)
    : invite.trim().length > 0;
  const peutLancer = !isPending && !dejaEnvoyee && complet;

  function lancer() {
    setMessage(null);
    demander(
      {
        prompt: invite.trim(),
        customMode: modeParoles,
        instrumental,
        // Hors mode personnalisé, l'API veut ces champs vides : les envoyer
        // quand même ferait basculer la demande sans qu'on l'ait demandé.
        style: modeParoles ? style.trim() || null : null,
        titre: modeParoles ? titre.trim() || null : null,
        duree,
        groupeId,
        sourceUrl: depart?.cle ?? null,
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
      <View style={{ gap: espacement.sm }}>
        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
          Point de départ
        </Texte>

        {carte && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 56,
              paddingLeft: espacement.md,
              borderRadius: rayons.md,
              backgroundColor: selectionnee ? couleurs.warmGold15 : couleurs.surfaceCarte,
              borderWidth: 1,
              borderColor: selectionnee ? "rgba(251,191,36,0.35)" : couleurs.bordure,
            }}
          >
            <Pressable
              onPress={() => setSelectionnee((v) => !v)}
              accessibilityRole="switch"
              accessibilityState={{ checked: selectionnee }}
              accessibilityLabel={`Partir de ${carte.titre}`}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: espacement.md,
                minHeight: 56,
              }}
            >
              <Ionicons
                name={ICONE_ORIGINE[carte.origine]}
                size={20}
                color={selectionnee ? couleurs.warmGold : couleurs.texteSecondaire}
              />
              <View style={{ flex: 1 }}>
                <Texte
                  variante="petit"
                  poids="semibold"
                  numberOfLines={1}
                  couleur={selectionnee ? couleurs.warmGold : couleurs.texte}
                >
                  {carte.titre}
                </Texte>
                <Texte variante="micro" couleur={couleurs.texteSecondaire} numberOfLines={1}>
                  {selectionnee ? "Reprise de cet audio" : libelleOrigine(carte.origine)}
                </Texte>
              </View>
            </Pressable>

            {/* La croix écarte l'audio ; la surface de la carte ne fait que
                cocher et décocher, la couleur suffisant à dire l'état. */}
            <Pressable
              onPress={() => {
                setCarte(null);
                setSelectionnee(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Retirer cet audio"
              hitSlop={8}
              style={{
                width: 48,
                height: 56,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: espacement.sm }}>
          <BoutonSource
            icone="albums-outline"
            libelle={candidats.length > 0 ? "Choisir un audio" : "Aucun audio"}
            desactive={candidats.length === 0}
            onPress={() => setChoixOuvert(true)}
          />
          <BoutonSource
            icone="mic-outline"
            libelle="Enregistrer"
            onPress={() => setMicroOuvert(true)}
          />
        </View>
      </View>

      {/* Informatif et non dissuasif : un rejet n'est pas facturé, l'essai ne
          coûte donc rien. */}
      {depart && (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: espacement.sm }}>
          <Ionicons name="information-circle-outline" size={16} color={couleurs.texteSecondaire} />
          <Texte variante="micro" couleur={couleurs.texteSecondaire} style={{ flex: 1 }}>
            {"En vertu du respect des droits d'auteur, l'audio proposé pourrait être rejeté."}
          </Texte>
        </View>
      )}

      {/* Le mode décide de la nature du grand champ : idée dont Suno tire des
          paroles, ou paroles chantées telles quelles. */}
      <View style={{ flexDirection: "row", gap: espacement.sm }}>
        <Puce
          libelle="Décrire"
          actif={!modeParoles}
          onPress={() => setModeParoles(false)}
        />
        <Puce
          libelle="Écrire les paroles"
          actif={modeParoles}
          onPress={() => setModeParoles(true)}
        />
      </View>

      {/* En personnalisé instrumental, l'API ignore ce champ : l'afficher
          laisserait croire que le texte saisi sera chanté. */}
      {!(modeParoles && instrumental) && (
        <Champ
          valeur={invite}
          surChanger={setInvite}
          placeholder={
            modeParoles
              ? "Le texte qui sera chanté, tel quel"
              : depart
                ? "Dans quel style le réarranger ? « version afrobeat, batterie et cuivres »"
                : "Décris le morceau : « gospel joyeux en si bémol, chœur et orgue Hammond »"
          }
          multiligne
          label={modeParoles ? "Paroles" : "Description"}
          aide={
            modeParoles
              ? "Chanté mot pour mot."
              : "Suno écrit les paroles à partir de cette idée."
          }
        />
      )}

      {modeParoles && (
        <>
          <Champ
            valeur={style}
            surChanger={setStyle}
            placeholder="Gospel ivoirien, tempo lent, chœur mixte, orgue Hammond, batterie discrète…"
            label="Style"
            multiligne
          />
          <Champ valeur={titre} surChanger={setTitre} placeholder="Titre du morceau" label="Titre" />
        </>
      )}

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

      {/* Même liste que l'onglet Générations IA, même composant : deux rendus
          concurrents du même objet finiraient par diverger. */}
      <OngletGenerations groupeId={groupeId} />

      <ModalChoix
        visible={choixOuvert}
        titre="Point de départ"
        elements={candidats.map((c) => ({
          id: c.cle,
          titre: c.titre,
          sousTitre: libelleOrigine(c.origine),
          icone: ICONE_ORIGINE[c.origine],
        }))}
        surChoisir={(cle) => {
          const choisi = candidats.find((c) => c.cle === cle);
          if (choisi) {
            setCarte(choisi);
            setSelectionnee(true);
          }
          setChoixOuvert(false);
        }}
        onFermer={() => setChoixOuvert(false)}
        messageVide="Aucun audio disponible comme point de départ."
      />

      <ModalEnregistrement
        visible={microOuvert}
        onFermer={() => setMicroOuvert(false)}
        dossier="generation/sources"
        onAjouter={(cle, _titreAudio, dureeSecondes, tailleOctets) =>
          surEnregistrement(cle, dureeSecondes, tailleOctets)
        }
      />
    </View>
  );
}

/** Bouton secondaire du choix de source : contour, largeur partagée. */
function BoutonSource({
  icone,
  libelle,
  onPress,
  desactive = false,
}: {
  icone: "albums-outline" | "mic-outline";
  libelle: string;
  onPress: () => void;
  desactive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="button"
      accessibilityLabel={libelle}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: espacement.xs,
        minHeight: 44,
        borderRadius: rayons.pill,
        borderWidth: 1,
        borderColor: couleurs.bordure,
        backgroundColor: couleurs.surfaceCarte,
        opacity: desactive ? 0.4 : 1,
      }}
    >
      <Ionicons name={icone} size={16} color={couleurs.texteSecondaire} />
      <Texte variante="micro" poids="semibold" couleur={couleurs.texte}>
        {libelle}
      </Texte>
    </Pressable>
  );
}

function Champ({
  valeur,
  surChanger,
  placeholder,
  label,
  aide,
  multiligne = false,
}: {
  valeur: string;
  surChanger: (v: string) => void;
  placeholder: string;
  label: string;
  /** Précise ce que l'API fera du texte : la nuance change le résultat. */
  aide?: string;
  multiligne?: boolean;
}) {
  return (
    <View style={{ gap: espacement.xs }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: espacement.sm }}>
        <Texte variante="micro" couleur={couleurs.texteSecondaire}>
          {label}
        </Texte>
        {aide && (
          <Texte variante="micro" couleur={couleurs.muted} numberOfLines={1} style={{ flex: 1 }}>
            {aide}
          </Texte>
        )}
      </View>
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
