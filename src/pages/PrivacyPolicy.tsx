import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
            <CardTitle className="text-3xl font-bold">Privaatsuspoliitika</CardTitle>
            <p className="text-muted-foreground">Viimati uuendatud: {new Date().toLocaleDateString('et-EE')}</p>
          </CardHeader>
          <CardContent className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Üldinfo</h2>
              <p>
                Treenitaastu ("meie", "meid", "meile") austab teie privaatsust ja kohustub kaitsta teie isikuandmeid. 
                See privaatsuspoliitika selgitab, kuidas me kogume, kasutame ja kaitseme teie teavet meie teenuste kasutamisel.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Kogutavad andmed</h2>
              <h3 className="text-lg font-medium mb-2">2.1 Isikuandmed</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>E-posti aadress</li>
                <li>Nimi</li>
                <li>Treeningtulemused ja progress</li>
                <li>Kasutajeeelised ja seaded</li>
              </ul>
              
              <h3 className="text-lg font-medium mb-2 mt-4">2.2 Tehnilised andmed</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>IP-aadress</li>
                <li>Seadme info</li>
                <li>Kasutamisstatistika</li>
                <li>Küpsised (cookies)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Andmete kasutamine</h2>
              <p>Teie andmeid kasutatakse:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Personaalsete treeningkavade loomiseks</li>
                <li>Teenuse osutamiseks ja parandamiseks</li>
                <li>Klienditoeks</li>
                <li>Maksete töötlemiseks</li>
                <li>Seaduslike kohustuste täitmiseks</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Andmete jagamine</h2>
              <p>
                Me ei jaga teie isikuandmeid kolmandate osapooltega, välja arvatud:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Makseteenuse pakkujatega (Stripe)</li>
                <li>Tehniliste teenusepakkujatega (Supabase)</li>
                <li>Seadusega nõutud juhtudel</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibild mb-3">5. Andmete säilitamine</h2>
              <p>
                Säilitame teie andmeid nii kaua, kui see on vajalik teenuse osutamiseks või 
                seadusega nõutud. Konto kustutamisel kustutatakse kõik isikuandmed.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Teie õigused</h2>
              <p>Teil on õigus:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Tutvuda oma andmetega</li>
                <li>Parandada ebatäpseid andmeid</li>
                <li>Kustutada oma konto ja andmed</li>
                <li>Piirata andmetöötlust</li>
                <li>Esitada kaebusi Andmekaitse Inspektsioonile</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Küpsised</h2>
              <p>
                Kasutame küpsiseid teenuse funktsionaalsuse tagamiseks ja kasutajakogemuse 
                parandamiseks. Saate küpsised oma brauseri seadetes keelata.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Kontakt</h2>
              <p>
                Küsimuste korral võtke meiega ühendust: 
                <br />
                E-post: info@treenitaastu.app
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}