import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Target, Lock } from "lucide-react";

interface VideoRoutine {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  isComingSoon: boolean;
}

const videoRoutines: VideoRoutine[] = [
  {
    id: "warmup-legs",
    title: "Jalapäeva soojendus",
    description: "5-10 minutit jalapäeva soojendamist kontoritöö jaoks",
    duration: "5-10 min",
    category: "Soojendus",
    isComingSoon: true
  },
  {
    id: "warmup-upper",
    title: "Ülakeha soojendus", 
    description: "Õlgade, kaela ja selja soojendamine enne tööd",
    duration: "5-10 min",
    category: "Soojendus",
    isComingSoon: true
  },
  {
    id: "hip-mobility",
    title: "Puusade liikuvus",
    description: "Puusade liigutavuse parandamine ja pingete leevendamine",
    duration: "5-10 min", 
    category: "Liikuvus",
    isComingSoon: true
  },
  {
    id: "back-mobility",
    title: "Alaselja liikuvus",
    description: "Alaselja pingete leevendamine ja liigutavuse parandamine",
    duration: "5-10 min",
    category: "Liikuvus", 
    isComingSoon: true
  }
];

const Harjutused = () => {

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Lühikesed harjutusrutiinid
        </h1>
        <p className="text-muted-foreground">
          5-10 minutit pikkused videorutiinid, mida saad järgida häälega. Kontoritöö kahjustuste ennetamiseks ja leevendamiseks.
        </p>
      </div>

      {/* Video Routines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videoRoutines.map((routine) => (
          <Card key={routine.id} className="group hover:shadow-medium transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1 group-hover:text-primary transition-colors">
                    {routine.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {routine.description}
                  </CardDescription>
                </div>
                {routine.isComingSoon && (
                  <Badge variant="secondary" className="ml-2">
                    <Lock className="w-3 h-3 mr-1" />
                    Tulekul
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Routine Details */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{routine.duration}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <Target className="w-4 h-4" />
                    <span>{routine.category}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="space-y-2">
                <button 
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                    routine.isComingSoon 
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                  disabled={routine.isComingSoon}
                >
                  <Play className="w-4 h-4 mr-2 inline" />
                  {routine.isComingSoon ? 'Tulekul' : 'Alusta harjutust'}
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-12 text-center">
        <div className="bg-muted/50 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="text-lg font-medium text-foreground mb-2">
            Videod tulevad varsti!
          </h3>
          <p className="text-muted-foreground">
            Töötame praegu lühikeste harjutusvideode kallal, mida saad järgida häälega. 
            Iga video on 5-10 minutit pikk ja keskendub kontoritöö kahjustuste ennetamisele.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Harjutused;