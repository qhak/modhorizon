'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ConnectDeviceRisk() {
  const [message,setMessage]=useState('Sign in to your owner account, then approve this connection.');
  const [busy,setBusy]=useState(false);
  async function connect() {
    setBusy(true);
    try {
      const state=new URL(window.location.href).searchParams.get('state');
      if(!state || !/^[a-zA-Z0-9_-]{43}$/.test(state)) throw new Error('The desktop request has expired. Start again from the app.');
      const result=await fetch('/api/device-risk/pair',{method:'POST',credentials:'same-origin',cache:'no-store'});
      if(!result.ok) throw new Error('Sign in as the configured owner and make sure device review is enabled.');
      const data=await result.json();
      const sent=await fetch('http://127.0.0.1:8791/receive',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,token:data.token})});
      if(!sent.ok) throw new Error('Could not reach the desktop app. Start the connection again.');
      setMessage('Connected. You can return to the desktop app.');
    } catch(error) {setMessage(error instanceof Error?error.message:'Unable to connect.');}
    finally {setBusy(false);}
  }
  return <main style={{maxWidth:520,margin:'10vh auto',padding:24,fontFamily:'system-ui'}}><h1>Connect Device Risk</h1><p>{message}</p><p>The desktop app will be able to read signup review records for five minutes.</p><button disabled={busy} onClick={()=>void connect()} style={{padding:12,marginRight:12}}>{busy?'Connecting…':'Approve connection'}</button><Link href="/account" target="_blank" rel="noopener noreferrer">Sign in to ModHorizon in a new tab</Link></main>;
}
