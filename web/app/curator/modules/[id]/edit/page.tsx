"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Module {
  id: string;
  title: string;
  description: string;
  status: string;
  is_mandatory: boolean;
  estimated_minutes: number;
  topic_title: string;
}

interface ContentSection {
  id: string;
  section_type: string;
  title: string;
  content: string;
  order_index: number;
}

interface ProprietaryContent {
  id: string;
  content_type: string;
  title: string;
  content: string;
  source_url: string;
  created_at: string;
}

export default function ModuleEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const [module, setModule] = useState<Module | null>(null);
  const [contentSections, setContentSections] = useState<ContentSection[]>([]);
  const [proprietaryContent, setProprietaryContent] = useState<ProprietaryContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [isMandatory, setIsMandatory] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  
  // Add proprietary content form
  const [showAddContent, setShowAddContent] = useState(false);
  const [newContentType, setNewContentType] = useState<'document' | 'case_study' | 'policy' | 'video'>('document');
  const [newContentTitle, setNewContentTitle] = useState('');
  const [newContentBody, setNewContentBody] = useState('');
  const [newContentUrl, setNewContentUrl] = useState('');

  useEffect(() => {
    if (id) {
      fetchModuleDetails();
    }
  }, [id]);

  const fetchModuleDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/curator/modules/${id}`, {
        headers: { 
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'test-admin-token' 
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to fetch module');
      }
      
      const data = await res.json();
      setModule(data.module);
      setContentSections(data.content || []);
      setProprietaryContent(data.proprietaryContent || []);
      
      // Populate form
      setTitle(data.module.title);
      setDescription(data.module.description || '');
      setStatus(data.module.status);
      setIsMandatory(data.module.is_mandatory);
      setEstimatedMinutes(data.module.estimated_minutes || 30);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModule = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/curator/modules/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'test-admin-token'
        },
        body: JSON.stringify({
          title,
          description,
          status,
          isMandatory,
          estimatedMinutes,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to update module');
      }
      
      await fetchModuleDetails();
      alert('Module updated successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddProprietaryContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/curator/modules/${id}/proprietary`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'test-admin-token'
        },
        body: JSON.stringify({
          contentType: newContentType,
          title: newContentTitle,
          content: newContentBody,
          sourceUrl: newContentUrl,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to add content');
      }
      
      // Reset form
      setNewContentTitle('');
      setNewContentBody('');
      setNewContentUrl('');
      setShowAddContent(false);
      
      // Refresh
      await fetchModuleDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProprietaryContent = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    
    try {
      const res = await fetch(`/api/curator/modules/${id}/proprietary/${contentId}`, {
        method: 'DELETE',
        headers: { 
          'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'test-admin-token'
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to delete content');
      }
      
      await fetchModuleDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-coral-500 border-t-transparent"></div>
          <p className="mt-4 text-brand-subtle">Loading module...</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Module not found</p>
          <Link href="/curator/modules" className="mt-4 inline-block text-brand-coral-500">
            ← Back to modules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/curator/modules" className="text-brand-coral-500 hover:text-brand-coral-600 mb-4 inline-block">
            ← Back to modules
          </Link>
          <h1 className="text-3xl font-bold text-brand-ink">Edit Module</h1>
          <p className="mt-2 text-brand-subtle">Update module details and add company-specific content</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic details */}
            <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
              <h2 className="text-xl font-semibold text-brand-ink mb-4">Module Details</h2>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="block text-sm font-medium text-brand-ink mb-2">Title *</span>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full border border-brand-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                    required
                  />
                </label>
                
                <label className="block">
                  <span className="block text-sm font-medium text-brand-ink mb-2">Description</span>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full border border-brand-border rounded-lg p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                  />
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-brand-ink mb-2">Status</span>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="w-full border border-brand-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  
                  <label className="block">
                    <span className="block text-sm font-medium text-brand-ink mb-2">Duration (minutes)</span>
                    <input
                      type="number"
                      value={estimatedMinutes}
                      onChange={e => setEstimatedMinutes(Number(e.target.value))}
                      min="5"
                      max="480"
                      className="w-full border border-brand-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                    />
                  </label>
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isMandatory}
                    onChange={e => setIsMandatory(e.target.checked)}
                    className="w-4 h-4 text-brand-coral-500 border-brand-border rounded focus:ring-brand-coral-500"
                  />
                  <span className="ml-2 text-sm font-medium text-brand-ink">
                    Make this module mandatory
                  </span>
                </label>
              </div>
              
              <button
                onClick={handleSaveModule}
                disabled={saving || !title.trim()}
                className="mt-6 w-full px-6 py-3 bg-brand-coral-500 text-white rounded-lg hover:bg-brand-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* Proprietary content */}
            <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-ink">Company-Specific Content</h2>
                <button
                  onClick={() => setShowAddContent(!showAddContent)}
                  className="px-4 py-2 bg-brand-coral-500 text-white rounded-lg hover:bg-brand-coral-600 transition-colors text-sm"
                >
                  + Add Content
                </button>
              </div>

              {showAddContent && (
                <form onSubmit={handleAddProprietaryContent} className="mb-6 p-4 bg-brand-surface2 rounded-lg">
                  <div className="space-y-3">
                    <label className="block">
                      <span className="block text-sm font-medium text-brand-ink mb-1">Type</span>
                      <select
                        value={newContentType}
                        onChange={e => setNewContentType(e.target.value as any)}
                        className="w-full border border-brand-border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                      >
                        <option value="document">Document</option>
                        <option value="case_study">Case Study</option>
                        <option value="policy">Policy</option>
                        <option value="video">Video</option>
                      </select>
                    </label>
                    
                    <label className="block">
                      <span className="block text-sm font-medium text-brand-ink mb-1">Title *</span>
                      <input
                        type="text"
                        value={newContentTitle}
                        onChange={e => setNewContentTitle(e.target.value)}
                        className="w-full border border-brand-border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                        required
                      />
                    </label>
                    
                    <label className="block">
                      <span className="block text-sm font-medium text-brand-ink mb-1">Content</span>
                      <textarea
                        value={newContentBody}
                        onChange={e => setNewContentBody(e.target.value)}
                        className="w-full border border-brand-border rounded p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                      />
                    </label>
                    
                    <label className="block">
                      <span className="block text-sm font-medium text-brand-ink mb-1">Source URL</span>
                      <input
                        type="url"
                        value={newContentUrl}
                        onChange={e => setNewContentUrl(e.target.value)}
                        className="w-full border border-brand-border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-coral-500"
                      />
                    </label>
                    
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving || !newContentTitle.trim()}
                        className="px-4 py-2 bg-brand-coral-500 text-white rounded text-sm hover:bg-brand-coral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddContent(false)}
                        className="px-4 py-2 bg-brand-surface2 text-brand-ink rounded text-sm hover:bg-brand-border"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {proprietaryContent.length === 0 ? (
                  <p className="text-brand-subtle text-sm">No company-specific content added yet</p>
                ) : (
                  proprietaryContent.map(content => (
                    <div key={content.id} className="border border-brand-border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-brand-coral-50 text-brand-coral-700 text-xs rounded">
                              {content.content_type.replace('_', ' ')}
                            </span>
                            <h3 className="font-medium text-brand-ink">{content.title}</h3>
                          </div>
                          {content.content && (
                            <p className="text-sm text-brand-subtle mb-2 line-clamp-2">{content.content}</p>
                          )}
                          {content.source_url && (
                            <a href={content.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-coral-500 hover:underline">
                              View source →
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteProprietaryContent(content.id)}
                          className="ml-4 text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick actions */}
            <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
              <h3 className="font-semibold text-brand-ink mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link 
                  href={`/curator/modules/${id}/assign`}
                  className="block w-full px-4 py-2 text-center bg-brand-coral-500 text-white rounded hover:bg-brand-coral-600 transition-colors no-underline"
                >
                  Assign to Team
                </Link>
                <Link 
                  href={`/curator/modules/${id}/analytics`}
                  className="block w-full px-4 py-2 text-center bg-brand-surface2 text-brand-ink rounded hover:bg-brand-border transition-colors no-underline"
                >
                  View Analytics
                </Link>
              </div>
            </div>

            {/* Content sections */}
            <div className="bg-brand-surface rounded-lg border border-brand-border p-6">
              <h3 className="font-semibold text-brand-ink mb-4">Content Sections</h3>
              <div className="space-y-2">
                {contentSections.length === 0 ? (
                  <p className="text-brand-subtle text-sm">No content sections available</p>
                ) : (
                  contentSections.map(section => (
                    <div key={section.id} className="text-sm p-2 bg-brand-surface2 rounded">
                      <span className="text-xs text-brand-subtle">{section.section_type}</span>
                      <p className="font-medium text-brand-ink">{section.title}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

