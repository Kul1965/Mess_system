/* Making Menu: multiple dishes per meal, ration preview, attendance and stock deduction */
(function(){
 const KEY="crpfMessData",$=id=>document.getElementById(id);
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}};
 const write=d=>{try{localStorage.setItem(KEY,JSON.stringify(d));return true}catch(e){alert("Data save nahi hua. Browser storage full ho sakta hai.");return false}};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=v=>"Rs "+Number(v||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
 const checkedIds=()=>[...document.querySelectorAll(".meal-member:checked")].map(x=>x.value);
 const selectedRecipes=()=>[...document.querySelectorAll(".meal-recipe:checked")].map(c=>c.value);
 function renderMembers(){
  const d=read(),q=($("mealMemberSearch").value||"").toLowerCase();
  const list=(d.members||[]).filter(m=>(m.status||"Active")==="Active"&&[m.name,m.forceNo,m.rank].join(" ").toLowerCase().includes(q));
  $("mealMemberList").innerHTML=list.map(m=>'<label class="member-option"><input type="checkbox" class="meal-member" value="'+esc(m.id)+'"><span>'+esc(m.name)+' <small class="help">'+esc(m.forceNo||"")+'</small></span></label>').join("")||'<p>No active members found.</p>';
  updatePreview();
 }
 function renderRecipeOptions(){
  const d=read(),recipes=d.recipes||[];
  $("mealRecipeList").innerHTML=recipes.map(r=>'<label class="member-option"><input type="checkbox" class="meal-recipe" value="'+esc(r.id)+'"><span><b>'+esc(r.name)+'</b><small class="help" style="display:block">'+money(r.costPerServing||r.totalCost)+' / member</small></span></label>').join("")||'<p>Recipe nahi hai. Pehle Recipes page par Dal, Chawal, Sabji jaise dishes banayein.</p>';
  $("recipeHelp").textContent=recipes.length?"Ek meal mein kai dishes tick karein — jaise Dal + Chawal + Sabji.":"Pehle Recipes page par har dish ki recipe banayein.";
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
  $("mealRecordRows").innerHTML=rows.map(r=>{
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
  if(!confirm(mealType+" mein "+dishNames.join(" + ")+" save karein? "+ids.length+" members ka cost "+money(totalCost)+" hai. Ration stock deduct hoga."))return;
  usage.forEach(u=>{const item=d.ration.find(x=>String(x.id)===String(u.itemId));item.quantity=Number(item.quantity||0)-u.quantity;});
  d.mealRecords=Array.isArray(d.mealRecords)?d.mealRecords:[];
  d.mealRecords.push({id:"MEAL"+Date.now(),date,mealType,recipeIds:recipes.map(r=>r.id),recipeNames:dishNames,recipeName:dishNames.join(" + "),items:dishNames,memberIds:ids,chargePerMember:perMember,totalCost,ingredientUsage:usage,createdAt:new Date().toISOString()});
  d.stockMovements=Array.isArray(d.stockMovements)?d.stockMovements:[];
  usage.forEach(u=>d.stockMovements.push({id:"OUT"+Date.now()+Math.random().toString(16).slice(2),date,type:"meal-consumption",itemId:u.itemId,itemName:u.itemName,quantity:u.quantity,unit:u.unit,reference:mealType+" - "+dishNames.join(" + "),memberCount:ids.length}));
  if(!write(d))return;
  document.querySelectorAll(".meal-member,.meal-recipe").forEach(x=>x.checked=false);
  updatePreview();renderRecords();
  alert("Meal save ho gaya! "+ids.length+" members ka ration deduct hua aur "+money(totalCost)+" ka charge per meal total add hua.");
 };
 function sendCookRation(){
  const d=read(),ids=checkedIds(),chosen=selectedRecipes(),recipes=(d.recipes||[]).filter(r=>chosen.includes(r.id));
  if(!recipes.length){alert("Pehle dishes / recipes select karein.");return}
  if(!ids.length){alert("Pehle khana khane wale members select karein.");return}
  const phone=String($("cookWhatsApp").value||"").replace(/[^0-9]/g,"");
  if(!phone){alert("Cook ka WhatsApp number country code ke saath dalein.");return}
  const lines=aggregate(recipes,d).map(i=>i.itemName+": "+(i.perServing*ids.length)+" "+i.unit);
  const message=["CRPF MESS — RATION LIST","Date: "+$("mealDate").value,"Meal: "+$("mealType").value,"Dishes: "+recipes.map(r=>r.name).join(" + "),"Members: "+ids.length,"Required ration:",...lines,"Please ration prepare karein. — Mess NCO"].join("\n");
  window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(message),"_blank","noopener");
 }
 $("sendCookRation").addEventListener("click",sendCookRation);
 $("mealMemberSearch").addEventListener("input",renderMembers);
 $("mealMemberList").addEventListener("change",updatePreview);
 $("mealRecipeList").addEventListener("change",updatePreview);
 $("mealDate").value=new Date().toLocaleDateString("en-CA");$("dateNow").textContent=new Date().toLocaleDateString();
 renderMembers();renderRecipeOptions();renderRecords();
})();