import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query, deleteDoc, doc } from 'firebase/firestore';

export default function History() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    try {
      const q = query(collection(db, 'history'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function deleteRecord(id) {
    await deleteDoc(doc(db, 'history', id));
    setRecords(records.filter(r => r.id !== id));
  }

  const typeLabels = { ft: 'Full-time', pt: 'Part-time', cas: 'Casual' };

  if (loading) return (
    <div className="card">
      <p style={{color:'#aaa', fontSize:'14px'}}>Loading...</p>
    </div>
  );

  return (
    <div className="card">
      <p className="section-title">Saved calculations</p>
      {records.length === 0
        ? <p style={{fontSize:'14px', color:'#aaa'}}>No history yet. Save a calculation first.</p>
        : records.map(r => (
          <div key={r.id} style={{
            display:'flex', justifyContent:'space-between',
            alignItems:'center', padding:'12px 0',
            borderBottom:'1px solid #f5f5f5'
          }}>
            <div>
              <p style={{fontSize:'14px', fontWeight:'600', color:'#1a1a1a'}}>
                {r.date?.toDate().toLocaleDateString('en-AU')}
              </p>
              <p style={{fontSize:'12px', color:'#aaa', marginTop:'3px'}}>
                {typeLabels[r.empType]} · {r.daysWorked} days · {r.totalHours} hrs
              </p>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'14px'}}>
              <span style={{fontSize:'17px', fontWeight:'700', color:'#e8222a'}}>
                ${r.totalPay.toFixed(2)}
              </span>
              <button
                onClick={() => deleteRecord(r.id)}
                style={{
                  background:'none', border:'none',
                  color:'#ddd', fontSize:'20px',
                  cursor:'pointer', lineHeight:1
                }}
              >×</button>
            </div>
          </div>
        ))
      }
    </div>
  );
}