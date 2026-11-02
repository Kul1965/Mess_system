/* Meal attendance records shared with Members View */
(function(){
 const KEY="crpfMessData";
 const $=id=>document.getElementById(id);
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}};
 const write=d=>localStorage.setItem(KEY,JSON.stringify(d));
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=v=>"Rs "+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:2});
 function renderMembers(){
  const d=read(),q=($("mealMemberSearch").value||"").toLowerCase();
  const list=(d.members||[]).filter(m=>(m.status||"Active")==="Active"&&[m.name,m.forceNo,m.rank].join(" ").toLowerCase().includes(q));
  $("mealMemberList").innerHTML=list.map(m=>'<label style="display:flex;gap:8px;align-items:center;background:var(--panel);padding:9px;border:1px solid var(--border);border-radius:7px"><input type="checkbox" class="meal-member" value="'+esc(m.id)+'" style="width:auto">'+esc(m.name)+' <small>'+esc(m.forceNo)+'</small></label>').join("")||'<p>No active members found.</p>';
 }
 function renderRecords(){
  const d=read(),rows=(d.mealRecords||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  $("mealRecordRows").innerHTML=rows.map(r=>{
   const names=(d.members||[]).filter(m=>(r.memberIds||[]).includes(m.id)).map(m=>m.name).join(", ");
   return '<tr><td>'+esc(r.date)+'</td><td>'+esc(r.mealType)+'</td><td>'+esc((r.items||[]).join(", "))+'</td><td>'+esc(names)+'</td><td>'+money(r.chargePerMember)+'</td></tr>';
  }).join("")||'<tr><td colspan="5">No meal attendance records saved.</td></tr>';
 }
 window.saveMealAttendance=function(){
  const d=read(),ids=[...document.querySelectorAll(".meal-member:checked")].map(x=>x.value);
  const items=$("mealItems").value.split("\n").map(x=>x.trim()).filter(Boolean);
  const date=$("mealDate").value,mealType=$("mealType").value,charge=Number($("mealCharge").value||0);
  if(!date){alert("Please select meal date.");return}
  if(!items.length){alert("Please enter what was served in this meal.");return}
  if(!ids.length){alert("Select at least one member who ate this meal.");return}
  d.mealRecords=Array.isArray(d.mealRecords)?d.mealRecords:[];
  d.mealRecords.push({id:"MEAL"+Date.now(),date,mealType,items,memberIds:ids,chargePerMember:charge,createdAt:new Date().toISOString()});
  write(d);
  $("mealItems").value="";$("mealCharge").value="0";
  document.querySelectorAll(".meal-member").forEach(x=>x.checked=false);
  renderRecords();
  alert("Meal record saved. Selected members ke View mein menu aur charge dikhega.");
 };
 $("mealMemberSearch").addEventListener("input",renderMembers);
 $("mealDate").value=new Date().toLocaleDateString("en-CA");
 renderMembers();renderRecords();
})();
