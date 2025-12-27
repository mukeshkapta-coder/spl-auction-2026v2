import React from 'react';

export const ScoringRules: React.FC = () => {
  const rules = [
    { category: 'Batting', item: '1 Run', points: '1 Point' },
    { category: 'Batting', item: '1 Four (Boundary)', points: '+2 Extra (6 Total)' },
    { category: 'Batting', item: '1 Six (Maximum)', points: '+4 Extra (10 Total)' },
    { category: 'Fielding', item: '1 Catch', points: '10 Points' },
    { category: 'Fielding', item: '1 Stumping', points: '10 Points' },
    { category: 'WK Milestones', item: '3 Dismissals', points: '+25 Extra Points' },
    { category: 'WK Milestones', item: '5 Dismissals', points: '+50 Extra Points' },
    { category: 'Bowling', item: '1 Wicket', points: '25 Points' },
    { category: 'Bowling Milestones', item: '3 Wickets', points: '+25 Extra Points' },
    { category: 'Bowling Milestones', item: '5 Wickets', points: '+50 Extra Points' },
    { category: 'Bowling Milestones', item: '6+ Wickets', points: '+75 Extra Points' },
    { category: 'Special', item: 'Player of the Match', points: '2x Total Match Points' },
    { category: 'Franchise', item: 'Captain (C)', points: '3x Total Match Points' },
    { category: 'Franchise', item: 'Vice-Captain (VC)', points: '2x Total Match Points' },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="border-b border-gray-200 pb-8 text-center md:text-left">
        <h2 className="text-4xl font-black text-ecbNavy uppercase tracking-tighter italic mb-4">Official Scoring Rules</h2>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Seva Premiere League Phase 2 Regulations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-2xl">
          <div className="p-8 bg-ecbNavy text-white">
            <h3 className="text-xl font-black uppercase italic tracking-tighter">Point Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Category</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400">Activity</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black uppercase text-gray-400">Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rules.map((rule, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${rule.category === 'Special' ? 'bg-amber-400 text-white' : rule.category === 'Franchise' ? 'bg-ecbCyan text-white' : 'bg-ecbGrey text-ecbNavy'}`}>
                        {rule.category}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-bold text-ecbNavy">{rule.item}</td>
                    <td className="px-8 py-5 text-right font-black text-ecbCyan italic">{rule.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-xl h-fit">
          <h4 className="text-ecbNavy font-black uppercase tracking-tighter text-xl mb-6 italic">Calculation Example</h4>
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <p className="text-sm font-bold text-ecbNavy mb-2">Batting Scoring:</p>
            <p className="text-gray-600 text-xs leading-relaxed mb-4">
              Total Runs + (Fours × 2) + (Sixes × 4)<br/>
              <span className="text-ecbCyan font-black">50 Runs (5x4, 2x6) = 50 + 10 + 8 = 68 Points</span>
            </p>
            <div className="h-px bg-gray-200 my-4"></div>
            <p className="text-sm font-bold text-ecbNavy mb-2">Bowling Scoring:</p>
            <p className="text-gray-600 text-xs leading-relaxed">
              Wickets × 25 + Milestones<br/>
              <span className="text-ecbCyan font-black">3 Wickets = (3 * 25) + 25 = 100 Points</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};