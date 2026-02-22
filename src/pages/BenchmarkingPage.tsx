import { useTranslation } from 'react-i18next'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card } from '../components/ui/Card.tsx'
import benchmarkingData from '../data/benchmarking-data.json'
import './benchmarking-page.css'

const CHART_COLORS = {
  yourHotel: '#1a3a5c',
  chainAvg: '#5b9bd5',
  industryAvg: '#bfbfbf',
}

const DONUT_COLORS = ['#1a3a5c', '#d9e6f2']

export function BenchmarkingPage() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'

  const { overall, ranking, categories, scoreHistory, weaknesses } =
    benchmarkingData

  return (
    <div className="benchmarking">
      <header className="benchmarking__header">
        <h1>{t('benchmarking.title')}</h1>
      </header>

      {/* Summary cards */}
      <div className="benchmarking__summary">
        <Card className="benchmarking__summary-card">
          <h3>{t('benchmarking.overallScore')}</h3>
          <div className="benchmarking__score-row">
            <span className="benchmarking__score-primary">
              {t('benchmarking.yourHotel')}: <strong>{overall.yourScore} %</strong>
            </span>
          </div>
          <div className="benchmarking__score-row" style={{ marginTop: '0.5rem' }}>
            <span className="benchmarking__score-label">
              {t('benchmarking.chainAvg')}:{' '}
              <span className="benchmarking__score-value">{overall.chainAvg}</span>
            </span>
            <span className="benchmarking__score-label">
              {t('benchmarking.industryAvg')}:{' '}
              <span className="benchmarking__score-value">{overall.industryAvg}</span>
            </span>
            <span className="benchmarking__score-label">
              {t('benchmarking.industryRank', { rank: overall.industryRank })}
            </span>
          </div>
        </Card>

        <Card className="benchmarking__summary-card">
          <h3>{t('benchmarking.rankingPosition')}</h3>
          <p className="benchmarking__ranking-text">
            {t('benchmarking.rankingDescription', {
              percentile: ranking.percentile,
              starRating: ranking.starRating,
            })}
          </p>
        </Card>

        <Card className="benchmarking__summary-card">
          <h3>{t('benchmarking.performanceTrend')}</h3>
          <p className="benchmarking__trend-text">
            {t('benchmarking.performanceTrendDescription')}
          </p>
        </Card>
      </div>

      {/* Category comparisons table */}
      <h2 className="benchmarking__section-title">
        {t('benchmarking.categoryComparisons')}
      </h2>
      <Card className="benchmarking__table-card">
        <table className="benchmarking__table">
          <thead>
            <tr>
              <th>{t('benchmarking.table.category')}</th>
              <th>{t('benchmarking.table.yourScore')}</th>
              <th>{t('benchmarking.table.chainAvg')}</th>
              <th>{t('benchmarking.table.industryAvg')}</th>
              <th>{t('benchmarking.table.trend')}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.key}>
                <td>
                  {t(`benchmarking.categories.${cat.key}` as const)}
                </td>
                <td>{cat.yourScore} %</td>
                <td>{cat.chainAvg} %</td>
                <td>{cat.industryAvg} %</td>
                <td>
                  <span
                    className={
                      cat.trend >= 0
                        ? 'benchmarking__trend--up'
                        : 'benchmarking__trend--down'
                    }
                  >
                    {cat.trend >= 0 ? `↑ ${cat.trend} %` : `↓ ${Math.abs(cat.trend)} %`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Charts row */}
      <div className="benchmarking__charts">
        {/* Score history line chart */}
        <Card className="benchmarking__chart-card">
          <h3>{t('benchmarking.scoreChart')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={scoreHistory}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="period"
                reversed={isRtl}
                tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              />
              <YAxis
                domain={[70, 95]}
                orientation={isRtl ? 'right' : 'left'}
                tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '0.8rem' }}
                formatter={(value: string) => {
                  const labelMap: Record<string, string> = {
                    yourHotel: t('benchmarking.yourHotel'),
                    chainAvg: t('benchmarking.chainAvg'),
                    industryAvg: t('benchmarking.industryAvg'),
                  }
                  return labelMap[value] ?? value
                }}
              />
              <Line
                type="monotone"
                dataKey="yourHotel"
                stroke={CHART_COLORS.yourHotel}
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="chainAvg"
                stroke={CHART_COLORS.chainAvg}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="industryAvg"
                stroke={CHART_COLORS.industryAvg}
                strokeWidth={1.5}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top weaknesses donut charts */}
        <Card className="benchmarking__chart-card">
          <h3>{t('benchmarking.topWeaknesses')}</h3>
          <div className="benchmarking__donuts">
            {weaknesses.map((w) => (
              <div key={w.key} className="benchmarking__donut-item">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={[
                        { value: w.innerPercent },
                        { value: 100 - w.innerPercent },
                      ]}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={0}
                    >
                      <Cell fill={DONUT_COLORS[0]} />
                      <Cell fill={DONUT_COLORS[1]} />
                    </Pie>
                    <text
                      x="50%"
                      y="44%"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={18}
                      fontWeight={700}
                      fill="var(--color-text)"
                    >
                      {w.score} %
                    </text>
                    <text
                      x="50%"
                      y="60%"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={12}
                      fill="var(--color-text-muted)"
                    >
                      {w.innerPercent} %
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="benchmarking__donut-label">
                  <strong>
                    {t(`benchmarking.categories.${w.key}` as const)}
                  </strong>
                </div>
                <div className="benchmarking__donut-related">
                  {w.relatedCategories.map((rc, idx) => (
                    <span key={idx}>
                      <span>{t(`benchmarking.categories.${rc.key}` as const)}</span>
                      <span>{rc.value} %</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
