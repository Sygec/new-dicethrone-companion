import React, { useRef, useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { Download, Upload, Trash2, Shield, RefreshCcw, Save, ShieldAlert, Sparkles } from 'lucide-react';

export default function Settings() {
  const { settings, setSetting, exportBackup, importBackup, heroes, players, matches, matchParticipants, updateHeroDetails } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showIndividualChecklist, setShowIndividualChecklist] = useState(false);

  const heroesBySet = useMemo(() => {
    return heroes.reduce((acc, curr) => {
      if (!acc[curr.releaseSet]) acc[curr.releaseSet] = [];
      acc[curr.releaseSet].push(curr);
      return acc;
    }, {} as Record<string, typeof heroes>);
  }, [heroes]);

  const handleExport = async () => {
    try {
      const data = await exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dicethrone-companion-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMsg('Database backup file downloaded successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      console.error(error);
      setErrorMsg('Failed to export backup file.');
      setTimeout(() => setErrorMsg(''), 4500);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (window.confirm('WARNING: Importing this backup will OVERWRITE all current player logs, match history, and configurations. Proceed?')) {
          await importBackup(parsed);
          setSuccessMsg('Database backup restored successfully!');
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      } catch (error) {
        console.error(error);
        setErrorMsg('Invalid file format. Ensure you selected a valid companion backup file.');
        setTimeout(() => setErrorMsg(''), 4500);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportCSV = () => {
    try {
      if (matches.length === 0) {
        alert('No matches recorded to export.');
        return;
      }

      // Group participants by matchId
      const pByMatch: Record<string, any[]> = {};
      matchParticipants.forEach((mp) => {
        if (!pByMatch[mp.matchId]) pByMatch[mp.matchId] = [];
        pByMatch[mp.matchId].push(mp);
      });

      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'MatchID,PlayedAt,GameMode,DurationMinutes,Notes,PlayerName,HeroName,Placement\n';

      matches.forEach((m) => {
        const parts = pByMatch[m.id] || [];
        parts.forEach((p) => {
          const playerName = players.find((pl) => pl.id === p.playerId)?.name || 'Unknown';
          const heroName = heroes.find((h) => h.id === p.heroId)?.name || 'Unknown';
          const notesClean = (m.notes || '').replace(/"/g, '""');
          csvContent += `"${m.id}","${new Date(m.playedAt).toISOString()}","${m.gameMode}",${m.durationMinutes || 0},"${notesClean}","${playerName}","${heroName}",${p.placement || ''}\n`;
        });
      });

      const encodedUri = encodeURI(csvContent);
      const a = document.createElement('a');
      a.href = encodedUri;
      a.download = `dicethrone-matches-history-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSuccessMsg('CSV export downloaded successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      console.error(error);
      setErrorMsg('Failed to export CSV.');
      setTimeout(() => setErrorMsg(''), 4500);
    }
  };

  const handleResetDatabase = async () => {
    if (window.confirm('CRITICAL ACTION: This will completely delete all matches, player records, custom heroes, and reset to default. This cannot be undone. Are you absolutely sure?')) {
      // Clear IndexedDB by creating an empty backup schema or purging Dexie
      try {
        localStorage.clear();
        indexedDB.deleteDatabase('DiceThroneCompanionDB');
        alert('Database has been completely purged. Reloading page...');
        window.location.reload();
      } catch (e) {
        console.error(e);
        setErrorMsg('Failed to purge database.');
      }
    }
  };

  const toggleSetOwnership = (setName: string) => {
    const owned = settings.ownedSets || [];
    const newSets = owned.includes(setName)
      ? owned.filter((s) => s !== setName)
      : [...owned, setName];
    setSetting('ownedSets', newSets);
  };

  const uniqueSets = useMemo<string[]>(() => {
    const sets = new Set<string>(heroes.map((h) => h.releaseSet));
    return Array.from(sets);
  }, [heroes]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-800/80">
        <h1 className="text-2xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
          SYSTEM SETTINGS
        </h1>
        <p className="text-xs text-slate-400">Configure catalog options, backup local storage databases, and download reports</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/60 text-emerald-300 text-xs font-bold rounded-2xl animate-pulse">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-950/40 border border-red-500/60 text-red-300 text-xs font-bold rounded-2xl">
          {errorMsg}
        </div>
      )}

      {/* Preferences Section */}
      <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-3xl space-y-5">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-400" /> Preferences & Collection
        </h3>

        {/* Collection Ownership toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-900 rounded-2xl">
          <div>
            <h4 className="text-sm font-bold text-white">Enable Individual Collection Ownership</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Allow player-specific owned catalogs instead of a shared playgroup inventory.
            </p>
          </div>
          <button
            onClick={() => setSetting('useCollectionOwnership', !settings.useCollectionOwnership)}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
              settings.useCollectionOwnership ? 'bg-violet-600 justify-end' : 'bg-slate-800 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Owned Sets Checklist */}
        <div className="space-y-3">
          <label className="text-xs text-slate-400 font-semibold">Sets Owned (Shared Collection Model)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {uniqueSets.map((setName) => {
              const isOwned = (settings.ownedSets || []).includes(setName);
              return (
                <button
                  key={setName}
                  onClick={() => toggleSetOwnership(setName)}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                    isOwned
                      ? 'bg-violet-950/40 border-violet-500 text-violet-300'
                      : 'bg-slate-950 border-slate-900 text-slate-500'
                  }`}
                >
                  {setName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Individual Hero Selector collapsible */}
        <div className="pt-3 border-t border-slate-900">
          <button
            type="button"
            onClick={() => setShowIndividualChecklist(!showIndividualChecklist)}
            className="text-xs text-violet-400 font-bold hover:text-violet-300 transition-colors flex items-center gap-1.5"
          >
            {showIndividualChecklist ? 'Hide Individual Hero Checklist' : 'Manage Specific Owned Heroes (Individual Selector)'}
          </button>

          {showIndividualChecklist && (
            <div className="mt-4 space-y-4 max-h-96 overflow-y-auto pr-2 bg-slate-950/40 p-4 rounded-2xl border border-slate-900">
              {Object.entries(heroesBySet).map(([setName, heroList]) => (
                <div key={setName} className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{setName}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {heroList.map((hero) => (
                      <button
                        type="button"
                        key={hero.id}
                        onClick={() => updateHeroDetails(hero.id, { owned: hero.owned === 1 ? 0 : 1 })}
                        className={`py-2 px-3 text-left rounded-xl border text-xs truncate transition-all ${
                          hero.owned === 1
                            ? 'bg-violet-950/20 border-violet-500 text-violet-300 font-bold'
                            : 'bg-slate-900 border-slate-850 text-slate-500'
                        }`}
                      >
                        {hero.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backup and Restore */}
      <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-3xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
          <Save className="w-4 h-4 text-emerald-400" /> Database Backup & Reports
        </h3>
        <p className="text-xs text-slate-400">
          Export or restore all parameters, configurations, play histories, and profiles.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Export JSON */}
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 p-3 bg-slate-950 border border-slate-850 hover:border-violet-600 rounded-2xl text-xs font-bold text-white transition-all"
          >
            <Download className="w-4 h-4 text-violet-400" /> Export JSON
          </button>

          {/* Import JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-3 bg-slate-950 border border-slate-850 hover:border-violet-600 rounded-2xl text-xs font-bold text-white transition-all"
          >
            <Upload className="w-4 h-4 text-violet-400" /> Import JSON
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 p-3 bg-slate-950 border border-slate-850 hover:border-violet-600 rounded-2xl text-xs font-bold text-white transition-all"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Export Matches CSV
          </button>
        </div>
      </div>

      {/* Critical Actions */}
      <div className="bg-red-950/10 border border-red-900/35 p-5 rounded-3xl space-y-4">
        <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-red-500" /> Critical Actions
        </h3>
        <p className="text-xs text-slate-400">
          Actions that permanently erase database files. Be very careful.
        </p>

        <button
          onClick={handleResetDatabase}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 hover:border-red-900 text-red-400 text-xs font-bold rounded-2xl transition-all"
        >
          <Trash2 className="w-4.5 h-4.5 text-red-500" /> Purge Local DB
        </button>
      </div>
    </div>
  );
}
