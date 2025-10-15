import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FeatureComparison() {
  const features = [
    {
      name: "Treeningprogrammid ja harjutused",
      trial: true,
      selfGuided: true,
      guided: true,
      transformation: true,
    },
    {
      name: "Progressi jälgimine ja statistika",
      trial: true,
      selfGuided: true,
      guided: true,
      transformation: true,
    },
    {
      name: "Tervisetõed ja mindfulness",
      trial: true,
      selfGuided: true,
      guided: true,
      transformation: true,
    },
    {
      name: "Püsiv ligipääs (ei lõpe)",
      trial: false,
      selfGuided: true,
      guided: true,
      transformation: true,
      note: "Proov kestab 7 päeva"
    },
    {
      name: "Email tugi",
      trial: false,
      selfGuided: "48h",
      guided: "24h",
      transformation: "24/7",
    },
    {
      name: "Iganädalased personaalsed tagasisided",
      trial: false,
      selfGuided: false,
      guided: true,
      transformation: true,
    },
    {
      name: "Kava kohandused progressi järgi",
      trial: false,
      selfGuided: false,
      guided: true,
      transformation: true,
    },
    {
      name: "1:1 videokonsultatsioonid",
      trial: false,
      selfGuided: false,
      guided: false,
      transformation: "5×",
    },
    {
      name: "Toitumis- ja elustiilisoovitused",
      trial: false,
      selfGuided: false,
      guided: false,
      transformation: true,
    },
  ];

  return (
    <Card className="max-w-5xl mx-auto mt-12">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Mis erineb?</CardTitle>
        <p className="text-center text-muted-foreground text-sm">
          Võrdle plaane ja vali sulle sobiv
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold text-sm">Funktsioon</th>
                <th className="text-center p-3 font-semibold text-sm w-24">
                  <div className="text-xs text-muted-foreground mb-1">Tasuta</div>
                  Proov
                </th>
                <th className="text-center p-3 font-semibold text-sm w-24">
                  <div className="text-xs text-muted-foreground mb-1">19.99€</div>
                  Self-Guided
                </th>
                <th className="text-center p-3 font-semibold text-sm w-24">
                  <div className="text-xs text-muted-foreground mb-1">49.99€</div>
                  <div className="text-primary font-bold">Guided</div>
                </th>
                <th className="text-center p-3 font-semibold text-sm w-24">
                  <div className="text-xs text-muted-foreground mb-1">199€</div>
                  Transform
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-sm">
                    {feature.name}
                    {feature.note && (
                      <div className="text-xs text-muted-foreground mt-0.5">{feature.note}</div>
                    )}
                  </td>
                  <td className="text-center p-3">
                    {typeof feature.trial === 'boolean' ? (
                      feature.trial ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">{feature.trial}</span>
                    )}
                  </td>
                  <td className="text-center p-3">
                    {typeof feature.selfGuided === 'boolean' ? (
                      feature.selfGuided ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )
                    ) : (
                      <span className="text-xs font-medium text-primary">{feature.selfGuided}</span>
                    )}
                  </td>
                  <td className="text-center p-3 bg-primary/5">
                    {typeof feature.guided === 'boolean' ? (
                      feature.guided ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )
                    ) : (
                      <span className="text-xs font-medium text-primary">{feature.guided}</span>
                    )}
                  </td>
                  <td className="text-center p-3">
                    {typeof feature.transformation === 'boolean' ? (
                      feature.transformation ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )
                    ) : (
                      <span className="text-xs font-medium text-primary">{feature.transformation}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}


