/** Traduction des erreurs Supabase/Auth en français (même logique que le web). */
export function erreurFrancaise(message: string): string {
  const erreurs: Record<string, string> = {
    "Invalid login credentials":
      "Email ou mot de passe incorrect.",
    "Email not confirmed":
      "Email non confirmé. Vérifie ta boîte mail.",
    "User already registered":
      "Un compte existe déjà avec cet email.",
    "Password should be at least 6 characters":
      "Le mot de passe doit contenir au moins 6 caractères.",
    "Signups not allowed for otp":
      "L'inscription par téléphone n'est pas disponible pour le moment.",
    "Token has expired or is invalid":
      "Ce code est expiré ou invalide. Demande un nouveau code.",
    "For security purposes, you can only request this once every 60 seconds":
      "Attends une minute avant de redemander un code.",
    "Unable to validate email address: invalid format":
      "Adresse email invalide.",
    "User not found":
      "Aucun compte associé à cet email.",
    "Password recovery requires an email":
      "Indique ton email pour réinitialiser le mot de passe.",
    "New password should be different from the old password":
      "Le nouveau mot de passe doit être différent de l'ancien.",
    "Network error":
      "Problème de connexion. Vérifie ta connexion internet.",
  };
  return erreurs[message] ?? message;
}
