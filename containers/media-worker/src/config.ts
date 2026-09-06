/**
 * Variables d'environnement du service. Toutes les dépendances externes
 * (R2, Supabase, secret d'appel) passent par ici : l'image reste identique
 * quel que soit l'hébergeur.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 80),
  /** Secret partagé attendu en `Authorization: Bearer …`. */
  workerSecret: required('MEDIA_WORKER_SECRET'),

  r2: {
    accountId: required('R2_ACCOUNT_ID'),
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    bucket: required('R2_BUCKET_NAME'),
    /**
     * Endpoint S3 de R2. Le défaut vise la **juridiction par défaut**, comme le
     * font les edge functions du projet — et non `.eu`, qui n'est requis que
     * pour un bucket créé explicitement en juridiction Union européenne.
     *
     * La distinction est piégeuse : un bucket dont l'*emplacement* est en
     * Europe reste dans la juridiction par défaut. Forcer `.eu` visait alors un
     * bucket homonyme inexistant, et chaque téléchargement échouait en 404 sans
     * que rien ne signale l'erreur d'adresse (constaté le 31/08).
     *
     * Renseigner R2_ENDPOINT pour surcharger, avec la même valeur que celle des
     * edge functions.
     */
    endpoint:
      process.env.R2_ENDPOINT ??
      `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  },

  supabase: {
    url: required('SUPABASE_URL').replace(/\/+$/, ''),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },

  /** Garde-fou : au-delà, on refuse le job plutôt que saturer le disque. */
  maxFileBytes: Number(process.env.MAX_FILE_BYTES ?? 1_500_000_000),
  /** Conserver le fichier source après traitement (v1 : oui, filet de sécurité). */
  deleteSourceAfterProcessing: process.env.DELETE_SOURCE_AFTER_PROCESSING === 'true',

  kie: {
    /** Absente, la génération reste inerte plutôt que d'échouer bruyamment. */
    apiKey: process.env.KIE_API_KEY ?? '',
    /** Adresse publique du conteneur : Kie.ai y renvoie la fin de génération.
     *  Sans elle, la génération ne peut pas être lancée — le résultat
     *  n'arriverait nulle part. */
    baseUrlPublique: process.env.PUBLIC_BASE_URL ?? '',
    /** Les fichiers de Kie.ai expirent au bout de 14 jours : on les rapatrie. */
    bitrate: process.env.KIE_BITRATE ?? '128k',
  },

  fadr: {
    /** Absente, la séparation reste inerte : une fonctionnalité qui se tait vaut
     *  mieux qu'un service qui tombe. Même règle que le déclencheur d'analyse
     *  tant que le conteneur n'existait pas. */
    apiKey: process.env.FADR_API_KEY ?? '',
    /** Fadr ne documente aucun état d'échec : seule une échéance distingue une
     *  tâche échouée d'une tâche lente. */
    delaiMaxMs: Number(process.env.FADR_TIMEOUT_MS ?? 15 * 60 * 1000),
    /** Les stems se jouent ENSEMBLE : cinq pistes stéréo à 48 kHz feraient
     *  515 Mo décodés sur l'appareil. Mono à 22 050 Hz ramène chacune à ~26 Mo. */
    frequenceStems: Number(process.env.FADR_STEM_SAMPLE_RATE ?? 22050),
    bitrateStems: process.env.FADR_STEM_BITRATE ?? '64k',
  },

  waveform: {
    /** Non destructif : activé par défaut. */
    enabled: process.env.ENABLE_WAVEFORM !== 'false',
    /** Nombre de pics produits, indépendant de la durée : le lecteur les étire. */
    peakCount: Number(process.env.WAVEFORM_PEAKS ?? 1000),
    /** Fréquence de décodage pour la mesure. 8 kHz mono suffit très largement
     *  pour une enveloppe visuelle, et divise par 6 le volume à parcourir. */
    sampleRate: 8000,
  },

  loudness: {
    /** DESTRUCTIF (réencodage) : livré désactivé, à activer après vérification
     *  sur un fichier témoin. */
    enabled: process.env.ENABLE_LOUDNESS_NORMALIZATION === 'true',
    /** -16 LUFS : cible usuelle pour la parole / le podcast. */
    targetLufs: Number(process.env.LOUDNESS_TARGET_LUFS ?? -16),
    /** Tolérance : en deçà, on ne réencode pas — inutile d'abîmer un fichier
     *  déjà correct pour 1 dB.
     *
     *  Astuce : une valeur volontairement énorme (99) transforme l'étape en
     *  simple MESURE — la sonie est relevée et enregistrée dans
     *  `metadata.loudness_lufs`, sans qu'aucun réencodage ne se déclenche.
     *  C'est le moyen de connaître l'état d'un corpus avant de décider. */
    toleranceLu: Number(process.env.LOUDNESS_TOLERANCE_LU ?? 2),
    /**
     * Débit du réencodage AAC.
     *
     * ⚠️ Ce réglage décide seul si la normalisation allège ou alourdit la
     * bibliothèque. Mesuré sur le corpus Cevlord : des mp3 de sermons à
     * ~92 kbps. Réencoder à 128 kbps les ferait passer de 419 à 581 Mo — on
     * paierait une perte de génération POUR grossir. À 64 kbps, l'AAC vaut au
     * moins le mp3 à 92 pour de la parole, et le total tombe à 291 Mo.
     *
     * D'où ce défaut à 64k, adapté à la voix. Pour de la musique, ou si l'on
     * préfère rester prudent, 96k reste proche du débit d'origine.
     */
    aacBitrate: process.env.LOUDNESS_AAC_BITRATE ?? '64k',
  },
};
