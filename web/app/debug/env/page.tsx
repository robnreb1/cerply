'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface EnvVars {
  [key: string]: string | undefined;
}

interface ApiCheck {
  endpoint: string;
  status: number;
  data: any;
  error?: string;
}

export default function DebugEnvPage() {
  const [clientEnv, setClientEnv] = useState<EnvVars>({});
  const [apiChecks, setApiChecks] = useState<ApiCheck[]>([]);
  const [loading, setLoading] = useState(true);

  // Build-time env vars (these get inlined at build time)
  const buildTimeEnv: EnvVars = {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
    NEXT_PUBLIC_FF_QUALITY_BAR_V1: process.env.NEXT_PUBLIC_FF_QUALITY_BAR_V1,
    NEXT_PUBLIC_BRAND: process.env.NEXT_PUBLIC_BRAND,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  };

  useEffect(() => {
    // Client-time env vars (what the browser sees)
    const clientEnvVars: EnvVars = {};
    Object.keys(buildTimeEnv).forEach(key => {
      clientEnvVars[key] = process.env[key];
    });
    setClientEnv(clientEnvVars);

    // API health checks
    const checkApis = async () => {
      const checks: ApiCheck[] = [];
      
      try {
        // Check /api/health
        const healthRes = await apiFetch('/health');
        const healthData = await healthRes.json();
        checks.push({
          endpoint: '/api/health',
          status: healthRes.status,
          data: healthData,
        });
      } catch (error) {
        checks.push({
          endpoint: '/api/health',
          status: 0,
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      try {
        // Check /api/prompts
        const promptsRes = await apiFetch('/prompts');
        const promptsData = await promptsRes.json();
        checks.push({
          endpoint: '/api/prompts',
          status: promptsRes.status,
          data: Array.isArray(promptsData) ? { count: promptsData.length } : promptsData,
        });
      } catch (error) {
        checks.push({
          endpoint: '/api/prompts',
          status: 0,
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      setApiChecks(checks);
      setLoading(false);
    };

    checkApis();
  }, []);

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Environment Debug Page</h1>
      
      <div className="space-y-8">
        {/* Build-time Environment */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Build-time Environment</h2>
          <div className="card">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Variable</th>
                  <th className="text-left py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(buildTimeEnv).map(([key, value]) => (
                  <tr key={key} className="border-b">
                    <td className="py-2 font-mono text-sm">{key}</td>
                    <td className="py-2 font-mono text-sm">
                      {value || <span className="text-brand-subtle">undefined</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Client-time Environment */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Client-time Environment</h2>
          <div className="card">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Variable</th>
                  <th className="text-left py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(clientEnv).map(([key, value]) => (
                  <tr key={key} className="border-b">
                    <td className="py-2 font-mono text-sm">{key}</td>
                    <td className="py-2 font-mono text-sm">
                      {value || <span className="text-brand-subtle">undefined</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* API Checks */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">API Checks</h2>
          <div className="card">
            {loading ? (
              <p>Loading API checks...</p>
            ) : (
              <div className="space-y-4">
                {apiChecks.map((check, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">{check.endpoint}</h3>
                    <div className="space-y-2">
                      <p><strong>Status:</strong> {check.status}</p>
                      {check.error ? (
                        <p className="text-red-600"><strong>Error:</strong> {check.error}</p>
                      ) : (
                        <div>
                          <p><strong>Response:</strong></p>
                          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                            {JSON.stringify(check.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
