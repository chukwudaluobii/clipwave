import { LegalShell, LegalH2 } from "@/components/LegalShell";

export const metadata = { title: "Terms of Service — Clipwave" };

// NOTE: Replace the [bracketed] placeholders with your real details before publishing.
const COMPANY = "[Company Name]";
const CONTACT = "[support@yourdomain.com]";
const JURISDICTION = "[Your Country/State]";
const UPDATED = "[Effective Date]";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated={UPDATED}>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of the Clipwave website and
        application (the &quot;Service&quot;) provided by {COMPANY} (&quot;Clipwave&quot;,
        &quot;we&quot;, &quot;us&quot;). By creating an account or using the Service, you agree to
        these Terms.
      </p>

      <LegalH2>1. The Service</LegalH2>
      <p>
        Clipwave turns long-form videos into short vertical clips. You provide a video (by upload or
        by submitting a link to content you are authorized to use); we transcribe it, use AI to
        identify engaging moments, and render captioned 9:16 clips that you can edit, schedule, and
        publish to social accounts you connect.
      </p>

      <LegalH2>2. Eligibility and accounts</LegalH2>
      <p>
        You must be at least 13 years old (or the minimum age in your jurisdiction) and able to form a
        binding contract. You are responsible for your account, your credentials, and all activity
        under your account.
      </p>

      <LegalH2>3. Content rights and acceptable use</LegalH2>
      <p>
        You may only process content that you own or are authorized to repurpose. You confirm you hold
        the necessary rights before each job. You agree not to use the Service to:
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>infringe any copyright, trademark, privacy, publicity, or other right;</li>
        <li>process content you do not have permission to use;</li>
        <li>create or distribute unlawful, deceptive, harassing, or harmful content; or</li>
        <li>violate the Terms of Service of any platform you connect or publish to (including TikTok, YouTube, and Instagram).</li>
      </ul>
      <p>You are solely responsible for the content you process and publish through the Service.</p>

      <LegalH2>4. Connected accounts and publishing</LegalH2>
      <p>
        When you connect a TikTok, YouTube, or Instagram account and choose to publish or schedule a
        clip, you authorize Clipwave to upload and post that content to your account on your behalf.
        You can disconnect any account at any time. Each connected platform&apos;s own terms and
        policies continue to apply to your use of that platform.
      </p>

      <LegalH2>5. Credits, plans, and billing</LegalH2>
      <p>
        The Service uses a credit model (approximately one credit per twenty minutes of source video
        processed) with tiered subscription plans. Paid plans are billed through our payment processor
        (Stripe) on the cycle shown at checkout. Credit grants, usage, and refunds for failed jobs are
        recorded to your account. Except where required by law, fees are non-refundable. Prices and
        plan features may change with notice.
      </p>

      <LegalH2>6. Intellectual property</LegalH2>
      <p>
        You retain ownership of your content and the clips generated from it. You grant us the limited
        rights needed to store, process, and deliver the Service to you (for example, to transcribe,
        render, and publish at your request). The Clipwave name, software, and design are owned by
        {" "}{COMPANY} and may not be copied without permission.
      </p>

      <LegalH2>7. Third-party services</LegalH2>
      <p>
        The Service relies on third parties (including AI providers, payment processing, cloud storage,
        and the social platforms you connect). Your use of those services through Clipwave is also
        subject to their terms, and we are not responsible for their acts or omissions.
      </p>

      <LegalH2>8. Disclaimers</LegalH2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of
        any kind. AI-generated transcripts, moment selection, and captions may contain errors; you are
        responsible for reviewing clips before publishing. We do not guarantee any particular result,
        reach, or availability.
      </p>

      <LegalH2>9. Limitation of liability</LegalH2>
      <p>
        To the maximum extent permitted by law, {COMPANY} will not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or for lost profits or data. Our total
        liability for any claim relating to the Service is limited to the amount you paid us in the
        twelve months before the claim.
      </p>

      <LegalH2>10. Termination</LegalH2>
      <p>
        You may stop using the Service and delete your account at any time. We may suspend or terminate
        access if you violate these Terms or use the Service unlawfully.
      </p>

      <LegalH2>11. Changes to these Terms</LegalH2>
      <p>We may update these Terms from time to time. Continued use after changes take effect constitutes acceptance of the updated Terms.</p>

      <LegalH2>12. Governing law</LegalH2>
      <p>These Terms are governed by the laws of {JURISDICTION}, without regard to conflict-of-law rules.</p>

      <LegalH2>13. Contact</LegalH2>
      <p>Questions about these Terms? Contact {COMPANY} at {CONTACT}.</p>
    </LegalShell>
  );
}
