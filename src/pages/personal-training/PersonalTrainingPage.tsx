import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * PersonalTrainingPage - Empty page for new services
 * This page will be populated with new product names and Stripe test keys
 */
export default function PersonalTrainingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mt-20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Teenused</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              See leht on planeeritud uuendamiseks.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
