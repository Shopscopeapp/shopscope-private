import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching app analytics data...');

    // User Analytics
    const { data: totalUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' });

    const { data: newUsersThisMonth } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const { data: newUsersThisWeek } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Daily active users (users who performed any action today)
    const today = new Date().toISOString().split('T')[0];
    const { data: dailyActiveUsers } = await supabase
      .rpc('get_daily_active_users', { target_date: today });

    // User profile completion
    const { data: profileCompletion } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url');

    const totalProfiles = profileCompletion?.length || 0;
    const completeProfiles = profileCompletion?.filter(p => p.username && p.full_name).length || 0;
    const usersWithAvatars = profileCompletion?.filter(p => p.avatar_url).length || 0;

    // E-commerce Analytics
    const { data: totalRevenue } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'paid');

    const { data: monthlyRevenue } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('status', 'paid')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const { data: topProducts } = await supabase
      .from('order_items')
      .select(`
        quantity,
        total_price,
        products!inner(title, price)
      `)
      .eq('orders.status', 'paid');

    // App Usage Analytics
    const { data: postsThisMonth } = await supabase
      .from('posts')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const { data: mostWishlistedProducts } = await supabase
      .from('wishlist_items')
      .select(`
        id,
        products!inner(title, price)
      `);

    // Social & Engagement
    const { data: totalFollows } = await supabase
      .from('followers')
      .select('id', { count: 'exact' });

    const { data: postEngagement } = await supabase
      .from('posts')
      .select('likes_count, comments_count');

    // Brand Performance
    const { data: brandPerformance } = await supabase
      .from('brands')
      .select(`
        name,
        products!inner(id),
        order_items!inner(
          quantity,
          total_price,
          orders!inner(status, total_amount)
        )
      `)
      .eq('order_items.orders.status', 'paid');

    // Calculate metrics
    const totalRevenueAmount = totalRevenue?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    const monthlyRevenueAmount = monthlyRevenue?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    const totalOrders = totalRevenue?.length || 0;
    const monthlyOrders = monthlyRevenue?.length || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenueAmount / totalOrders : 0;

    // Top products calculation
    const productSales = new Map();
    topProducts?.forEach(item => {
      if (item.products) {
        const productTitle = item.products.title;
        const existing = productSales.get(productTitle) || { quantity: 0, revenue: 0 };
        productSales.set(productTitle, {
          quantity: existing.quantity + (item.quantity || 0),
          revenue: existing.revenue + (item.total_price || 0),
          price: item.products.price
        });
      }
    });

    const topProductsList = Array.from(productSales.entries())
      .map(([title, data]) => ({ title, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Wishlist products calculation
    const wishlistCounts = new Map();
    mostWishlistedProducts?.forEach(item => {
      if (item.products) {
        const productTitle = item.products.title;
        wishlistCounts.set(productTitle, (wishlistCounts.get(productTitle) || 0) + 1);
      }
    });

    const topWishlistedProducts = Array.from(wishlistCounts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Post engagement calculation
    const avgLikes = postEngagement?.reduce((sum, post) => sum + (post.likes_count || 0), 0) / (postEngagement?.length || 1);
    const avgComments = postEngagement?.reduce((sum, post) => sum + (post.comments_count || 0), 0) / (postEngagement?.length || 1);

    // Brand performance calculation
    const brandStats = new Map();
    brandPerformance?.forEach(brand => {
      const brandName = brand.name;
      const existing = brandStats.get(brandName) || { orders: 0, revenue: 0, products: 0 };
      
      // Count unique products
      const uniqueProducts = new Set();
      brand.products?.forEach((product: any) => uniqueProducts.add(product.id));
      
      // Calculate revenue and orders
      let brandRevenue = 0;
      let brandOrders = 0;
      brand.order_items?.forEach((item: any) => {
        if (item.orders) {
          brandRevenue += item.orders.total_amount || 0;
          brandOrders += 1;
        }
      });

      brandStats.set(brandName, {
        orders: existing.orders + brandOrders,
        revenue: existing.revenue + brandRevenue,
        products: uniqueProducts.size
      });
    });

    const topBrands = Array.from(brandStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const analytics = {
      userAnalytics: {
        totalUsers: totalUsers?.length || 0,
        newUsersThisMonth: newUsersThisMonth?.length || 0,
        newUsersThisWeek: newUsersThisWeek?.length || 0,
        dailyActiveUsers: dailyActiveUsers || 0,
        profileCompletionRate: totalProfiles > 0 ? Math.round((completeProfiles / totalProfiles) * 100) : 0,
        avatarRate: totalProfiles > 0 ? Math.round((usersWithAvatars / totalProfiles) * 100) : 0
      },
      ecommerceAnalytics: {
        totalRevenue: totalRevenueAmount,
        monthlyRevenue: monthlyRevenueAmount,
        totalOrders,
        monthlyOrders,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        topProducts: topProductsList
      },
      appUsageAnalytics: {
        postsThisMonth: postsThisMonth?.length || 0,
        topWishlistedProducts,
        avgLikes: Math.round(avgLikes * 100) / 100,
        avgComments: Math.round(avgComments * 100) / 100
      },
      socialEngagement: {
        totalFollows: totalFollows?.length || 0,
        totalPosts: postEngagement?.length || 0
      },
      brandPerformance: {
        topBrands
      }
    };

    console.log('App analytics data fetched successfully');
    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching app analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch app analytics' },
      { status: 500 }
    );
  }
}
