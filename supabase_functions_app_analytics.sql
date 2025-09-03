-- Function to get daily active users
CREATE OR REPLACE FUNCTION get_daily_active_users(target_date DATE)
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT user_id) INTO active_count
    FROM (
        SELECT user_id FROM posts WHERE DATE(created_at) = target_date
        UNION
        SELECT user_id FROM wishlist_items WHERE DATE(created_at) = target_date
        UNION
        SELECT user_id FROM orders WHERE DATE(created_at) = target_date
        UNION
        SELECT follower_id as user_id FROM followers WHERE DATE(created_at) = target_date
        UNION
        SELECT following_id as user_id FROM followers WHERE DATE(created_at) = target_date
    ) as active_users;
    
    RETURN COALESCE(active_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get user retention (users active in last 7 days who joined 7+ days ago)
CREATE OR REPLACE FUNCTION get_user_retention()
RETURNS INTEGER AS $$
DECLARE
    retained_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO retained_count
    FROM profiles p
    WHERE p.created_at <= CURRENT_DATE - INTERVAL '7 days'
    AND EXISTS (
        SELECT 1 FROM posts WHERE user_id = p.id AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        UNION
        SELECT 1 FROM wishlist_items WHERE user_id = p.id AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        UNION
        SELECT 1 FROM orders WHERE user_id = p.id AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    );
    
    RETURN COALESCE(retained_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get conversion rate (users with carts who made purchases)
CREATE OR REPLACE FUNCTION get_conversion_rate()
RETURNS DECIMAL AS $$
DECLARE
    users_with_carts INTEGER;
    users_who_purchased INTEGER;
    conversion_rate DECIMAL;
BEGIN
    SELECT COUNT(DISTINCT user_id) INTO users_with_carts
    FROM cart_items;
    
    SELECT COUNT(DISTINCT user_id) INTO users_who_purchased
    FROM cart_items ci
    WHERE EXISTS (
        SELECT 1 FROM orders o WHERE o.user_id = ci.user_id AND o.status = 'paid'
    );
    
    IF users_with_carts > 0 THEN
        conversion_rate := (users_who_purchased::DECIMAL / users_with_carts::DECIMAL) * 100;
    ELSE
        conversion_rate := 0;
    END IF;
    
    RETURN ROUND(conversion_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get wishlist conversion rate
CREATE OR REPLACE FUNCTION get_wishlist_conversion_rate()
RETURNS DECIMAL AS $$
DECLARE
    wishlisted_products INTEGER;
    purchased_from_wishlist INTEGER;
    conversion_rate DECIMAL;
BEGIN
    SELECT COUNT(DISTINCT product_id) INTO wishlisted_products
    FROM wishlist_items;
    
    SELECT COUNT(DISTINCT wi.product_id) INTO purchased_from_wishlist
    FROM wishlist_items wi
    WHERE EXISTS (
        SELECT 1 FROM order_items oi 
        JOIN orders o ON o.id = oi.order_id 
        WHERE oi.product_id = wi.product_id 
        AND o.status = 'paid'
    );
    
    IF wishlisted_products > 0 THEN
        conversion_rate := (purchased_from_wishlist::DECIMAL / wishlisted_products::DECIMAL) * 100;
    ELSE
        conversion_rate := 0;
    END IF;
    
    RETURN ROUND(conversion_rate, 2);
END;
$$ LANGUAGE plpgsql;
