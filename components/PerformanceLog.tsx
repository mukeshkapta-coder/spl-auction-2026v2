import React, { useState, useMemo } from 'react';
import { Player, Franchise } from '../types';

interface PerformanceLogProps {
  players: Player[];
  franchises: Franchise[];
}

export const PerformanceLog: React.FC<PerformanceLogProps> = ({ players, franchises }) => {
  const [selectedMatch, setSelectedMatch] = useState<number | 'all'>('all');

  // Helper to get franchise info and multipliers
  const getFranchiseInfo = (teamId?: string) => {
    if (!teamId) return { name: 'Free Agent', color: '#cbd5e1', captainId: null, viceCaptainId: null };
    const franchise = franchises.find(f => f.id === teamId);
    return franchise ? { 
      name: franchise.name, 
      color: franchise.color, 
      captainId: franchise.captainId, 
      viceCaptainId: franchise.viceCaptainId 
    } : { name: 'Unassigned', color: '#cbd5e1', captainId: null, viceCaptainId: null };
  };

  // Flatten all performances and attach metadata with multipliers
  const allPerformances = useMemo(() => {
    return players.flatMap(p => {
      const history = p.performanceHistory || [];
      const franchise = getFranchiseInfo(p.teamId);
      
      let multiplier = 1;
      let roleLabel = "";
      if (franchise.captainId === p.id) {
        multiplier = 3;
        roleLabel = "Captain (3x)";
      } else if (franchise.viceCaptainId === p.id) {
        multiplier = 2;
        roleLabel = "Vice-Captain (2x)";
      }

      return history.map(perf => ({
        ...perf,
        playerName: p.name,
        playerSkill: p.skill,
        teamId: p.teamId,
        playerId: p.id,
        multiplier,
        roleLabel,
        calculatedPoints: perf.points * multiplier
      }));
    }).sort((a: any, b: any) => (b.matchNumber - a.matchNumber) || (b.calculatedPoints - a.calculatedPoints));
  }, [players, franchises]);

  // Identify unique match numbers
  const matchNumbers = useMemo(() => {
    return Array.from(new Set(allPerformances.map(p => p.matchNumber))).sort((a: any, b: any) => b - a);
  }, [allPerformances]);

  // Filter performances based on selection
  const filteredPerformances = useMemo(() => {
    return selectedMatch === 'all' 
      ? allPerformances 
      : allPerformances.filter(p => p.matchNumber === selectedMatch);
  }, [selectedMatch, allPerformances]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Header & Match Selector */}
      <div className="flex flex-col space-y-8 border-b border-gray-200 pb-10">
        <div>
          <h2 className="text-4xl font-black text-ecbNavy uppercase tracking-tighter italic leading-none">Match Performance Log</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mt-2">Comprehensive breakdown of all 74+ league matches with multipliers</p>
        </div>
        
        <div className="flex flex-col space-y-4">
          <div className="text-[10px] font-black text-ecbCyan uppercase tracking-[0.3em]">Filter By Match Number</div>
          <div className="flex items-center space-x-3 overflow-x-auto pb-4 custom-scrollbar">
            <button 
              onClick={() => setSelectedMatch('all')}
              className={`flex-shrink-0 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                selectedMatch === 'all' ? 'bg-ecbNavy text-white shadow-xl scale-105' : 'bg-white text-gray-400 hover:text-ecbNavy border border-gray-100'
              }`}
            >
              All Matches
            </button>
            {matchNumbers.map(m => (
              <button 
                key={m}
                onClick={() => setSelectedMatch(m)}
                className={`flex-shrink-0 w-14 h-14 rounded-xl text-xs font-black uppercase tracking-tighter transition-all flex items-center justify-center ${
                  selectedMatch === m ? 'bg-ecbCyan text-white shadow-lg shadow-ecbCyan/20 scale-110' : 'bg-white text-gray-400 hover:text-ecbNavy border border-gray-100'
                }`}
              >
                M{m}
              </button>
            ))}
            {matchNumbers.length === 0 && (
              <div className="text-gray-300 text-xs font-bold uppercase italic px-4">Awaiting first match sync...</div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Timeline */}
      <div className="grid grid-cols-1 gap-6">
        {filteredPerformances.length > 0 ? (
          filteredPerformances.map((perf, i) => {
            const franchise = getFranchiseInfo(perf.teamId);
            return (
              <div key={`${perf.playerName}-${perf.matchNumber}-${i}`} className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-lg hover:shadow-2xl transition-all group relative overflow-hidden">
                 {/* Match Number Badge */}
                 <div className="absolute top-0 left-0 bg-ecbNavy text-white px-6 py-2 rounded-br-2xl font-black text-[10px] tracking-widest">
                   MATCH {perf.matchNumber}
                 </div>

                 {perf.isPOTM && (
                   <div className="absolute top-0 right-10 bg-amber-400 text-white px-8 py-2 rounded-b-[2rem] font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center z-10">
                     <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                     Player of the Match (2x)
                   </div>
                 )}
                 
                 <div className="flex flex-col md:flex-row md:items-center gap-8 mt-6 md:mt-0">
                    <div className="flex items-center space-x-6 min-w-[300px]">
                      <div className="w-16 h-16 rounded-full bg-ecbGrey flex items-center justify-center text-2xl font-black text-ecbNavy border border-gray-100 group-hover:bg-ecbCyan group-hover:text-white transition-all shrink-0">
                        {perf.playerName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded text-white uppercase tracking-widest whitespace-nowrap" style={{ backgroundColor: franchise.color }}>
                            {franchise.name}
                          </span>
                          {perf.roleLabel && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded text-white uppercase tracking-widest ${perf.multiplier === 3 ? 'bg-amber-500' : 'bg-ecbCyan'}`}>
                              {perf.roleLabel}
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-black text-ecbNavy uppercase italic leading-tight mt-1 truncate">{perf.playerName}</h3>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">{perf.playerSkill}</div>
                      </div>
                    </div>

                    <div className="flex-1 md:border-l border-gray-100 md:pl-8">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Performance Breakdown
                      </div>
                      <p className="text-ecbNavy font-medium italic text-lg leading-relaxed">
                        "{perf.breakdown}"
                      </p>
                      {perf.multiplier > 1 && (
                        <div className="mt-2 text-[10px] font-black text-ecbCyan uppercase tracking-widest">
                          Base Points: {perf.points} × {perf.multiplier} Leadership Multiplier
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Final Match Points</div>
                      <div className="text-5xl font-black text-ecbNavy tracking-tighter italic">
                        +{perf.calculatedPoints}
                      </div>
                    </div>
                 </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] py-32 text-center flex flex-col items-center justify-center">
             <svg className="w-20 h-20 text-gray-100 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
             <div className="text-gray-300 font-black uppercase tracking-[0.2em]">Match Analytics Data Not Yet Available</div>
             <p className="text-gray-400 text-sm mt-2 max-w-sm">Synchronize match scorecards in the Rankings tab to populate this timeline.</p>
          </div>
        )}
      </div>
    </div>
  );
};
