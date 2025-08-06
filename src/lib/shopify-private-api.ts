import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

export interface ShopifyCredentials {
  shopDomain: string
  accessToken: string
  apiKey?: string
  apiSecret?: string
}

export interface ShopifyProduct {
  id: string
  title: string
  handle: string
  description: string
  vendor: string
  product_type: string
  status: string
  tags: string
  variants: ShopifyVariant[]
  images: ShopifyImage[]
  created_at: string
  updated_at: string
}

export interface ShopifyVariant {
  id: string
  product_id: string
  title: string
  price: string
  sku: string
  inventory_quantity: number
  weight: number
  weight_unit: string
  requires_shipping: boolean
  taxable: boolean
  barcode?: string
  image_id?: string
}

export interface ShopifyImage {
  id: string
  product_id: string
  src: string
  alt?: string
  width: number
  height: number
  created_at: string
}

export interface ShopifyOrder {
  id: string
  order_number: string
  email: string
  created_at: string
  updated_at: string
  total_price: string
  subtotal_price: string
  total_tax: string
  currency: string
  financial_status: string
  fulfillment_status: string
  line_items: ShopifyLineItem[]
  shipping_address: ShopifyAddress
  billing_address: ShopifyAddress
  customer: ShopifyCustomer
}

export interface ShopifyLineItem {
  id: string
  product_id: string
  variant_id: string
  title: string
  quantity: number
  price: string
  sku: string
  vendor: string
}

export interface ShopifyAddress {
  first_name: string
  last_name: string
  company?: string
  address1: string
  address2?: string
  city: string
  province: string
  country: string
  zip: string
  phone?: string
}

export interface ShopifyCustomer {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  created_at: string
}

export interface ShopifyWebhook {
  id?: string
  topic: string
  address: string
  format: 'json' | 'xml'
  created_at?: string
  updated_at?: string
}

/**
 * ShopScope Private API Service
 * Handles communication with Shopify stores using private app credentials
 */
export class ShopifyPrivateAPI {
  private client: AxiosInstance
  private credentials: ShopifyCredentials
  private rateLimitDelay = 500 // 0.5 second between requests (2 calls/second)
  private lastRequestTime = 0

  constructor(credentials: ShopifyCredentials) {
    this.credentials = credentials
    
    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: `https://${credentials.shopDomain}/admin/api/2024-01/`,
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    })

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.enforceRateLimit()
      return config
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          console.warn('Rate limit exceeded, implementing backoff')
        }
        return Promise.reject(error)
      }
    )
  }

  /**
   * Enforce rate limiting (2 calls per second max)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  /**
   * Test the connection with the provided credentials
   */
  async testConnection(): Promise<{ success: boolean; shop?: any; error?: string }> {
    try {
      const response = await this.client.get('shop.json')
      return {
        success: true,
        shop: response.data.shop
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      }
    }
  }

  /**
   * Get shop information
   */
  async getShop(): Promise<any> {
    const response = await this.client.get('shop.json')
    return response.data.shop
  }

  /**
   * Get all products with pagination support
   */
  async getProducts(params: {
    limit?: number
    since_id?: string
    status?: 'active' | 'archived' | 'draft'
    vendor?: string
    product_type?: string
  } = {}): Promise<ShopifyProduct[]> {
    const queryParams = new URLSearchParams()
    
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.since_id) queryParams.append('since_id', params.since_id)
    if (params.status) queryParams.append('status', params.status)
    if (params.vendor) queryParams.append('vendor', params.vendor)
    if (params.product_type) queryParams.append('product_type', params.product_type)

    const response = await this.client.get(`products.json?${queryParams.toString()}`)
    return response.data.products
  }

  /**
   * Get a single product by ID
   */
  async getProduct(productId: string): Promise<ShopifyProduct> {
    const response = await this.client.get(`products/${productId}.json`)
    return response.data.product
  }

  /**
   * Update product status
   */
  async updateProductStatus(productId: string, status: 'active' | 'archived' | 'draft'): Promise<ShopifyProduct> {
    const response = await this.client.put(`products/${productId}.json`, {
      product: { status }
    })
    return response.data.product
  }

  /**
   * Get orders with pagination and filtering
   */
  async getOrders(params: {
    limit?: number
    since_id?: string
    status?: string
    financial_status?: string
    fulfillment_status?: string
    created_at_min?: string
    created_at_max?: string
  } = {}): Promise<ShopifyOrder[]> {
    const queryParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString())
    })

    const response = await this.client.get(`orders.json?${queryParams.toString()}`)
    return response.data.orders
  }

  /**
   * Get a single order by ID
   */
  async getOrder(orderId: string): Promise<ShopifyOrder> {
    const response = await this.client.get(`orders/${orderId}.json`)
    return response.data.order
  }

  /**
   * Update order fulfillment status
   */
  async createFulfillment(orderId: string, fulfillment: {
    location_id?: string
    tracking_number?: string
    tracking_company?: string
    tracking_urls?: string[]
    notify_customer?: boolean
    line_items: Array<{
      id: string
      quantity: number
    }>
  }): Promise<any> {
    const response = await this.client.post(`orders/${orderId}/fulfillments.json`, {
      fulfillment
    })
    return response.data.fulfillment
  }

  /**
   * Get inventory levels for variants
   */
  async getInventoryLevels(inventoryItemIds: string[]): Promise<any[]> {
    const queryParams = new URLSearchParams()
    inventoryItemIds.forEach(id => queryParams.append('inventory_item_ids[]', id))

    const response = await this.client.get(`inventory_levels.json?${queryParams.toString()}`)
    return response.data.inventory_levels
  }

  /**
   * Update inventory level
   */
  async updateInventoryLevel(inventoryItemId: string, locationId: string, available: number): Promise<any> {
    const response = await this.client.post('inventory_levels/set.json', {
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available
    })
    return response.data.inventory_level
  }

  /**
   * Create a webhook
   */
  async createWebhook(webhook: Omit<ShopifyWebhook, 'id' | 'created_at' | 'updated_at'>): Promise<ShopifyWebhook> {
    const response = await this.client.post('webhooks.json', { webhook })
    return response.data.webhook
  }

  /**
   * Get all webhooks
   */
  async getWebhooks(): Promise<ShopifyWebhook[]> {
    const response = await this.client.get('webhooks.json')
    return response.data.webhooks
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.client.delete(`webhooks/${webhookId}.json`)
  }

  /**
   * Register all required webhooks for ShopScope
   */
  async registerShopScopeWebhooks(baseUrl: string): Promise<ShopifyWebhook[]> {
    const webhooksToCreate = [
      {
        topic: 'orders/create',
        address: `${baseUrl}/api/webhooks/orders`,
        format: 'json' as const
      },
      {
        topic: 'orders/updated',
        address: `${baseUrl}/api/webhooks/orders`,
        format: 'json' as const
      },
      {
        topic: 'orders/paid',
        address: `${baseUrl}/api/webhooks/orders`,
        format: 'json' as const
      },
      {
        topic: 'orders/cancelled',
        address: `${baseUrl}/api/webhooks/orders`,
        format: 'json' as const
      },
      {
        topic: 'products/create',
        address: `${baseUrl}/api/webhooks/products`,
        format: 'json' as const
      },
      {
        topic: 'products/update',
        address: `${baseUrl}/api/webhooks/products`,
        format: 'json' as const
      },
      {
        topic: 'products/delete',
        address: `${baseUrl}/api/webhooks/products`,
        format: 'json' as const
      },
      {
        topic: 'inventory_levels/update',
        address: `${baseUrl}/api/webhooks/inventory`,
        format: 'json' as const
      }
    ]

    const createdWebhooks: ShopifyWebhook[] = []

    for (const webhook of webhooksToCreate) {
      try {
        const created = await this.createWebhook(webhook)
        createdWebhooks.push(created)
        console.log(`Created webhook: ${webhook.topic}`)
      } catch (error) {
        console.error(`Failed to create webhook ${webhook.topic}:`, error)
      }
    }

    return createdWebhooks
  }

  /**
   * Bulk operation to sync all products efficiently
   */
  async syncAllProducts(): Promise<{
    products: ShopifyProduct[]
    total: number
    errors: string[]
  }> {
    const allProducts: ShopifyProduct[] = []
    const errors: string[] = []
    let hasNextPage = true
    let sinceId: string | undefined

    try {
      while (hasNextPage) {
        const products = await this.getProducts({
          limit: 50, // Max per page
          since_id: sinceId,
          status: 'active'
        })

        if (products.length === 0) {
          hasNextPage = false
        } else {
          allProducts.push(...products)
          sinceId = products[products.length - 1].id
          
          // If we got less than 50, we've reached the end
          if (products.length < 50) {
            hasNextPage = false
          }
        }
      }

      return {
        products: allProducts,
        total: allProducts.length,
        errors
      }
    } catch (error: any) {
      errors.push(error.message)
      return {
        products: allProducts,
        total: allProducts.length,
        errors
      }
    }
  }

  /**
   * Get shipping zones and rates
   */
  async getShippingZones(): Promise<any[]> {
    const response = await this.client.get('shipping_zones.json')
    return response.data.shipping_zones
  }

  /**
   * Create a new product
   */
  async createProduct(product: Partial<ShopifyProduct>): Promise<ShopifyProduct> {
    const response = await this.client.post('products.json', { product })
    return response.data.product
  }

  /**
   * Update an existing product
   */
  async updateProduct(productId: string, updates: Partial<ShopifyProduct>): Promise<ShopifyProduct> {
    const response = await this.client.put(`products/${productId}.json`, {
      product: updates
    })
    return response.data.product
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<void> {
    await this.client.delete(`products/${productId}.json`)
  }
}

/**
 * Utility function to create a ShopifyPrivateAPI instance
 */
export function createShopifyAPI(credentials: ShopifyCredentials): ShopifyPrivateAPI {
  return new ShopifyPrivateAPI(credentials)
}

/**
 * Utility function to validate Shopify domain format
 */
export function validateShopifyDomain(domain: string): boolean {
  const regex = /^[a-zA-Z0-9-]+\.myshopify\.com$/
  return regex.test(domain)
}

/**
 * Utility function to extract shop name from domain
 */
export function extractShopName(domain: string): string {
  return domain.replace('.myshopify.com', '')
} 