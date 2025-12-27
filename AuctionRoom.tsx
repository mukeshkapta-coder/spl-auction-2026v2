import React, { useState, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Player, Franchise } from '../types';
import { MIN_BID_INCREMENT } from '../constants';
import { getScoutingReport } from '../services/geminiService';
import { PlayerCard } from './PlayerCard';
import { Logo } from './Logo';

interface AuctionRoomProps {
  franchises: Franchise[];
  players: Player[];
  onBid: (teamId: string, amount: number) => void;
  onSold: (playerId: string, teamId: string, amount: number) => void;
  onSkip: (playerId: string) => void;
}

type ScoutingSortKey = 'name' | 'originalTeam' | 'skill' | 'basePrice' | 'rating';
type SortOrder = 'asc' | 'desc';

const getRoleBadge = (role: string) => {
  const r = role.toLowerCase();
  if (r.includes('wk')) return 'bg-orange-500';
  if (r.includes('batter')) return 'bg-ecbCyan';
  if (r.includes('bowler')) return 'bg-ecbNavy';
  if (r.includes('all-rounder')) return 'bg-ecbGreen';
  return 'bg-gray-500';
};

export const AuctionRoom = forwardRef<{ startRandom: () => void }, AuctionRoomProps>(({ 
  franchises, 
  players, 
  onBid, 
  onSold, 
  onSkip 
}, ref) => {
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [lastBidder, setLastBidder] = useState<string | null>(null);
  const [scoutingReport, setScoutingReport] = useState<string>("");
  const [isLoadingScout, setIsLoadingScout] = useState(false);
  const [animateBid, setAnimateBid] = useState(false);
  const [finalPriceInput, setFinalPriceInput] = useState<string>("");
  
  const [sortConfig, setSortConfig] = useState<{ key: ScoutingSortKey; order: SortOrder }>({ key: 'name', order: 'asc' });

  const availablePlayers = players.filter(p => !p.isSold);

  const sortedScoutingPlayers = useMemo(() => {
    const sortable = [...availablePlayers];
    sortable.sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof Player];
      let bVal: any = b[sortConfig.key as keyof Player];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [availablePlayers, sortConfig]);

  const toggleSort = (key: ScoutingSortKey) => {
    setSortConfig(prev => ({ key, order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc' }));
  };

  const SortIndicator = ({ column }: { column: ScoutingSortKey }) => {
    if (sortConfig.key !== column) return <span className="ml-1 opacity-20">⇅</span>;
    return <span className="ml-1 text-ecbCyan font-black">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>;
  };

  useImperativeHandle(ref, () => ({
    startRandom: () => {
      if (availablePlayers.length > 0) {
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        handleStartAuction(availablePlayers[randomIndex]);
      } else {
        alert("No players left in the pool!");
      }
    }
  }));

  useEffect(() => {
    if (currentBid > 0) setFinalPriceInput(currentBid.toString());
  }, [currentBid]);

  const handleStartAuction = async (player: Player) => {
    if (player.isSold) return;
    setActivePlayer(player);
    setCurrentBid(50);
    setLastBidder(null);
    setScoutingReport("");
    setFinalPriceInput("50");
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsLoadingScout(true);
    try {
      const report = await getScoutingReport(player, franchises);
      setScoutingReport(report);
    } finally {
      setIsLoadingScout(false);
    }
  };

  const placeBid = (teamId: string) => {
    if (!activePlayer || lastBidder === teamId) return;
    const team = franchises.find(f => f.id === teamId);
    if (!team) return;
    const nextBid = lastBidder ? currentBid + MIN_BID_INCREMENT : currentBid;
    if (team.budget >= nextBid) {
      setCurrentBid(nextBid);
      setLastBidder(teamId);
      onBid(teamId, nextBid);
      setAnimateBid(true);
      setTimeout(() => setAnimateBid(false), 300);
    } else {
      alert(`${team.name} has insufficient funds!`);
    }
  };

  const finalizeSale = () => {
    const saleAmount = parseInt(finalPriceInput);
    if (isNaN(saleAmount) || saleAmount < 0) return;
    if (activePlayer && lastBidder) {
      onSold(activePlayer.id, lastBidder, saleAmount);
      setActivePlayer(null);
      setCurrentBid(0);
      setLastBidder(null);
      setFinalPriceInput("");
    }
  };

  return (
    <div className="flex flex-col space-y-12">
      <section>
        {activePlayer ? (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10 relative overflow-hidden animate-in zoom-in duration-300">
            <div className="absolute top-0 right-0 w-96 h-96 bg-ecbCyan/5 blur-[100px] -mr-48 -mt-48"></div>
            <div className="relative flex flex-col lg:flex-row items-stretch gap-12">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-6">
                  <span className="bg-ecbNavy text-white px-4 py-1 rounded text-[10px] font-black uppercase tracking-widest">Live Auction</span>
                  <div className="h-px flex-1 bg-gray-100"></div>
                </div>
                <h2 className="text-6xl font-black text-ecbNavy mb-2 tracking-tighter italic uppercase">{activePlayer.name}</h2>
                <div className="flex items-center space-x-3 text-lg font-bold text-gray-400 mb-8">
                  <span>{activePlayer.country}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-ecbCyan"></div>
                  <span>{activePlayer.skill}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-ecbCyan"></div>
                  <span className="text-ecbNavy">{activePlayer.originalTeam}</span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <h4 className="text-sm font-black text-ecbNavy uppercase tracking-widest mb-4">ECB Insights & Scouting</h4>
                  {isLoadingScout ? (
                    <div className="flex space-x-2 py-4"><div className="w-2 h-2 bg-ecbCyan rounded-full animate-bounce"></div><div className="w-2 h-2 bg-ecbCyan rounded-full animate-bounce [animation-delay:0.2s]"></div></div>
                  ) : (
                    <p className="text-gray-600 leading-relaxed font-medium italic">"{scoutingReport || "Compiling report..."}"</p>
                  )}
                </div>
              </div>
              <div className="lg:w-[400px] flex flex-col">
                <div className="bg-ecbNavy rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden flex-1 min-h-[300px]">
                  <div className="absolute top-0 left-0 w-full h-1 bg-ecbCyan"></div>
                  <p className="text-white/40 text-xs font-black uppercase tracking-[0.3em] mb-4">Leading Valuation</p>
                  <div className={`text-8xl font-black text-white tracking-tighter mb-6 transition-all duration-300 ${animateBid ? 'scale-110 text-ecbCyan' : ''}`}>₹{currentBid}</div>
                  <div className="w-full pt-8 border-t border-white/10">
                    {lastBidder ? (
                      <div className="bg-white/5 border border-white/10 rounded-2xl py-3 px-6 inline-block"><span className="text-xl font-black text-ecbCyan italic">{franchises.find(f => f.id === lastBidder)?.name}</span></div>
                    ) : (
                      <span className="text-white/20 font-black uppercase tracking-widest italic text-sm animate-pulse">Awaiting Opening Bid...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {franchises.map(team => (
                <button key={team.id} onClick={() => placeBid(team.id)} disabled={lastBidder === team.id || team.budget < (lastBidder ? currentBid + MIN_BID_INCREMENT : currentBid)} className={`group relative p-4 rounded-xl border transition-all ${lastBidder === team.id ? 'border-ecbCyan bg-ecbCyan/5' : 'bg-white border-gray-100 hover:border-ecbCyan/40'} disabled:opacity-30`}>
                  <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: team.color }}></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase mb-1 truncate w-full text-center">{team.name}</span>
                  <div className="text-sm font-black text-ecbNavy">₹{team.budget}</div>
                </button>
              ))}
            </div>
            <div className="mt-12 pt-10 border-t border-gray-100 flex flex-col md:flex-row gap-6 items-end">
              {lastBidder && (
                <div className="flex-1 w-full">
                  <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Final Price</label>
                  <input type="number" value={finalPriceInput} onChange={(e) => setFinalPriceInput(e.target.value)} className="w-full bg-gray-50 border border-gray-200 focus:border-ecbCyan rounded-2xl py-6 px-6 text-3xl font-black text-ecbNavy outline-none" />
                </div>
              )}
              <div className="flex-[2] flex gap-4 w-full h-[84px]">
                <button onClick={finalizeSale} disabled={!lastBidder} className="flex-1 bg-ecbCyan hover:bg-ecbDeepNavy disabled:bg-gray-100 rounded-2xl font-black text-2xl text-white uppercase shadow-xl">Sold</button>
                <button onClick={() => setActivePlayer(null)} className="flex-1 bg-white hover:bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-400 text-lg uppercase">Skip</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl py-24 px-10 text-center flex flex-col items-center">
            <h3 className="text-4xl font-black text-ecbNavy mb-4 tracking-tight uppercase italic text-center">Awaiting Next Talent</h3>
            <p className="text-gray-400 max-w-md font-medium text-lg mb-10 text-center">The auction floor is clear. Select a player from the scouting database below or draw a random one.</p>
            <button onClick={() => { if (availablePlayers.length > 0) handleStartAuction(availablePlayers[Math.floor(Math.random() * availablePlayers.length)]); }} className="px-12 py-5 bg-ecbNavy hover:bg-ecbCyan text-white font-black uppercase rounded-2xl transition-all">Draw Next Player</button>
          </div>
        )}
      </section>

      <section className="space-y-8">
        <div className="flex items-center justify-between border-b-2 border-gray-100 pb-6">
          <h2 className="text-3xl font-black text-ecbNavy tracking-tighter uppercase italic">Scouting Database</h2>
          <span className="text-sm font-bold text-gray-400">{availablePlayers.length} PLAYERS AVAILABLE</span>
        </div>
        {availablePlayers.length > 0 ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-400 uppercase text-[11px] font-black tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="px-10 py-6 cursor-pointer" onClick={() => toggleSort('name')}>Player <SortIndicator column="name" /></th>
                    <th className="px-10 py-6 cursor-pointer" onClick={() => toggleSort('originalTeam')}>IPL Team <SortIndicator column="originalTeam" /></th>
                    <th className="px-10 py-6 cursor-pointer" onClick={() => toggleSort('skill')}>Role <SortIndicator column="skill" /></th>
                    <th className="px-10 py-6 text-right">Base Price</th>
                    <th className="px-10 py-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedScoutingPlayers.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-10 py-6 font-black text-ecbNavy">{p.name}</td>
                      <td className="px-10 py-6 font-bold text-gray-500">{p.originalTeam}</td>
                      <td className="px-10 py-6"><span className={`text-[10px] font-black px-4 py-1.5 rounded-full text-white uppercase ${getRoleBadge(p.skill)}`}>{p.skill}</span></td>
                      <td className="px-10 py-6 text-right font-black">₹{p.basePrice}</td>
                      <td className="px-10 py-6 text-right"><button onClick={() => handleStartAuction(p)} className="bg-ecbNavy hover:bg-ecbCyan text-white px-6 py-2 rounded-lg font-black uppercase text-[10px]">Start Auction</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-center py-20 italic">No remaining players in pool.</div>
        )}
      </section>
    </div>
  );
});