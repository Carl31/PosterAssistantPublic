'use client';

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center p-6 sm:p-12">
      <div className="max-w-3xl w-full bg-white shadow-lg rounded-xl p-8 sm:p-12">
        <h1 className="text-3xl font-bold mb-6 text-center">Privacy Policy</h1>

        <p className="mb-4 text-xs">
          This Privacy Policy (“Policy”) describes how <strong>SickShotsAI</strong> (“we,” “our,” “us”) collects, uses, discloses, and protects the information you provide when using our application (the “App”). By accessing or using the App, you acknowledge that you have read, understood, and agree to be bound by this Policy. If you do not agree, do not use the App.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
        <p className="text-xs mb-4">
          1.1 Personal Information: We may collect personal information such as email addresses, account identifiers, and any other information you voluntarily provide during registration or use of the App.<br />
          1.2 Uploaded Content: Users may upload photos, images, or other content to the App. By uploading any content, you acknowledge that such content may be accessed, viewed, moderated, and stored by the App administrators for operational, moderation, and quality control purposes.<br />
          1.3 Usage Data: We may collect data on how you interact with the App, including but not limited to device information, IP addresses, browser types, operating systems, access times, and pages visited.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">2. Use of Information</h2>
        <p className="text-xs mb-4">
          2.1 Operational Purposes: Information is used to provide, maintain, and improve the App, ensure security, troubleshoot technical issues, and monitor user activity for compliance with this Policy.<br />
          2.2 Communications: We may use your information to communicate with you regarding updates, notices, or changes to the App or its features.<br />
          2.3 Research and Analytics: Aggregated, non-identifiable data may be used for analytics, research, and to enhance user experience.<br />
          2.4 Consent-Based Use: By using the App, you consent to the collection and use of your information as described herein.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">3. Disclosure of Information</h2>
        <p className="text-xs mb-4">
          3.1 Service Providers: We may share information with third-party service providers who assist with the operation, maintenance, and analytics of the App.<br />
          3.2 Legal Requirements: We may disclose information if required by law, in response to legal processes, or to protect the rights, property, or safety of the App, our users, or others.<br />
          3.3 Business Transfers: In the event of a merger, acquisition, or sale of assets, user information may be transferred to the acquiring entity.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">4. User Responsibilities</h2>
        <p className="text-xs mb-4">
          4.1 Prohibited Content: Users must not upload content that is unlawful, harmful, abusive, offensive, sexually explicit, discriminatory, infringing, or otherwise violates applicable laws or regulations.<br />
          4.2 Compliance: Users agree to comply with all applicable local, national, and international laws in connection with their use of the App.<br />
          4.3 Accountability: Users are solely responsible for the content they upload and the consequences of sharing such content.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">5. Consent to Admin Access</h2>
        <p className="text-xs mb-4">
          By uploading any content to the App, users consent to administrative access for the purposes of moderation, security monitoring, content review, and operational oversight. Administrators may review, store, or remove content at their discretion to ensure compliance with this Policy.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">6. Cookies and Tracking</h2>
        <p className="text-xs mb-4">
          We may use cookies, web beacons, and similar tracking technologies to collect information about your usage of the App. This data may be used for analytics, improving functionality, and personalizing user experience. You may configure your browser to reject cookies, though some features of the App may not function properly without them.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">7. Data Retention</h2>
        <p className="text-xs mb-4">
          We retain personal information and uploaded content for as long as necessary to provide the App, comply with legal obligations, resolve disputes, and enforce agreements. Users may request deletion of their account or content; however, residual copies may remain in backups or archives for operational or legal reasons.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">8. Third-Party Links</h2>
        <p className="text-xs mb-4">
          The App may contain links to third-party websites. We are not responsible for the privacy practices or content of third-party sites. Users are encouraged to review the privacy policies of any external sites they access.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">9. Security</h2>
        <p className="text-xs mb-4">
          We implement reasonable administrative, technical, and physical measures to protect user information from unauthorized access, disclosure, alteration, or destruction. However, no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">10. Children’s Privacy</h2>
        <p className="text-xs mb-4">
          The App is not intended for use by children under the age of 13. We do not knowingly collect information from children. If we become aware that a child has provided personal information, we will take steps to delete such information promptly.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">11. International Users</h2>
        <p className="text-xs mb-4">
          By using the App, users acknowledge and consent to the collection, storage, and processing of their information in countries where we operate, which may have different data protection laws than their country of residence. Users are responsible for compliance with local laws regarding the use of the App.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">12. Changes to This Policy</h2>
        <p className="text-xs mb-4">
          We reserve the right to update this Privacy Policy at any time. Changes will be posted on this page with an updated revision date. Continued use of the App after changes constitutes acceptance of the revised Policy.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">13. Contact Information</h2>
        <p className="text-xs mb-4">
          For questions or concerns regarding this Privacy Policy, you may contact us at: <strong>carlos@sickshotsnz.app</strong> or through the contact form provided in the App.
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
