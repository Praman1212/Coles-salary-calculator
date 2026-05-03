import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import './Calculator.css';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const DEFAULT_RATES = {
  base: 27.135248,
  eveningStart: 18,
};

function buildTimeOptions() {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const val = h * 60 + m;
      const ampm = h < 12 ? 'AM' : 'PM';
      const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const mm2 = m.toString().padStart(2, '0');
      options.push({ val, label: `${hh}:${mm2} ${ampm}` });
    }
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

function getMinutes(start, end) {
  let mins = end - start;
  if (mins <= 0) mins += 1440;
  return mins;
}

function calcDayPay(dayIndex, startMin, endMin, empType, rates) {
  const isSat = dayIndex === 5;
  const isSun = dayIndex === 6;
  const base  = rates.base;

  // Rate multipliers based on employment type
  const ordinaryMult = empType === 'cas' ? 1.25 : 1.0;   // normal weekday
  const satMult      = empType === 'cas' ? 1.50 : 1.25;  // saturday + after 6pm
  const sunMult      = empType === 'cas' ? 1.75 : 1.50;  // sunday

  const totalMins = getMinutes(startMin, endMin);

  // Break rules
  let unpaidMins = 0;
  if (totalMins >= 360 && totalMins <= 540) unpaidMins = 30;

  const paidMins = totalMins - unpaidMins;

  // Split into day vs evening (weekdays only)
  let rawDayMins = 0;
  let rawEveMins = 0;
  for (let m = startMin; m < startMin + totalMins; m++) {
    const t = m % 1440;
    if (!isSat && !isSun && t >= rates.eveningStart * 60) {
      rawEveMins++;
    } else {
      rawDayMins++;
    }
  }

  // Deduct unpaid break from day hours first
  let dayMins = 0;
  let eveMins = 0;
  if (unpaidMins <= rawDayMins) {
    dayMins = rawDayMins - unpaidMins;
    eveMins = rawEveMins;
  } else {
    const rem = unpaidMins - rawDayMins;
    dayMins = 0;
    eveMins = rawEveMins - rem;
  }

  const dayHours   = dayMins / 60;
  const eveHours   = eveMins / 60;
  const totalHours = paidMins / 60;

  // Calculate pay by category
  let ordinary_hrs = 0, ordinary_pay = 0;
  let pen_sat_hrs  = 0, pen_sat_pay  = 0;
  let pen_sun_hrs  = 0, pen_sun_pay  = 0;

  if (isSun) {
    // Sunday — all hours at sunday rate
    pen_sun_hrs = totalHours;
    pen_sun_pay = totalHours * base * sunMult;
  } else if (isSat) {
    // Saturday — all hours at saturday rate
    pen_sat_hrs = totalHours;
    pen_sat_pay = totalHours * base * satMult;
  } else {
    // Weekday — day hours at ordinary, evening hours at saturday rate
    ordinary_hrs = dayHours;
    ordinary_pay = dayHours * base * ordinaryMult;
    pen_sat_hrs  = eveHours;
    pen_sat_pay  = eveHours * base * satMult;
  }

  return {
    hours: totalHours,
    total: ordinary_pay + pen_sat_pay + pen_sun_pay,
    ordinary_hrs, ordinary_pay,
    pen_sat_hrs,  pen_sat_pay,
    pen_sun_hrs,  pen_sun_pay,
    isSat, isSun,
    unpaidMins,
    dayHours, eveHours,
  };
}

export default function Calculator() {
  const [empType, setEmpType] = useState('ft');
  const [shifts, setShifts]   = useState(DAYS.map(() => ({ enabled: false, start: '', end: '' })));
  const [rates]               = useState(DEFAULT_RATES);
  const [saved, setSaved]     = useState(false);

  const base = rates.base;

  // Display rates for each emp type
  // const displayRate    = empType === 'cas' ? base * 1.25 : base;
  const rateOrdinary   = empType === 'cas' ? base * 1.25 : base;
  const rateSat        = empType === 'cas' ? base * 1.50 : base * 1.25;
  const rateSun        = empType === 'cas' ? base * 1.75 : base * 1.50;

  const empTypes = [
    { key: 'ft',  label: 'Full-time', rate: base },
    { key: 'pt',  label: 'Part-time', rate: base },
    { key: 'cas', label: 'Casual',    rate: base * 1.25 },
  ];

  function toggleDay(i) {
    const updated = [...shifts];
    updated[i] = { ...updated[i], enabled: !updated[i].enabled, start: '', end: '' };
    setShifts(updated);
  }

  function updateShift(i, field, val) {
    const updated = [...shifts];
    updated[i] = { ...updated[i], [field]: val };
    setShifts(updated);
  }

  function clearAll() {
    setShifts(DAYS.map(() => ({ enabled: false, start: '', end: '' })));
    setSaved(false);
  }

  const results = shifts.map((s, i) => {
    if (!s.enabled || s.start === '' || s.end === '') return null;
    return calcDayPay(i, parseInt(s.start), parseInt(s.end), empType, rates);
  });

  const totalHours     = results.reduce((a, r) => a + (r ? r.hours         : 0), 0);
  const totalPay       = results.reduce((a, r) => a + (r ? r.total         : 0), 0);
  const daysWorked     = results.filter(Boolean).length;
  const totalOrdHrs    = results.reduce((a, r) => a + (r ? r.ordinary_hrs  : 0), 0);
  const totalSatHrs    = results.reduce((a, r) => a + (r ? r.pen_sat_hrs   : 0), 0);
  const totalSunHrs    = results.reduce((a, r) => a + (r ? r.pen_sun_hrs   : 0), 0);
  const totalOrdPay    = results.reduce((a, r) => a + (r ? r.ordinary_pay  : 0), 0);
  const totalSatPay    = results.reduce((a, r) => a + (r ? r.pen_sat_pay   : 0), 0);
  const totalSunPay    = results.reduce((a, r) => a + (r ? r.pen_sun_pay   : 0), 0);

  async function saveToHistory() {
    if (totalHours === 0) return;
    try {
      await addDoc(collection(db, 'history'), {
        date: Timestamp.now(),
        empType,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalPay:   parseFloat(totalPay.toFixed(2)),
        daysWorked,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div>
      {/* Employment Type */}
      <div className="card">
        <p className="section-title">Employment type</p>
        <div className="emp-grid">
          {empTypes.map(e => (
            <button
              key={e.key}
              className={`emp-btn ${empType === e.key ? 'active' : ''}`}
              onClick={() => setEmpType(e.key)}
            >
              <span className="emp-label">{e.label}</span>
              <span className="emp-rate">${e.rate.toFixed(2)}/hr</span>
            </button>
          ))}
        </div>

        {/* Rate legend */}
        <div className="rate-legend">
          <div className="rate-item">
            <span className="rate-dot ordinary"></span>
            <span>Ordinary — ${rateOrdinary.toFixed(5)}</span>
          </div>
          <div className="rate-item">
            <span className="rate-dot sat"></span>
            <span>Sat / After 6pm — ${rateSat.toFixed(5)}</span>
          </div>
          <div className="rate-item">
            <span className="rate-dot sun"></span>
            <span>Sunday — ${rateSun.toFixed(5)}</span>
          </div>
        </div>

        {/* Shift Times */}
        <p className="section-title" style={{marginTop:'1.25rem'}}>Shift times</p>
        <div className="col-headers">
          <span>Day</span>
          <span>Start</span>
          <span>End</span>
          <span>Hrs</span>
          <span></span>
        </div>

        {DAYS.map((day, i) => {
          const s   = shifts[i];
          const res = results[i];
          const isWeekend = i >= 5;
          return (
            <div key={day} className={`day-row ${s.enabled ? 'enabled' : ''}`}>
              <span className={`day-name ${i === 6 ? 'sunday' : isWeekend ? 'weekend' : ''}`}>
                {day.slice(0, 3)}
              </span>
              <select
                className="time-select"
                value={s.start}
                disabled={!s.enabled}
                onChange={e => updateShift(i, 'start', e.target.value)}
              >
                <option value="">--</option>
                {TIME_OPTIONS.map(o => (
                  <option key={o.val} value={o.val}>{o.label}</option>
                ))}
              </select>
              <select
                className="time-select"
                value={s.end}
                disabled={!s.enabled}
                onChange={e => updateShift(i, 'end', e.target.value)}
              >
                <option value="">--</option>
                {TIME_OPTIONS.map(o => (
                  <option key={o.val} value={o.val}>{o.label}</option>
                ))}
              </select>
              <span className="day-hrs">
                {res ? res.hours.toFixed(2) : '—'}
              </span>
              <button
                className={`toggle-btn ${s.enabled ? 'on' : ''}`}
                onClick={() => toggleDay(i)}
              >
                {s.enabled ? '✓' : '+'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Results */}
      {totalHours > 0 && (
        <>
          {/* Summary metrics */}
          <div className="results-card">
            <div className="metrics">
              <div className="metric">
                <span className="metric-label">Total hours</span>
                <span className="metric-value">{totalHours.toFixed(2)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Days worked</span>
                <span className="metric-value">{daysWorked}</span>
              </div>
              <div className="metric highlight">
                <span className="metric-label">Gross pay</span>
                <span className="metric-value green">${totalPay.toFixed(2)}</span>
              </div>
            </div>

            {/* Daily breakdown */}
            <p className="section-title" style={{marginTop:'1rem'}}>Daily breakdown</p>
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Ordinary hrs</th>
                  <th>Ordinary pay</th>
                  <th>Penalty hrs</th>
                  <th>Penalty pay</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => r && (
                  <tr key={i} className={r.isSun ? 'row-sun' : r.isSat ? 'row-sat' : ''}>
                    <td>
                      <span className={`day-tag ${r.isSun ? 'sun' : r.isSat ? 'sat' : ''}`}>
                        {DAYS[i].slice(0, 3)}
                      </span>
                      {r.unpaidMins > 0 && <span className="badge break">-{r.unpaidMins}m</span>}
                    </td>
                    <td>{r.ordinary_hrs > 0 ? r.ordinary_hrs.toFixed(2) + 'h' : '—'}</td>
                    <td>{r.ordinary_pay > 0 ? '$' + r.ordinary_pay.toFixed(2) : '—'}</td>
                    <td>
                      {r.pen_sat_hrs > 0 && (
                        <div>{r.pen_sat_hrs.toFixed(2)}h <span className="badge pen150">{r.isSat ? 'SAT' : 'EVE'}</span></div>
                      )}
                      {r.pen_sun_hrs > 0 && (
                        <div>{r.pen_sun_hrs.toFixed(2)}h <span className="badge pen175">SUN</span></div>
                      )}
                      {r.pen_sat_hrs === 0 && r.pen_sun_hrs === 0 && '—'}
                    </td>
                    <td>
                      {r.pen_sat_pay > 0 && <div>${r.pen_sat_pay.toFixed(2)}</div>}
                      {r.pen_sun_pay > 0 && <div>${r.pen_sun_pay.toFixed(2)}</div>}
                      {r.pen_sat_pay === 0 && r.pen_sun_pay === 0 && '—'}
                    </td>
                    <td className="total-col">${r.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan="5">Total gross pay</td>
                  <td className="total-col">${totalPay.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payslip style summary */}
          <div className="card">
            <p className="section-title">Hours & earnings summary</p>
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Earnings</th>
                </tr>
              </thead>
              <tbody>
                {totalOrdHrs > 0 && (
                  <tr>
                    <td>Ordinary {empType === 'cas' ? '1.25' : '1.0'}</td>
                    <td>{totalOrdHrs.toFixed(2)}</td>
                    <td>${rateOrdinary.toFixed(5)}</td>
                    <td className="total-col">${totalOrdPay.toFixed(2)}</td>
                  </tr>
                )}
                {totalSatHrs > 0 && (
                  <tr>
                    <td>Penalty {empType === 'cas' ? '1.5' : '1.25'} (Sat/Eve)</td>
                    <td>{totalSatHrs.toFixed(2)}</td>
                    <td>${rateSat.toFixed(5)}</td>
                    <td className="total-col">${totalSatPay.toFixed(2)}</td>
                  </tr>
                )}
                {totalSunHrs > 0 && (
                  <tr>
                    <td>Penalty {empType === 'cas' ? '1.75' : '1.5'} (Sun)</td>
                    <td>{totalSunHrs.toFixed(2)}</td>
                    <td>${rateSun.toFixed(5)}</td>
                    <td className="total-col">${totalSunPay.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td>Total earnings</td>
                  <td>{totalHours.toFixed(2)}</td>
                  <td></td>
                  <td className="total-col">${totalPay.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      <div className="btn-row">
        <button className="btn-primary" onClick={saveToHistory}>
          {saved ? '✓ Saved!' : 'Save to history'}
        </button>
        <button className="btn-clear" onClick={clearAll}>Clear</button>
      </div>
    </div>
  );
}