import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Activity, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface AICostsData {
  totalLast30Days: number;
  byProvider: Record<string, number>;
  recent: Array<{
    id: number;
    date: string;
    description: string;
    amount: number;
    currency: string;
  }>;
  dateRange: string;
}

const AICostsOverview: React.FC = () => {
  const [data, setData] = useState<AICostsData>({
    totalLast30Days: 0,
    byProvider: {},
    recent: [],
    dateRange: 'Last 30 Days'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTransactionsCollapsed, setIsTransactionsCollapsed] = useState(true);

  const fetchCosts = async () => {
    try {
      const response = await fetch('/api/ai-costs');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching AI costs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCosts();
  };

  const providerColors: Record<string, string> = {
    'Anthropic': 'rgba(255, 157, 0, 0.6)',
    'OpenAI': 'rgba(96, 165, 250, 0.6)',
    'OpenRouter': 'rgba(168, 85, 247, 0.6)',
    'Midjourney': 'rgba(236, 72, 153, 0.6)',
    'Krea': 'rgba(20, 184, 166, 0.6)',
    'Other': 'rgba(128, 128, 128, 0.6)'
  };

  if (isLoading) {
    return (
      <div className="twisted-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="text-green-400" size={24} />
          <h2 className="text-xl font-bold text-white">AI Costs</h2>
        </div>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="twisted-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="text-green-400" size={24} />
          <h2 className="text-xl font-bold text-white">AI Costs</h2>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="twisted-btn-sm flex items-center gap-2"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Total Last 30 Days */}
      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-1">
          Total ({data.dateRange})
        </div>
        <div className="text-3xl font-bold text-green-400">
          ${data.totalLast30Days.toFixed(2)}
        </div>
      </div>

      {/* Breakdown by Provider */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <TrendingUp size={16} />
          By Provider
        </div>
        <div className="space-y-2">
          {Object.entries(data.byProvider)
            .sort(([, a], [, b]) => b - a)
            .map(([provider, amount]) => {
              const percentage = (amount / data.totalLast30Days) * 100;
              return (
                <div key={provider} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-300">{provider}</span>
                      <span className="text-sm font-semibold text-white">
                        ${amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: providerColors[provider] || providerColors['Other']
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div 
          className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
          onClick={() => setIsTransactionsCollapsed(!isTransactionsCollapsed)}
        >
          <Activity size={16} />
          Recent Transactions
          {isTransactionsCollapsed ? (
            <ChevronDown size={16} className="ml-auto" />
          ) : (
            <ChevronUp size={16} className="ml-auto" />
          )}
        </div>
        {!isTransactionsCollapsed && (
          <div className="space-y-2">
            {data.recent.length === 0 ? (
              <p className="text-sm text-gray-500">No recent transactions</p>
            ) : (
              data.recent.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-start text-sm bg-black/20 rounded-lg p-2"
                >
                  <div className="flex-1">
                    <div className="text-gray-300 truncate">
                      {tx.description.replace(/^(Anthropic|OpenAI|OpenRouter|Midjourney|Krea):\s*/i, '')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="font-semibold text-green-400 ml-2">
                    ${tx.amount.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AICostsOverview;
