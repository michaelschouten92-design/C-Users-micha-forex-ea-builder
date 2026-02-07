import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gebruiksvoorwaarden - AlgoStudio",
  description: "AlgoStudio gebruiksvoorwaarden.",
};

export default function TermsOfServicePage() {
  const lastUpdated = "2025-02-07";

  return (
    <div className="min-h-screen bg-[#0F0A1A] text-[#CBD5E1]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="text-[#4F46E5] hover:text-[#6366F1] text-sm mb-8 inline-block"
        >
          &larr; Terug naar home
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Gebruiksvoorwaarden</h1>
        <p className="text-sm text-[#64748B] mb-10">
          Laatst bijgewerkt: {lastUpdated}
        </p>

        <div className="space-y-8 text-[#94A3B8] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Acceptatie van voorwaarden
            </h2>
            <p>
              Door gebruik te maken van AlgoStudio ga je akkoord met deze gebruiksvoorwaarden. Als je niet akkoord gaat, gebruik het platform dan niet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. Beschrijving van de dienst
            </h2>
            <p>
              AlgoStudio is een visuele no-code builder waarmee je Expert Advisors (EA&apos;s) kunt ontwerpen voor MetaTrader 5. Het platform biedt:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Een drag-and-drop interface voor het samenstellen van handelsstrategieen</li>
              <li>Export van strategieen naar MQL5-code</li>
              <li>Versiebeheer van strategieontwerpen</li>
              <li>Verschillende abonnementsniveaus (Free, Starter, Pro)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Accounts en registratie
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Je bent verantwoordelijk voor het geheimhouden van je inloggegevens</li>
              <li>Je moet een geldig e-mailadres opgeven</li>
              <li>Je mag maar een account per persoon aanmaken</li>
              <li>Wij behouden het recht om accounts te beperken of te verwijderen bij misbruik</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Abonnementen en betalingen
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Betaalde abonnementen worden maandelijks of jaarlijks afgerekend via Stripe</li>
              <li>Je kunt je abonnement op elk moment opzeggen via het Stripe-portaal</li>
              <li>Bij opzegging behoud je toegang tot het einde van de betaalde periode</li>
              <li>Wij bieden geen terugbetalingen aan voor gedeeltelijke periodes</li>
              <li>Prijswijzigingen worden minimaal 30 dagen van tevoren aangekondigd</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Intellectueel eigendom
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Je behoudt het volledige eigendom van de strategieen die je maakt</li>
              <li>De geexporteerde MQL5-code is van jou en mag je vrij gebruiken</li>
              <li>Het AlgoStudio platform, logo en interface zijn ons eigendom</li>
              <li>Je mag het platform niet reverse-engineeren of kopieren</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Disclaimer - Handelsrisico
            </h2>
            <p className="font-semibold text-amber-400">
              BELANGRIJK: Handel op de financiele markten brengt aanzienlijke risico&apos;s met zich mee.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>AlgoStudio is een hulpmiddel voor het ontwerpen van handelsstrategieen, geen financieel advies</li>
              <li>Wij garanderen niet dat gegenereerde EA&apos;s winstgevend zijn</li>
              <li>Je bent zelf volledig verantwoordelijk voor het testen en inzetten van strategieen op live accounts</li>
              <li>Test strategieen altijd eerst op een demo-account</li>
              <li>Wij zijn niet aansprakelijk voor financiele verliezen als gevolg van het gebruik van geexporteerde EA&apos;s</li>
              <li>In het verleden behaalde resultaten bieden geen garantie voor de toekomst</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Beschikbaarheid
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Wij streven naar 99.9% uptime maar garanderen dit niet</li>
              <li>Het platform kan tijdelijk onbeschikbaar zijn voor onderhoud</li>
              <li>Wij zijn niet aansprakelijk voor schade door downtime</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Aanvaardbaar gebruik
            </h2>
            <p>Je mag het platform niet gebruiken om:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>De dienst te overbelasten (bijv. geautomatiseerde bulk-exports)</li>
              <li>Beveiligingsmaatregelen te omzeilen</li>
              <li>Illegale activiteiten te ondersteunen</li>
              <li>De dienstverlening aan andere gebruikers te verstoren</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              9. Beperking van aansprakelijkheid
            </h2>
            <p>
              AlgoStudio wordt aangeboden &quot;as is&quot;. Voor zover wettelijk toegestaan zijn wij niet aansprakelijk voor indirecte schade, gevolgschade of gederfde winst als gevolg van het gebruik van het platform of geexporteerde code.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              10. Wijzigingen
            </h2>
            <p>
              Wij kunnen deze voorwaarden wijzigen. Bij substantiele wijzigingen informeren wij je via e-mail. Voortgezet gebruik na wijziging geldt als acceptatie.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              11. Toepasselijk recht
            </h2>
            <p>
              Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-sm text-[#64748B]">
          <Link href="/privacy" className="hover:text-[#94A3B8]">
            Privacybeleid
          </Link>
        </div>
      </div>
    </div>
  );
}
