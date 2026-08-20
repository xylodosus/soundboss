import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BoiteDialogue } from "@/components/ui/boite-dialogue";

export type OptionsConfirmation = {
  titre: string;
  message?: string;
  boutonConfirmer?: string;
  boutonAnnuler?: string;
  /** Style « danger » du bouton de confirmation (fond rouge). Défaut : true. */
  danger?: boolean;
};

type EtatDialogue =
  | {
      variante: "confirmation";
      options: OptionsConfirmation;
      resoudre: (valide: boolean) => void;
    }
  | {
      variante: "succes" | "erreur";
      titre: string;
      message: string;
      resoudre: () => void;
    }
  | null;

export type ApiDialogue = {
  /** Demande une confirmation. Résout true si l'utilisateur confirme. */
  confirmer: (options: OptionsConfirmation) => Promise<boolean>;
  /** Affiche un message de succès. */
  succes: (message: string, titre?: string) => Promise<void>;
  /** Affiche un message d'erreur. */
  erreur: (message: string, titre?: string) => Promise<void>;
};

const ContexteDialogue = createContext<ApiDialogue | null>(null);

export function FournisseurDialogue({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatDialogue>(null);

  const confirmer = useCallback((options: OptionsConfirmation) => {
    return new Promise<boolean>((resoudre) => {
      setEtat({ variante: "confirmation", options, resoudre });
    });
  }, []);

  const succes = useCallback((message: string, titre = "C'est fait !") => {
    return new Promise<void>((resoudre) => {
      setEtat({ variante: "succes", titre, message, resoudre });
    });
  }, []);

  const erreur = useCallback((message: string, titre = "Une erreur est survenue") => {
    return new Promise<void>((resoudre) => {
      setEtat({ variante: "erreur", titre, message, resoudre });
    });
  }, []);

  const api = useMemo<ApiDialogue>(
    () => ({ confirmer, succes, erreur }),
    [confirmer, succes, erreur]
  );

  return (
    <ContexteDialogue.Provider value={api}>
      {children}

      {etat && etat.variante === "confirmation" ? (
        <BoiteDialogue
          visible
          variante="confirmation"
          titre={etat.options.titre}
          message={etat.options.message}
          boutonConfirmer={etat.options.boutonConfirmer ?? "Supprimer"}
          boutonAnnuler={etat.options.boutonAnnuler ?? "Annuler"}
          danger={etat.options.danger ?? true}
          surAnnuler={() => {
            etat.resoudre(false);
            setEtat(null);
          }}
          surConfirmer={() => {
            etat.resoudre(true);
            setEtat(null);
          }}
        />
      ) : etat ? (
        <BoiteDialogue
          visible
          variante={etat.variante}
          titre={etat.titre}
          message={etat.message}
          boutonConfirmer="OK"
          surConfirmer={() => {
            etat.resoudre();
            setEtat(null);
          }}
          surFermer={() => {
            etat.resoudre();
            setEtat(null);
          }}
        />
      ) : null}
    </ContexteDialogue.Provider>
  );
}

export function useDialogue(): ApiDialogue {
  const contexte = useContext(ContexteDialogue);
  if (!contexte) {
    throw new Error("useDialogue doit être utilisé sous <FournisseurDialogue>.");
  }
  return contexte;
}
