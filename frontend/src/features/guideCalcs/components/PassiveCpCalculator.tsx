import { useState, useMemo } from 'react';
import { cpAtLevel, CP_REQUIRED, type CpBuilding } from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel from './CalcResultPanel';

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
  const apply = (preset: string) => setLevels(() => {
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
        <h2>{lang === 'en' ? 'Culture Points' : '文明點'}</h2>
        {/* Preset 「常用」= MB20+Market20+Embassy20+Academy20+TH10 → 531 CP/day; see tests */}
        <p>{lang === 'en'
          ? 'How many culture points one village produces per day. Raise building levels below, or tap a preset to fill common setups.'
          : '看一個村莊每天能產出多少文明點。調整下面的建築等級，或點預設一鍵帶入常見配置。'}</p>
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
            <button onClick={() => apply('lumi')}>{lang === 'en' ? 'Common (531/d)' : '常用（531／天）'}</button>
            <button onClick={() => apply('min')}>{lang === 'en' ? 'Bare-min' : '最小'}</button>
            <button onClick={() => apply('zero')}>{lang === 'en' ? 'Clear' : '清空'}</button>
          </div>
        </div>

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Daily passive CP' : '每日被動 CP'}
          primary={<>{total} / {lang === 'en' ? 'day' : '天'}</>}
          secondary={lang === 'en' ? 'Includes +2 empty-village baseline' : '含空村 +2 基礎產量'}
        >
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
              ? 'Culture points are account-wide — add up every village. A great celebration costs 5× a small one and gives +2,000 CP (about 60 hours at Town Hall 10).'
              : '文明點是整帳號共用，要把所有村莊加起來才準。大慶典花費是小慶典的 5 倍，一次加 2,000 點（城鎮廳 10 級大約 60 小時）。'}
          </div>
        </CalcResultPanel>
      </div>
    </>
  );
}
