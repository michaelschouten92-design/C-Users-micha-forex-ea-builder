import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - AlgoStudio",
  description: "AlgoStudio privacy policy - how we handle your data.",
};

export default function PrivacyPolicyPage() {
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

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#64748B] mb-10">
          Laatst bijgewerkt: {lastUpdated}
        </p>

        <div className="space-y-8 text-[#94A3B8] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Welke gegevens verzamelen wij
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Accountgegevens:</strong> e-mailadres en (gehashte) wachtwoorden bij registratie via e-mail, of profiel-informatie van je OAuth-provider (Google, GitHub).
              </li>
              <li>
                <strong>Projectgegevens:</strong> strategienamen, beschrijvingen en builder-configuraties die je aanmaakt.
              </li>
              <li>
                <strong>Betalingsgegevens:</strong> worden verwerkt door Stripe. Wij slaan geen creditcardnummers op. We bewaren alleen je Stripe customer-ID en abonnementsstatus.
              </li>
              <li>
                <strong>Gebruiksgegevens:</strong> audit-logs van acties (login, export, projectwijzigingen) met geanonimiseerde IP-adressen voor beveiligingsdoeleinden.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. Waarvoor gebruiken wij je gegevens
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Om je account aan te maken en te beheren</li>
              <li>Om je strategieprojecten op te slaan en te exporteren</li>
              <li>Om betalingen en abonnementen te verwerken via Stripe</li>
              <li>Om wachtwoord-herstel e-mails te versturen via Resend</li>
              <li>Om de beveiliging en stabiliteit van het platform te bewaken</li>
              <li>Om fouten op te sporen en op te lossen (via Sentry)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Gegevens delen met derden
            </h2>
            <p>Wij delen je gegevens alleen met de volgende verwerkers:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Stripe</strong> - betalingsverwerking</li>
              <li><strong>Resend</strong> - transactionele e-mails</li>
              <li><strong>Sentry</strong> - foutrapportage (geen persoonsgegevens)</li>
              <li><strong>Neon/PostgreSQL</strong> - database-hosting</li>
              <li><strong>Vercel</strong> - applicatiehosting</li>
            </ul>
            <p className="mt-2">
              Wij verkopen je gegevens nooit aan derden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Gegevensbeveiliging
            </h2>
            <p>
              Wij nemen passende technische en organisatorische maatregelen om je gegevens te beschermen:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Wachtwoorden worden gehasht met bcrypt</li>
              <li>Alle verbindingen verlopen via HTTPS/TLS</li>
              <li>Password-reset tokens worden gehasht opgeslagen (SHA-256)</li>
              <li>Rate limiting op alle API-endpoints</li>
              <li>CSRF-bescherming op alle state-changing requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Gegevensbewaring
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Accountgegevens worden bewaard zolang je account actief is</li>
              <li>Verwijderde projecten worden na 30 dagen definitief gewist</li>
              <li>Verlopen password-reset tokens worden automatisch opgeruimd</li>
              <li>Webhook-events worden na 90 dagen verwijderd</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Jouw rechten (AVG/GDPR)
            </h2>
            <p>Je hebt het recht om:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Inzage</strong> te vragen in je persoonsgegevens</li>
              <li><strong>Een kopie</strong> van je gegevens te downloaden (data-export)</li>
              <li><strong>Correctie</strong> te vragen van onjuiste gegevens</li>
              <li><strong>Verwijdering</strong> van je account en alle bijbehorende gegevens aan te vragen</li>
              <li><strong>Bezwaar</strong> te maken tegen verwerking van je gegevens</li>
            </ul>
            <p className="mt-2">
              Je kunt je gegevens exporteren en je account verwijderen via je accountinstellingen, of door contact met ons op te nemen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Cookies
            </h2>
            <p>Wij gebruiken de volgende cookies:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Sessie-cookie</strong> (noodzakelijk) - voor authenticatie</li>
              <li><strong>CSRF-token</strong> (noodzakelijk) - voor beveiliging tegen cross-site request forgery</li>
              <li><strong>Cookie-voorkeur</strong> (noodzakelijk) - om je cookie-keuze te onthouden</li>
            </ul>
            <p className="mt-2">
              Wij gebruiken geen tracking- of advertentiecookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Contact
            </h2>
            <p>
              Voor vragen over je privacy of om je rechten uit te oefenen, neem contact met ons op via het e-mailadres in je accountinstellingen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              9. Wijzigingen
            </h2>
            <p>
              Wij kunnen dit privacybeleid van tijd tot tijd bijwerken. Wijzigingen worden op deze pagina gepubliceerd met een bijgewerkte datum.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-sm text-[#64748B]">
          <Link href="/terms" className="hover:text-[#94A3B8]">
            Gebruiksvoorwaarden
          </Link>
        </div>
      </div>
    </div>
  );
}
