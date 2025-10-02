import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Tagasi avalehele
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Kasutustingimused</CardTitle>
            <p className="text-muted-foreground">Viimati uuendatud: {new Date().toLocaleDateString('et-EE')}</p>
          </CardHeader>
          <CardContent className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Teenuse kirjeldus</h2>
              <p>
                Treenitaastu on digitaalne fitness platvorm, mis pakub personaalseid treeningkavasid, 
                video juhendeid ja progressi jälgimist. Teenus on saadaval veebis ja mobiilses äppis.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Kasutajaks registreerumine</h2>
              <p>
                Teenuse kasutamiseks peate:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Olema vähemalt 16-aastane</li>
                <li>Andma õiged ja ajakohased andmed</li>
                <li>Hoidma oma konto turvalisena</li>
                <li>Vastutama oma konto all toimuva eest</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Tellimused ja maksed</h2>
              <h3 className="text-lg font-medium mb-2">3.1 Hinnad</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Kuu pakett: 14,99€ kuus</li>
                <li>Aasta pakett: 9,99€ kuus (119,88€ aastas)</li>
              </ul>
              
              <h3 className="text-lg font-medium mb-2 mt-4">3.2 Maksmine</h3>
              <p>
                Maksed töödeldakse turvaliselt läbi Stripe. Tellimus uueneb automaatselt, 
                kuni selle tühistate.
              </p>
              
              <h3 className="text-lg font-medium mb-2 mt-4">3.3 Tagasimaksed</h3>
              <p>
                30-päevane tagasimakse garantii uutele kasutajatele. Pärast seda 
                tagasimakseid ei toimu, välja arvatud seadusega nõutud juhtudel.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Kasutusreeglid</h2>
              <p>Keelatud on:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Sisu ilma loata edasi müümine või jagamine</li>
                <li>Konto andmete jagamine teistega</li>
                <li>Teenuse automatiseeritud kasutamine</li>
                <li>Kahjuliku koodi üles laadimine</li>
                <li>Teiste kasutajate häirimine</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Intellektuaalomand</h2>
              <p>
                Kõik Treenitaastu sisu (videod, treeningkavad, tekstid) on meie 
                intellektuaalomand. Teil on ainult kasutusõigus isiklikuks kasutamiseks.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Tervisehoiatus</h2>
              <p>
                <strong>TÄHTIS:</strong> Enne treeningutega alustamist konsulteerige arstiga. 
                Treenitaastu ei vastuta vigastuste või tervisekahjude eest. Kuulake oma keha 
                ja lõpetage treening ebamugavuse korral.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Teenuse kättesaadavus</h2>
              <p>
                Püüame tagada 99,9% teenuse kättesaadavuse, kuid ei saa garanteerida 
                katkestustevaba kasutamist. Hooldustööd tehakse ette teatades.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Vastutuse piiramine</h2>
              <p>
                Treenitaastu vastutus on piiratud makstud tellimuse summaga. 
                Me ei vastuta kaudse kahju või kasusaamata jäämise eest.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Tellimuse lõpetamine</h2>
              <p>
                Saate tellimuse igal ajal tühistada konto seadetes. Juurdepääs jääb 
                aktiivseks makstud perioodi lõpuni.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Tingimuste muutmine</h2>
              <p>
                Tingimusi võime muuta, teavitades sellest 30 päeva ette. 
                Jätkuv kasutamine tähendab muudatustega nõustumist.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Kohaldatav õigus</h2>
              <p>
                Tingimustele kohaldub Eesti Vabariigi õigus. Vaidlused lahendatakse 
                Eesti kohtutes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Kontakt</h2>
              <p>
                Küsimuste korral võtke meiega ühendust:
                <br />
                E-post: info@treenitaastu.app
                <br />
                Veeb: treenitaastu.app
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}