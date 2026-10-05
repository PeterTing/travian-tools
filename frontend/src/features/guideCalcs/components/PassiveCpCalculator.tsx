import { useState, useMemo } from 'react';
import { cpAtLevel, CP_REQUIRED, type CpBuilding } from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';

interface FieldDef { id: string; key: CpBuilding; label: string }

const FIELDS: FieldDef[] = [
  { id: 'mb', key: 'mainBuilding',     label: 'Main Building' },
  { id: 'mk', key: 'marketplace',      label: 'Marketplace' },
  { id: 'em', key: 'embassy',          label: 'Embassy' },
  { id: 'ac', key: 'academy',          label: 'Academy' },
  { id: 'th', key: 'townHall',         label: 'Town Hall' },
  { id: 're', key: 'residence',        label: 'Residence' },
  { id: 'cr', key: 'cranny',           label: 'Cranny' },
  { id: 'wh', key: 'warehouse',        label: 'Warehouse' },
  { id: 'gr', key: 'granary',          label: 'Granary' },
  { id: 'sm', key: 'smithy',           label: 'Smithy / Armoury' },
  { id: 'ba', key: 'barracks',         label: 'Barracks' },
  { id: 'st', key: 'stable',           label: 'Stable' },
  { id: 'ts', key: 'tournamentSquare', label: 'Tournament Sq.' },
  { id: 'hm', key: 'heroMansion',      label: "Hero's Mansion" },
  { id: 'to', key: 'tradeOffice',      label: 'Trade Office' },
  { id: 'pl', key: 'palace',           label: 'Palace / Treasury' },
];

const PRESETS: Record<string, Record<string, number>> = {
  lumi: { mb: 20, mk: 20, em: 20, ac: 20, th: 10, re: 10, cr: 1, wh: 10, gr: 10 },
  min: { mb: 5, mk: 3, em: 3, ac: 10, th: 1, re: 10, cr: 1, wh: 3, gr: 3 },
  zero: {},
};

export default function PassiveCpCalculator() {
  const { lang } = useLang();
  const [levels, setLevels] = useState<Record<string, number>>(PRESETS.lumi);
  const set = (id: string, v: number) => setLevels(prev => ({ ...prev, [id]: Math.max(0, Math.min(20, v || 0)) }));
  const apply = (preset: string) => setLevels(_prev => {
    const next: Record<string, number> = {};
    FIELDS.forEach(f => { next[f.id] = PRESETS[preset]?.[f.id] ?? 0; });
    return next;
  });

  const total = useMemo(() => {
    let sum = 2; // baseline
    FIELDS.forEach(f => { sum += cpAtLevel(f.key, levels[f.id] ?? 0); });
    return sum;
  }, [levels]);

  const breakdown = useMemo(() => FIELDS.map(f => ({
    label: f.label,
    level: levels[f.id] ?? 0,
    cp: cpAtLevel(f.key, levels[f.id] ?? 0),
  })).filter(x => x.cp > 0).sort((a, b) => b.cp - a.cp), [levels]);

  return (
    <>
      <div className={s.intro}>
        <h2>{lang === 'en' ? 'Passive CP Calculator' : '被動 CP 計算器'}</h2>
        {/* Breakdown: MB20=77 + Mkt20=115 + Emb20=153 + Acad20=153 + TH10=31 + baseline=2 = 531 CP/day
            (round(base×1.2^L) per building; Lumi's "529" rounds the components individually differently) */}
        <p>{lang === 'en'
          ? 'CP per day from a single village. Lumi recommends MB 20 + Market 20 + Embassy 20 + Academy 20 + Town Hall 10 = 531 CP/day per village (77 + 115 + 153 + 153 + 31 + 2 baseline). The 2,000-CP baseline includes a small constant +2 for an empty village.'
          : '單村每天能產多少被動 CP。Lumi 建議：村莊大樓 20 + 市場 20 + 大使 20 + 研究院 20 + 城鎮廳 10 = 531 CP/天（77+115+153+153+31+2 基線）。基線含 +2（空村產量）。'}</p>
      </div>

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Building levels' : '建築等級'}</h4>
          {Array.from({ length: Math.ceil(FIELDS.length / 2) }).map((_, idx) => {
            const a = FIELDS[idx * 2];
            const b = FIELDS[idx * 2 + 1];
            return (
              <div key={idx} className={s.fieldRow}>
                {a && (
                  <div className={s.field}>
                    <label>{a.label}</label>
                    <input type="number" min={0} max={20} value={levels[a.id] ?? 0}
                           onChange={e => set(a.id, +e.target.value)} />
                  </div>
                )}
                {b && (
                  <div className={s.field}>
                    <label>{b.label}</label>
                    <input type="number" min={0} max={20} value={levels[b.id] ?? 0}
                           onChange={e => set(b.id, +e.target.value)} />
                  </div>
                )}
              </div>
            );
          })}

          <div className={s.btnRow}>
            <button onClick={() => apply('lumi')}>{lang === 'en' ? 'Lumi (531/d)' : 'Lumi (531/天)'}</button>
            <button onClick={() => apply('min')}>{lang === 'en' ? 'Bare-min' : '最小'}</button>
            <button onClick={() => apply('zero')}>{lang === 'en' ? 'Clear' : '清空'}</button>
          </div>
        </div>

        <div className={s.output}>
          <h4>{lang === 'en' ? 'Daily passive CP' : '每日被動 CP'}</h4>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Total (incl. +2 baseline)' : '總計（含 +2 基礎）'}</span><span className={`${s.value} ${s.highlight}`}>{total} / {lang === 'en' ? 'day' : '天'}</span></div>

          <h4>{lang === 'en' ? 'Days to reach village #N' : '開村門檻所需天數'}</h4>
          <table className={s.table}>
            <thead><tr><th>#</th><th>{lang === 'en' ? 'CP req.' : '需求'}</th><th>{lang === 'en' ? 'Days passive' : '被動'}</th><th>{lang === 'en' ? '+1 great celeb/day' : '+大慶典/天'}</th></tr></thead>
            <tbody>
              {CP_REQUIRED.slice(1).map(r => {
                const dPassive = total > 0 ? (r.cumulative / total).toFixed(1) : '∞';
                const dWithCel = (r.cumulative / (total + 2000)).toFixed(1);
                return (
                  <tr key={r.village}>
                    <td>#{r.village}</td>
                    <td>{r.cumulative.toLocaleString()}</td>
                    <td>{dPassive}</td>
                    <td>{dWithCel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h4>{lang === 'en' ? 'Top contributors' : '最大貢獻建築'}</h4>
          <table className={s.table}>
            <thead><tr><th>{lang === 'en' ? 'Building' : '建築'}</th><th>Lv</th><th>CP/day</th></tr></thead>
            <tbody>
              {breakdown.slice(0, 8).map(b => (
                <tr key={b.label}><td>{b.label}</td><td>{b.level}</td><td>{b.cp}</td></tr>
              ))}
            </tbody>
          </table>

          <div className={s.note}>
            {lang === 'en'
              ? 'CP is account-global — sum across all your villages for the true total. Great Celebration costs 5× a small one but gives +2,000 CP/cycle (60 hr at TH Lv 10).'
              : 'CP 是帳號全域 ─ 多村加總才準。大慶典成本是小慶典的 5 倍但給 +2,000 CP/週期（城鎮廳 Lv 10 為 60 小時）。'}
          </div>
        </div>
      </div>
    </>
  );
}
