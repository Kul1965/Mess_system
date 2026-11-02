/* Single-serving recipe attendance and automatic ration deduction */
(function(){
 const KEY="crpfMessData", $=id=>document.getElementById(id);
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}};
 const write=d=>localStorage.setItem(KEY,JSON.stringify(d));
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=v=>"Rs "+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:2});
 function renderMembers(){
  const d=read(),q=($("mealMemberSearch").value||"").toLowerCase();
  const list=(d.members||[]).filter(m=>(m.status||"Active")==="Active"&&[m.name,m.forceNo,m.rank].join(" ").toLowerCase().includes(q));
  $("mealMemberList").innerHTML=list.map(m=>'<label style="display:flex;gap:8px;align-items:center;background:var(--panel);padding:9px;border:1px solid var(--border);border-radius:7px"><input type="checkbox" class="meal-member" value="'+esc(m.id)+'" style="width:auto">'+esc(m.name)+' <small>'+esc(m.forceNo)+'</small></label>').join("")||'<p>No active members found.</p>';
  updateTotals();
 }
 function renderRecipeOptions(){
  const d=read(),recipes=d.recipes||[];
  $("mealRecipe").innerHTML='<option value="">Choose recipe</option>'+recipes.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+' — '+money(r.costPerServing)+'/person</option>').join("");
  $("recipeHelp").textContent=recipes.length?"Recipe 1 serving ki hai. Selected members ke hisaab se ration multiply hoga.":"Recipe nahi hai. Pehle Recipes page par ingredients add karke recipe banayein.";
  $("mealCharge").value="0";updateTotals();
 }
 function updateTotals(){
  const count=document.querySelectorAll(".meal-member:checked").length,charge=Number($("mealCharge").value||0);
  $("memberCount").value=count;$("mealTotal").value=(count*charge).toFixed(2);
 }
 function updateRecipeCost(){
  const d=read(),r=(d.recipes||[]).find(x=>x.id===$("mealRecipe").value);
  $("mealCharge").value=r?Number(r.costPerServing||r.totalCost||0):"0";
  $("recipeHelp").textContent=r?"1 serving cost: "+money($("mealCharge").value)+". Ration quantity selected members se multiply hogi.":"Recipe select karein.";
  updateTotals();
 }
 function renderRecords(){
  const d=read(),rows=(d.mealRecords||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  $("mealRecordRows").innerHTML=rows.map(r=>{
   const names=(d.members||[]).filter(m=>(r.memberIds||[]).includes(m.id)).map(m=>m.name).join(", ");
   return '<tr><td>'+esc(r.date)+'</td><td>'+esc(r.recipeName||r.items?.[0]||"")+'</td><td>'+esc(names)+'</td><td>'+money(r.chargePerMember)+'</td><td>'+money(r.totalCost||r.chargePerMember*(r.memberIds||[]).length)+'</td></tr>';
  }).join("")||'<tr><td colspan="5">No menu records saved.</td></tr>';
 }
 window.saveMealAttendance=function(){
  const d=read(),ids=[...document.querySelectorAll(".meal-member:checked")].map(x=>x.value);
  const recipe=(d.recipes||[]).find(r=>r.id===$("mealRecipe").value);
  const date=$("mealDate").value,charge=Number($("mealCharge").value||0);
  if(!date){alert("Date select karein.");return}
  if(!recipe){alert("Pehle Recipes page par recipe banayein aur select karein.");return}
  if(!ids.length){alert("Jitne members ne khaya hai unko select karein.");return}
  if(charge<=0){alert("Recipe ka 1 serving cost zero hai. Recipe aur ingredient rate check karein.");return}
  const usage=(recipe.ingredients||[]).map(i=>({itemId:i.itemId,itemName:i.itemName,unit:i.unit,perServing:Number(i.quantity||0),quantity:Number(i.quantity||0)*ids.length,rate:Number(i.rate||0),lineCost:Number(i.lineCost||0)*ids.length}));
  if(!usage.length){alert("Is recipe mein ingredients nahi hain. Recipes page par ingredients add karein.");return}
  for(const u of usage){
   const item=(d.ration||[]).find(x=>x.id===u.itemId);
   if(!item){alert("Ration Store mein "+u.itemName+" nahi mila. Recipe edit karein.");return}
   if(Number(item.quantity||0)<u.quantity){alert("Stock kam hai: "+item.name+". Zaroorat "+u.quantity+" "+item.unit+", available "+item.quantity+".");return}
  }
  if(!confirm("Confirm karein? "+ids.length+" members ke liye ration stock se katega aur har member par "+money(charge)+" charge hoga."))return;
  usage.forEach(u=>{const item=d.ration.find(x=>x.id===u.itemId);item.quantity=Number(item.quantity||0)-u.quantity;});
  const totalCost=charge*ids.length;
  d.mealRecords=Array.isArray(d.mealRecords)?d.mealRecords:[];
  d.mealRecords.push({id:"MEAL"+Date.now(),date,recipeId:recipe.id,recipeName:recipe.name,items:[recipe.name],memberIds:ids,chargePerMember:charge,totalCost,ingredientUsage:usage,createdAt:new Date().toISOString()});
  d.stockMovements=Array.isArray(d.stockMovements)?d.stockMovements:[];
  usage.forEach(u=>d.stockMovements.push({id:"OUT"+Date.now()+Math.random().toString(16).slice(2),date,type:"meal-consumption",itemId:u.itemId,itemName:u.itemName,quantity:u.quantity,unit:u.unit,reference:recipe.name,memberCount:ids.length}));
  write(d);$("mealCharge").value="0";$("mealRecipe").value="";
  document.querySelectorAll(".meal-member").forEach(x=>x.checked=false);
  updateTotals();renderRecipeOptions();renderRecords();
  alert("Menu save ho gaya. "+ids.length+" members ka ration stock se deduct hua aur charges Member View mein add ho gaye.");
 };
 $("mealMemberSearch").addEventListener("input",renderMembers);
 $("mealMemberList").addEventListener("change",updateTotals);
 $("mealRecipe").addEventListener("change",updateRecipeCost);
 $("mealDate").value=new Date().toLocaleDateString("en-CA");
 renderMembers();renderRecipeOptions();renderRecords();
})();