// src/components/paywall/ProgramPaywall.tsx
import { Link } from "react-router-dom";

type Props = {
  onCheckout?: () => void; // wire to Stripe later; temporary fallback uses /checkout
};

export function ProgramPaywall({ onCheckout }: Props) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border bg-white/60 backdrop-blur p-6 md:p-8 shadow-soft">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">
          Ava ligipääs 20-päevasele programmile
        </h1>
        <p className="text-muted-foreground mb-6">
          Täielik 4-nädalane kava (E–R), 2× online nõustamist, 24/7 tugi.
          Ühekordne makse — püsiv ligipääs programmile ja online toele.
          Programm algab igal esmaspäeval.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <div className="rounded-xl border p-4">
            <div className="text-sm text-muted-foreground mb-1">
              Hind
            </div>
            <div className="text-2xl font-semibold">149€</div>
            <div className="text-xs text-muted-foreground">4 nädalat</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm text-muted-foreground mb-1">
              Sisaldab
            </div>
            <ul className="text-sm space-y-1">
              <li>• 2× online nõustamist</li>
              <li>• 24/7 tugi</li>
              <li>• Püsiv ligipääs</li>
              <li>• Alustab igal esmaspäeval</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={onCheckout ?? (() => (window.location.href = "/checkout?product=program20"))}
            className="inline-flex justify-center items-center rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 transition"
          >
            Osta programm – 149€
          </button>

          <Link
            to="/programmi-info"
            className="text-blue-700 underline underline-offset-2"
          >
            Loe lähemalt SIIN
          </Link>
        </div>
      </div>
    </div>
  );
}
