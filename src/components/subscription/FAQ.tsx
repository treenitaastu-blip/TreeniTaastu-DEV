import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function FAQ() {
  const faqs = [
    {
      question: "Kuidas tasuta proov töötab?",
      answer: "Tasuta proov kestab 7 päeva ja annab ligipääsu kõigile funktsioonidele. Krediitkaart ei ole vajalik ja saate proovi igal ajal tühistada."
    },
    {
      question: "Kas saan proovi tühistada?",
      answer: "Jah, saate proovi tühistada igal ajal. Kui tühistate enne 7 päeva möödumist, ei tehta teile ühtegi tasu."
    },
    {
      question: "Milline on erinevus iseseisva ja juhendatud treeningu vahel?",
      answer: "Iseseisev treening annab ligipääsu kõigile programmidele ja harjutustele. Juhendatud treening lisab personaalseid tagasisideid, kava kohandusi ja prioriteetset tuge."
    },
    {
      question: "Kas saan plaani vahetada?",
      answer: "Jah, saate plaani üles- või allapoole vahetada igal ajal. Muudatused jõustuvad kohe."
    },
    {
      question: "Kas programmid on mobiilisõbralikud?",
      answer: "Jah, kõik programmid on optimeeritud kõigile seadmetele - telefon, tahvel ja arvuti."
    },
    {
      question: "Kui kaua kestab transformatsiooni programm?",
      answer: "Transformatsiooni programm kestab 6 nädalat ja sisaldab 5 privaatset videokonsultatsiooni. Pärast programmi lõppu jääb ligipääs teie personaalsele programmile püsima."
    },
    {
      question: "Kas saan raha tagasi?",
      answer: "Jah, kui olete rahulolematu esimese 30 päeva jooksul, tagastame teile raha täielikult."
    },
    {
      question: "Kas programmid sobivad algajatele?",
      answer: "Jah, kõik programmid on loodud nii algajatele kui kogenud treenijatele. Iga harjutus sisaldab selgeid juhiseid ja videojuhendeid."
    }
  ];

  return (
    <Card className="max-w-4xl mx-auto mt-12">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">Korduma kippuvad küsimused</CardTitle>
        <p className="text-center text-muted-foreground text-sm">
          Vastused kõige levinumatele küsimustele
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-semibold">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}


