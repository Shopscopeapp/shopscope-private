import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-shopscope-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-shopscope-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-shopscope-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-shopscope-black">ShopScope</h1>
                <p className="text-xs text-shopscope-gray-600">Mobile Marketplace</p>
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-shopscope-gray-200 p-8">
          <h1 className="text-4xl font-bold text-shopscope-black mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-shopscope-gray-700 mb-8">
              ShopScope respects the privacy of brands using our mobile marketplace platform. This policy outlines 
              how we collect, use, and protect your information through our private app integration.
            </p>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">1. Information We Collect</h2>
            
            <div className="bg-shopscope-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-shopscope-black mb-3">Brand Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
                <li>Brand name, contact information, and business details</li>
                <li>Email address and account credentials</li>
                <li>Shopify store URL and store identification</li>
                <li>Stripe Connect account information for payouts</li>
                <li>Business verification documents (if required)</li>
              </ul>
            </div>

            <div className="bg-shopscope-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-shopscope-black mb-3">Product Data</h3>
              <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
                <li>Product listings, descriptions, and pricing</li>
                <li>Product images and media files</li>
                <li>Inventory levels and availability status</li>
                <li>Product categories and tags</li>
                <li>Variant information (size, color, etc.)</li>
              </ul>
            </div>

            <div className="bg-shopscope-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-shopscope-black mb-3">Transaction and Analytics Data</h3>
              <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
                <li>Order details and transaction history</li>
                <li>Customer engagement metrics (views, likes, wishlists)</li>
                <li>Sales performance and revenue data</li>
                <li>Mobile app usage analytics</li>
                <li>Commission and payout information</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">2. How We Use Your Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-shopscope-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-shopscope-black mb-3">Core Platform Services</h3>
                <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700 text-sm">
                  <li>Sync and display product listings on mobile app</li>
                  <li>Process customer orders and payments</li>
                  <li>Manage inventory updates in real-time</li>
                  <li>Calculate and process commission payments</li>
                  <li>Provide customer support and technical assistance</li>
                </ul>
              </div>
              
              <div className="bg-shopscope-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-shopscope-black mb-3">Analytics and Insights</h3>
                <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700 text-sm">
                  <li>Generate engagement and sales analytics</li>
                  <li>Provide business performance insights</li>
                  <li>Create personalized dashboards and reports</li>
                  <li>Optimize product discovery algorithms</li>
                  <li>Improve mobile app user experience</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">3. Data Sharing and Third Parties</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">Important: We Do Not Sell Your Data</h3>
              <p className="text-yellow-700 text-sm">
                ShopScope does not sell, rent, or trade brand data to third parties for marketing purposes.
              </p>
            </div>

            <p className="text-shopscope-gray-700 mb-4">We may share data with authorized third parties for:</p>
            
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700 mb-6">
              <li><strong>Payment Processing:</strong> Stripe for secure payment processing and payouts</li>
              <li><strong>Infrastructure:</strong> Cloud hosting providers (AWS, Google Cloud) for secure data storage</li>
              <li><strong>Analytics:</strong> Aggregated, anonymized data for platform improvement</li>
              <li><strong>Customer Support:</strong> Support ticket systems to assist with inquiries</li>
              <li><strong>Legal Compliance:</strong> When required by law or legal process</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">4. Data Security and Protection</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-green-800 mb-3">Security Measures</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="list-disc pl-6 space-y-1 text-green-700 text-sm">
                  <li>End-to-end encryption for data transmission</li>
                  <li>Encrypted database storage</li>
                  <li>Regular security audits and updates</li>
                  <li>Access controls and authentication</li>
                </ul>
                <ul className="list-disc pl-6 space-y-1 text-green-700 text-sm">
                  <li>Secure API key management</li>
                  <li>Regular data backups</li>
                  <li>24/7 security monitoring</li>
                  <li>Compliance with industry standards</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">5. Your Data Rights</h2>
            
            <p className="text-shopscope-gray-700 mb-4">As a brand partner, you have the right to:</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <ul className="list-disc pl-6 space-y-2 text-blue-800">
                <li><strong>Access:</strong> Request a copy of all data we hold about your brand</li>
                <li><strong>Update:</strong> Correct or update your brand information at any time</li>
                <li><strong>Delete:</strong> Request deletion of your data upon account termination</li>
                <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                <li><strong>Restrict:</strong> Limit how we process certain types of your data</li>
                <li><strong>Object:</strong> Opt out of certain data processing activities</li>
              </ul>
            </div>

            <p className="text-shopscope-gray-700 text-sm">
              To exercise these rights, contact us at{' '}
              <a href="mailto:info@shopscope.app" className="text-shopscope-black underline">
                info@shopscope.app
              </a>
              . We will respond within 30 days.
            </p>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">6. Cookies and Tracking</h2>
            
            <p className="text-shopscope-gray-700 mb-4">We use cookies and similar technologies for:</p>
            
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700 mb-6">
              <li><strong>Authentication:</strong> Maintaining secure login sessions</li>
              <li><strong>Preferences:</strong> Remembering your dashboard settings and preferences</li>
              <li><strong>Analytics:</strong> Understanding platform usage and performance</li>
              <li><strong>Personalization:</strong> Customizing your experience and insights</li>
            </ul>

            <p className="text-shopscope-gray-700 text-sm">
              You can control cookie settings through your browser preferences.
            </p>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">7. Integration with Shopify</h2>
            
            <div className="bg-shopscope-gray-50 rounded-lg p-6 mb-6">
              <p className="text-shopscope-gray-700 mb-4">
                Our private app integration with Shopify means:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
                <li>We access only the data necessary for mobile marketplace functionality</li>
                <li>Your Shopify store data remains under your control</li>
                <li>We comply with Shopify's API terms and privacy requirements</li>
                <li>You can revoke access at any time through your Shopify admin</li>
              </ul>
              <p className="text-shopscope-gray-700 text-sm mt-4">
                Please also review{' '}
                <a href="https://shopify.com/legal/privacy" className="text-shopscope-black underline" target="_blank" rel="noopener noreferrer">
                  Shopify's Privacy Policy
                </a>{' '}
                for their data handling practices.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">8. Data Retention</h2>
            
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700 mb-6">
              <li><strong>Active Accounts:</strong> Data retained while your account is active</li>
              <li><strong>Financial Records:</strong> Transaction data retained for 7 years for tax/legal purposes</li>
              <li><strong>Analytics Data:</strong> Aggregated analytics retained indefinitely (anonymized)</li>
              <li><strong>Account Deletion:</strong> Personal data deleted within 30 days of account closure</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">9. International Data Transfers</h2>
            
            <p className="text-shopscope-gray-700 mb-4">
              ShopScope operates globally and may transfer data across borders. We ensure:
            </p>
            
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700 mb-6">
              <li>Compliance with applicable data protection laws (GDPR, CCPA, etc.)</li>
              <li>Adequate safeguards for international data transfers</li>
              <li>Transparency about where your data is processed and stored</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">10. Children's Privacy</h2>
            
            <p className="text-shopscope-gray-700 mb-6">
              ShopScope is designed for business use. We do not knowingly collect personal information 
              from children under 13. Our mobile marketplace is intended for adult consumers.
            </p>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">11. Updates to This Policy</h2>
            
            <p className="text-shopscope-gray-700 mb-6">
              We may update this Privacy Policy periodically to reflect changes in our services, 
              legal requirements, or industry best practices. Brands will be notified of significant 
              changes via email. Continued use of ShopScope constitutes acceptance of the updated policy.
            </p>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">12. Contact Us</h2>
            
            <div className="bg-shopscope-gray-50 rounded-lg p-6">
              <p className="text-shopscope-gray-700 mb-4">
                For any privacy-related questions, concerns, or requests, please contact us:
              </p>
              <div className="space-y-2 text-shopscope-gray-700">
                <p>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:info@shopscope.app" className="text-shopscope-black underline hover:no-underline">
                    info@shopscope.app
                  </a>
                </p>
                <p><strong>Subject Line:</strong> Privacy Inquiry - [Your Brand Name]</p>
                <p><strong>Response Time:</strong> Within 24 hours for privacy-related inquiries</p>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-shopscope-gray-200">
              <p className="text-shopscope-gray-600 text-center">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>
              <div className="text-center mt-4 space-x-4">
                <Link href="/terms" className="text-shopscope-black underline hover:no-underline">
                  Terms & Conditions
                </Link>
                <span className="text-shopscope-gray-400">•</span>
                <Link href="/" className="text-shopscope-black underline hover:no-underline">
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 