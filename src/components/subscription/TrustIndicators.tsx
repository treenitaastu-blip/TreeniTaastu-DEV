import { Shield, Users, Award, Clock } from "lucide-react";

export function TrustIndicators() {
  const indicators = [
    {
      icon: Shield,
      title: "100% Turvaline",
      description: "Krediitkaart ei ole vajalik prooviperioodil"
    },
    {
      icon: Clock,
      title: "Tühista igal ajal",
      description: "Paindlik tellimus, ei mingit siduvust"
    },
    {
      icon: Award,
      title: "Füsioterapeudi koostatud",
      description: "Loodud tervishoiu spetsialisti poolt"
    },
    {
      icon: Users,
      title: "500+ treenijat",
      description: "Eesti inimesed treenivad juba"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mt-12 mb-12">
      {indicators.map((item, index) => (
        <div
          key={index}
          className="text-center space-y-2 p-4 rounded-lg hover:bg-muted/30 transition-colors"
        >
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <item.icon className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h3 className="font-semibold text-sm">{item.title}</h3>
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

