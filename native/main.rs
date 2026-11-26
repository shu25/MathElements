use macroquad::prelude::*;

const INK: Color = Color::new(0.055,0.13,0.12,1.); const PAPER: Color=Color::new(0.94,0.91,0.83,1.);
const GOLD: Color=Color::new(0.95,0.72,0.20,1.); const CORAL: Color=Color::new(0.92,0.32,0.25,1.); const MINT: Color=Color::new(0.26,0.72,0.60,1.);
const TOP:f32=104.; const BOTTOM:f32=54.;

#[derive(Clone,Copy,PartialEq)] enum Tool{Number,Complex,Factor,Attract,Repel,Orbit,Matrix,Derivative,Integral,Probability,Wave,Charge,Symmetry,Portal,Erase}
#[derive(Clone)] struct Orb{p:Vec2,v:Vec2,re:i32,im:i32,r:f32,h:f32,trail:Vec<Vec2>,cool:f32}
#[derive(Clone,Copy)] struct Field{p:Vec2,kind:Tool,phase:f32}
struct Spark{p:Vec2,v:Vec2,life:f32,c:Color}
struct Game{orbs:Vec<Orb>,fields:Vec<Field>,sparks:Vec<Spark>,tool:Tool,page:usize,value:i32,drag:Option<Vec2>,grab:Option<usize>,paused:bool,energy:f32,flash:f32,entropy:f32}

impl Game{
 fn new()->Self{let mut g=Self{orbs:vec![],fields:vec![],sparks:vec![],tool:Tool::Number,page:0,value:2,drag:None,grab:None,paused:false,energy:0.,flash:0.,entropy:0.};for i in 0..8{let a=i as f32/8.*std::f32::consts::TAU;g.spawn(vec2(620.+a.cos()*175.,390.+a.sin()*105.),vec2(-a.sin(),a.cos())*58.,i%5+1,0)}g.fields.push(Field{p:vec2(620.,390.),kind:Tool::Orbit,phase:0.});g}
 fn spawn(&mut self,p:Vec2,v:Vec2,re:i32,im:i32){let mag=((re*re+im*im)as f32).sqrt();self.orbs.push(Orb{p,v,re,im,r:(18.+mag.sqrt()*5.).min(45.),h:rand::gen_range(0.,1.),trail:vec![],cool:0.})}
 fn burst(&mut self,p:Vec2,c:Color,n:usize){for _ in 0..n{let a=rand::gen_range(0.,std::f32::consts::TAU);let s=rand::gen_range(35.,190.);self.sparks.push(Spark{p,v:vec2(a.cos(),a.sin())*s,life:rand::gen_range(0.3,1.),c})}}
 fn reset(&mut self){*self=Self::new()}
 fn palette(&self)->[(Tool,&'static str);5]{match self.page{0=>[(Tool::Number,"NUMBER"),(Tool::Complex,"COMPLEX"),(Tool::Factor,"FACTOR"),(Tool::Symmetry,"SYMMETRY"),(Tool::Erase,"ERASE")],1=>[(Tool::Attract,"GRAVITY"),(Tool::Repel,"REPEL"),(Tool::Orbit,"ORBIT"),(Tool::Matrix,"MATRIX"),(Tool::Portal,"PORTAL")],_=>[(Tool::Derivative,"d/dt"),(Tool::Integral,"INTEGRAL"),(Tool::Probability,"RANDOM"),(Tool::Wave,"FOURIER"),(Tool::Charge,"CHARGE")]}}
 fn input(&mut self){
  let m=vec2(mouse_position().0,mouse_position().1);
  if is_key_pressed(KeyCode::Tab){self.page=(self.page+1)%3;self.tool=self.palette()[0].0} if is_key_pressed(KeyCode::Space){self.paused=!self.paused} if is_key_pressed(KeyCode::R){self.reset()} if is_key_pressed(KeyCode::C){self.orbs.clear();self.fields.clear()}
  for n in 1..=9{let keys=[KeyCode::Key1,KeyCode::Key2,KeyCode::Key3,KeyCode::Key4,KeyCode::Key5,KeyCode::Key6,KeyCode::Key7,KeyCode::Key8,KeyCode::Key9];if is_key_pressed(keys[n-1]){self.value=n as i32;}}
  if is_mouse_button_pressed(MouseButton::Left)&&m.y<TOP{let i=((m.x-265.)/105.).floor()as i32;if(0..5).contains(&i){self.tool=self.palette()[i as usize].0;}return}
  if is_mouse_button_pressed(MouseButton::Left)&&m.y>TOP&&m.y<screen_height()-BOTTOM{
   self.drag=Some(m);self.grab=self.orbs.iter().enumerate().rev().find(|(_,o)|o.p.distance(m)<o.r+7.).map(|(i,_)|i);
   match self.tool{
    Tool::Attract|Tool::Repel|Tool::Orbit|Tool::Matrix|Tool::Derivative|Tool::Integral|Tool::Probability|Tool::Wave|Tool::Charge|Tool::Portal=>{self.fields.push(Field{p:m,kind:self.tool,phase:0.});self.drag=None}
    Tool::Symmetry=>{let copies:Vec<_>=self.orbs.iter().map(|o|{let mut q=o.clone();q.p.x=2.*m.x-q.p.x;q.v.x=-q.v.x;q}).collect();self.orbs.extend(copies);self.burst(m,MINT,24);self.drag=None}
    Tool::Factor=>{if let Some(i)=self.grab{let o=self.orbs.remove(i);let fs=factors(o.re.abs());for(k,f)in fs.iter().enumerate(){let a=k as f32/fs.len()as f32*std::f32::consts::TAU;self.spawn(o.p+vec2(a.cos(),a.sin())*35.,vec2(a.cos(),a.sin())*90.,*f*o.re.signum(),0)}self.drag=None;self.grab=None}}
    Tool::Erase=>{self.orbs.retain(|o|o.p.distance(m)>o.r+12.);self.fields.retain(|f|f.p.distance(m)>30.);self.drag=None}
    _=>{}
   }
  }
  if let Some(i)=self.grab{if is_mouse_button_down(MouseButton::Left)&&i<self.orbs.len(){self.orbs[i].p=m;self.orbs[i].v=Vec2::ZERO}}
  if is_mouse_button_released(MouseButton::Left){if matches!(self.tool,Tool::Number|Tool::Complex){if let Some(s)=self.drag{let v=(s-m)*2.25;if let Some(i)=self.grab{if i<self.orbs.len(){self.orbs[i].v=v}}else{let im=if self.tool==Tool::Complex{self.value}else{0};self.spawn(s,v,self.value,im)}}}self.drag=None;self.grab=None}
 }
 fn update(&mut self){let raw=get_frame_time().min(1./30.);let dt=if self.paused{0.}else{raw};self.flash=(self.flash-raw*2.).max(0.);self.entropy+=dt;for f in &mut self.fields{f.phase+=dt}
  let fields=self.fields.clone();let mut births=vec![];
  for f in &fields{if f.kind==Tool::Probability&&rand::gen_range(0.,1.)<dt*0.7{births.push((f.p+vec2(rand::gen_range(-28.,28.),rand::gen_range(-28.,28.)),vec2(rand::gen_range(-80.,80.),rand::gen_range(-100.,10.)),rand::gen_range(1,10),0));}}
  for o in &mut self.orbs{let mut a=vec2(0.,76.);o.cool=(o.cool-dt).max(0.);for f in &fields{let d=f.p-o.p;let d2=d.length_squared().max(700.);let n=d.normalize_or_zero();match f.kind{
   Tool::Attract=>a+=n*4_000./d2*900.,Tool::Repel=>a-=n*5_000./d2*900.,Tool::Orbit=>{a+=n*2_300./d2*900.;a+=vec2(-n.y,n.x)*3_000./d2*650.},
   Tool::Charge=>a-=n*(o.re.signum()as f32)*4_500./d2*900.,Tool::Wave=>a.y+=(d.length()*0.055-f.phase*5.).sin()*85.,
   Tool::Derivative=>if d.length()<85.{a+=o.v.normalize_or_zero()*110.},Tool::Integral=>if d.length()<95.{o.v*=1.-dt*1.8;},
   Tool::Matrix=>if d.length()<72.&&o.cool<=0.{o.v=vec2(-o.v.y,o.v.x);o.cool=0.15},Tool::Portal=>if d.length()<28.&&o.cool<=0.{if let Some(other)=fields.iter().find(|q|q.kind==Tool::Portal&&q.p.distance(f.p)>40.){o.p=other.p+(o.p-f.p).normalize_or_zero()*38.;o.cool=0.5}},_=>{}}
  }o.v+=a*dt;o.v*=1.-dt*0.06;o.p+=o.v*dt;let floor=screen_height()-BOTTOM;if o.p.x<o.r{o.p.x=o.r;o.v.x=o.v.x.abs()*0.8}if o.p.x>screen_width()-o.r{o.p.x=screen_width()-o.r;o.v.x=-o.v.x.abs()*0.8}if o.p.y<TOP+o.r{o.p.y=TOP+o.r;o.v.y=o.v.y.abs()*0.8}if o.p.y>floor-o.r{o.p.y=floor-o.r;o.v.y=-o.v.y.abs()*0.76;o.v.x*=0.985}if o.trail.last().map_or(true,|p|p.distance(o.p)>6.){o.trail.push(o.p);if o.trail.len()>28{o.trail.remove(0);}}}
  for b in births{self.spawn(b.0,b.1,b.2,b.3)}self.collide();for s in &mut self.sparks{s.p+=s.v*dt;s.v*=0.97;s.life-=raw}self.sparks.retain(|s|s.life>0.);
 }
 fn collide(&mut self){let mut i=0;while i<self.orbs.len(){let mut j=i+1;while j<self.orbs.len(){let d=self.orbs[j].p-self.orbs[i].p;let min=self.orbs[i].r+self.orbs[j].r;if d.length()<min{let n=d.normalize_or_zero();let rel=(self.orbs[j].v-self.orbs[i].v).dot(n);if rel<0.{self.orbs[i].v-=n*(-rel*0.7);self.orbs[j].v+=n*(-rel*0.7)}if rel.abs()>70.{let a=self.orbs[i].clone();let b=self.orbs[j].clone();let(re,im)=(a.re+b.re,a.im+b.im);let p=(a.p+b.p)*0.5;self.orbs.remove(j);self.orbs.remove(i);if re!=0||im!=0{self.spawn(p,(a.v+b.v)*0.4,re.clamp(-99,99),im.clamp(-99,99));self.burst(p,GOLD,18)}else{self.burst(p,CORAL,30)}self.energy+=rel.abs();self.flash=0.15;return}else{let push=(min-d.length())*0.5;let(a,b)=self.orbs.split_at_mut(j);a[i].p-=n*push;b[0].p+=n*push}}j+=1}i+=1}}
 fn draw(&self){let w=screen_width();let h=screen_height();clear_background(INK);for x in(0..w as i32).step_by(34){for y in(TOP as i32..h as i32).step_by(34){draw_circle(x as f32,y as f32,1.,Color::new(1.,1.,1.,0.05))}}
  for f in &self.fields{draw_field(*f)}for o in &self.orbs{for k in 1..o.trail.len(){let q=k as f32/o.trail.len()as f32;draw_line(o.trail[k-1].x,o.trail[k-1].y,o.trail[k].x,o.trail[k].y,2.,Color::new(1.,1.,1.,q*0.18))}let c=if o.im!=0{CORAL}else if o.h<0.5{GOLD}else{MINT};draw_circle(o.p.x,o.p.y,o.r+6.,Color::new(c.r,c.g,c.b,0.12));draw_circle(o.p.x,o.p.y,o.r,c);draw_circle_lines(o.p.x,o.p.y,o.r,2.,PAPER);let t=if o.im==0{o.re.to_string()}else{format!("{}+{}i",o.re,o.im)};let m=measure_text(&t,None,if o.im==0{28}else{18},1.);draw_text(&t,o.p.x-m.width/2.,o.p.y+m.height/2.,if o.im==0{28.}else{18.},INK);}for s in &self.sparks{draw_circle(s.p.x,s.p.y,2.+s.life*2.,Color::new(s.c.r,s.c.g,s.c.b,s.life.min(1.)))}if let Some(s)=self.drag{let m=vec2(mouse_position().0,mouse_position().1);draw_line(s.x,s.y,m.x,m.y,3.,GOLD)}self.ui(w,h);if self.flash>0.{draw_rectangle(0.,0.,w,h,Color::new(1.,0.8,0.2,self.flash))}}
 fn ui(&self,w:f32,h:f32){draw_rectangle(0.,0.,w,TOP,PAPER);draw_text("FORMULA // UNIVERSE",22.,31.,22.,INK);draw_text(["ALGEBRA + SYMMETRY","FIELDS + LINEAR ALGEBRA","CALCULUS + PROBABILITY + WAVES"][self.page],22.,51.,10.,Color::new(0.1,0.2,0.18,0.55));draw_text("TAB  NEXT DOMAIN",22.,82.,12.,INK);let mut x=265.;for(t,label)in self.palette(){if t==self.tool{draw_rectangle(x-9.,17.,96.,55.,INK)}draw_text(label,x,49.,13.,if t==self.tool{PAPER}else{INK});x+=105.}draw_text(&format!("n = {}",self.value),w-92.,47.,17.,INK);draw_rectangle(0.,h-BOTTOM,w,BOTTOM,PAPER);draw_text("1-9 VALUE",20.,h-21.,12.,INK);draw_text("DRAG / THROW",132.,h-21.,12.,INK);draw_text("SPACE FREEZE",280.,h-21.,12.,INK);draw_text("R NEW UNIVERSE",435.,h-21.,12.,INK);draw_text(&format!("OBJECTS {}  FIELDS {}  ENERGY {:.0}",self.orbs.len(),self.fields.len(),self.energy),w-310.,h-21.,12.,INK);}
}
fn factors(n:i32)->Vec<i32>{if n<2{return vec![n]}let mut x=n;let mut p=2;let mut out=vec![];while x>1{if x%p==0{out.push(p);x/=p}else{p+=1}}out}
fn draw_field(f:Field){let(c,label)=match f.kind{Tool::Attract=>(GOLD,"G"),Tool::Repel=>(CORAL,"-"),Tool::Orbit=>(MINT,"O"),Tool::Matrix=>(PAPER,"M"),Tool::Derivative=>(MINT,"d"),Tool::Integral=>(GOLD,"S"),Tool::Probability=>(PAPER,"?"),Tool::Wave=>(MINT,"~"),Tool::Charge=>(CORAL,"q"),Tool::Portal=>(GOLD,"P"),_=>(PAPER,".")};for k in 1..=3{let r=17.+k as f32*12.+(f.phase*4.).sin()*2.;draw_circle_lines(f.p.x,f.p.y,r,1.,Color::new(c.r,c.g,c.b,0.3/k as f32))}let m=measure_text(label,None,18,1.);draw_text(label,f.p.x-m.width/2.,f.p.y+m.height/2.,18.,c);}
fn conf()->Conf{Conf{window_title:"Formula Playground".into(),window_width:1280,window_height:760,high_dpi:true,window_resizable:true,..Default::default()}}
#[macroquad::main(conf)]async fn main(){let mut g=Game::new();loop{g.input();g.update();g.draw();next_frame().await}}
