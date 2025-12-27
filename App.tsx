import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Layout } from './components/Layout';
import { AuctionRoom } from './components/AuctionRoom';
import { Ranking } from './components/Ranking';
import { ScoringRules } from './components/ScoringRules';
import { PerformanceLog } from './components/PerformanceLog';
import { Player, Franchise, MatchPerformance } from './types';
import { INITIAL_PLAYERS, FRANCHISES } from './constants';
import { fetchPlayersFromWeb, processScorecard } from './services/geminiService';

const STORAGE_KEY_PLAYERS = 'spl_auction_players_v18';
const STORAGE_KEY_FRANCHISES = 'spl_auction_franchises_v18';
const STORAGE_KEY_MATCH_COUNT = 'spl_match_count_v18';

const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

const ResetConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void }> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ecbNavy/90 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white rounded-[2rem] p-10 max-w-md w-full shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-3xl font-black text-ecbNavy mb-4 uppercase italic">Reset System?</h2>
        <p className="text-gray-500 mb-10">This will erase all auction acquisitions and scores.</p>
        <div className="flex flex-col gap-4">
          <button onClick={() => { onConfirm(); onClose(); }} className="w-full bg-red-500 text-white font-black uppercase py-5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-500/20">Confirm Wipe</button>
          <button onClick={onClose} className="w-full bg-gray-100 text-gray-500 font-black uppercase py-5 rounded-2xl transition-all active:scale-95">Cancel</button>
        </div>
      </div>
    </div>
  );
};

type SortKey = 'name' | 'originalTeam' | 'skill' | 'soldPrice' | 'isSold' | 'points';
type SortOrder = 'asc' | 'desc';

const App: React.FC = () => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [showResetToast, setShowResetToast] = useState(false);
  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYERS);
      return saved ? JSON.parse(saved) : INITIAL_PLAYERS.map(p => ({ ...p, points: 0, performanceHistory: [] }));
    } catch (e) { return INITIAL_PLAYERS.map(p => ({ ...p, points: 0, performanceHistory: [] })); }
  });
  const [franchises, setFranchises] = useState<Franchise[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FRANCHISES);
      return saved ? JSON.parse(saved) : deepClone(FRANCHISES).map(f => ({ ...f, totalPoints: 0 }));
    } catch (e) { return deepClone(FRANCHISES).map(f => ({ ...f, totalPoints: 0 })); }
  });
  const [matchCount, setMatchCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MATCH_COUNT);
      return saved ? parseInt(saved) : 0;
    } catch (e) { return 0; }
  });
  const [activeTab, setActiveTab] = useState<'auction' | 'dashboard' | 'players' | 'ranking' | 'rules' | 'performance'>('auction');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingScorecard, setIsSyncingScorecard] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({ key: 'name', order: 'asc' });
  const auctionRoomRef = useRef<{ startRandom: () => void } | null>(null);

  const franchisesWithCalculatedPoints = useMemo(() => {
    return franchises.map(f => {
      const teamPlayers = players.filter(p => p.teamId === f.id);
      const totalPoints = teamPlayers.reduce((sum, p) => {
        let multiplier = 1;
        if (p.id === f.captainId) multiplier = 3;
        else if (p.id === f.viceCaptainId) multiplier = 2;
        return sum + ((p.points || 0) * multiplier);
      }, 0);
      return { ...f, roster: teamPlayers, totalPoints };
    });
  }, [players, franchises]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
    localStorage.setItem(STORAGE_KEY_FRANCHISES, JSON.stringify(franchises));
    localStorage.setItem(STORAGE_KEY_MATCH_COUNT, matchCount.toString());
  }, [players, franchises, matchCount]);

  const handleAtomicReset = () => {
    setPlayers(prev => prev.map(p => ({ ...p, isSold: false, teamId: undefined, soldPrice: undefined, points: 0, performanceHistory: [] })));
    setFranchises(deepClone(FRANCHISES).map(f => ({ ...f, totalPoints: 0, captainId: undefined, viceCaptainId: undefined })));
    setMatchCount(0);
    setShowResetToast(true);
    setTimeout(() => setShowResetToast(false), 3000);
  };

  const handleSyncPlayers = async () => {
    if (!confirm("Access official Season 2026 player records?")) return;
    setIsSyncing(true);
    try {
      const webPlayers = await fetchPlayersFromWeb();
      if (webPlayers && webPlayers.length > 0) {
        const soldPlayers = players.filter(p => p.isSold);
        const soldNames = new Set(soldPlayers.map(p => p.name));
        const newPlayers = webPlayers.filter(p => !soldNames.has(p.name));
        setPlayers([...soldPlayers, ...newPlayers]);
      }
    } catch (error) { console.error(error); alert("Sync failed."); } finally { setIsSyncing(false); }
  };

  const handleSyncMatchDayScores = async (url: string) => {
    setIsSyncingScorecard(true);
    try {
      const names = players.map(p => p.name);
      const scores = await processScorecard(url, names);
      const nextMatch = matchCount + 1;
      setPlayers(prev => prev.map(p => {
        const update = scores.find(s => s.playerName.toLowerCase() === p.name.toLowerCase());
        if (update) {
          const perf = { matchNumber: nextMatch, url, points: update.points, breakdown: update.breakdown, isPOTM: update.isPOTM };
          return { ...p, points: (p.points || 0) + update.points, performanceHistory: [...(p.performanceHistory || []), perf] };
        }
        return p;
      }));
      setMatchCount(nextMatch);
      alert(`Match ${nextMatch} Synced!`);
    } catch (e) { alert("Scorecard error."); } finally { setIsSyncingScorecard(false); }
  };

  const handleSold = useCallback((playerId: string, teamId: string, amount: number) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, isSold: true, teamId, soldPrice: amount } : p));
    setFranchises(prev => prev.map(f => f.id === teamId ? { ...f, budget: f.budget - amount } : f));
  }, []);

  const handleUpdatePrice = (playerId: string, newPrice: number) => {
    const p = players.find(x => x.id === playerId);
    if (!p || !p.teamId) return;
    const diff = newPrice - (p.soldPrice || 0);
    setPlayers(prev => prev.map(x => x.id === playerId ? { ...x, soldPrice: newPrice } : x));
    setFranchises(prev => prev.map(f => f.id === p.teamId ? { ...f, budget: f.budget - diff } : f));
    setEditingPlayerId(null);
  };

  const handleMovePlayer = (playerId: string, targetTeamId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player || player.teamId === targetTeamId) return;
    const sourceTeamId = player.teamId;
    const targetTeam = franchises.find(f => f.id === targetTeamId);
    const price = player.soldPrice || 0;
    
    if (targetTeam && targetTeam.budget < price) {
      alert("Target franchise cannot afford this player's contract.");
      return;
    }

    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, teamId: targetTeamId } : p));
    setFranchises(prev => prev.map(f => {
      if (f.id === sourceTeamId) return { ...f, budget: f.budget + price };
      if (f.id === targetTeamId) return { ...f, budget: f.budget - price };
      return f;
    }));
  };

  const onDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData("playerId", playerId);
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const onDrop = (e: React.DragEvent, teamId: string) => {
    const playerId = e.dataTransfer.getData("playerId");
    handleMovePlayer(playerId, teamId);
  };

  const handleSetCaptain = (teamId: string, playerId: string) => {
    setFranchises(prev => prev.map(f => f.id === teamId ? { ...f, captainId: f.captainId === playerId ? undefined : playerId, viceCaptainId: f.viceCaptainId === playerId ? undefined : f.viceCaptainId } : f));
  };
  const handleSetViceCaptain = (teamId: string, playerId: string) => {
    setFranchises(prev => prev.map(f => f.id === teamId ? { ...f, viceCaptainId: f.viceCaptainId === playerId ? undefined : playerId, captainId: f.captainId === playerId ? undefined : f.captainId } : f));
  };

  const downloadAuctionReport = () => {
    const headers = ['Player', 'Original IPL Team', 'Skill', 'Franchise', 'Bid (₹)', 'Points'];
    const rows = players.filter(p => p.isSold).map(p => [p.name, p.originalTeam || 'N/A', p.skill, franchises.find(f => f.id === p.teamId)?.name || 'N/A', p.soldPrice, p.points]);
    const csv = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "SPL_Auction_Report.csv";
    link.click();
  };

  const sortedPlayersList = useMemo(() => {
    const sorted = [...players];
    sorted.sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof Player];
      let bVal: any = b[sortConfig.key as keyof Player];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [players, sortConfig]);

  const toggleSort = (key: SortKey) => setSortConfig(p => ({ key, order: p.key === key && p.order === 'asc' ? 'desc' : 'asc' }));

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onSync={handleSyncPlayers} onReset={() => setShowResetModal(true)} isSyncing={isSyncing}>
      <ResetConfirmModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} onConfirm={handleAtomicReset} />
      
      {activeTab === 'auction' && <AuctionRoom ref={auctionRoomRef} players={players} franchises={franchisesWithCalculatedPoints} onBid={() => {}} onSold={handleSold} onSkip={() => {}} />}
      
      {activeTab === 'ranking' && <Ranking franchises={franchisesWithCalculatedPoints} onSyncScores={handleSyncMatchDayScores} isSyncing={isSyncingScorecard} />}
      
      {activeTab === 'performance' && <PerformanceLog players={players} franchises={franchises} />}
      
      {activeTab === 'rules' && <ScoringRules />}
      
      {activeTab === 'dashboard' && (
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="flex justify-between items-center border-b pb-8">
             <div><h2 className="text-4xl font-black text-ecbNavy uppercase italic tracking-tighter">Franchise Portfolios</h2><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Drag players to reassign | Select C (3x) and VC (2x)</p></div>
             <button onClick={downloadAuctionReport} className="bg-ecbNavy hover:bg-ecbCyan text-white px-8 py-4 rounded-xl font-black uppercase shadow-xl transition-all active:scale-95">Download Report</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {franchisesWithCalculatedPoints.map(team => (
              <div 
                key={team.id} 
                onDragOver={onDragOver} 
                onDrop={(e) => onDrop(e, team.id)}
                className="bg-white rounded-3xl border-2 p-6 flex flex-col h-full shadow-lg min-h-[500px] transition-all hover:shadow-xl relative group" 
                style={{ borderColor: team.color + '20' }}
              >
                <div className="absolute top-0 left-0 w-full h-1.5 transition-all group-hover:h-2 rounded-t-3xl" style={{ backgroundColor: team.color }}></div>
                <div className="flex justify-between items-start mb-6 pt-2">
                  <div className="min-w-0"><h3 className="text-2xl font-black text-ecbNavy uppercase italic truncate pr-2 leading-none">{team.name}</h3><div className="text-[8px] font-black uppercase text-gray-400 mt-1 tracking-widest">{team.roster.length} PLAYERS</div></div>
                  <div className="text-right shrink-0"><div className="text-lg font-black text-ecbCyan leading-none">₹{team.budget}</div><div className="text-[10px] font-black text-ecbNavy mt-1 italic">PTS: {team.totalPoints}</div></div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                  {team.roster.map(p => {
                    const isC = p.id === team.captainId; const isVC = p.id === team.viceCaptainId;
                    const pts = (p.points || 0) * (isC ? 3 : isVC ? 2 : 1);
                    return (
                      <div 
                        key={p.id} 
                        draggable 
                        onDragStart={(e) => onDragStart(e, p.id)}
                        className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col gap-2 relative cursor-grab active:cursor-grabbing hover:bg-white hover:shadow-md transition-all group/row"
                      >
                        {isC && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-xl"></div>}
                        {isVC && <div className="absolute left-0 top-0 bottom-0 w-1 bg-ecbCyan rounded-l-xl"></div>}
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1"><div className="text-[11px] font-black text-ecbNavy truncate uppercase italic leading-none mb-1">{p.name}</div><div className="text-[8px] text-gray-400 font-bold uppercase">{p.skill} ({p.originalTeam})</div></div>
                          <div className="text-right shrink-0"><div className={`text-[11px] font-black ${isC || isVC ? 'text-amber-500' : 'text-ecbCyan'}`}>{pts} <span className="text-[7px] text-gray-400 uppercase">PTS</span></div></div>
                        </div>
                        <div className="flex justify-between items-center mt-1 pt-2 border-t border-gray-100">
                          <div className="flex gap-1">
                            <button onClick={() => handleSetCaptain(team.id, p.id)} className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-black border transition-all ${isC ? 'bg-amber-400 text-white border-amber-500 shadow-sm' : 'bg-white text-gray-300 hover:border-amber-400 hover:text-amber-400'}`} title="Set Captain (3x)">C</button>
                            <button onClick={() => handleSetViceCaptain(team.id, p.id)} className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-black border transition-all ${isVC ? 'bg-ecbCyan text-white border-ecbCyan shadow-sm' : 'bg-white text-gray-300 hover:border-ecbCyan hover:text-ecbCyan'}`} title="Set Vice-Captain (2x)">VC</button>
                          </div>
                          <div className="text-right">
                             {editingPlayerId === p.id ? (
                               <input 
                                 autoFocus 
                                 type="number" 
                                 className="w-12 bg-white border border-ecbCyan rounded px-0.5 py-0.5 text-[9px] font-black text-ecbNavy outline-none" 
                                 defaultValue={p.soldPrice}
                                 onBlur={(e) => handleUpdatePrice(p.id, parseInt(e.target.value) || 0)} 
                                 onKeyDown={(e) => e.key === 'Enter' && handleUpdatePrice(p.id, parseInt((e.target as HTMLInputElement).value) || 0)}
                               />
                             ) : (
                               <div onClick={() => setEditingPlayerId(p.id)} className="text-[10px] font-black text-ecbCyan cursor-pointer hover:underline italic">₹{p.soldPrice}</div>
                             )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'players' && (
        <div className="space-y-12 animate-in fade-in duration-500">
           <div className="flex justify-between items-center border-b pb-8"><h2 className="text-4xl font-black text-ecbNavy uppercase italic tracking-tighter">Player Registry</h2></div>
           <div className="bg-white rounded-[2rem] border overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b tracking-widest">
                <tr>
                  <th className="px-10 py-6 cursor-pointer hover:text-ecbNavy transition-colors" onClick={() => toggleSort('name')}>Player</th>
                  <th className="px-10 py-6 cursor-pointer hover:text-ecbNavy transition-colors" onClick={() => toggleSort('originalTeam')}>Franchise</th>
                  <th className="px-10 py-6 text-right cursor-pointer hover:text-ecbNavy transition-colors" onClick={() => toggleSort('soldPrice')}>Valuation</th>
                  <th className="px-10 py-6 text-right cursor-pointer hover:text-ecbNavy transition-colors" onClick={() => toggleSort('isSold')}>Status</th>
                  <th className="px-10 py-6 text-right cursor-pointer hover:text-ecbNavy transition-colors" onClick={() => toggleSort('points')}>Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedPlayersList.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-10 py-6 font-black text-ecbNavy group-hover:text-ecbCyan transition-colors">{p.name}</td>
                    <td className="px-10 py-6 font-bold text-gray-500 uppercase text-xs">{p.originalTeam}</td>
                    <td className="px-10 py-6 text-right font-black text-ecbNavy text-lg">₹{p.isSold ? p.soldPrice : p.basePrice}</td>
                    <td className="px-10 py-6 text-right">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${
                        p.isSold ? 'bg-ecbGreen/10 text-ecbGreen border-ecbGreen/20' : 'bg-gray-100 text-gray-400 border-gray-200'
                      }`}>
                        {p.isSold ? 'Acquired' : 'Available'}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right font-black text-ecbCyan text-lg">{p.points || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
        </div>
      )}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }`}</style>
    </Layout>
  );
};

export default App;