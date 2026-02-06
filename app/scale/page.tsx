'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const inter = Inter({ subsets: ['latin'] })

// Dynamically import Globe to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

type MemberLocation = {
  id: number
  name: string
  city: string
  country?: string
  lat?: number
  lng?: number
  turtles: string[]
  skills: string[]
  orgs: string[]
  pizzaToppings?: string
}

type GlobePoint = {
  lat: number
  lng: number
  size: number
  color: string
  label: string
  members: MemberLocation[]
}

const TURTLE_COLORS = {
  splinter: '#8B4513',
  raphael: '#DC143C',
  leonardo: '#1E90FF',
  donatello: '#9370DB',
  april: '#FFD700',
  'foot clan': '#808080',
  michelangelo: '#FF8C00',
} as const

const TURTLE_NAMES = [
  'splinter',
  'raphael',
  'leonardo',
  'donatello',
  'april',
  'foot clan',
  'michelangelo',
] as const

export default function ScalePage() {
  const [members, setMembers] = useState<MemberLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [heatMapMode, setHeatMapMode] = useState<string | null>(null)
  const globeEl = useRef<{ controls: () => { autoRotate: boolean; autoRotateSpeed: number } } | undefined>()

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/members/locations')
        if (!res.ok) throw new Error('Failed to load members')
        const data = await res.json()
        setMembers(data.members || [])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchMembers()
  }, [])

  // Auto-rotate globe
  useEffect(() => {
    if (globeEl.current) {
      const controls = globeEl.current.controls()
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.5
    }
  }, [])

  const stats = useMemo(() => {
    const cityCounts = new Map<string, number>()
    const countryCounts = new Map<string, number>()
    const turtleCounts = new Map<string, number>()
    const skillCounts = new Map<string, number>()
    const orgCounts = new Map<string, number>()

    members.forEach((m) => {
      if (m.city) cityCounts.set(m.city, (cityCounts.get(m.city) || 0) + 1)
      if (m.country) countryCounts.set(m.country, (countryCounts.get(m.country) || 0) + 1)
      m.turtles.forEach((t) => {
        const normalized = t.toLowerCase()
        turtleCounts.set(normalized, (turtleCounts.get(normalized) || 0) + 1)
      })
      m.skills.forEach((s) => skillCounts.set(s, (skillCounts.get(s) || 0) + 1))
      m.orgs.forEach((o) => orgCounts.set(o, (orgCounts.get(o) || 0) + 1))
    })

    return {
      total: members.length,
      withLocation: members.filter((m) => m.lat && m.lng).length,
      cities: cityCounts.size,
      countries: countryCounts.size,
      topCities: Array.from(cityCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      countryCounts,
      turtleCounts,
      skillCounts,
      orgCounts,
    }
  }, [members])

  const globePoints = useMemo<GlobePoint[]>(() => {
    const cityMap = new Map<string, MemberLocation[]>()

    members.forEach((m) => {
      if (m.lat && m.lng) {
        const key = `${m.lat},${m.lng}`
        const existing = cityMap.get(key) || []
        cityMap.set(key, [...existing, m])
      }
    })

    return Array.from(cityMap.entries()).map(([, cityMembers]) => {
      const first = cityMembers[0]

      let color = '#ffffff'
      let label = first.city

      if (heatMapMode) {
        const turtleCount = cityMembers.filter((m) =>
          m.turtles.some((t) => t.toLowerCase() === heatMapMode.toLowerCase())
        ).length

        if (turtleCount > 0) {
          const turtleKey = heatMapMode.toLowerCase() as keyof typeof TURTLE_COLORS
          color = TURTLE_COLORS[turtleKey] || '#ffffff'
          label = `${first.city} (${turtleCount} ${heatMapMode})`
        } else {
          color = 'rgba(255,255,255,0.2)'
        }
      }

      return {
        lat: first.lat!,
        lng: first.lng!,
        size: Math.min(0.5 + cityMembers.length * 0.15, 2),
        color,
        label,
        members: cityMembers,
      }
    })
  }, [members, heatMapMode])

  const turtleDistribution = useMemo(() => {
    return TURTLE_NAMES.map((turtle) => ({
      name: turtle.charAt(0).toUpperCase() + turtle.slice(1),
      value: stats.turtleCounts.get(turtle) || 0,
      fill: TURTLE_COLORS[turtle],
    })).filter((t) => t.value > 0)
  }, [stats.turtleCounts])

  const countryDistribution = useMemo(() => {
    return Array.from(stats.countryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }))
  }, [stats.countryCounts])

  const pizzaToppingsByRegion = useMemo(() => {
    const regions = new Map<string, Map<string, number>>()

    members.forEach((m) => {
      if (m.pizzaToppings && m.country) {
        if (!regions.has(m.country)) {
          regions.set(m.country, new Map())
        }
        const countryToppings = regions.get(m.country)!

        const toppings = m.pizzaToppings
          .toLowerCase()
          .split(/[,/&]+/)
          .map((t) => t.trim())
          .filter(Boolean)

        toppings.forEach((t) => {
          countryToppings.set(t, (countryToppings.get(t) || 0) + 1)
        })
      }
    })

    return Array.from(regions.entries())
      .map(([country, toppingCounts]) => {
        const topToppings = Array.from(toppingCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => `${name} (${count})`)

        return {
          country,
          topToppings: topToppings.join(', '),
          totalMembers: Array.from(toppingCounts.values()).reduce((a, b) => a + b, 0),
        }
      })
      .filter((r) => r.topToppings)
      .sort((a, b) => b.totalMembers - a.totalMembers)
  }, [members])

  if (loading) {
    return (
      <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={spinnerStyle} />
          <p style={{ fontSize: 18, opacity: 0.8, marginTop: 20 }}>Loading member data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center' }}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>Error</h1>
          <p style={{ opacity: 0.7, marginBottom: 32 }}>{error}</p>
          <Link href="/" style={btnStyle('primary')}>
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', display: 'grid', gap: 24 }}>
        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" style={navBtnStyle}>
            ← Home
          </Link>
          <Link href="/crews" style={navBtnStyle}>
            Crews
          </Link>
        </div>

        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 48, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            PizzaDAO at Scale
          </h1>
          <p style={{ fontSize: 18, opacity: 0.7, marginTop: 12 }}>
            Our global community visualized
          </p>
        </header>

        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          <StatCard label="Total Members" value={stats.total} />
          <StatCard label="Cities" value={stats.cities} />
          <StatCard label="Countries" value={stats.countries} />
          <StatCard label="Mapped" value={`${Math.round((stats.withLocation / stats.total) * 100)}%`} />
        </div>

        {/* Globe Container */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Global Distribution</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setHeatMapMode(null)}
                style={{
                  ...filterBtnStyle,
                  ...(heatMapMode === null ? activeBtnStyle : {}),
                }}
              >
                All Members
              </button>
              {TURTLE_NAMES.map((turtle) => {
                const count = stats.turtleCounts.get(turtle) || 0
                if (count === 0) return null
                return (
                  <button
                    key={turtle}
                    onClick={() => setHeatMapMode(turtle)}
                    style={{
                      ...filterBtnStyle,
                      ...(heatMapMode === turtle ? { ...activeBtnStyle, background: TURTLE_COLORS[turtle], color: 'white' } : {}),
                    }}
                  >
                    {turtle.charAt(0).toUpperCase() + turtle.slice(1)} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 600, width: '100%', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
            <Globe
              ref={globeEl}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
              backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
              pointsData={globePoints}
              pointLat="lat"
              pointLng="lng"
              pointColor="color"
              pointAltitude={0.01}
              pointRadius="size"
              pointLabel="label"
              atmosphereColor="#ffffff"
              atmosphereAltitude={0.15}
            />
          </div>

          {heatMapMode && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: '#f8f8f8',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>
                Showing <strong>{heatMapMode}</strong> skill density across cities
              </p>
            </div>
          )}
        </div>

        {/* Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          {/* Turtle Distribution */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Skill Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={turtleDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {turtleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Country Distribution */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Top Countries</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryDistribution}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#000000" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Cities */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Top Cities</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {stats.topCities.map(([city, count]) => (
              <div
                key={city}
                style={{
                  padding: 16,
                  background: '#f8f8f8',
                  borderRadius: 8,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 800 }}>{count}</div>
                <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>{city}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pizza Toppings by Region */}
        {pizzaToppingsByRegion.length > 0 && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              Favorite Pizza Toppings by Region
            </h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {pizzaToppingsByRegion.map(({ country, topToppings, totalMembers }) => (
                <div
                  key={country}
                  style={{
                    padding: 16,
                    background: '#f8f8f8',
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{country}</div>
                    <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>{topToppings}</div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.6,
                      background: 'white',
                      padding: '6px 12px',
                      borderRadius: 12,
                    }}
                  >
                    {totalMembers} members
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>{value}</div>
      <div style={{ fontSize: 14, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#fafafa',
  color: '#000',
  fontFamily: inter.style.fontFamily,
  padding: '40px 20px',
  display: 'flex',
  flexDirection: 'column',
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 14,
  padding: 24,
  boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
}

const navBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '10px 16px',
  minHeight: 44,
  background: 'white',
  border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: 8,
  color: '#000',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 600,
}

const filterBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  minHeight: 40,
  background: 'white',
  border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
}

const activeBtnStyle: React.CSSProperties = {
  background: '#000',
  color: '#fff',
  borderColor: '#000',
}

const spinnerStyle: React.CSSProperties = {
  width: 50,
  height: 50,
  border: '4px solid rgba(0,0,0,0.1)',
  borderTop: '4px solid #000',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  margin: '0 auto',
}

function btnStyle(kind: 'primary' | 'secondary'): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    minHeight: 44,
    borderRadius: 10,
    border: '1px solid rgba(0,0,0,0.18)',
    fontWeight: 650,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: 'inherit',
    fontSize: 14,
  }
  if (kind === 'primary') return { ...base, background: 'black', color: 'white', borderColor: 'black' }
  return { ...base, background: 'white', color: 'black' }
}
