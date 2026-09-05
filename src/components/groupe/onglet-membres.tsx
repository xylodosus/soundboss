import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  useMembresGroupe,
  useMettreAJourMembre,
  useNommerAdmin,
  usePupitresGroupe,
} from "@/lib/queries/groupes";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Avatar } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { EtatVide, SqueletteListe } from "@/components/ui/etat-vide";
import { useQueryClient } from "@tanstack/react-query";
import { InvitationGroupe } from "@/components/groupe/invitation-groupe";
import { ModalChoix } from "@/components/ui/modal-choix";
import { nomAuteur } from "@/lib/chat-affichage";

export function OngletMembres({
  groupeId,
  chefId,
  estGestionnaire,
  groupeNom,
}: {
  groupeId: string;
  chefId: string;
  estGestionnaire: boolean;
  groupeNom?: string;
}) {
  const { data: membres = [], isLoading } = useMembresGroupe(groupeId);
  const nommerAdmin = useNommerAdmin();
  const mettreAJourMembre = useMettreAJourMembre();
  const queryClient = useQueryClient();
  const dialogue = useDialogue();
  const [action, setAction] = useState<string | null>(null);
  const { data: pupitres = [] } = usePupitresGroupe(groupeId);
  // Identifiant du membre dont le menu est ouvert, puis de celui à qui l'on
  // attribue un pupitre : deux modales successives, jamais simultanées.
  const [menuMembreId, setMenuMembreId] = useState<string | null>(null);
  const [pupitreMembreId, setPupitreMembreId] = useState<string | null>(null);

  function basculerAdmin(membre: (typeof actifs)[number]) {
    setAction(membre.id);
    nommerAdmin.mutate(
      { membreId: membre.id, estAdmin: !membre.est_admin },
      {
        onSettled: () => setAction(null),
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: ["groupes", "membres", groupeId] }),
        onError: () => dialogue.erreur("Impossible de modifier les droits de ce membre."),
      }
    );
  }

  /** role_id porte le pupitre ; null détache le membre de tout pupitre. */
  function attribuerPupitre(membreId: string, roleId: string | null) {
    setAction(membreId);
    mettreAJourMembre.mutate(
      { membreId, groupeId, modifications: { role_id: roleId } },
      {
        onSettled: () => setAction(null),
        onError: () => dialogue.erreur("Impossible d'attribuer ce pupitre."),
      }
    );
  }

  async function exclureMembre(membre: (typeof actifs)[number]) {
    const nom = `${membre.user?.prenom ?? ""} ${membre.user?.nom ?? ""}`.trim();
    const ok = await dialogue.confirmer({
      titre: "Exclure ce membre ?",
      message: `${nom} perdra l'accès au groupe.`,
      boutonConfirmer: "Exclure",
    });
    if (!ok) return;
    setAction(membre.id);
    try {
      await mettreAJourMembre.mutateAsync({
        membreId: membre.id,
        groupeId,
        modifications: { statut: "exclu" },
      });
      dialogue.succes("Membre exclu du groupe.");
    } catch {
      dialogue.erreur("Impossible d'exclure ce membre.");
    } finally {
      setAction(null);
    }
  }

  const actifs = membres
    .filter((m) => m.statut === "actif")
    .sort((a, b) => {
      const roleA = a.role?.ordre ?? 99;
      const roleB = b.role?.ordre ?? 99;
      return roleA - roleB;
    });

  if (isLoading) {
    return (
      <View>
        <SqueletteListe lignes={2} hauteur={64} />
      </View>
    );
  }

  if (membres.length === 0) {
    return (
      <EtatVide
        icone="people-outline"
        titre="Aucun membre"
        message="Partage le code du groupe pour que les premiers membres le rejoignent."
      />
    );
  }

  return (
    <View style={{ gap: 20 }}>
      {estGestionnaire && (
        <InvitationGroupe groupeId={groupeId} groupeNom={groupeNom ?? "mon groupe"} />
      )}

      <View style={{ gap: 8 }}>
        <Texte variante="micro" poids="bold" couleur={couleurs.texteSecondaire} style={{ letterSpacing: 1 }}>
          MEMBRES · {actifs.length}
        </Texte>
        {actifs.map((membre) => {
        const estChef = membre.user_id === chefId;
        const estAdmin = membre.est_admin ?? false;
        const enAction = action === membre.id;

        return (
          <View
            key={membre.id}
            style={{
              borderRadius: rayons.md,
              borderWidth: 1,
              borderColor: couleurs.bordure,
              backgroundColor: couleurs.surfaceCarte,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Avatar
              prenom={membre.user?.prenom}
              nom={membre.user?.nom}
              url={membre.user?.avatar_url}
              taille={42}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Texte poids="semibold" variante="petit" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {membre.user?.prenom} {membre.user?.nom}
                </Texte>
                {estChef && <Ionicons name="sparkles" size={14} color={couleurs.warmGold} />}
                {estAdmin && !estChef && (
                  <Ionicons name="shield-checkmark" size={14} color={couleurs.terracottaLight} />
                )}
              </View>
              {membre.role && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: membre.role.couleur ?? couleurs.muted,
                    }}
                  />
                  <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                    {membre.role.nom}
                  </Texte>
                </View>
              )}
            </View>

            {estGestionnaire && !estChef && (
              <Pressable
                onPress={() => setMenuMembreId(membre.id)}
                disabled={enAction}
                accessibilityRole="button"
                accessibilityLabel={`Actions pour ${nomAuteur(membre.user)}`}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: enAction ? 0.5 : 1,
                }}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={18}
                  color={couleurs.texteSecondaire}
                />
              </Pressable>
            )}
          </View>
        );
      })}
      </View>

      <ModalChoix
        visible={!!menuMembreId}
        titre={nomAuteur(actifs.find((m) => m.id === menuMembreId)?.user)}
        elements={[
          { id: "pupitre", titre: "Attribuer un pupitre", icone: "musical-notes-outline" },
          {
            id: "admin",
            titre: actifs.find((m) => m.id === menuMembreId)?.est_admin
              ? "Retirer les droits d'administrateur"
              : "Nommer administrateur",
            icone: "shield-outline",
          },
          { id: "exclure", titre: "Exclure du groupe", icone: "person-remove-outline" },
        ]}
        surChoisir={(choix) => {
          const membre = actifs.find((m) => m.id === menuMembreId);
          setMenuMembreId(null);
          if (!membre) return;
          if (choix === "pupitre") setPupitreMembreId(membre.id);
          else if (choix === "admin") basculerAdmin(membre);
          else if (choix === "exclure") exclureMembre(membre);
        }}
        onFermer={() => setMenuMembreId(null)}
      />

      <ModalChoix
        visible={!!pupitreMembreId}
        titre="Attribuer un pupitre"
        messageVide="Ce groupe n'a pas encore de pupitre."
        elements={[
          { id: "aucun", titre: "Aucun pupitre", icone: "close-circle-outline" },
          ...pupitres.map((p) => ({
            id: p.id,
            titre: p.nom,
            icone: "musical-notes-outline" as const,
          })),
        ]}
        surChoisir={(choix) => {
          const membreId = pupitreMembreId;
          setPupitreMembreId(null);
          if (membreId) attribuerPupitre(membreId, choix === "aucun" ? null : choix);
        }}
        onFermer={() => setPupitreMembreId(null)}
      />
    </View>
  );
}
