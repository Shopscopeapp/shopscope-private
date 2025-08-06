import Link from 'next/link'

export default function TermsAndConditions() {
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
          <h1 className="text-4xl font-bold text-shopscope-black mb-8">Terms and Conditions</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-shopscope-gray-700 mb-8">
              Welcome to ShopScope Mobile Marketplace. By using our platform, you agree to these terms and conditions.
            </p>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">1. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
              <li>"Platform" refers to ShopScope's web application and mobile app</li>
              <li>"Brand" or "Merchant" refers to businesses using our platform to sell products</li>
              <li>"User" or "Customer" refers to shoppers using our mobile application</li>
              <li>"Service" refers to all services provided by ShopScope</li>
              <li>"Private App Integration" refers to the Shopify private app connection method</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">2. Platform Usage</h2>
            <p className="text-shopscope-gray-700 mb-4">By using ShopScope, brands agree to:</p>
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
              <li>Provide accurate and up-to-date product information</li>
              <li>Maintain accurate inventory levels through real-time sync</li>
              <li>Process and fulfill orders promptly</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Maintain accurate brand account information</li>
              <li>Provide valid Shopify private app credentials for integration</li>
              <li>Ensure products comply with Shopify and ShopScope policies</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">3. Commission and Fees</h2>
            <div className="bg-shopscope-gray-50 rounded-lg p-6 mb-4">
              <h3 className="font-semibold text-shopscope-black mb-3">Commission Structure</h3>
              <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
                <li><strong>Standard Rate:</strong> 10% commission per sale</li>
                <li><strong>Premium Tier:</strong> 7.5% commission (when available)</li>
                <li><strong>Upsell Fees:</strong> $1.50 per customer (Standard) or $0.75 per customer (Premium)</li>
              </ul>
            </div>
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
              <li>Payment processing fees are included in the commission</li>
              <li>Commissions are automatically deducted from sales</li>
              <li>No setup fees, monthly fees, or listing fees</li>
              <li>No additional payment processing fees</li>
              <li>No cancellation or termination fees</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">4. Payments and Payouts</h2>
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
              <li>Weekly payouts every Friday for completed orders</li>
              <li>Minimum payout threshold: $10</li>
              <li>Payments processed through Stripe Connect</li>
              <li>Processing time: 1-2 business days to your account</li>
              <li>Brands must maintain valid Stripe Connect account</li>
              <li>Currency: USD (additional currencies available upon request)</li>
              <li>Automatic refund processing for returns</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">5. Product Listings and Integration</h2>
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
              <li>Products must comply with Shopify and ShopScope policies</li>
              <li>Accurate product descriptions and pricing required</li>
              <li>Real-time inventory synchronization mandatory</li>
              <li>High-quality product images required</li>
              <li>Brands responsible for product availability and accuracy</li>
              <li>ShopScope reserves the right to moderate product listings</li>
              <li>Private app credentials must remain secure and valid</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">6. Mobile Marketplace Features</h2>
            <div className="bg-shopscope-gray-50 rounded-lg p-6 mb-4">
              <h3 className="font-semibold text-shopscope-black mb-3">What's Included</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="list-disc pl-6 space-y-1 text-shopscope-gray-700 text-sm">
                  <li>Swipe-based mobile shopping experience</li>
                  <li>Real-time product sync from Shopify</li>
                  <li>Mobile app hosting & maintenance</li>
                  <li>Customer acquisition & marketing</li>
                </ul>
                <ul className="list-disc pl-6 space-y-1 text-shopscope-gray-700 text-sm">
                  <li>Detailed engagement analytics</li>
                  <li>Order tracking and management</li>
                  <li>Discount code management</li>
                  <li>Upsell campaign tools</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">7. Data and Privacy</h2>
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
              <li>Brands retain ownership of their product data</li>
              <li>ShopScope accesses data only as necessary for service provision</li>
              <li>Data security measures in place to protect brand information</li>
              <li>Compliance with applicable data protection regulations</li>
              <li>Analytics data shared with brands for business insights</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">8. Service Availability</h2>
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
              <li>ShopScope strives for 99.9% uptime</li>
              <li>Scheduled maintenance will be communicated in advance</li>
              <li>Mobile app updates deployed regularly</li>
              <li>Customer support available via email</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">9. Termination</h2>
            <p className="text-shopscope-gray-700 mb-4">ShopScope reserves the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
              <li>Suspend or terminate accounts violating these terms</li>
              <li>Remove products that violate our policies</li>
              <li>Modify or discontinue services with reasonable notice</li>
              <li>Process final payouts within 30 days of termination</li>
            </ul>
            <p className="text-shopscope-gray-700 mt-4">
              Brands may terminate their account at any time with no penalties or cancellation fees.
            </p>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">10. Liability and Warranties</h2>
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
              <li>ShopScope is not liable for brand product quality or accuracy</li>
              <li>Brands are responsible for product descriptions and fulfillment</li>
              <li>Platform provided "as is" without express warranties</li>
              <li>ShopScope's liability limited to commission fees paid</li>
              <li>Brands responsible for compliance with local laws</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">11. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2 text-shopscope-gray-700">
              <li>Brands retain rights to their product images and descriptions</li>
              <li>ShopScope retains rights to platform technology and branding</li>
              <li>Brands grant ShopScope license to display products on mobile platform</li>
              <li>Respect for third-party intellectual property required</li>
            </ul>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">12. Changes to Terms</h2>
            <p className="text-shopscope-gray-700">
              We may update these terms periodically to reflect service improvements or legal requirements. 
              Brands will be notified of significant changes via email. Continued use of ShopScope after 
              changes constitutes acceptance of new terms.
            </p>

            <h2 className="text-2xl font-semibold text-shopscope-black mt-8 mb-4">13. Contact Information</h2>
            <div className="bg-shopscope-gray-50 rounded-lg p-6">
              <p className="text-shopscope-gray-700 mb-4">
                For questions about these terms or support issues, contact us at:
              </p>
              <div className="space-y-2 text-shopscope-gray-700">
                <p>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:info@shopscope.app" className="text-shopscope-black underline hover:no-underline">
                    info@shopscope.app
                  </a>
                </p>
                <p><strong>Response Time:</strong> Within 24 hours for all inquiries</p>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-shopscope-gray-200">
              <p className="text-shopscope-gray-600 text-center">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>
              <div className="text-center mt-4 space-x-4">
                <Link href="/privacy" className="text-shopscope-black underline hover:no-underline">
                  Privacy Policy
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