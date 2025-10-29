'use client'

/**
 * Certified Catalogue - V2.0
 * Browse and search certified modules
 */

import { useState, useEffect } from 'react'
import { CatalogueSearch } from '../components/CatalogueSearch'

export default function CertifiedPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Certified Catalogue</h1>
              <p className="text-sm text-gray-600 mt-1">Browse expert-stamped modules</p>
            </div>
            <a
              href="/v2"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <CatalogueSearch />
      </main>
    </div>
  )
}

