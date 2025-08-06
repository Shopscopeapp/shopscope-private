import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { brandId, accessToken, shop } = await request.json()
    console.log('Syncing shipping info for:', { brandId, shop })

    if (!brandId || !accessToken || !shop) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verify brand exists
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      console.error('Brand not found:', brandError || 'No brand with this ID')
      return NextResponse.json(
        { error: 'Brand not found in database' },
        { status: 404 }
      )
    }

    // First check delivery settings
    const settingsResponse = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: `
          query {
            deliverySettings {
              legacyModeProfiles
            }
          }
        `,
      }),
    })

    if (!settingsResponse.ok) {
      const errorText = await settingsResponse.text()
      console.error('Shopify API error:', errorText)
      throw new Error(`Failed to fetch delivery settings from Shopify: ${errorText}`)
    }

    const settingsData = await settingsResponse.json()
    const isLegacyMode = settingsData.data?.deliverySettings?.legacyModeProfiles

    // Fetch shipping zones using the appropriate query based on mode
    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: `
          query {
            deliveryProfiles(first: 10) {
              edges {
                node {
                  id
                  name
                  default
                  profileLocationGroups {
                    locationGroup {
                      id
                    }
                    locationGroupZones(first: 10) {
                      edges {
                        node {
                          zone {
                            id
                            name
                            countries {
                              code {
                                countryCode
                                restOfWorld
                              }
                              provinces {
                                name
                                code
                              }
                            }
                          }
                          methodDefinitions(first: 10) {
                            edges {
                              node {
                                id
                                active
                                name
                                description
                                rateProvider {
                                  ... on DeliveryRateDefinition {
                                    price {
                                      amount
                                      currencyCode
                                    }
                                  }
                                }
                                methodConditions {
                                  field
                                  operator
                                  conditionCriteria {
                                    __typename
                                    ... on MoneyV2 {
                                      amount
                                      currencyCode
                                    }
                                    ... on Weight {
                                      unit
                                      value
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Shopify API error:', errorText)
      throw new Error(`Failed to fetch shipping zones from Shopify: ${errorText}`)
    }

    const data = await response.json()
    
    // Add debug logging
    console.log('Raw Shopify response:', JSON.stringify(data, null, 2))
    
    // Check for GraphQL errors
    if (data.errors) {
      console.error('GraphQL errors:', data.errors)
      return NextResponse.json(
        { error: `GraphQL errors: ${data.errors.map((e: any) => e.message).join(', ')}` },
        { status: 400 }
      )
    }

    // Validate response structure
    if (!data.data?.deliveryProfiles?.edges) {
      console.error('Invalid response structure:', data)
      return NextResponse.json(
        { error: 'Invalid response structure from Shopify' },
        { status: 500 }
      )
    }

    const profiles = data.data.deliveryProfiles.edges.map((edge: { node: any }) => edge.node)
    console.log(`Processing ${profiles.length} delivery profiles:`, JSON.stringify(profiles, null, 2))
    
    // Process each delivery profile and create/update shipping zones
    for (const profileData of profiles) {
      if (!profileData?.profileLocationGroups) {
        console.warn('Skipping profile due to missing location groups:', profileData.id)
        continue
      }

      // Process each location group
      for (const locationGroup of profileData.profileLocationGroups) {
        if (!locationGroup?.locationGroupZones?.edges) {
          console.warn('Skipping location group due to missing zones:', locationGroup?.locationGroup?.id)
          continue
        }

        console.log('Processing location group zones:', JSON.stringify(locationGroup.locationGroupZones.edges, null, 2))

        // Process each zone in the location group
        for (const zoneEdge of locationGroup.locationGroupZones.edges) {
          const zoneNode = zoneEdge.node
          if (!zoneNode?.zone) {
            console.warn('Skipping zone due to missing data')
            continue
          }

          const zone = zoneNode.zone
          const countries = zone.countries
            .map((country: any) => country.code.countryCode)
            .filter(Boolean)
          
          const provinces = zone.countries
            .flatMap((country: any) => country.provinces || [])
            .map((province: any) => province.code)
            .filter(Boolean)

          console.log('Creating/updating shipping zone:', {
            name: zone.name,
            countries,
            provinces,
            shopify_zone_id: zone.id
          })

          // First, check if zone exists
          const { data: existingZone } = await supabaseAdmin
            .from('shipping_zones')
            .select('id')
            .eq('brand_id', brandId)
            .eq('shopify_zone_id', zone.id)
            .single()

          // Update or insert zone
          const zoneData = {
            brand_id: brandId,
            name: zone.name || 'Unknown Zone',
            countries,
            provinces,
            shopify_zone_id: zone.id,
            updated_at: new Date().toISOString()
          }

          const { data: zoneResult, error: zoneError } = existingZone
            ? await supabaseAdmin
                .from('shipping_zones')
                .update(zoneData)
                .eq('id', existingZone.id)
                .select()
                .single()
            : await supabaseAdmin
                .from('shipping_zones')
                .insert(zoneData)
                .select()
                .single()

          if (zoneError) {
            console.error('Error upserting shipping zone:', zoneError)
            continue
          }

          console.log('Successfully created/updated shipping zone:', zoneResult)

          // Process method definitions for this zone
          if (!zoneNode.methodDefinitions?.edges) {
            console.warn('No method definitions found for zone:', zone.id)
            continue
          }

          console.log('Processing method definitions:', JSON.stringify(zoneNode.methodDefinitions.edges, null, 2))

          // First, get existing rates for this zone
          const { data: existingRates } = await supabaseAdmin
            .from('shipping_rates')
            .select('id, shopify_rate_id')
            .eq('zone_id', zoneResult.id)

          const existingRatesMap = new Map(
            existingRates?.map(rate => [rate.shopify_rate_id, rate.id]) || []
          )

          for (const methodEdge of zoneNode.methodDefinitions.edges) {
            const method = methodEdge.node
            if (!method?.active || !method.id) continue

            console.log('Processing shipping method:', {
              name: method.name,
              conditions: method.methodConditions,
              rateProvider: method.rateProvider
            })

            // Extract shipping rate price and conditions
            let shippingPrice = 0
            let minOrderAmount = null
            let maxOrderAmount = null
            let minWeight = null
            let maxWeight = null

            // Get price from rateProvider first
            if (method.rateProvider?.price?.amount) {
              shippingPrice = parseFloat(method.rateProvider.price.amount)
              console.log('Found rate from provider:', shippingPrice)
            }

            // Process conditions for thresholds
            for (const condition of method.methodConditions || []) {
              console.log('Processing condition:', condition)
              
              if (condition.field === 'TOTAL_PRICE' && 
                  condition.conditionCriteria?.__typename === 'MoneyV2') {
                if (condition.operator === 'GREATER_THAN_OR_EQUAL_TO') {
                  minOrderAmount = parseFloat(condition.conditionCriteria.amount)
                  console.log('Found min order amount:', minOrderAmount)
                } else if (condition.operator === 'LESS_THAN_OR_EQUAL_TO') {
                  maxOrderAmount = parseFloat(condition.conditionCriteria.amount)
                  console.log('Found max order amount:', maxOrderAmount)
                }
              } else if (condition.field === 'WEIGHT' && 
                  condition.conditionCriteria?.__typename === 'Weight') {
                if (condition.operator === 'GREATER_THAN_OR_EQUAL_TO') {
                  minWeight = parseFloat(condition.conditionCriteria.value)
                  console.log('Found min weight:', minWeight)
                }
              }
            }

            // Apply free shipping rules
            if (method.name.toLowerCase().includes('free') || 
               (minOrderAmount && minOrderAmount >= 100 && method.name.toLowerCase().includes('standard')) ||
               (minWeight && minWeight >= 20 && method.name.toLowerCase().includes('international'))) {
              shippingPrice = 0
              console.log('Applied free shipping rule')
            }

            console.log('Final shipping rate values:', {
              name: method.name,
              price: shippingPrice,
              minOrderAmount,
              maxOrderAmount,
              minWeight,
              maxWeight
            })

            // If we have an existing rate, update it. Otherwise, insert a new one.
            const existingRateId = existingRatesMap.get(method.id)
            const rateData = {
              zone_id: zoneResult.id,
              name: method.name || 'Shipping Rate',
              price: shippingPrice,
              min_order_amount: minOrderAmount,
              max_order_amount: maxOrderAmount,
              conditions: method.methodConditions || [],
              shopify_rate_id: method.id,
              updated_at: new Date().toISOString()
            }

            const { error: rateError } = existingRateId
              ? await supabaseAdmin
                  .from('shipping_rates')
                  .update(rateData)
                  .eq('id', existingRateId)
              : await supabaseAdmin
                  .from('shipping_rates')
                  .insert(rateData)

            if (rateError) {
              console.error('Error upserting shipping rate:', rateError)
            } else {
              console.log('Successfully created/updated shipping rate')
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Shipping zones and rates synced successfully'
    })
  } catch (error) {
    console.error('Error syncing shipping info:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync shipping information' },
      { status: 500 }
    )
  }
}
