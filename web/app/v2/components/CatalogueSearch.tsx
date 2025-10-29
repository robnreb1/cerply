'use client'

/**
 * Catalogue Search Component
 * Search and filter certified modules
 */

import { useState } from 'react'

interface CertifiedModule {
  id: string
  title: string
  description: string
  industryCategory: string
  provenance: string
  stampedBy: string
  stampedAt: Date
}

export function CatalogueSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('all')
  const [results, setResults] = useState<CertifiedModule[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('q', searchTerm)
      if (category !== 'all') params.append('industry', category)

      const response = await fetch(`/api/v2/certified/catalogue?${params}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data.modules || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getProvenanceBadge = (provenance: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      certified_core: { label: 'Certified Core', color: 'bg-green-100 text-green-800' },
      industry: { label: 'Industry Source', color: 'bg-blue-100 text-blue-800' },
      internal: { label: 'Internal', color: 'bg-gray-100 text-gray-800' },
    }
    const badge = badges[provenance] || badges.internal
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, topic, or skill..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">All Industries</option>
            <option value="finance">Finance</option>
            <option value="healthcare">Healthcare</option>
            <option value="tech">Technology</option>
            <option value="manufacturing">Manufacturing</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {results.map((module) => (
            <div
              key={module.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors cursor-pointer"
              onClick={() => window.location.href = `/v2/certified/${module.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                    {getProvenanceBadge(module.provenance)}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>✓ Stamped by {module.stampedBy}</span>
                    <span>{new Date(module.stampedAt).toLocaleDateString()}</span>
                    <span className="px-2 py-1 bg-gray-100 rounded">{module.industryCategory}</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500">No certified modules found</p>
          <p className="text-sm text-gray-400 mt-2">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  )
}

