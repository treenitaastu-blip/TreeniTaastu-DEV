import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const MOTIVATIONAL_QUOTES = [
  "Suurepärane töö! Iga päev viib sind lähemale eesmärgile.",
  "Järjepidevus on võti edu saavutamisel. Jätka samas vaimus!",
  "Sa oled tugevam kui arvad. Tänane treening tõestab seda!",
  "Iga treening on investeering oma tervisse ja heaolusse.",
  "Võta uhkusega vastu oma edusamme - sa vääritud seda!",
  "Väikesed sammud viivad suurtele tulemustele. Hästi tehtud!",
  "Sinu pühendumus on inspireeriv. Lähme edasi!",
  "Täna võitsid jälle enda üle. See on tõeline jõud!",
  "Iga lõpetatud treening teeb sind paremaks versiooniks iseendast.",
  "Sa näitad, et tervislik elustiil on võimalik. Suurepärane!"
];

type MotivationBannerProps = {
  isVisible: boolean;
  onClose: () => void; // jääb alles, et saaks X-iga sulgeda või loogikast peita
};

export function MotivationBanner({ isVisible, onClose }: MotivationBannerProps) {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    if (isVisible) {
      // vali tsitaat ainult siis, kui seda veel pole – nii ei vahetu päevasiseselt
      if (!quote) {
        const randomQuote =
          MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
        setQuote(randomQuote);
      }
      // ⛔️ AUTOLUKUSTAMINE EEMALDATUD – enam pole setTimeout(onClose, 5000)
    } else {
      // kui komponent peidetakse (nt uuel päeval), nullime tsitaadi, et järgmisel avamisel uus tuleks
      if (quote) setQuote("");
    }
  }, [isVisible, quote]);

  if (!isVisible) return null;

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-800/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {quote}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 text-sm font-medium"
            aria-label="Sulge"
            title="Sulge"
          >
            ×
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
