/* Meal attendance records shared with Members View */
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
 }
 function renderRecipeOptions(){
  const d=read(),meal=$("mealType").value,recipes=(d.recipes||[]).filter(r=>!r.category||r.category===meal);
  $("mealRecipe").innerHTML='<option value="">Choose recipe</option>'+recipes.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+' — '+money(r.costPerServing)+'/serving</option>').join("");
  $("recipeHelp").textContent=recipes.length?"Recipe select karte hi per-member cost automatic set hoga.":"Is meal ki recipe nahi hai. Pehle Recipes page mein "+meal+" recipe add karein.";
  $("mealCharge").value="0";
 }
 function updateRecipeCost(){
  const d=read(),r=(d.recipes||[]).find(x=>x.id===$("mealRecipe").value);
  $("mealCharge").value=r?Number(r.costPerServing||0):"0";
  $("recipeHelp").textContent=r?"Auto cost: "+money(r.costPerServing)+" per member.":"Recipe select karein.";
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
  const recipe=(d.recipes||[]).find(r=>r.id===$("mealRecipe").value);
  const extra=$("mealItems").value.split("\n").map(x=>x.trim()).filter(Boolean);
  const items=recipe?[recipe.name,...extra]:[];
  const date=$("mealDate").value,mealType=$("mealType").value,charge=Number($("mealCharge").value||0);
  if(!date){alert("Please select meal date.");return}
  if(!recipe){alert("Recipe nahi hai ya select nahi ki. Pehle Recipes page mein is meal ki recipe add karein.");return}
  if(charge<=0){alert("Selected recipe ka cost set nahi hai. Recipes page mein cost per serving add karein.");return}
  if(!ids.length){alert("Select at least one member who ate this meal.");return}
  d.mealRecords=Array.isArray(d.mealRecords)?d.mealRecords:[];
  d.mealRecords.push({id:"MEAL"+Date.now(),date,mealType,recipeId:recipe.id,recipeName:recipe.name,items,memberIds:ids,chargePerMember:charge,createdAt:new Date().toISOString()});
  write(d);$("mealItems").value="";$("mealCharge").value="0";$("mealRecipe").value="";
  document.querySelectorAll(".meal-member").forEach(x=>x.checked=false);
  renderRecipeOptions();renderRecords();
  alert("Meal saved. Recipe cost selected members ke account record mein add ho gaya.");
 };
 $("mealMemberSearch").addEventListener("input",renderMembers);
 $("mealType").addEventListener("change",renderRecipeOptions);
 $("mealRecipe").addEventListener("change",updateRecipeCost);
 $("mealDate").value=new Date().toLocaleDateString("en-CA");
 renderMembers();renderRecipeOptions();renderRecords();
})();
