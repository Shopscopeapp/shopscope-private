interface UpsellStatsProps {
  stats: {
    totalUpsells: number
    conversionRate: number
    revenue: number
    activePromotions: number
  }
}

export default function UpsellStats({ stats }: UpsellStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100)
  }

  const metrics = [
    {
      label: 'Total Upsells',
      value: stats.totalUpsells.toLocaleString(),
      description: 'Total number of upsell actions taken',
    },
    {
      label: 'Conversion Rate',
      value: formatPercentage(stats.conversionRate),
      description: 'Percentage of upsells that led to sales',
    },
    {
      label: 'Revenue Generated',
      value: formatCurrency(stats.revenue),
      description: 'Total revenue from upsell conversions',
    },
    {
      label: 'Active Promotions',
      value: stats.activePromotions.toLocaleString(),
      description: 'Currently running upsell campaigns',
    },
  ]

  return (
    <>
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="bg-white p-6 rounded-lg shadow-sm border border-shopscope-gray-200"
        >
          <dt className="text-sm font-medium text-shopscope-gray-500">{metric.label}</dt>
          <dd className="mt-1">
            <span className="text-2xl font-semibold text-shopscope-black">
              {metric.value}
            </span>
          </dd>
          <p className="mt-2 text-sm text-shopscope-gray-600">{metric.description}</p>
        </div>
      ))}
    </>
  )
}
