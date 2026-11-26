import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import './styles/index.css';

type Vec = { x: number; y: number };
type Chapter = 'numbers' | 'geometry' | 'motion';
const chapters = [
  ['numbers', '01', '数の庭', 'つなげると、数は姿を変える'],
  ['geometry', '02', 'かたちの部屋', '点を動かして、面積をつくる'],
  ['motion', '03', '運動の塔', '力を描いて、星まで届ける'],
] as const;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export default function App() {
  const [started, setStarted] = useState(false), [chapter, setChapter] = useState<Chapter>('numbers');
  const [sound, setSound] = useState(true), [done, setDone] = useState<Chapter[]>([]);
  const complete = (id: Chapter) => setDone(v => v.includes(id) ? v : [...v, id]);
  if (!started) return <main className="title-screen">
    <div className="orbit a"/><div className="orbit b"/><div className="title-mark"><i>1</i><i>+</i><i>1</i><b>=</b><strong>2</strong></div>
    <p className="overline">A PLAYABLE WORLD OF IDEAS</p><h1>FORMULA</h1><p className="title-jp">触れて、動かして、ひらめく。</p>
    <button className="primary" onClick={() => setStarted(true)}>はじめる <span>→</span></button>
    <div className="title-footer"><span>DRAG · CONNECT · DISCOVER</span><span>v0.2 PLAYABLE PROTOTYPE</span></div>
  </main>;
  const current = chapters.find(c => c[0] === chapter)!;
  return <main className="game-shell">
    <header><button className="wordmark" onClick={() => setStarted(false)}>FORMULA<small>PLAYGROUND</small></button><nav>{chapters.map(c => <button key={c[0]} className={chapter === c[0] ? 'active' : ''} onClick={() => setChapter(c[0])}><span>{done.includes(c[0]) ? '✓' : c[1]}</span>{c[2]}</button>)}</nav><button className="round" onClick={() => setSound(!sound)}>{sound ? '♪' : '×'}</button></header>
    <section className="stage-wrap"><div className="chapter-label"><span>{current[1]}</span><div><strong>{current[2]}</strong><small>{current[3]}</small></div></div>
      {chapter === 'numbers' && <NumberGarden complete={() => complete('numbers')}/>} {chapter === 'geometry' && <GeometryRoom complete={() => complete('geometry')}/>} {chapter === 'motion' && <MotionTower complete={() => complete('motion')}/>}</section>
    <footer><span>ESC メニュー</span><span>{done.length} / 3 DISCOVERIES</span><span>マウスで触ってみよう</span></footer>
  </main>;
}

function NumberGarden({complete}:{complete:()=>void}) {
  const stage=useRef<HTMLDivElement>(null); const [drag,setDrag]=useState<0|1|null>(null); const [merged,setMerged]=useState(false);
  const [values,setValues]=useState([2,3]); const [p,setP]=useState<Vec[]>([{x:27,y:55},{x:73,y:55}]);
  const move=(e:PointerEvent)=>{if(drag===null||!stage.current||merged)return;const r=stage.current.getBoundingClientRect(),q={x:clamp((e.clientX-r.left)/r.width*100,8,92),y:clamp((e.clientY-r.top)/r.height*100,20,82)},other=p[1-drag];setP(old=>old.map((v,i)=>i===drag?q:v));if(Math.hypot(q.x-other.x,q.y-other.y)<13){setMerged(true);setDrag(null);complete();}};
  const reset=()=>{setMerged(false);setValues([2,3]);setP([{x:27,y:55},{x:73,y:55}]);};
  return <div className="play-stage number-stage" ref={stage} onPointerMove={move} onPointerUp={()=>setDrag(null)}>
    <Mission done={merged} n="01" normal="2 と 3 を近づけてみよう" success="できた！ ふたつの数が、ひとつになった。"/>
    <svg className="ambient" viewBox="0 0 1000 500" preserveAspectRatio="none"><path d="M0 410Q220 330 410 410T1000 390"/><circle cx="500" cy="260" r="190"/></svg>
    {!merged ? <>{p.map((q,i)=><button key={i} className="number-token" style={{left:q.x+'%',top:q.y+'%'}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setDrag(i as 0|1)}} onDoubleClick={()=>setValues(v=>v.map((n,j)=>j===i?(n%9)+1:n))}><span>{values[i]}</span><small>ダブルクリックで変える</small></button>)}<div className="plus">+</div></> : <button className="result" onClick={reset}><small>{values[0]} + {values[1]}</small>{values[0]+values[1]}<span>クリックでもう一度</span></button>}
    <div className="hint">つかむ <b>●</b> 動かす</div></div>;
}
function Mission({done,n,normal,success}:{done:boolean;n:string;normal:string;success:string}){return <p className="mission"><span>ひらめき {n}</span>{done?success:normal}</p>}

function GeometryRoom({complete}:{complete:()=>void}) {
  const stage=useRef<HTMLDivElement>(null);const [active,setActive]=useState<number|null>(null);const [p,setP]=useState<Vec[]>([{x:31,y:70},{x:50,y:28},{x:69,y:70}]);
  const area=Math.abs(p.reduce((s,a,i)=>s+a.x*p[(i+1)%3].y-p[(i+1)%3].x*a.y,0)/2);
  useEffect(()=>{if(area>1450)complete()},[area,complete]);
  const move=(e:PointerEvent)=>{if(active===null||!stage.current)return;const r=stage.current.getBoundingClientRect(),q={x:clamp((e.clientX-r.left)/r.width*100,8,92),y:clamp((e.clientY-r.top)/r.height*100,16,85)};setP(v=>v.map((a,i)=>i===active?q:a))};
  return <div className="play-stage geometry" ref={stage} onPointerMove={move} onPointerUp={()=>setActive(null)}><Mission done={area>1450} n="02" normal="点を動かして、面積を 1,450 より大きくしよう" success="できた！ かたちを動かすと、面積も変わる。"/><div className="area"><small>AREA</small>{Math.round(area).toLocaleString()}</div>
    <svg className="geo-canvas" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5"/></pattern></defs><rect width="100" height="100" fill="url(#grid)"/><polygon points={p.map(a=>a.x+','+a.y).join(' ')}/></svg>
    {p.map((a,i)=><button key={i} className="vertex" style={{left:a.x+'%',top:a.y+'%'}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setActive(i)}}><span>{'ABC'[i]}</span></button>)}<div className="formula">面積 = 底辺 × 高さ ÷ 2</div></div>;
}

function MotionTower({complete}:{complete:()=>void}) {
  const stage=useRef<HTMLDivElement>(null),frame=useRef(0),last=useRef(0);const start={x:15,y:75,vx:0,vy:0};const [body,setBody]=useState(start),[aim,setAim]=useState<Vec>({x:37,y:38}),[running,setRunning]=useState(false),[won,setWon]=useState(false);const target={x:80,y:34};
  useEffect(()=>{if(!running)return;last.current=performance.now();const tick=(now:number)=>{const dt=Math.min(.025,(now-last.current)/1000);last.current=now;setBody(b=>{const n={...b,x:b.x+b.vx*dt,y:b.y+b.vy*dt,vy:b.vy+38*dt};if(Math.hypot(n.x-target.x,n.y-target.y)<7){setRunning(false);setWon(true);complete()}else if(n.y>88||n.x>100)setRunning(false);return n});frame.current=requestAnimationFrame(tick)};frame.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame.current)},[running,complete]);
  const launch=()=>{setWon(false);setBody(b=>({...b,vx:(aim.x-b.x)*.85,vy:(aim.y-b.y)*.85}));setRunning(true)};const reset=useCallback(()=>{setRunning(false);setWon(false);setBody(start)},[]);
  return <div className="play-stage motion" ref={stage}><Mission done={won} n="03" normal="黄色い矢印を調整して、星へ飛ばそう" success="命中！ 力と重力が、きれいな軌道を描いた。"/><div className="stars">·　✦　·　　　·　　✧　　　·</div><div className="target" style={{left:target.x+'%',top:target.y+'%'}}>★<small>GOAL</small></div><div className="ground"/><div className="ball" style={{left:body.x+'%',top:body.y+'%'}}/>
    {!running&&!won&&<><svg className="aim-line"><line x1={body.x+'%'} y1={body.y+'%'} x2={aim.x+'%'} y2={aim.y+'%'}/></svg><button className="aim" style={{left:aim.x+'%',top:aim.y+'%'}} onPointerDown={e=>{const el=e.currentTarget;el.setPointerCapture(e.pointerId);el.onpointermove=m=>{const r=stage.current!.getBoundingClientRect();setAim({x:clamp((m.clientX-r.left)/r.width*100,20,65),y:clamp((m.clientY-r.top)/r.height*100,18,72)})}}}>力</button></>}
    <div className="controls"><button onClick={launch} disabled={running}>{running?'飛行中…':'発射'}</button><button onClick={reset}>やり直す</button><span>重力 9.8 m/s²</span></div></div>;
}
