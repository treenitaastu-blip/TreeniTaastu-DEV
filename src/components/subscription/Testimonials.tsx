import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    {
      name: "Liis K.",
      age: 31,
      result: "Uskumatu muutus 4 nädalaga!",
      text: "Ma ei suutnud uskuda, kui palju mu keha muutus juba esimese kuu jooksul. Personaalsed tagasisided aitasid mul jääda motiveeritud.",
      rating: 5
    },
    {
      name: "Mart T.",
      age: 28,
      result: "Lõpuks leidsin endale sobiva programmi",
      text: "Olen proovinud palju erinevaid treeningprogramme, aga see on esimene, mis tõesti sobib minu elustiilile ja ajakavale.",
      rating: 5
    },
    {
      name: "Anna L.",
      age: 35,
      result: "Füsioterapeudi nõuanded olid kuldväärt",
      text: "Õppisin palju oma keha kohta ja kuidas treenida õigesti. Ei ole enam valu pärast treeninguid!",
      rating: 5
    }
  ];

  return (
    <div className="max-w-6xl mx-auto mb-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Mida ütlevad meie kliendid</h2>
        <p className="text-muted-foreground text-lg">
          Üle 500 inimese on juba alustanud oma fitness-teekonda meiega
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((testimonial, index) => (
          <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <blockquote className="text-muted-foreground mb-4 leading-relaxed">
                "{testimonial.text}"
              </blockquote>
              
              <div className="border-t pt-4">
                <div className="font-semibold text-sm">{testimonial.name}, {testimonial.age}</div>
                <div className="text-primary font-medium text-sm">{testimonial.result}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
