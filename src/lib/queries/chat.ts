import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/lib/database.types";
import { supabase, utilisateurId } from "@/lib/supabase";

type Message = Database["public"]["Tables"]["messages"]["Row"];

export const clefsChat = {
  conversations: ["chat", "conversations"] as const,
  messages: (groupeId: string, pupitreId?: string | null) =>
    ["chat", "messages", groupeId, pupitreId ?? "general"] as const,
};

export type Conversation = {
  groupe: Pick<Database["public"]["Tables"]["groupes"]["Row"], "id" | "nom" | "photo_url"> | null;
  dernierMessage: Pick<Message, "id" | "contenu" | "type" | "created_at"> | null;
};

export function useConversations() {
  return useQuery({
    queryKey: clefsChat.conversations,
    queryFn: async (): Promise<Conversation[]> => {
      const userId = await utilisateurId();

      const { data: membreships } = await supabase
        .from("groupe_membres")
        .select("groupe:groupes(id, nom, photo_url)")
        .eq("user_id", userId)
        .eq("statut", "actif");

      const { data: groupesChef } = await supabase
        .from("groupes")
        .select("id, nom, photo_url")
        .eq("chef_id", userId);

      const groupes = [...(membreships ?? []).map((m) => m.groupe), ...(groupesChef ?? [])].filter(
        (g, i, arr) => g && arr.findIndex((x) => x?.id === g.id) === i
      );

      const conversations: Conversation[] = [];
      for (const groupe of groupes) {
        if (!groupe) continue;
        const { data: dernier } = await supabase
          .from("messages")
          .select("id, contenu, type, created_at")
          .eq("groupe_id", groupe.id)
          .is("pupitre_id", null)
          .eq("est_supprime", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        conversations.push({
          groupe: { id: groupe.id, nom: groupe.nom, photo_url: groupe.photo_url },
          dernierMessage: dernier ?? null,
        });
      }

      return conversations.sort((a, b) =>
        (b.dernierMessage?.created_at ?? "").localeCompare(a.dernierMessage?.created_at ?? "")
      );
    },
  });
}

export function useMessages(groupeId: string, pupitreId?: string | null) {
  return useQuery({
    queryKey: clefsChat.messages(groupeId, pupitreId),
    queryFn: async (): Promise<
      (Message & {
        user: { id: string; prenom: string | null; nom: string | null; avatar_url: string | null } | null;
        parent: {
          id: string;
          user_id: string | null;
          contenu: string | null;
          type: string | null;
          fichier_nom: string | null;
          user: { id: string; prenom: string | null; nom: string | null } | null;
        } | null;
      })[]
    > => {
      let requete = supabase
        .from("messages")
        .select("*, user:users(id, prenom, nom, avatar_url)")
        .eq("groupe_id", groupeId)
        .eq("est_supprime", false)
        .order("created_at", { ascending: true });

      if (pupitreId) {
        requete = requete.eq("pupitre_id", pupitreId);
      } else {
        requete = requete.is("pupitre_id", null);
      }

      const { data } = await requete;
      const messages = (data ?? []) as unknown as (Message & {
        user: { id: string; prenom: string | null; nom: string | null; avatar_url: string | null } | null;
      })[];

      // Messages parents (réponses) : requête séparée pour éviter l'embedding self-référentiel.
      const idsParents = [
        ...new Set(messages.map((m) => m.parent_message_id).filter(Boolean)),
      ] as string[];
      const parentsParId: Record<
        string,
        {
          id: string;
          user_id: string | null;
          contenu: string | null;
          type: string | null;
          fichier_nom: string | null;
          user: { id: string; prenom: string | null; nom: string | null } | null;
        }
      > = {};
      if (idsParents.length > 0) {
        const { data: parents } = await supabase
          .from("messages")
          .select("id, user_id, contenu, type, fichier_nom, user:users(id, prenom, nom)")
          .in("id", idsParents);
        for (const p of (parents ?? []) as unknown as {
          id: string;
          user_id: string | null;
          contenu: string | null;
          type: string | null;
          fichier_nom: string | null;
          user: { id: string; prenom: string | null; nom: string | null } | null;
        }[]) {
          parentsParId[p.id] = p;
        }
      }

      return messages.map((m) => ({
        ...m,
        parent: m.parent_message_id ? (parentsParId[m.parent_message_id] ?? null) : null,
      }));
    },
  });
}

/** Realtime : s'abonne aux changements de la table messages. */
export function useRealtimeMessages(groupeId: string, pupitreId?: string | null) {
  const queryClient = useQueryClient();
  const cle = clefsChat.messages(groupeId, pupitreId);

  useEffect(() => {
    const canal = supabase
      .channel(`messages-${groupeId}-${pupitreId ?? "general"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `groupe_id=eq.${groupeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: cle });
          queryClient.invalidateQueries({ queryKey: clefsChat.conversations });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [groupeId, pupitreId, cle, queryClient]);
}

export function useEnvoyerMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupeId,
      contenu,
      type = "texte",
      fichier,
      pupitreId,
      parentMessageId,
      mentionIds,
    }: {
      groupeId: string;
      contenu?: string | null;
      type?: Database["public"]["Enums"]["message_type"];
      fichier?: { url: string; nom?: string; taille?: number; duree?: number } | null;
      pupitreId?: string | null;
      parentMessageId?: string | null;
      mentionIds?: string[] | null;
    }) => {
      const userId = await utilisateurId();
      const { error } = await supabase.from("messages").insert({
        groupe_id: groupeId,
        user_id: userId,
        contenu: contenu ?? null,
        type,
        fichier_url: fichier?.url ?? null,
        fichier_nom: fichier?.nom ?? null,
        fichier_taille: fichier?.taille ?? null,
        pupitre_id: pupitreId ?? null,
        parent_message_id: parentMessageId ?? null,
        mentions: mentionIds && mentionIds.length > 0 ? mentionIds : null,
      });
      if (error) throw new Error("Impossible d'envoyer le message.");
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsChat.messages(v.groupeId, v.pupitreId) });
      queryClient.invalidateQueries({ queryKey: clefsChat.conversations });
    },
  });
}

/** Modifie le contenu d'un message (l'envoyeur, limite 30 min côté client). */
export function useModifierMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      groupeId,
      pupitreId,
      contenu,
    }: {
      messageId: string;
      groupeId: string;
      pupitreId?: string | null;
      contenu: string;
    }) => {
      const { error } = await supabase
        .from("messages")
        .update({ contenu, est_modifie: true })
        .eq("id", messageId);
      if (error) throw new Error("Impossible de modifier le message.");
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsChat.messages(v.groupeId, v.pupitreId) });
      queryClient.invalidateQueries({ queryKey: clefsChat.conversations });
    },
  });
}

/**
 * Suppression d'un message (envoyeur ou chef du groupe).
 * Note : la suppression douce (est_supprime = true) est bloquée par la RLS
 * (la nouvelle ligne doit rester visible par la politique SELECT) — on supprime donc réellement.
 */
export function useSupprimerMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      groupeId,
      pupitreId,
    }: {
      messageId: string;
      groupeId: string;
      pupitreId?: string | null;
    }) => {
      const { error } = await supabase.from("messages").delete().eq("id", messageId);
      if (error) throw new Error("Impossible de supprimer le message.");
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsChat.messages(v.groupeId, v.pupitreId) });
      queryClient.invalidateQueries({ queryKey: clefsChat.conversations });
    },
  });
}

/** Marquage lu (insertion groupée, upsert). */
export function useMarquerLu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupeId,
      messageIds,
    }: {
      groupeId: string;
      messageIds: string[];
    }) => {
      const userId = await utilisateurId();
      if (messageIds.length === 0) return;
      const { error } = await supabase.from("messages_lus").upsert(
        messageIds.map((messageId) => ({ message_id: messageId, user_id: userId })),
        { onConflict: "message_id,user_id" }
      );
      if (error) throw new Error("Impossible de marquer comme lu.");
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: clefsChat.messages(v.groupeId) });
      queryClient.invalidateQueries({ queryKey: ["non-lus"] });
    },
  });
}

export function useEpinglerMessage(groupeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, epingle }: { messageId: string; epingle: boolean }) => {
      const { error } = await supabase
        .from("messages")
        .update({ est_epingle: epingle })
        .eq("id", messageId);
      if (error) throw new Error("Impossible de modifier le message.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clefsChat.messages(groupeId) }),
  });
}
