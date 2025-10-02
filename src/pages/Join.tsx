// src/pages/Join.tsx
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";

export default function Join() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { loading, canStatic, canPT } = useAccess();

  // You can still read this param if you want to tailor copy,
  // but it no longer affects any entitlement logic.
  const wantsTrial = params.get("trial") === "1";

  const hasAccess = !!(canStatic || canPT);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-gray-700">Laen…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-3">Liitu Treenitaastuga</h1>
        <p className="text-gray-600 mb-4">
          Logi sisse või loo konto, et alustada oma programmiga.
        </p>
        <div className="flex gap-2">
          <Link
            to="/login"
            className="px-4 py-2 rounded-md border hover:bg-black hover:text-white transition"
          >
            Logi sisse
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-md border hover:bg-black hover:text-white transition"
          >
            Loo konto
          </Link>
        </div>
      </div>
    );
  }

  if (hasAccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-2xl border p-6">
          <h1 className="text-xl font-bold mb-2">Oled valmis!</h1>
          <p className="text-gray-600">
            Sul on aktiivne ligipääs. Vali kuhu soovid edasi minna.
          </p>
          <div className="mt-4 flex gap-2">
            {canStatic && (
              <Link
                to="/programm"
                className="px-4 py-2 rounded-md border hover:bg-black hover:text-white transition"
              >
                Ava programm
              </Link>
            )}
            {canPT && (
              <Link
                to="/programs"
                className="px-4 py-2 rounded-md border hover:bg-black hover:text-white transition"
              >
                Minu personaalprogrammid
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Signed in but no access yet
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="rounded-2xl border p-6">
        <h1 className="text-xl font-bold mb-2">Alustame</h1>
        <p className="text-gray-700 mb-3">
          {wantsTrial
            ? "Alusta tasuta prooviperioodiga või vali sobiv plaan."
            : "Liitu programmiga ja saa ligipääs harjutustele, kava ning progressile."}
        </p>

        <div className="flex gap-2">
          <Link
            to="/pricing"
            className="px-4 py-2 rounded-md border hover:bg-black hover:text-white transition"
          >
            Vali plaan
          </Link>
          <Link
            to="/"
            className="px-4 py-2 rounded-md border hover:bg-black hover:text-white transition"
          >
            Avaleht
          </Link>
        </div>
      </div>
    </div>
  );
}
