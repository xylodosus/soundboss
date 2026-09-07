import { setAudioModeAsync } from "expo-audio";

/**
 * Bascule de la session audio entre lecture et enregistrement.
 *
 * `allowsRecording` vaut `false` par défaut et n'existe que sur iOS : sans
 * lui, `prepareToRecordAsync()` échoue et l'utilisateur ne voit qu'un
 * « Impossible de démarrer l'enregistrement ».
 *
 * Le retour en mode lecture n'est pas une politesse : tant que la session
 * reste en enregistrement, iOS route le son vers l'écouteur du haut et la
 * lecture devient presque inaudible.
 */
export async function modeEnregistrement(): Promise<void> {
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
}

export async function modeLecture(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldPlayInBackground: true,
  });
}
