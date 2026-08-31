import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setAudioModeAsync } from "expo-audio";
import { urlLectureR2 } from "@/lib/r2";
import {
  LecteurAudioModal,
  type PisteAudio,
} from "@/components/ui/lecteur-audio-modal";

interface PisteDemandee {
  cle: string; // clé R2 (ou URL http)
  titre: string;
  sousTitre?: string;
  imageCle?: string | null; // couverture : photo de groupe / affiche de projet
}

interface ContexteAudio {
  /** Ouvre le lecteur audio sur une piste (clé R2 ou URL). */
  ouvrirPiste: (piste: PisteDemandee) => void;
}

const Contexte = createContext<ContexteAudio>({ ouvrirPiste: () => {} });

/**
 * Fournisseur du lecteur audio global : la modal flotte au-dessus de
 * tous les écrans. N'importe quel composant peut appeler useLecteurAudio().
 */
export function FournisseurAudio({ children }: { children: React.ReactNode }) {
  const [piste, setPiste] = useState<PisteAudio | null>(null);
  const [chargement, setChargement] = useState(false);

  // Lecture en mode silencieux iOS (coupure physique) et poursuite en
  // arrière-plan : l'app doit continuer à jouer écran verrouillé.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});
  }, []);

  const ouvrirPiste = useCallback(async (demande: PisteDemandee) => {
    setChargement(true);
    try {
      const url = await urlLectureR2(demande.cle);
      if (!url) return; // lecture indisponible : on n'ouvre rien
      setPiste({
        titre: demande.titre,
        sousTitre: demande.sousTitre,
        url,
        imageCle: demande.imageCle,
      });
    } finally {
      setChargement(false);
    }
  }, []);

  const fermer = useCallback(() => setPiste(null), []);

  return (
    <Contexte.Provider value={useMemo(() => ({ ouvrirPiste }), [ouvrirPiste])}>
      {children}
      <LecteurAudioModal
        piste={piste}
        visible={!!piste && !chargement}
        onFermer={fermer}
      />
    </Contexte.Provider>
  );
}

/** Hook : ouvre le lecteur audio global. */
export function useLecteurAudio(): ContexteAudio {
  return useContext(Contexte);
}
