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
      name: "Videojuhised kõigile harjutustele",
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
      name: "Tervisetõed ja mindfulness-õpped",
      trial: true,
      selfGuided: true,
      guided: true,
      transformation: true,
    },
    {
      name: "Ligipääs kõigil seadmetel",
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
      selfGuided: "48 tunni jooksul",
      guided: "24 tunni jooksul",
      transformation: "24/7 tugi",
    },
    {
      name: "Iganädalased personaalsed tagasisided",
      trial: false,
      selfGuided: false,
      guided: true,
      transformation: true,
    },
    {
      name: "Treeningkava kohandused sinu progressi järgi",
      trial: false,
      selfGuided: false,
      guided: true,
      transformation: true,
    },
    {
      name: "1:1 konsultatsioonid",
      trial: false,
      selfGuided: false,
      guided: "Email ja chat",
      transformation: "5 videokonsultatsiooni",
    },
    {
      name: "Toitumis- ja elustiilisoovitused",
      trial: false,
      selfGuided: false,
      guided: false,
      transformation: true,
    },
    {
      name: "Prioriteetne tugi",
      trial: false,
      selfGuided: false,
      guided: true,
      transformation: true,
    },
  ];

  return (
    <Card className="max-w-6xl mx-auto mt-12">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">Funktsioonide võrdlus</CardTitle>
        <p className="text-center text-muted-foreground text-sm">
          Võrdle plaane ja vali sulle sobiv
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-4 font-semibold text-sm">Funktsioon</th>
                <th className="text-center p-4 font-semibold text-sm min-w-[120px]">
                  <div className="text-xs text-muted-foreground mb-1">Tasuta</div>
                  <div className="font-bold">Proov</div>
                </th>
                <th className="text-center p-4 font-semibold text-sm min-w-[120px]">
                  <div className="text-xs text-muted-foreground mb-1">19.99€</div>
                  <div className="font-bold">Iseseisev</div>
                </th>
                <th className="text-center p-4 font-semibold text-sm min-w-[120px] bg-primary/5">
                  <div className="text-xs text-muted-foreground mb-1">49.99€</div>
                  <div className="text-primary font-bold">Juhendatud</div>
                </th>
                <th className="text-center p-4 font-semibold text-sm min-w-[120px]">
                  <div className="text-xs text-muted-foreground mb-1">199€</div>
                  <div className="font-bold">Transformatsioon</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm font-medium">
                    {feature.name}
                    {feature.note && (
                      <div className="text-xs text-muted-foreground mt-1 font-normal">{feature.note}</div>
                    )}
                  </td>
                  <td className="text-center p-4">
                    {typeof feature.trial === 'boolean' ? (
                      feature.trial ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium">{feature.trial}</span>
                    )}
                  </td>
                  <td className="text-center p-4">
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
                  <td className="text-center p-4 bg-primary/5">
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
                  <td className="text-center p-4">
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


