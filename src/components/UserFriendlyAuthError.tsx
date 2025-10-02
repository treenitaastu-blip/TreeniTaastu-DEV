interface UserFriendlyAuthErrorProps {
  error: string;
}

export function UserFriendlyAuthError({ error }: UserFriendlyAuthErrorProps) {
  const getEstonianError = (errorMessage: string): string => {
    const lowerError = errorMessage.toLowerCase();
    
    // Signup errors
    if (lowerError.includes('user already registered') || lowerError.includes('email already in use')) {
      return "See e-post on juba registreeritud. Proovi sisse logida või kasuta parooli lähtestamist.";
    }
    
    if (lowerError.includes('signup is disabled')) {
      return "Registreerimine on hetkel keelatud. Võta ühendust administraatoriga.";
    }
    
    // Login errors
    if (lowerError.includes('invalid login credentials') || lowerError.includes('invalid email or password')) {
      return "Vale e-post või parool. Kontrolli andmeid või kasuta parooli lähtestamist.";
    }
    
    if (lowerError.includes('user not found')) {
      return "Selle e-mailiga kontot ei leitud. Palun loo konto või kontrolli e-maili aadressi.";
    }
    
    if (lowerError.includes('email not confirmed')) {
      return "E-post pole kinnitatud. Kontrolli oma e-posti ja kliki kinnituslinki.";
    }
    
    // Password reset errors
    if (lowerError.includes('password reset') && lowerError.includes('user not found')) {
      return "Selle e-mailiga kontot ei leitud. Kontrolli e-maili aadressi.";
    }
    
    // Google/OAuth errors
    if (lowerError.includes('oauth')) {
      return "Google'iga sisselogimine ebaõnnestus. Proovi uuesti või kasuta e-posti ja parooli.";
    }
    
    // Password validation errors
    if (lowerError.includes('password') && (lowerError.includes('weak') || lowerError.includes('strength'))) {
      return "Parool on liiga nõrk. Kasuta vähemalt 8 tähemärki, sh väiketähti, suurtähti ja numbreid.";
    }
    
    // Rate limiting
    if (lowerError.includes('rate limit') || lowerError.includes('too many requests')) {
      return "Liiga palju katseid. Oota mõni minut ja proovi uuesti.";
    }
    
    // Network errors
    if (lowerError.includes('network') || lowerError.includes('fetch')) {
      return "Ühenduse viga. Kontrolli internetiühendust ja proovi uuesti.";
    }
    
    // Default fallback
    return `Viga: ${errorMessage}`;
  };
  
  return <span>{getEstonianError(error)}</span>;
}