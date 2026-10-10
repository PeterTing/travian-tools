import { useState, useMemo, useEffect } from 'react';
import { MERCHANTS, merchantCapacity, TRADE_OFFICE_PER_LEVEL_DEFAULT, TRADE_OFFICE_PER_LEVEL_ROMAN, type TribeId } from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel from './CalcResultPanel';
import { useAutoFill } from '@/components/autofill/AutoFillContext'
import { CalcBar } from '@/components/autofill/CalcFrame'
import LevelSelect from '@/components/common/LevelSelect'
import { ingameTribeName } from '@/lib/ingameNames';

const fmtInt = (n: number) => isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
const fmtHr = (h: number) => {
  if (!isFinite(h)) return '—';
  const totalMin = Math.round(h * 60);
  const H = Math.floor(totalMin / 60);
  const M = totalMin % 60;
  return (H ? `${H}h ` : '') + `${M}m`;
};

// 頁首說明的交易所每級加成跟計算用同一組常數（P0-23）
const OFFICE_PCT = Math.round(TRADE_OFFICE_PER_LEVEL_DEFAULT * 100);
const OFFICE_PCT_ROMAN = Math.round(TRADE_OFFICE_PER_LEVEL_ROMAN * 100);

export default function TraderouteCalculator() {
  const { lang } = useLang();
  // 部族預設跟「已帶入」列（目前村莊的部族）
  const { tribe: accountTribe } = useAutoFill();
  const [tribe, setTribe] = useState<TribeId>(() => (accountTribe && accountTribe in MERCHANTS ? accountTribe as TribeId : 'gauls'));
  // 換村莊（征服保留部族的世界，村莊可以是不同部族）或帳號晚點載入：使用者還沒自己選過就跟著（P0-25）
  const [tribeTouched, setTribeTouched] = useState(false);
  useEffect(() => {
    if (!tribeTouched && accountTribe && accountTribe in MERCHANTS) setTribe(accountTribe as TribeId);
  }, [accountTribe, tribeTouched]);
  const [office, setOffice] = useState(10);
  // 距離用文字存：空白、0、負數在欄位下方寫原因（以前負距離會算出負時間）
  const [distText, setDistText] = useState('30');
  const dist = Number(distText);
  const distError = distText.trim() === '' || !Number.isFinite(dist) || dist <= 0
    ? (lang === 'en' ? 'Enter a distance above 0' : '請填大於 0 的距離')
    : null;
  // 你現有的商人（市場頁看得到）；空白＝不比對
  const [haveText, setHaveText] = useState('');
  const have = haveText.trim() === '' ? null : Number(haveText);
  const [surplus, setSurplus] = useState({ wood: 5000, clay: 5000, iron: 5000, crop: 2000 });

  const cap = merchantCapacity(tribe, office);
  const speed = MERCHANTS[tribe].speed;
  // 商人速度會不會隨伺服器倍速變快：官方 S20 沒寫，先用 x1 速度（待驗證）
  const oneWay = distError ? NaN : dist / speed;
  const roundTrip = oneWay * 2;

  const rows = useMemo(() => {
    const labels: Record<string, string> = lang === 'en'
      ? { wood: '🪵 Wood', clay: '🧱 Clay', iron: '⛏️ Iron', crop: '🌾 Crop' }
      : { wood: '🪵 木材', clay: '🧱 黏土', iron: '⛏️ 鐵礦', crop: '🌾 糧食' };
    return (['wood', 'clay', 'iron', 'crop'] as const).map(t => {
      const sur = Math.max(0, surplus[t]);
      const tripsHr = sur > 0 ? sur / cap : 0;
      const dedicated = tripsHr * roundTrip;
      return { t, label: labels[t], sur, tripsHr, dedicated };
    });
  }, [surplus, cap, roundTrip, lang]);

  const totalDed = rows.reduce((s, r) => s + r.dedicated, 0);
  // 商人一個一個派，不能派 0.9 個：無條件進位（稽核 2026-10-10：以前顯示 18.9）
  const needed = isFinite(totalDed) ? Math.ceil(totalDed - 1e-9) : NaN;
  const enough = have == null || !isFinite(needed) ? null : have >= needed;
  const totalLabel = !isFinite(needed) ? '—' : `${needed}${enough == null ? '' : enough ? ' 🟢' : ' 🔴'}`;

  return (
    <>
      <div className={s.intro}>
        <h2>{lang === 'en' ? 'Trade Route' : '貿易路線'}</h2>
        <p>{lang === 'en'
          ? `How many merchants you need to move a feeder village's hourly surplus. Tribe sets base capacity and speed; each Trade Office level adds +${OFFICE_PCT}% capacity (Romans +${OFFICE_PCT_ROMAN}%). Within about 60 fields, one or two merchants are often enough.`
          : `算支援村每小時多出來的資源，要幾個商人才能搬完。部族決定基礎容量與速度；交易所每級多 ${OFFICE_PCT}% 容量（羅馬人每級 ${OFFICE_PCT_ROMAN}%）。大約 60 格以內，通常一到兩個商人就夠。`}</p>
      </div>
      <CalcBar />

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Setup' : '基本'}</h4>

          <div className={s.field}>
            <label htmlFor="traderoute-tribe">{lang === 'en' ? 'Tribe' : '部族'}</label>
            <select id="traderoute-tribe" value={tribe} onChange={e => { setTribe(e.target.value as TribeId); setTribeTouched(true); }}>
              {Object.entries(MERCHANTS).map(([id, m]) => {
                const display = lang === 'en'
                  ? `${id.charAt(0).toUpperCase() + id.slice(1)} (${m.capacity}/${m.speed})`
                  : `${ingameTribeName(id)}（容量 ${m.capacity}、速度 ${m.speed}）`;
                return <option key={id} value={id}>{display}</option>;
              })}
            </select>
          </div>

          <div className="mb-3.5">
            <LevelSelect lang={lang} label={lang === 'en' ? 'Trade Office level (0–20)' : '交易所等級 (0–20)'} buildingId="trade_office" value={office} onChange={setOffice} min={0} max={20} testId="traderoute-office" />
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Distance (tiles)' : '距離（格）'}</label>
            <input type="number" min={1} max={500} value={distText} data-testid="traderoute-dist"
                   aria-invalid={distError ? true : undefined} onChange={e => setDistText(e.target.value)} />
            {distError && <p role="alert" className="mt-1 text-xs text-red-600" data-testid="traderoute-dist-error">{distError}</p>}
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Merchants you have (optional)' : '你現有的商人（選填）'}</label>
            <input type="number" min={0} value={haveText} data-testid="traderoute-have"
                   placeholder={lang === 'en' ? 'see the Marketplace page' : '市場頁看得到'}
                   onChange={e => setHaveText(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>

          <h4 style={{ marginTop: 16 }}>{lang === 'en' ? 'Hourly surplus to ship' : '每小時送出量'}</h4>
          <div className={s.fieldRow}>
            <div className={s.field}><label>{lang === 'en' ? 'Wood' : '木材'}</label><input type="number" min={0} value={surplus.wood} onChange={e => setSurplus(p => ({ ...p, wood: +e.target.value }))} /></div>
            <div className={s.field}><label>{lang === 'en' ? 'Clay' : '黏土'}</label><input type="number" min={0} value={surplus.clay} onChange={e => setSurplus(p => ({ ...p, clay: +e.target.value }))} /></div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}><label>{lang === 'en' ? 'Iron' : '鐵礦'}</label><input type="number" min={0} value={surplus.iron} onChange={e => setSurplus(p => ({ ...p, iron: +e.target.value }))} /></div>
            <div className={s.field}><label>{lang === 'en' ? 'Crop' : '糧食'}</label><input type="number" min={0} value={surplus.crop} onChange={e => setSurplus(p => ({ ...p, crop: +e.target.value }))} /></div>
          </div>
        </div>

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Merchants needed' : '所需商人'}
          primary={<>{totalLabel}</>}
          secondary={
            // 商人容量、速度：官方說明頁 S3；交易所每級 +20%（羅馬人 +40%）：官方知識庫＋S213、S88（P0-23）
            lang === 'en'
              ? `Cap ${fmtInt(cap)} · round trip ${fmtHr(roundTrip)}`
              : `容量 ${fmtInt(cap)} · 往返 ${fmtHr(roundTrip)}`
          }
        >
          <h4>{lang === 'en' ? 'Merchant specs' : '商人規格'}</h4>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Capacity per merchant (incl. Trade Office)' : '每商人容量（含交易所）'}</span><span className={s.value}>{fmtInt(cap)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Speed' : '速度'}</span><span className={s.value}>{speed} {lang === 'en' ? 'tiles/hr' : '格/小時'}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'One-way / round trip' : '單程 / 往返'}</span><span className={s.value}>{fmtHr(oneWay)} / {fmtHr(roundTrip)}</span></div>

          <h4>{lang === 'en' ? 'Merchants needed (1 hour cycle)' : '所需商人（每小時送完）'}</h4>
          {/* 每列 44px、垂直置中 */}
          <table className={`${s.table} ${s.tapRows}`} data-testid="traderoute-table">
            <thead>
              <tr className="h-11">
                <th>{lang === 'en' ? 'Resource' : '資源'}</th><th>/ hr</th>
                <th>{lang === 'en' ? 'Trips/hr' : '次數'}</th>
                <th>{lang === 'en' ? 'Dedicated' : '常駐'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.t} className="h-11"><td>{r.label}</td><td>{fmtInt(r.sur)}</td><td>{r.tripsHr.toFixed(2)}</td><td>{isFinite(r.dedicated) ? r.dedicated.toFixed(2) : '—'}</td></tr>
              ))}
            </tbody>
          </table>

          <div className={s.row} style={{ marginTop: 12 }}><span className={s.label}>{lang === 'en' ? 'Total merchants' : '總商人'}</span><span className={`${s.value} ${s.highlight}`} data-testid="traderoute-needed">{totalLabel}</span></div>
          {enough === false && (
            <p role="alert" className="text-sm text-red-600" data-testid="traderoute-short">
              {lang === 'en'
                ? `You need ${needed} merchants but have ${have}: ${needed - (have ?? 0)} short.`
                : `要 ${needed} 個商人，你只有 ${have} 個，還差 ${needed - (have ?? 0)} 個。`}
            </p>
          )}
          <p className="text-xs text-muted-foreground" data-testid="traderoute-speed-note">
            {lang === 'en'
              ? 'Merchant speed is the x1 value; whether faster servers speed merchants up is not in the official speed page (unverified).'
              : '商人速度用 x1 的數字；伺服器倍速會不會讓商人變快，官方說明頁沒寫（待驗證）。'}
          </p>

          <div className={s.note}>
            {lang === 'en'
              ? 'If you need more merchants than you have, raise the Trade Office or shorten the distance.'
              : '若算出來要的商人比你現有的多，就升交易所或縮短距離。'}
          </div>
        </CalcResultPanel>
      </div>
    </>
  );
}
