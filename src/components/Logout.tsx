import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function Logout() {
  const navigate = useNavigate();
  
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };
  return <button onClick={signOut}>Logi välja</button>;
}
