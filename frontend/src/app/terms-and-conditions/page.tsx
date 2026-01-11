'use client';

import Link from 'next/link';

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center p-6 sm:p-12">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-xl p-8 sm:p-12">
        <h1 className="text-3xl font-bold mb-6 text-center">Terms and Conditions</h1>

        <p className="mb-4 text-xs">
          These Terms and Conditions (“Terms”) govern your access to and use of <strong>SickShotsAI</strong> (“we,” “our,” “us”) and its services (the “App”). By accessing or using the App, you agree to be bound by these Terms. If you do not agree, do not use the App.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
        <p className="text-xs mb-4">
          By creating an account, uploading content, or using the App, you accept these Terms in full. You represent that you have the legal capacity to enter into these Terms and are of the minimum age required to use the App.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">2. Eligibility</h2>
        <p className="text-xs mb-4">
          You must be at least 13 years of age (or the applicable age in your jurisdiction) to use the App. Use by children under this age is strictly prohibited.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">3. User Obligations</h2>
        <p className="text-xs mb-4">
          3.1 You must not upload or share content that is unlawful, harmful, abusive, offensive, sexually explicit, discriminatory, infringing, or otherwise violates applicable laws or regulations.<br />
          3.2 You are responsible for all content you upload and any consequences arising from it.<br />
          3.3 You must comply with all local, national, and international laws in connection with your use of the App.<br />
          3.4 You agree not to attempt to disrupt, reverse engineer, or compromise the App’s functionality or security.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">4. Account Security</h2>
        <p className="text-xs mb-4">
          You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We are not liable for any losses arising from unauthorized access to your account due to your failure to secure your credentials.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">5. Uploaded Content and License</h2>
        <p className="text-xs mb-4">
          By uploading any content to the App, you grant us a worldwide, royalty-free, non-exclusive, sublicensable license to use, store, display, reproduce, modify, and remove such content for operational, moderation, research, and security purposes. Administrators may review, store, or remove content at their discretion to ensure compliance with these Terms and applicable laws.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">6. Prohibited Activities</h2>
        <p className="text-xs mb-4">
          You agree not to: 
          <ul className="list-disc pl-5">
            <li>Upload malware, viruses, or any code designed to disrupt the App.</li>
            <li>Engage in harassment, abuse, or threats toward other users.</li>
            <li>Attempt to circumvent security measures, scrape content, or interfere with other users’ access.</li>
            <li>Use the App for unlawful purposes, including infringement of intellectual property or violation of privacy rights.</li>
          </ul>
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">7. Intellectual Property</h2>
        <p className="text-xs mb-4">
          The App, including its design, graphics, logos, text, and software, is the property of SickShotsAI and is protected by copyright, trademark, and other intellectual property laws. You may not copy, reproduce, distribute, or create derivative works without explicit written permission.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">8. Disclaimers</h2>
        <p className="text-xs mb-4">
          The App is provided “as-is” without warranties of any kind, whether express or implied. We do not guarantee uninterrupted or error-free operation. We disclaim all liability for damages arising from use of the App, including but not limited to content uploaded by users.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">9. Limitation of Liability</h2>
        <p className="text-xs mb-4">
          In no event shall SickShotsAI, its affiliates, officers, or employees be liable for any indirect, incidental, special, or consequential damages, or loss of data, revenue, or profits, arising from or in connection with your use of the App.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">10. Termination</h2>
        <p className="text-xs mb-4">
          We may suspend or terminate your account and access to the App at any time for violation of these Terms, illegal activity, or at our sole discretion. Termination does not limit our right to pursue legal remedies for breaches.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">11. Changes to Terms</h2>
        <p className="text-xs mb-4">
          We reserve the right to modify or update these Terms at any time. Updated Terms will be posted on this page with the revision date. Continued use of the App after changes constitutes acceptance of the revised Terms.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">12. Governing Law</h2>
        <p className="text-xs mb-4">
          These Terms are governed by and construed in accordance with the laws of the jurisdiction in which SickShotsAI operates, without regard to conflict of law principles. Any disputes arising under these Terms shall be resolved exclusively in the courts located in such jurisdiction.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">13. Contact Information</h2>
        <p className="text-xs mb-4">
          For questions regarding these Terms, please contact us at <strong>carlos@sickshotsnz.app</strong> or via the contact mechanisms provided in the App.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-lg bg-black text-white text-sm hover:bg-gray-700 transition-colors"
          >
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
