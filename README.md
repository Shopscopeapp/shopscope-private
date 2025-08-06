# ShopScope Private API Integration

A complete brand-facing system for connecting Shopify stores to the ShopScope marketplace using **private app integration** instead of public Shopify apps. This approach bypasses Shopify's app store review process while providing all the same functionality.

## 🚀 Why Private App Integration?

- ✅ **No App Store Delays** - Skip Shopify's lengthy review process
- ✅ **Full Control** - Brands maintain complete control over their data and permissions
- ✅ **Direct API Access** - Better performance with direct Shopify API connection
- ✅ **Custom Integration** - Tailored specifically for ShopScope needs
- ✅ **No Revenue Sharing** - No app store commissions or restrictions
- ✅ **Enterprise Security** - Private app credentials stay secure with the brand

## 📋 Features

### 🎯 Core Functionality
- **Brand Onboarding** - Guided setup process for connecting Shopify stores
- **Product Sync** - Automatic synchronization of products from Shopify to ShopScope
- **Order Management** - Real-time order tracking and fulfillment
- **Analytics Dashboard** - Comprehensive sales and performance analytics
- **Payout System** - Automated commission calculations and Stripe payouts
- **Inventory Management** - Real-time inventory sync between platforms

### 🔧 Technical Features
- **Rate Limited API** - Respects Shopify's 2 calls/second limit
- **Webhook Management** - Automatic webhook registration and handling
- **Error Handling** - Comprehensive error handling and retry logic
- **Security** - Secure credential storage and API key management
- **Scalable Architecture** - Built to handle multiple brands simultaneously

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Landing Page  │    │  Brand Signup   │    │ Shopify Setup   │
│                 │───▶│                 │───▶│                 │
│ shopscope.com   │    │ Account Creation│    │ Private App     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │  API Integration│    │   ShopScope     │
│                 │◀───│                 │───▶│   Marketplace   │
│ Analytics, etc. │    │ Shopify Private │    │   (Existing)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account for database
- Stripe account for payments
- Access to brand's Shopify admin

### Installation

1. **Clone and Install**
   ```bash
   git clone [repository]
   cd shopscope-private
   npm install
   ```

2. **Environment Variables**
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   STRIPE_SECRET_KEY=your_stripe_secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public_key
   WEBHOOK_SECRET=your_webhook_secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Database Setup**
   ```sql
   -- Create brands table
   CREATE TABLE brands (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id),
     brand_name TEXT NOT NULL,
     shopify_domain TEXT NOT NULL,
     shopify_access_token TEXT NOT NULL,
     shopify_api_key TEXT,
     shopify_api_secret TEXT,
     stripe_account_id TEXT,
     commission_rate DECIMAL DEFAULT 0.10,
     status TEXT DEFAULT 'active',
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- Create products table
   CREATE TABLE products (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     brand_id UUID REFERENCES brands(id),
     shopify_product_id TEXT NOT NULL,
     title TEXT NOT NULL,
     description TEXT,
     handle TEXT NOT NULL,
     vendor TEXT,
     product_type TEXT,
     status TEXT DEFAULT 'active',
     tags TEXT[],
     price DECIMAL,
     compare_at_price DECIMAL,
     inventory_quantity INTEGER DEFAULT 0,
     images JSONB,
     variants JSONB,
     sync_status TEXT DEFAULT 'pending',
     last_synced TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- Create orders table
   CREATE TABLE orders (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     brand_id UUID REFERENCES brands(id),
     shopify_order_id TEXT NOT NULL,
     order_number TEXT,
     total_amount DECIMAL NOT NULL,
     commission_amount DECIMAL,
     customer_email TEXT,
     customer_name TEXT,
     shipping_address JSONB,
     line_items JSONB,
     financial_status TEXT,
     fulfillment_status TEXT,
     payment_status TEXT DEFAULT 'pending',
     payout_status TEXT DEFAULT 'pending',
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- Add RLS policies
   ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
   ALTER TABLE products ENABLE ROW LEVEL SECURITY;
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`

## 🔧 Brand Onboarding Process

### Step 1: Account Creation
- Brand visits landing page and clicks "Get Started"
- Fills out brand information and Shopify domain
- Creates account credentials

### Step 2: Private App Setup
The system guides brands through creating a Shopify private app:

1. **Navigate to Shopify Admin**
   - Settings → Apps and sales channels
   - Click "Develop apps for your store"
   - Click "Create an app"

2. **Configure Permissions**
   Required scopes:
   ```
   read_products, write_products
   read_orders, write_orders
   read_inventory, write_inventory
   read_fulfillments, write_fulfillments
   read_shipping, write_shipping
   ```

3. **Get API Credentials**
   - Install the private app
   - Copy Admin API access token
   - Copy API key and secret

4. **Connect to ShopScope**
   - Enter credentials in our system
   - Automatic connection validation
   - Webhook registration

### Step 3: Product Sync
- Automatic sync of all active products
- Real-time updates via webhooks
- Inventory level synchronization

## 📊 Dashboard Features

### Main Dashboard
- **Integration Status** - Shopify and Stripe connection status
- **Key Metrics** - Revenue, orders, products, payouts
- **Recent Orders** - Latest sales activity
- **Quick Actions** - Easy access to key functions

### Products Page
- View all synced products
- Manage product status and visibility
- Update pricing and inventory
- Product performance analytics

### Orders Page
- Track all marketplace orders
- Update fulfillment status
- Process refunds and exchanges
- Customer communication

### Analytics Page
- Revenue trends and forecasting
- Product performance analysis
- Customer behavior insights
- Commission tracking

### Payouts Page
- View pending and completed payouts
- Commission calculations
- Stripe payout history
- Tax reporting tools

## 🔌 API Integration

### Shopify Private API Service
```typescript
import { createShopifyAPI } from '@/lib/shopify-private-api'

const shopifyAPI = createShopifyAPI({
  shopDomain: 'yourstore.myshopify.com',
  accessToken: 'shpat_...',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret'
})

// Test connection
const { success, shop } = await shopifyAPI.testConnection()

// Sync products
const { products, total } = await shopifyAPI.syncAllProducts()

// Get orders
const orders = await shopifyAPI.getOrders({
  limit: 50,
  status: 'open'
})
```

### Webhook Handlers
Automatic webhook registration for:
- `orders/create` - New order processing
- `orders/updated` - Order status changes
- `orders/paid` - Payment confirmations
- `products/create` - New product sync
- `products/update` - Product changes
- `inventory_levels/update` - Inventory changes

## 🔐 Security Features

- **Encrypted Credentials** - All API keys stored encrypted
- **Rate Limiting** - Respects Shopify's API limits
- **Webhook Verification** - HMAC signature validation
- **Row Level Security** - Database access controls
- **Audit Logging** - Complete activity tracking

## 🚀 Deployment

### Production Setup
1. **Deploy to Vercel/Netlify**
   ```bash
   npm run build
   # Deploy built files
   ```

2. **Configure Environment**
   - Set production environment variables
   - Update webhook URLs
   - Configure Stripe webhooks

3. **Database Migration**
   - Run production migrations
   - Set up backups
   - Configure monitoring

### Scaling Considerations
- **Database Indexing** - Index frequently queried fields
- **Caching** - Implement Redis for session/data caching
- **Queue System** - Background job processing for bulk operations
- **Monitoring** - Set up error tracking and performance monitoring

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/signup` - Create brand account
- `POST /api/auth/login` - Authenticate brand
- `POST /api/auth/connect-shopify` - Connect Shopify store

### Brand Management
- `GET /api/brands/profile` - Get brand profile
- `PUT /api/brands/profile` - Update brand information
- `POST /api/brands/sync` - Trigger full sync

### Products
- `GET /api/products` - List brand products
- `PUT /api/products/:id` - Update product
- `POST /api/products/sync` - Sync specific product

### Orders
- `GET /api/orders` - List brand orders
- `PUT /api/orders/:id/fulfill` - Update fulfillment
- `POST /api/orders/:id/refund` - Process refund

### Webhooks
- `POST /api/webhooks/orders` - Shopify order webhooks
- `POST /api/webhooks/products` - Shopify product webhooks
- `POST /api/webhooks/inventory` - Shopify inventory webhooks

## 🤝 Support & Documentation

### For Brands
- **Setup Guide** - Step-by-step private app creation
- **Video Tutorials** - Visual walkthrough of key features
- **FAQ** - Common questions and solutions
- **Live Chat** - Real-time support during business hours

### For Developers
- **API Reference** - Complete endpoint documentation
- **SDK Examples** - Code samples for common operations
- **Testing Guide** - Unit and integration testing
- **Contribution Guide** - How to contribute to the project

## 🎯 Migration from Public App

For brands currently using the public Shopify app:

1. **Data Export** - Export existing product and order data
2. **Private App Setup** - Follow onboarding process
3. **Data Import** - Import historical data
4. **Webhook Migration** - Update webhook endpoints
5. **Testing** - Verify all functionality works correctly

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Basic private app integration
- ✅ Product sync and management
- ✅ Order processing
- ✅ Dashboard analytics

### Phase 2 (Next 30 days)
- 🔄 Advanced analytics and reporting
- 🔄 Bulk product management tools
- 🔄 Automated marketing features
- 🔄 Multi-currency support

### Phase 3 (Future)
- 📋 Advanced inventory management
- 📋 Customer loyalty programs
- 📋 AI-powered recommendations
- 📋 Multi-marketplace expansion

---

## 🆘 Getting Help

- **Documentation**: [docs.shopscope.com](https://docs.shopscope.com)
- **Support Email**: support@shopscope.com
- **Discord Community**: [discord.gg/shopscope](https://discord.gg/shopscope)
- **GitHub Issues**: [Report bugs and feature requests](https://github.com/shopscope/issues)

Built with ❤️ by the ShopScope team 