/* Making Menu: meal type, recipe, ration preview, attendance and stock deduction */
(function(){
 const KEY="crpfMessData", $=id=>document.getElementById(id);
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}};
 const write=d=>{try{localStorage.setItem(KEY,JSON.stringify(d));return true}catch(e){alert("Data save nahi hua. Browser storage full ho sakta hai.");return false}};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=v=>"Rs "+Number(v||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
 let selectedRecipe=null;
 function checkedIds(){return [...document.querySelectorAll(".meal-member:checked")].map(x=>x.value)}
 function renderMembers(){
  const d=read(),q=($("mealMemberSearch").value||"").toLowerCase();
  const list=(d.members||[]).filter(m=>(m.status||"Active")==="Active"&&[m.name,m.forceNo,m.rank].join(" ").toLowerCase().includes(q));
  $("mealMemberList").innerHTML=list.map(m=>'<label class="member-option"><input type="checkbox" class="meal-member" value="'+esc(m.id)+'"><span>'+esc(m.name)+' <small class="help">'+esc(m.forceNo||"")+'</small></span></label>').join("")||'<p>No active members found.</p>';
  updatePreview();
 }
 function renderRecipeOptions(){
  const d=read(),recipes=d.recipes||[];
  $("mealRecipe").innerHTML='<option value="">Choose recipe</option>'+recipes.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.name)+' — '+money(r.costPerServing||r.totalCost)+'/person</option>').join("");
  $("recipeHelp").textContent=recipes.length?"Har recipe 1 serving ke liye hai. Members ki ginti ke hisaab se ration badhega.":"Recipe nahi hai. Pehle Recipes page par recipe banayein.";
  selectedRecipe=null;updatePreview();
 }
 function updatePreview(){
  const d=read(),ids=checkedIds(),count=ids.length;
  selectedRecipe=(d.recipes||[]).find(r=>r.id===$("mealRecipe").value)||null;
  const charge=selectedRecipe?Number(selectedRecipe.costPerServing||selectedRecipe.totalCost||0):0;
  $("mealChargeView").textContent=money(charge);
  $("memberCountView").textContent=count;
  $("mealTotalView").textContent=money(charge*count);
  if(!selectedRecipe){$("rationPreview").innerHTML='<tr><td colspan="3">Recipe select karein.</td></tr>';$("stockNote").textContent="Members select karne par total ration quantity calculate hogi.";return}
  const ingredients=selectedRecipe.ingredients||[];
  $("rationPreview").innerHTML=ingredients.map(i=>{
   const per=Number(i.quantity||0),total=per*count,item=(d.ration||[]).find(x=>x.id===i.itemId),available=Number(item?.quantity||0);
   const shortage=count>0&&available<total;
   return '<tr><td>'+esc(i.itemName||item?.name||"Ration")+'</td><td>'+per+' '+esc(i.unit||item?.unit||"")+'</td><td style="font-weight:700;'+(shortage?'color:#e83e49':'')+'">'+total+' '+esc(i.unit||item?.unit||"")+(shortage?' (Stock kam)':'')+'</td></tr>';
  }).join("")||'<tr><td colspan="3">Is recipe mein ration ingredients nahi hain.</td></tr>';
  $("stockNote").textContent=count? "Selected "+count+" members ke liye total ration quantity dikhayi gayi hai.": "Members select karein; total ration quantity automatic calculate hogi.";
  $("recipeHelp").textContent="1 serving cost: "+money(charge)+". Selected members ke liye total cost aur ration neeche calculate hoga.";
 }
 function renderRecords(){
  const d=read(),rows=(d.mealRecords||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  $("mealRecordRows").innerHTML=rows.map(r=>{
   const names=(d.members||[]).filter(m=>(r.memberIds||[]).includes(m.id)).map(m=>m.name).join(", ");
   return '<tr><td>'+esc(r.date)+'</td><td>'+esc(r.mealType||"—")+'</td><td>'+esc(r.recipeName||r.items?.[0]||"")+'</td><td>'+esc(names)+'</td><td>'+money(r.chargePerMember)+'</td><td>'+money(r.totalCost||r.chargePerMember*(r.memberIds||[]).length)+'</td></tr>';
  }).join("")||'<tr><td colspan="6">Abhi koi meal save nahi hua.</td></tr>';
 }
 window.saveMealAttendance=function(){
  const d=read(),ids=checkedIds(),recipe=(d.recipes||[]).find(r=>r.id===$("mealRecipe").value);
  const date=$("mealDate").value,mealType=$("mealType").value,charge=Number(recipe?.costPerServing||recipe?.totalCost||0);
  if(!date){alert("Date select karein.");return}
  if(!recipe){alert("Recipe select karein.");return}
  if(!ids.length){alert("Jin members ne khana khaya hai unko select karein.");return}
  if(charge<=0){alert("Recipe ka cost zero hai. Recipe aur ration rate check karein.");return}
  const usage=(recipe.ingredients||[]).map(i=>({itemId:i.itemId,itemName:i.itemName,unit:i.unit,perServing:Number(i.quantity||0),quantity:Number(i.quantity||0)*ids.length,rate:Number(i.rate||0),lineCost:Number(i.lineCost||0)*ids.length}));
  if(!usage.length){alert("Recipe mein ration ingredients nahi hain. Pehle recipe edit karein.");return}
  for(const u of usage){
   const item=(d.ration||[]).find(x=>x.id===u.itemId);
   if(!item){alert("Ration Store mein "+u.itemName+" nahi mila. Recipe edit karein.");return}
   if(Number(item.quantity||0)<u.quantity){alert("Stock kam hai: "+item.name+". Zaroorat "+u.quantity+" "+item.unit+", available "+item.quantity+".");return}
  }
  const totalCost=charge*ids.length;
  if(!confirm(mealType+" save karein? "+ids.length+" members ka total meal cost "+money(totalCost)+" hai. Ration Store se stock deduct hoga."))return;
  usage.forEach(u=>{const item=d.ration.find(x=>x.id===u.itemId);item.quantity=Number(item.quantity||0)-u.quantity;});
  d.mealRecords=Array.isArray(d.mealRecords)?d.mealRecords:[];
  d.mealRecords.push({id:"MEAL"+Date.now(),date,mealType,recipeId:recipe.id,recipeName:recipe.name,items:[recipe.name],memberIds:ids,chargePerMember:charge,totalCost,ingredientUsage:usage,createdAt:new Date().toISOString()});
  d.stockMovements=Array.isArray(d.stockMovements)?d.stockMovements:[];
  usage.forEach(u=>d.stockMovements.push({id:"OUT"+Date.now()+Math.random().toString(16).slice(2),date,type:"meal-consumption",itemId:u.itemId,itemName:u.itemName,quantity:u.quantity,unit:u.unit,reference:mealType+" - "+recipe.name,memberCount:ids.length}));
  if(!write(d))return;
  document.querySelectorAll(".meal-member").forEach(x=>x.checked=false);
  $("mealRecipe").value="";$("mealType").value=mealType;
  updatePreview();renderRecords();
  alert("Meal save ho gaya! "+ids.length+" members ka ration deduct hua aur "+money(totalCost)+" ka charge accounts mein add ho gaya.");
 };
 $("mealMemberSearch").addEventListener("input",renderMembers);
 $("mealMemberList").addEventListener("change",updatePreview);
 $("mealRecipe").addEventListener("change",updatePreview);
 $("mealDate").value=new Date().toLocaleDateString("en-CA");
 $("dateNow").textContent=new Date().toLocaleDateString();
 renderMembers();renderRecipeOptions();renderRecords();
})();