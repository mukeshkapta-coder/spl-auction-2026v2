import React, { useState } from 'react';
import { Franchise } from '../types';

interface RankingProps {
  franchises: Franchise[];
  onSyncScores: (url: string) => void;
  isSyncing: boolean;
}

export const Ranking: React.FC<RankingProps> = ({ franchises, onSyncScores, isSyncing }) => {
  const [scorecardUrl, setScorecardUrl] = useState('');
  
  const sortedFranchises = [...franchises].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  const maxPoints = Math.max(...franchises.map(f => f.totalPoints || 0), 100);
  const topPoints = sortedFranchises[0]?.totalPoints || 0;

  const handleSync = () => {
    if (!scorecardUrl) {
      alert("Please enter a scorecard link.");
      return;
    }
    onSyncScores(scorecardUrl);
    setScorecardUrl('');
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-200 pb-8 gap-6">
        <h2 className="text-4xl font-black text-ecbNavy uppercase tracking-tighter italic">World Leaderboard</h2>
        <div className="flex w-full md:w-auto items-stretch gap-2">
          <input 
            type="text" 
            placeholder="Paste Scorecard URL (Match Day Link)" 
            className="flex-1 md:w-80 px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-ecbCyan text-sm font-medium transition-all"
            value={scorecardUrl}
            onChange={(e) => setScorecardUrl(e.target.value)}
          />
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-ecbCyan hover:bg-ecbDeepNavy text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 flex items-center"
          >
            {isSyncing ? 'Syncing...' : 'Sync Match'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Table View */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-xl font-black text-ecbNavy uppercase italic tracking-tighter">Franchise Standing</h3>
            <span className="text-[10px] font-black text-ecbCyan uppercase tracking-[0.2em]">Live Data Feed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="px-6 py-6 text-center">Rank</th>
                  <th className="px-6 py-6">Franchise</th>
                  <th className="px-6 py-6 text-right">Pts</th>
                  <th className="px-6 py-6 text-right">Gap Above</th>
                  <th className="px-6 py-6 text-right">Gap to #1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedFranchises.map((f, i) => {
                  const points = f.totalPoints || 0;
                  const prevPoints = i > 0 ? (sortedFranchises[i - 1].totalPoints || 0) : points;
                  const diffPrev = prevPoints - points;
                  const diffTop = topPoints - points;

                  return (
                    <tr key={f.id} className="hover:bg-gray-50 transition-all group">
                      <td className="px-6 py-6">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mx-auto ${
                          i === 0 ? 'bg-amber-400 text-white shadow-lg' : 
                          i === 1 ? 'bg-gray-300 text-white' : 
                          i === 2 ? 'bg-orange-400 text-white' : 
                          'bg-ecbGrey text-ecbNavy'
                        }`}>
                          {i + 1}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color }}></div>
                          <span className="font-black text-ecbNavy text-base uppercase italic group-hover:text-ecbCyan transition-colors truncate max-w-[120px]">{f.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right font-black text-ecbNavy text-xl tracking-tighter">
                        {points}
                      </td>
                      <td className="px-6 py-6 text-right">
                        {i === 0 ? (
                          <span className="text-[9px] font-black text-ecbGreen uppercase tracking-widest bg-ecbGreen/10 px-2 py-1 rounded-md">Leader</span>
                        ) : (
                          <span className="text-sm font-black text-red-500">-{diffPrev}</span>
                        )}
                      </td>
                      <td className="px-6 py-6 text-right">
                        {i === 0 ? (
                          <span className="text-ecbCyan font-black text-sm">0</span>
                        ) : (
                          <span className="text-sm font-black text-gray-400">-{diffTop}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Visual Chart View */}
        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-2xl flex flex-col">
           <h3 className="text-xl font-black text-ecbNavy uppercase italic tracking-tighter mb-8 border-b border-gray-50 pb-4">Point Distribution</h3>
           
           <div className="flex-1 space-y-6">
              {sortedFranchises.map(f => (
                <div key={f.id} className="space-y-2">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                      <span>{f.name}</span>
                      <span className="text-ecbNavy">{f.totalPoints || 0} PTS</span>
                   </div>
                   <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-1000 ease-out rounded-full" 
                        style={{ 
                          width: `${((f.totalPoints || 0) / maxPoints) * 100}%`,
                          backgroundColor: f.color 
                        }}
                      ></div>
                   </div>
                </div>
              ))}
           </div>

           <div className="mt-8 pt-8 border-t border-gray-50">
              <div className="bg-ecbNavy p-6 rounded-2xl text-center">
                 <div className="text-[10px] font-black text-ecbCyan uppercase tracking-[0.2em] mb-1">Total League Points</div>
                 <div className="text-3xl font-black text-white italic">
                   {franchises.reduce((sum, f) => sum + (f.totalPoints || 0), 0)}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
