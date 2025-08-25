const AI_API_BASE_URL = 'https://shopscope-ai-api-production.up.railway.app';

export interface AISyncResult {
  success: boolean;
  processed_count?: number;
  failed_count?: number;
  message?: string;
  error?: string;
}

export interface AIStatus {
  total_products: number;
  products_with_embeddings: number;
  embedding_coverage: string;
  sync_health: string;
  products_pending_ai: number;
  recent_performance?: {
    swipes_last_7d: number;
    like_rate_percentage: number;
  };
}

export interface ShopifyProduct {
  id: string;
  title: string;
  body_html: string;
  variants: Array<{
    id: string;
    price: string;
    sku?: string;
    inventory_quantity?: number;
    title?: string;
    compare_at_price?: string | null;
  }>;
  image?: { src: string };
  images: Array<{ src: string }>;
  product_type: string;
  vendor: string;
  tags: string;
}

/**
 * 1. Initial Product Sync - Call after Shopify product sync
 */
export const syncProductsToAI = async (brandId: string, shopifyProducts: ShopifyProduct[]): Promise<AISyncResult> => {
  try {
    console.log(`🤖 Starting AI sync for brand ${brandId} with ${shopifyProducts.length} products`);
    console.log(`🤖 AI API URL: ${AI_API_BASE_URL}/brands/sync-products`);
    
    const requestBody = {
      brand_id: brandId,
      shopify_products: shopifyProducts
    };
    console.log(`🤖 Request body size: ${JSON.stringify(requestBody).length} characters`);
    
    const response = await fetch(`${AI_API_BASE_URL}/brands/sync-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`🤖 AI API Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🤖 AI API Error Response: ${errorText}`);
      throw new Error(`AI API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`🤖 AI API Response:`, result);
    
    if (result.success) {
      console.log(`✅ AI Sync Success: ${result.processed_count} processed, ${result.failed_count} failed`);
      return {
        success: true,
        processed_count: result.processed_count,
        failed_count: result.failed_count,
        message: result.message
      };
    } else {
      throw new Error(result.error || 'AI sync failed');
    }
  } catch (error) {
    console.error('❌ AI Sync Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * 2. Real-time Product Updates - Call from Shopify webhooks
 */
export const syncSingleProductToAI = async (
  brandId: string, 
  productData: ShopifyProduct, 
  operation: 'create' | 'update' | 'delete'
): Promise<AISyncResult> => {
  try {
    console.log(`🤖 Syncing single product ${productData.id} to AI (${operation})`);
    
    const requestBody = {
      brand_id: brandId,
      operation,
      product: productData
    };
    
    const response = await fetch(`${AI_API_BASE_URL}/brands/sync-product`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Single product AI sync success: ${operation}`);
      return { success: true, message: result.message };
    } else {
      throw new Error(result.error || 'Single product AI sync failed');
    }
  } catch (error) {
    console.error('❌ Single product AI sync error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * 3. Get AI Status for a brand
 */
export const getAIStatus = async (brandId: string): Promise<AIStatus | null> => {
  try {
    console.log(`🤖 Getting AI status for brand ${brandId}`);
    console.log(`🤖 AI status URL: ${AI_API_BASE_URL}/brands/${brandId}/sync-status`);
    
    const response = await fetch(`${AI_API_BASE_URL}/brands/${brandId}/sync-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`🤖 AI status response:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🤖 AI status check failed: ${response.status} - ${errorText}`);
      return null;
    }

    const status = await response.json();
    console.log(`✅ AI status retrieved:`, status);
    return status;
  } catch (error) {
    console.error('❌ AI status check error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return null;
  }
};

/**
 * 4. Health check for AI service
 */
export const checkAIServiceHealth = async () => {
  try {
    console.log(`🤖 Checking AI service health at ${AI_API_BASE_URL}/`);
    
    const response = await fetch(`${AI_API_BASE_URL}/`);
    
    if (response.ok) {
      console.log(`✅ AI service health: Healthy`);
      return { status: 'healthy', message: 'Service is running' };
    } else {
      console.log(`❌ AI service health: Unhealthy (${response.status})`);
      return { status: 'unhealthy', message: `Service returned ${response.status}` };
    }
  } catch (error) {
    console.error('❌ AI service health check failed:', error);
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
