export default function Terms() {
  return (
    <div className="h-screen overflow-y-auto bg-[var(--color-bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-6 text-[var(--color-text-primary)]">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              By accessing and using Divergent Todos ("the Service"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Divergent Todos is a todo list application that helps you organize and manage your tasks. The Service is provided through web and desktop applications and uses your Google account for authentication and data storage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed mb-2">
              To use the Service, you must:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text-secondary)] leading-relaxed space-y-1 ml-4">
              <li>Sign in with a valid Google account or use anonymous access (web only)</li>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Privacy and Data</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Your privacy is important to us. We collect and store your todo data using Firebase services. By using the Service, you consent to the collection, use, and storage of your data as necessary to provide the Service. We do not sell or share your personal data with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Subscription and Payment</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed mb-2">
              The desktop version of Divergent Todos requires an active subscription. By purchasing a subscription:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text-secondary)] leading-relaxed space-y-1 ml-4">
              <li>You agree to pay the subscription fee as displayed at the time of purchase</li>
              <li>Subscriptions are processed through Stripe</li>
              <li>You may cancel your subscription at any time through your account settings</li>
              <li>Refunds are handled on a case-by-case basis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Acceptable Use</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed mb-2">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text-secondary)] leading-relaxed space-y-1 ml-4">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Abuse, harass, or harm other users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              The Service, including its design, features, and content, is owned by Divergent Todos and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of the Service without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Disclaimer of Warranties</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, DIVERGENT TODOS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR GOODWILL.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes by updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Termination</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              We may terminate or suspend your access to the Service at any time, with or without cause or notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              If you have questions about these Terms, please contact us through the feedback option in the application.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--color-outline)]">
          <button
            onClick={() => window.history.back()}
            className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)] font-medium"
          >
            ← Back to app
          </button>
        </div>
      </div>
    </div>
  );
}
