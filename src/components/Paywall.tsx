import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Paywall() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] grid place-items-center p-6 bg-white text-gray-900">
      <Card className="w-full max-w-md bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Ligipääs piiratud</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Sul ei ole veel aktiivset paketti või prooviperioodi.
          </p>
          <Button
            onClick={() => navigate("/pricing")}
            className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
          >
            Vaata pakette
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
