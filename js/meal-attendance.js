/* Making Menu: multiple dishes per meal, ration preview, attendance and stock deduction */
(function(){
 const KEY="crpfMessData",$=id=>document.getElementById(id);
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}};
 const write=d=>{try{localStorage.setItem(KEY,JSON.stringify(d));return true}catch(e){alert("Data save nahi hua. Browser storage full ho sakta hai.");return false}};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=v=>"Rs "+Number(v||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
 function showNotice(title,message,kind){
  const wrap=document.createElement("div");wrap.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.58);display:grid;place-items:center;padding:18px";
  const box=document.createElement("div");box.style.cssText="width:min(100%,390px);background:#fff;border-radius:20px;padding:24px 20px;text-align:center;box-shadow:0 18px 60px rgba(0,0,0,.3);font-family:Arial,sans-serif";
  const icon=kind==="success"?"✅":"📲";
  box.innerHTML='<div style="font-size:38px;margin-bottom:10px">'+icon+'</div><h3 style="margin:0 0 10px;color:#145b40;font-size:21px"></h3><p style="margin:0 0 20px;color:#46534c;line-height:1.55;font-size:15px"></p><button type="button" style="border:0;border-radius:11px;background:#176747;color:#fff;padding:12px 28px;font-weight:700;font-size:15px">ठीक है</button>';
  box.querySelector("h3").textContent=title;box.querySelector("p").textContent=message;box.querySelector("button").onclick=()=>wrap.remove();document.body.appendChild(wrap);wrap.appendChild(box);
 }
 const cookField=document.getElementById("cookWhatsApp");
 const cookSelect=document.getElementById("cookSelect");
 function dateISO(d){return d.toLocaleDateString("en-CA")}
 function mondayOf(value){const d=new Date(value+"T12:00:00");const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d}
 function weekDates(){const start=$("planWeekStart").value;if(!start)return [];const d=mondayOf(start);return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return dateISO(x)})}
 function renderPlanDates(){const dates=weekDates(),sel=$("planDate"),old=sel.value;sel.innerHTML=dates.map(v=>'<option value="'+v+'">'+v+'</option>').join("");if(dates.includes(old))sel.value=old}
 function renderPlanRecipes(){const d=read();$("planRecipeList").innerHTML=(d.recipes||[]).map(r=>'<label class="member-option"><input type="checkbox" class="plan-recipe" value="'+esc(r.id)+'"><span>'+esc(r.name)+' <small class="help">'+money(r.costPerServing||r.totalCost||0)+'/member</small></span></label>').join("")||'<p>Pehle Recipes page par recipes banayein.</p>'}
 function renderWeeklyPlans(){const dates=weekDates(),plans=(read().weeklyMenus||[]).filter(p=>dates.includes(p.date)).sort((a,b)=>a.date.localeCompare(b.date)||a.mealType.localeCompare(b.mealType));$("weeklyPlanRows").innerHTML=plans.map(p=>'<tr><td>'+esc(p.date)+'</td><td>'+esc(p.mealType)+'</td><td>'+esc((p.recipeNames||[]).join(" + "))+'</td><td><button type="button" class="btn use-week-plan" data-id="'+esc(p.id)+'">Hajiri Lagayein</button> <button type="button" class="alt delete-week-plan" data-id="'+esc(p.id)+'">Delete</button></td></tr>').join("")||'<tr><td colspan="4" class="ration-empty">Is hafte ka menu abhi nahi bana.</td></tr>'}
 function saveWeeklyPlan(){const ids=[...document.querySelectorAll(".plan-recipe:checked")].map(x=>x.value),d=read(),recipes=(d.recipes||[]).filter(r=>ids.includes(String(r.id))),date=$("planDate").value,mealType=$("planMealType").value;if(!date||!recipes.length){alert("Date aur kam se kam ek dish select karein.");return}d.weeklyMenus=Array.isArray(d.weeklyMenus)?d.weeklyMenus:[];const existing=d.weeklyMenus.find(p=>p.date===date&&p.mealType===mealType);if(existing){if(!confirm("Is date aur meal ka plan pehle se hai. Update karein?"))return;existing.recipeIds=recipes.map(r=>r.id);existing.recipeNames=recipes.map(r=>r.name)}else d.weeklyMenus.push({id:"PLAN"+Date.now(),date,mealType,recipeIds:recipes.map(r=>r.id),recipeNames:recipes.map(r=>r.name),createdAt:new Date().toISOString()});if(!write(d))return;document.querySelectorAll(".plan-recipe").forEach(x=>x.checked=false);renderWeeklyPlans();alert("Weekly menu save ho gaya. Stock deduct nahi hua.");}
 function loadPlanForAttendance(id){const d=read(),p=(d.weeklyMenus||[]).find(x=>String(x.id)===String(id));if(!p)return;$("mealDate").value=p.date;$("mealType").value=p.mealType;document.querySelectorAll(".meal-recipe").forEach(x=>x.checked=(p.recipeIds||[]).map(String).includes(String(x.value)));document.querySelectorAll(".meal-member").forEach(x=>x.checked=false);updatePreview();$("mealMemberList").scrollIntoView({behavior:"smooth",block:"start"});alert("Planned dishes load ho gaye. Ab sirf jin members ne khaya unki hajiri lagayein aur Save Meal dabayein.");}
 function renderCookOptions(){
  if(!cookSelect)return;
  const d=read();
  const cooks=(d.staff||[]).filter(s=>String(s.status||"Active").toLowerCase()==="active"&&String(s.duty||"").trim().toLowerCase()==="cook");
  const previous=cookSelect.value;
  cookSelect.innerHTML='<option value="">Cook select karein</option>'+cooks.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name||"Cook")+(s.phone||s.mobile||s.contact?" — "+esc(s.phone||s.mobile||s.contact):" — Number nahi diya")+"</option>").join("");
  if(cooks.some(s=>String(s.id)===previous))cookSelect.value=previous;
  else if(cooks.length)cookSelect.value=String(cooks[0].id);
  syncCookPhone();
 }
 function syncCookPhone(){
  if(!cookSelect||!cookField)return;
  const selected=(read().staff||[]).find(s=>String(s.id)===String(cookSelect.value));
  cookField.value=selected?String(selected.phone||selected.mobile||selected.contact||"").replace(/[^0-9]/g,""):"";
  if($("cookSelectForm"))$("cookSelectForm").value=cookSelect.value;
  if($("cookWhatsAppForm"))$("cookWhatsAppForm").value=cookField.value;
 }
 function syncCookForm(){
  const target=$("cookSelectForm");if(!target)return;
  target.innerHTML=cookSelect?cookSelect.innerHTML:'<option value="">Cook select karein</option>';
  if(cookSelect)target.value=cookSelect.value;
  const selected=(read().staff||[]).find(s=>String(s.id)===String(target.value));
  $("cookWhatsAppForm").value=selected?String(selected.phone||selected.mobile||selected.contact||"").replace(/[^0-9]/g,""):"";
 }
 $("cookSelectForm")?.addEventListener("change",()=>{
  const id=$("cookSelectForm").value,staff=(read().staff||[]).find(s=>String(s.id)===String(id));
  if(cookSelect)cookSelect.value=id;
  if(cookField)cookField.value=staff?String(staff.phone||staff.mobile||staff.contact||"").replace(/[^0-9]/g,""):"";
  $("cookWhatsAppForm").value=cookField?cookField.value:"";
 });
 if(cookSelect)cookSelect.addEventListener("change",syncCookPhone);
 const checkedIds=()=>[...document.querySelectorAll(".meal-member:checked")].map(x=>x.value);
 const selectedRecipes=()=>[...document.querySelectorAll(".meal-recipe:checked")].map(c=>c.value);
 function renderMembers(){
  const d=read(),q=($("mealMemberSearch").value||"").toLowerCase();
  const list=(d.members||[]).filter(m=>(m.status||"Active")==="Active"&&[m.name,m.forceNo,m.rank].join(" ").toLowerCase().includes(q));
  $("mealMemberList").innerHTML=list.map(m=>'<label class="member-option"><input type="checkbox" class="meal-member" value="'+esc(m.id)+'"><span>'+esc(m.name)+' <small class="help">'+esc(m.forceNo||"")+'</small></span></label>').join("")||'<p>No active members found.</p>';
  updatePreview();
 }
 function renderRecipeOptions(){
  const d=read(),recipes=d.recipes||[],own=recipes.filter(r=>r.source!=="premade"),pre=recipes.filter(r=>r.source==="premade");
  const card=r=>'<label class="member-option"><input type="checkbox" class="meal-recipe" value="'+esc(r.id)+'"><span><b>'+esc(r.name)+'</b><small class="help" style="display:block">'+money(r.costPerServing||r.totalCost)+' / member</small></span></label>';
  $("mealRecipeList").innerHTML='<div id="ownRecipePanel"><b>Apni Recipes</b><div class="member-list" style="margin-top:8px">'+(own.map(card).join("")||'<p>Abhi apni recipe nahi bani. Recipes page par banayein.</p>')+'</div></div><div id="premadeRecipePanel" style="display:none"><b>Pre-made Recipes</b><div class="member-list" style="margin-top:8px">'+(pre.map(card).join("")||'<p>Pre-made list abhi khali hai. Neeche diye button se 31 ready recipes kholein.</p>')+'</div><a class="btn" href="recipes.html" style="display:inline-block;margin-top:10px">📚 Pre-made Recipe Library (31) kholein</a></div>';
  $("recipeHelp").textContent="Pehle Apni Recipes ya Pre-made Recipes option chunein. Ek meal mein kai dishes tick kar sakte hain.";
  const ownBtn=$("showOwnRecipes"),preBtn=$("showPremadeRecipes");
  if(ownBtn&&!ownBtn.dataset.bound){ownBtn.dataset.bound="1";ownBtn.addEventListener("click",()=>{ $("ownRecipePanel").style.display="block";$("premadeRecipePanel").style.display="none";ownBtn.classList.add("active");preBtn.classList.remove("active");});}
  if(preBtn&&!preBtn.dataset.bound){preBtn.dataset.bound="1";preBtn.addEventListener("click",()=>{ $("ownRecipePanel").style.display="none";$("premadeRecipePanel").style.display="block";preBtn.classList.add("active");ownBtn.classList.remove("active");});}
  updatePreview();
 }
 function unitFactor(unit){
 const u=String(unit||"").toLowerCase();
 if(["g","gram","grams"].includes(u))return {kind:"weight",factor:1};
 if(["kg","kgs"].includes(u))return {kind:"weight",factor:1000};
 if(u==="ml")return {kind:"volume",factor:1};
 if(["ltr","l","litre","liter"].includes(u))return {kind:"volume",factor:1000};
 if(["pcs","pc","piece","pieces"].includes(u))return {kind:"count",factor:1};
 return null;
}
function convertQty(q,from,to){
 const f=unitFactor(from),t=unitFactor(to);
 if(!f||!t||f.kind!==t.kind)return null;
 return Number(q)*f.factor/t.factor;
}
function recipeUnitFor(item){const u=String(item?.unit||"").toLowerCase();if(["kg","kgs","g","gram","grams"].includes(u))return "g";if(["ltr","l","litre","liter","ml"].includes(u))return "ml";return "pcs"}
function aggregate(recipes,d){
 const map=new Map();
 recipes.forEach(r=>(r.ingredients||[]).forEach(i=>{
  const item=(d.ration||[]).find(x=>String(x.id)===String(i.itemId)),unit=item?recipeUnitFor(item):(i.unit||"pcs");
  const qty=convertQty(Number(i.quantity||0),i.unit||unit,unit);if(qty===null)return;
  const key=String(i.itemId||i.itemName),old=map.get(key)||{itemId:i.itemId,itemName:i.itemName,unit,perServing:0,rate:Number(i.rate||0),lineCost:0};
  old.perServing+=qty;old.lineCost+=Number(i.lineCost||0);map.set(key,old);
 }));
 return [...map.values()];
}
function updatePreview(){
  const d=read(),ids=checkedIds(),count=ids.length,chosen=selectedRecipes();
  const recipes=(d.recipes||[]).filter(r=>chosen.includes(r.id));
  const perMember=recipes.reduce((s,r)=>s+Number(r.costPerServing||r.totalCost||0),0);
  $("mealChargeView").textContent=money(perMember);$("memberCountView").textContent=count;$("mealTotalView").textContent=money(perMember*count);
  if(!recipes.length){$("rationPreview").innerHTML='<tr><td colspan="3">Ek ya zyada dishes select karein.</td></tr>';$("stockNote").textContent="Dal, Chawal, Sabji jaise dishes select karein.";return}
  const ingredients=aggregate(recipes,d);
  const prettyQty=(value,unit)=>{const n=Number(value||0),u=String(unit||"");if(u==="g"&&n>=1000)return (n/1000).toLocaleString("en-IN",{maximumFractionDigits:2})+" kg";if(u==="ml"&&n>=1000)return (n/1000).toLocaleString("en-IN",{maximumFractionDigits:2})+" L";return n.toLocaleString("en-IN",{maximumFractionDigits:2})+" "+u;};
  $("rationPreview").innerHTML=ingredients.map(i=>{
   const total=i.perServing*count,item=(d.ration||[]).find(x=>String(x.id)===String(i.itemId)),available=item?convertQty(Number(item.quantity||0),item.unit,i.unit):0,short=count>0&&(available===null||available+1e-9<total);
   return '<tr><td><div class="ration-item-name"><span class="ration-item-icon">🥣</span><span>'+esc(i.itemName||item?.name||"Ration")+'</span></div></td><td><span class="qty-pill">'+esc(prettyQty(i.perServing,i.unit||item?.unit))+'</span></td><td><span class="qty-total '+(short?'short-stock':'')+'">'+esc(prettyQty(total,i.unit||item?.unit))+'</span>'+(short?'<small style="display:block;color:#ff9da3;margin-top:5px;font-weight:700">⚠ Stock kam</small>':'')+'</td></tr>';
  }).join("")||'<tr><td class="ration-empty" colspan="3">Selected recipes mein ration ingredients nahi hain.</td></tr>';
  $("stockNote").textContent=count?"Selected "+count+" members ke liye sabhi dishes ka combined ration dikhaya gaya hai.":"Members select karein; total ration quantity calculate hogi.";
  $("recipeHelp").textContent=recipes.map(r=>r.name).join(" + ")+" | Total per member: "+money(perMember);
 }
 function renderRecords(){
  const d=read(),rows=(d.mealRecords||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const heading=document.querySelector(".menu-panel h3:last-of-type");if(heading)heading.textContent="Saved Meal Records — "+rows.length+" Entries";$("mealRecordRows").innerHTML=rows.map(r=>{
   const names=(d.members||[]).filter(m=>(r.memberIds||[]).includes(m.id)).map(m=>m.name).join(", ");
   const dishes=(r.recipeNames||[r.recipeName||""]).join(" + ");
   return '<tr><td>'+esc(r.date)+'</td><td>'+esc(r.mealType||"—")+'</td><td>'+esc(dishes)+'</td><td>'+esc(names)+'</td><td>'+money(r.chargePerMember)+'</td><td>'+money(r.totalCost||r.chargePerMember*(r.memberIds||[]).length)+'</td></tr>';
  }).join("")||'<tr><td colspan="6">Abhi koi meal save nahi hua.</td></tr>';
 }
 window.saveMealAttendance=function(){
  const d=read(),ids=checkedIds(),chosen=selectedRecipes(),recipes=(d.recipes||[]).filter(r=>chosen.includes(r.id));
  const date=$("mealDate").value,mealType=$("mealType").value;
  // Only Active members can receive a new meal attendance / bill.
  // Re-check at save time so a member changed to Leave or Transferred
  // while this page was open cannot be charged accidentally.
  const activeIds=new Set((d.members||[]).filter(m=>(m.status||"Active")==="Active").map(m=>String(m.id)));
  const blockedIds=ids.filter(id=>!activeIds.has(String(id)));
  if(blockedIds.length){
   alert("Leave ya Transferred member ki nayi hajiri / mess bill nahi ban sakti. Member list refresh kar di gayi hai.");
   renderMembers();
   return;
  }
  if(!date){alert("Date select karein.");return}
  if(!recipes.length){alert("Kam se kam ek dish / recipe select karein.");return}
  if(!ids.length){alert("Jin members ne khana khaya hai unko select karein.");return}
  if(recipes.some(r=>Number(r.costPerServing||r.totalCost||0)<=0)){alert("Kisi selected recipe ka cost zero hai. Recipe aur ration rate check karein.");return}
  const perMember=recipes.reduce((s,r)=>s+Number(r.costPerServing||r.totalCost||0),0);
  const ingredients=aggregate(recipes,d),usage=ingredients.map(i=>{const item=(d.ration||[]).find(x=>String(x.id)===String(i.itemId)),recipeQuantity=i.perServing*ids.length,stockQuantity=item?convertQty(recipeQuantity,i.unit,item.unit):null;return {...i,recipeQuantity,quantity:stockQuantity,unit:item?.unit||i.unit,lineCost:i.lineCost*ids.length};});
  if(!usage.length){alert("Selected recipes mein ration ingredients nahi hain. Recipe edit karein.");return}
  for(const u of usage){
   const item=(d.ration||[]).find(x=>String(x.id)===String(u.itemId));
   if(!item){alert("Ration Store mein "+u.itemName+" nahi mila. Recipe edit karein.");return}
   if(u.quantity===null||!Number.isFinite(u.quantity)){alert("Unit conversion nahi ho saka: "+item.name+". Store unit aur recipe unit check karein.");return}
   if(Number(item.quantity||0)+1e-9<u.quantity){alert("Stock kam hai: "+item.name+". Zaroorat "+u.recipeQuantity+" "+recipeUnitFor(item)+" (Store mein "+u.quantity+" "+item.unit+"), available "+item.quantity+" "+item.unit+".");return}
  }
  const totalCost=perMember*ids.length,dishNames=recipes.map(r=>r.name);
  const duplicate=(d.mealRecords||[]).find(r=>r.date===date&&r.mealType===mealType);
  if(duplicate){alert("Is date ka "+mealType+" menu pehle hi save ho chuka hai. Ek meal time ka ration sirf ek baar save hoga.");return}
  if(!confirm(mealType+" mein "+dishNames.join(" + ")+" save karein? "+ids.length+" members ka cost "+money(totalCost)+" hai. Ration stock deduct hoga."))return;
  usage.forEach(u=>{const item=d.ration.find(x=>String(x.id)===String(u.itemId));item.quantity=Number(item.quantity||0)-u.quantity;});
  d.mealRecords=Array.isArray(d.mealRecords)?d.mealRecords:[];
  d.mealRecords.push({id:"MEAL"+Date.now(),date,mealType,recipeIds:recipes.map(r=>r.id),recipeNames:dishNames,recipeName:dishNames.join(" + "),items:dishNames,memberIds:ids,chargePerMember:perMember,totalCost,ingredientUsage:usage,cookWhatsAppSent:false,createdAt:new Date().toISOString()});
  d.stockMovements=Array.isArray(d.stockMovements)?d.stockMovements:[];
  usage.forEach(u=>d.stockMovements.push({id:"OUT"+Date.now()+Math.random().toString(16).slice(2),date,type:"meal-consumption",itemId:u.itemId,itemName:u.itemName,quantity:u.quantity,unit:u.unit,reference:mealType+" - "+dishNames.join(" + "),memberCount:ids.length}));
  if(!write(d))return;
  document.querySelectorAll(".meal-member,.meal-recipe").forEach(x=>x.checked=false);
  updatePreview();renderRecords();
  renderCookMealOptions(); showNotice("Meal Successfully Saved","Ration stock deduct ho gaya hai. Neeche Cook WhatsApp form se saved meal select karke ration bhejein.","success");
 };
 function renderCookMealOptions(){
  const d=read(),sel=$("cookMealRecord");if(!sel)return;
  const previous=sel.value,rows=(d.mealRecords||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(a.mealType||"").localeCompare(b.mealType||""));
  const sentMap=d.cookRationSent||{};
  // Older build marked records as sent at save time even when WhatsApp never opened.
  // Only the explicit send log is treated as proof that the message was handed off.
  sel.innerHTML='<option value="">Saved meal select karein</option>'+rows.map(r=>{
   const sent=!!sentMap[r.date+"|"+r.mealType];
   return '<option value="'+esc(r.id)+'" '+(sent?'disabled':'')+'>'+esc(r.date)+' — '+esc(r.mealType)+' — '+esc((r.recipeNames||[r.recipeName||""]).join(" + "))+(sent?' ✓ WhatsApp bhejne ke liye process ho chuka':'')+'</option>';
  }).join("");
  if(rows.some(r=>String(r.id)===previous&&!sentMap[r.date+"|"+r.mealType]))sel.value=previous;
  $("cookMealStatus").textContent=rows.length?"Total "+rows.length+" saved meals. Jo ✓ nahi hain, unka WhatsApp abhi bheja ja sakta hai.":"Abhi koi Meal Save nahi mila. Meal Save & Deduct Ration dabayein.";
 }
 function sendCookRation(){
  const d=read(),id=$("cookMealRecord").value,record=(d.mealRecords||[]).find(r=>String(r.id)===String(id));
  if(!record){alert("Pehle Saved Meal select karein.");return}
  d.cookRationSent=d.cookRationSent||{};const key=record.date+"|"+record.mealType;
  if(d.cookRationSent[key]){alert("Is date ka "+record.mealType+" ration WhatsApp pehle hi bheja ja chuka hai.");renderCookMealOptions();return}
  const phone=String($("cookWhatsAppForm").value||"").replace(/[^0-9]/g,"");if(!phone){alert("Cook select karein; number automatic aayega.");return}
  const lines=(record.ingredientUsage||[]).map(i=>(i.itemName||"Ration")+": "+Number(i.recipeQuantity||i.quantity||0)+" "+(i.recipeUnit||i.unit||""));
  if(!lines.length){alert("Is saved meal ki ration detail nahi mili.");return}
  const dishes=(record.recipeNames||[record.recipeName||""]).join(" + ");
  const message=["CRPF MESS — RATION LIST","Date: "+record.date,"Meal: "+record.mealType,"Dishes: "+dishes,"Members: "+(record.memberIds||[]).length,"Required ration:",...lines,"Please ration prepare karein. — Mess NCO"].join("\\n");
  const waUrl="https://wa.me/"+phone+"?text="+encodeURIComponent(message);
  const waWindow=window.open(waUrl,"_blank");
  if(!waWindow){window.location.href=waUrl;return}
  d.cookRationSent=d.cookRationSent||{};d.cookRationSent[key]={recordId:record.id,sentAt:new Date().toISOString(),phone};
  record.cookWhatsAppSent=true;record.cookWhatsAppSentAt=new Date().toISOString();
  if(!write(d))return;renderCookMealOptions();
  showNotice("WhatsApp Ready!",record.mealType+" ki ration list WhatsApp mein khul gayi hai. Ab Send dabayein. Is date aur meal ka ration dobara nahi bheja jayega.","success");
 }

 $("mealMemberSearch").addEventListener("input",renderMembers);
 $("mealMemberList").addEventListener("change",updatePreview);
 $("mealRecipeList").addEventListener("change",updatePreview);
 $("mealDate").value=new Date().toLocaleDateString("en-CA");$("dateNow").textContent=new Date().toLocaleDateString();
 $("planWeekStart").value=dateISO(mondayOf(dateISO(new Date())));renderPlanDates();renderPlanRecipes();renderWeeklyPlans();$("planWeekStart").addEventListener("change",()=>{renderPlanDates();renderWeeklyPlans()});$("saveWeeklyPlan").addEventListener("click",saveWeeklyPlan);$("weeklyPlanRows").addEventListener("click",e=>{const use=e.target.closest(".use-week-plan"),del=e.target.closest(".delete-week-plan");if(use)loadPlanForAttendance(use.dataset.id);if(del){const d=read();if(confirm("Is planned menu ko delete karein?")){d.weeklyMenus=(d.weeklyMenus||[]).filter(p=>String(p.id)!==String(del.dataset.id));write(d);renderWeeklyPlans()}}});
 renderCookOptions();syncCookForm();renderMembers();renderRecipeOptions();renderRecords();renderCookMealOptions(); $("sendCookRation").addEventListener("click",sendCookRation); $("cookMealRecord").addEventListener("change",()=>{const r=(read().mealRecords||[]).find(x=>String(x.id)===$("cookMealRecord").value);if(r&&!(r.cookWhatsAppSent||(read().cookRationSent||{})[r.date+"|"+r.mealType]))$("cookMealStatus").textContent=r.date+" — "+r.mealType+" selected. Ab Cook ko WhatsApp karein.";});
})();