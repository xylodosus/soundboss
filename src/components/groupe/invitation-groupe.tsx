import { useState } from "react";
import { Pressable, Share, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useGenererInvitation,
  useInvitationsGroupe,
  useRetirerInvitation,
} from "@/lib/queries/groupes";
import { useDialogue } from "@/lib/dialogue";
import { couleurs, rayons } from "@/lib/theme";
import { Texte } from "@/components/ui/texte";
import { Bouton } from "@/components/ui/bouton";
import { SqueletteListe } from "@/components/ui/etat-vide";
import { formatDateHeure } from "@/lib/format";

/** Gestion des invitations du groupe (chef/admin) : code 6 chiffres, 48 h. */
export function InvitationGroupe({ groupeId, groupeNom }: { groupeId: string; groupeNom: string }) {
  const { data: invitations = [], isLoading } = useInvitationsGroupe(groupeId, true);
  const generer = useGenererInvitation();
  const retirer = useRetirerInvitation(groupeId);
  const dialogue = useDialogue();

  const [codeActif, setCodeActif] = useState<{ code: string; expireAt: string } | null>(null);

  const invitationsActives = invitations.filter((i) => i.est_actif && new Date(i.expire_at) > new Date());

  async function genererCode() {
    try {
      const resultat = await generer.mutateAsync(groupeId);
      if (resultat) setCodeActif({ code: resultat.code, expireAt: resultat.expire_at });
    } catch {
      dialogue.erreur("Impossible de générer le code d'invitation.");
    }
  }

  async function partager(code: string) {
    const lien = `soundboss://rejoindre?code=${code}`;
    const message = `Rejoins mon groupe « ${groupeNom} » sur SoundBoss avec le code : ${code} (valable 48 h)\n${lien}`;
    try {
      await Share.share({ message });
    } catch {}
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Texte variante="petit" poids="semibold" couleur={couleurs.texteSecondaire}>
          Invitations ({invitationsActives.length})
        </Texte>
        <Bouton
          variante="secondaire"
          taille="sm"
          titre="Générer un code"
          onPress={genererCode}
          chargement={generer.isPending}
        />
      </View>

      {/* Code fraîchement généré */}
      {codeActif && (
        <View
          style={{
            borderRadius: rayons.lg,
            borderWidth: 1,
            borderColor: "rgba(251,191,36,0.35)",
            backgroundColor: couleurs.surfaceCarte,
            padding: 16,
            alignItems: "center",
            gap: 10,
          }}
        >
          <Texte variante="micro" poids="bold" couleur={couleurs.texteSecondaire} style={{ letterSpacing: 1 }}>
            CODE D&apos;INVITATION · VALABLE 48 H
          </Texte>
          <Texte variante="titre2" poids="extrabold" couleur={couleurs.warmGold} style={{ letterSpacing: 8 }}>
            {codeActif.code}
          </Texte>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Bouton
              variante="secondaire"
              taille="sm"
              titre="Partager"
              onPress={() => partager(codeActif.code)}
            >
              <Ionicons name="share-outline" size={14} color={couleurs.cream} />
            </Bouton>
          </View>
          <Texte variante="micro" couleur={couleurs.texteFaible}>
            Le code ne sera plus réaffiché après cette fenêtre.
          </Texte>
        </View>
      )}

      {/* Invitations actives */}
      {isLoading ? (
        <SqueletteListe lignes={1} hauteur={48} />
      ) : invitationsActives.length > 0 ? (
        <View style={{ gap: 8 }}>
          {invitationsActives.map((invitation) => (
            <View
              key={invitation.id}
              style={{
                borderRadius: rayons.md,
                borderWidth: 1,
                borderColor: couleurs.bordure,
                backgroundColor: couleurs.surfaceCarte,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Ionicons name="key-outline" size={18} color={couleurs.warmGold} />
              <View style={{ flex: 1 }}>
                <Texte variante="petit" poids="semibold">
                  Code · expiré le {formatDateHeure(invitation.expire_at)}
                </Texte>
                <Texte variante="micro" couleur={couleurs.texteSecondaire}>
                  {invitation.utilisations ?? 0} inscription{(invitation.utilisations ?? 0) > 1 ? "s" : ""} · créée le{" "}
                  {formatDateHeure(invitation.created_at)}
                </Texte>
              </View>
              <Pressable
                onPress={async () => {
                  const ok = await dialogue.confirmer({
                    titre: "Révoquer ce code ?",
                    message: "Personne ne pourra plus rejoindre avec ce code.",
                    boutonConfirmer: "Révoquer",
                  });
                  if (!ok) return;
                  try {
                    await retirer.mutateAsync(invitation.id);
                    dialogue.succes("Invitation révoquée.");
                  } catch {
                    dialogue.erreur("Impossible de révoquer l'invitation.");
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Révoquer le code"
                hitSlop={8}
              >
                <Ionicons name="close-circle-outline" size={20} color={couleurs.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Texte variante="micro" couleur={couleurs.texteFaible}>
          Aucun code actif. Génère un code pour inviter des membres.
        </Texte>
      )}
    </View>
  );
}
