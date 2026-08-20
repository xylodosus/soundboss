import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useMembresGroupe, useMettreAJourMembre, useNommerAdmin } from "@/lib/queries/groupes";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Avatar } from "@/components/ui/avatar";
import { Texte } from "@/components/ui/texte";
import { SqueletteListe } from "@/components/ui/etat-vide";
import { useQueryClient } from "@tanstack/react-query";
import { InvitationGroupe } from "@/components/groupe/invitation-groupe";

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
      <View style={{ alignItems: "center", paddingVertical: 32 }}>
        <Texte variante="petit" couleur={couleurs.texteSecondaire}>
          Aucun membre pour le moment.
        </Texte>
      </View>
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
              <View style={{ flexDirection: "row", gap: 4 }}>
                {!estAdmin && (
                  <View
                    onTouchEnd={() => {
                      setAction(membre.id);
                      nommerAdmin.mutate(
                        { membreId: membre.id, estAdmin: true },
                        {
                          onSettled: () => setAction(null),
                          onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groupes", "membres", groupeId] }),
                        }
                      );
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Nommer administrateur"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "rgba(251,191,36,0.3)",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: enAction ? 0.5 : 1,
                    }}
                  >
                    <Ionicons name="shield-outline" size={16} color={couleurs.warmGold} />
                  </View>
                )}
                <View
                  onTouchEnd={() => exclureMembre(membre)}
                  accessibilityRole="button"
                  accessibilityLabel="Exclure du groupe"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(224,82,74,0.3)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: enAction ? 0.5 : 1,
                  }}
                >
                  <Ionicons name="person-remove-outline" size={16} color={couleurs.danger} />
                </View>
              </View>
            )}
          </View>
        );
      })}
      </View>
    </View>
  );
}
