import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const { toast } = useToast();

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        toast({
          title: "Viga",
          description: "Makse sessiooni ID puudub",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId }
        });

        if (error) throw error;

        if (data?.success) {
          setVerified(true);
          toast({
            title: "Makse õnnestus!",
            description: "Sinu juurdepääs on aktiveeritud"
          });
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast({
          title: "Makse kinnitamisel tekkis viga",
          description: "Palun võta meiega ühendust, kui probleem püsib",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-semibold">Kinnitame makset...</h2>
              <p className="text-muted-foreground">
                Palun oota, kuni töötleme sinu tellimu
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-2xl">
            {verified ? "Makse õnnestus!" : "Makse lõpetatud"}
          </CardTitle>
          <CardDescription>
            {verified 
              ? "Sinu juurdepääs on edukalt aktiveeritud"
              : "Makse on töödeldud, kuid kinnitamine ebaõnnestus"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {sessionId && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                Makse ID: <code className="font-mono">{sessionId}</code>
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Link to="/programm">
              <Button className="w-full" size="lg">
                Alusta treeningprogrammiga
              </Button>
            </Link>
            
            <Link to="/">
              <Button variant="outline" className="w-full">
                Tagasi avalehele
              </Button>
            </Link>
          </div>

          {!verified && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                Kui sinu juurdepääs pole aktiveeritud, võta meiega ühendust tugimeili kaudu.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}