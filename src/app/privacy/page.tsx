import { LegalShell, LegalH2 } from "@/components/LegalShell";

export const metadata = { title: "Privacy Policy — Clipwave" };

// NOTE: Replace the [bracketed] placeholders with your real details before publishing.
const COMPANY = "[Company Name]";
const CONTACT = "[privacy@yourdomain.com]";
const UPDATED = "[Effective Date]";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated={UPDATED}>
      <p>
        This Privacy Policy explains how {COMPANY} (&quot;Clipwave&quot;, &quot;we&quot;,
        &quot;us&quot;) collects, uses, stores, and shares information when you use the Clipwave
        website and application (the &quot;Service&quot;). By using the Service you agree to this
        Policy.
      </p>

      <LegalH2>1. Information we collect</LegalH2>
      <p>We collect only what we need to provide the Service:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li><strong>Account information</strong> — your email address and, if you sign in with Google, your name and profile image.</li>
        <li><strong>Content you provide</strong> — videos you upload, links to videos you submit, and the transcripts, clips, captions, titles, and metadata generated from them.</li>
        <li><strong>Connected accounts</strong> — when you connect a TikTok, YouTube, or Instagram account, we store the access and refresh tokens the platform issues and your public account identifier/handle, so we can act on your behalf when you ask us to.</li>
        <li><strong>Billing information</strong> — subscription plan, credit balance, and billing status. Card/payment details are handled by our payment processor (Stripe) and are never stored on our servers.</li>
        <li><strong>Usage data</strong> — basic technical logs (e.g. request and error logs) used to operate and secure the Service.</li>
      </ul>

      <LegalH2>2. How we use information</LegalH2>
      <ul className="list-disc space-y-1 pl-6">
        <li>To transcribe your videos, detect engaging moments, and render vertical clips with captions.</li>
        <li>To let you schedule and publish clips to the social accounts you connect, when you choose to.</li>
        <li>To manage your account, subscription, and credit balance.</li>
        <li>To secure, maintain, and improve the Service.</li>
      </ul>
      <p>We do <strong>not</strong> sell your personal information, and we do not use your content to train our own advertising or unrelated models.</p>

      <LegalH2>3. Third-party services we share data with</LegalH2>
      <p>To deliver the Service, limited data is processed by these providers:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li><strong>AI providers</strong> (e.g. Google Gemini, OpenAI, Anthropic) — audio and/or transcript text are sent to generate transcripts, identify clip moments, and draft titles/captions.</li>
        <li><strong>Payment processing</strong> (Stripe) — to handle subscriptions and billing.</li>
        <li><strong>Cloud storage / hosting</strong> — to store your source files and rendered clips and to run the Service.</li>
        <li><strong>Social platforms</strong> (TikTok, YouTube, Instagram) — only when you connect an account and ask us to publish, we send the relevant clip and post details to that platform&apos;s API.</li>
      </ul>

      <LegalH2>4. YouTube API Services</LegalH2>
      <p>
        Clipwave uses <strong>YouTube API Services</strong>. By using features that access YouTube,
        you also agree to the{" "}
        <a className="text-brand-300 underline" href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">YouTube Terms of Service</a>,
        and your use of Google/YouTube data is subject to the{" "}
        <a className="text-brand-300 underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a>.
        We access YouTube data only to import videos you own or are authorized to use and to publish
        clips to your own connected YouTube channel. We store YouTube authorization tokens and the
        content you process only for as long as needed to provide the Service, and you can revoke our
        access at any time from your{" "}
        <a className="text-brand-300 underline" href="https://security.google.com/settings/security/permissions" target="_blank" rel="noreferrer">Google security settings</a>{" "}
        or by disconnecting the account in Clipwave.
      </p>

      <LegalH2>5. TikTok and Instagram data</LegalH2>
      <p>
        When you connect TikTok or Instagram, we access your basic profile to confirm the account and
        the content-posting permissions needed to upload and publish the clips you choose. We use this
        access only to perform actions you explicitly initiate, and never to post without your action.
      </p>

      <LegalH2>6. Data retention</LegalH2>
      <p>
        We keep your account data while your account is active. Source videos, clips, and transcripts
        are retained so you can access them and are deleted when you delete them or close your account,
        subject to short backup and legal-retention windows. Disconnecting a social account removes the
        stored tokens for that account.
      </p>

      <LegalH2>7. Your rights and choices</LegalH2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Disconnect any social account at any time from the Accounts page.</li>
        <li>Delete your projects and clips, or request deletion of your account and associated data.</li>
        <li>Request a copy of the personal data we hold about you.</li>
      </ul>
      <p>To exercise these rights, contact us at {CONTACT}.</p>

      <LegalH2>8. Security</LegalH2>
      <p>
        We use industry-standard measures to protect your data, including encrypted transport (HTTPS)
        and access controls on stored credentials. No method of transmission or storage is 100% secure,
        but we work to protect your information and limit access to it.
      </p>

      <LegalH2>9. Children</LegalH2>
      <p>The Service is not directed to children under 13 (or the minimum age in your jurisdiction), and we do not knowingly collect their data.</p>

      <LegalH2>10. International transfers</LegalH2>
      <p>Your information may be processed in countries other than your own, including by the third-party providers listed above.</p>

      <LegalH2>11. Changes to this Policy</LegalH2>
      <p>We may update this Policy from time to time. Material changes will be reflected by updating the &quot;Last updated&quot; date above.</p>

      <LegalH2>12. Contact</LegalH2>
      <p>Questions about this Policy or your data? Contact {COMPANY} at {CONTACT}.</p>
    </LegalShell>
  );
}
