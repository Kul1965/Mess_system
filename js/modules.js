/* CRPF Mess shared local-first module engine */
function showAppAlert(message){
 const old=document.getElementById("appToast");
 if(old)old.remove();
 const text=String(message??"");
 const kind=/success|saved|restored|updated|deleted/i.test(text)?"success":
   /error|failed|not saved|save nahi|unable|invalid|already registered/i.test(text)?"error":
   /warning|khali|low stock|please allow/i.test(text)?"warning":"info";
 const toast=document.createElement("div");
 toast.id="appToast";
 toast.className="app-toast "+kind;
 toast.setAttribute("role",kind==="error"?"alert":"status");
 toast.setAttribute("aria-live",kind==="error"?"assertive":"polite");
 const icon=document.createElement("span");
 icon.className="app-toast-icon";
 icon.textContent=kind==="success"?"✓":kind==="error"?"!":kind==="warning"?"⚠":"ℹ";
 const label=document.createElement("span");
 label.className="app-toast-message";
 label.textContent=text;
 const close=document.createElement("button");
 close.type="button";close.className="app-toast-close";
 close.setAttribute("aria-label","Close message");close.textContent="×";
 close.addEventListener("click",()=>toast.remove());
 const bar=document.createElement("span");bar.className="app-toast-progress";
 toast.append(icon,label,close,bar);document.body.appendChild(toast);
 window.setTimeout(()=>{if(toast.isConnected)toast.remove()},4200);
}
const KEY="crpfMessData";
const configs={
 store:{title:"Ration Store",sub:"Item register and current stock — purchases are entered on the Purchases page",key:"ration",fields:[["name","Item name","text",1],["category","Category","text"],["unit","Stock unit (required)","select",1,"g|kg|ml|ltr|pcs"],["quantity","Opening stock (only if stock already exists)","number"],["minimum","Minimum stock alert","number"],["price","Opening rate per stock unit (Rs)","number"]],cols:["name","category","quantity","unit","minimum","price"],stats:["Total Items","Low Stock","Stock Value"]},
 purchases:{title:"Purchases",sub:"Record purchases and automatically update stock",key:"purchases",fields:[["date","Purchase date","date",1],["itemId","Store item","item",1],["quantity","Quantity purchased","number",1],["unit","Purchase unit","select",1,"kg|g|ltr|ml|pcs"],["rate","Rate per purchase unit (Rs)","number",1],["vendor","Supplier","text"],["bill","Bill / reference","text"]],cols:["date","itemName","quantity","unit","rate","total","vendor"]},
 recipes:{title:"Recipes",sub:"Add ration ingredients; cost is calculated from current store rates",key:"recipes",fields:[["name","Recipe name","text",1],["notes","Notes","text"]],cols:["name","ingredientSummary","totalCost","costPerServing"]},
 menu:{title:"Making Menu",sub:"Select a meal and recipe; recipe cost is calculated automatically",key:"menu",fields:[["date","Menu date","date",1],["recipeId","Select recipe","recipe",1],["servings","Number of members / servings","number",1]],cols:["date","recipeName","servings","totalCost"]},
 accounts:{title:"Accounts",sub:"Record office funds, Mess Cutting collections and expenses",key:"transactions",fields:[["date","Date","date",1],["type","Transaction type","select",1,"office_received|cutting_collected|office_deposited|expense|special_expense|surplus_spend"],["memberId","Member","member"],["description","Details / purpose","text",1],["amount","Amount (Rs)","number",1],["approvedBy","Approval / receipt reference (Surplus spend: required)","text"]],cols:["date","type","memberName","description","amount"]},
 staff:{title:"Mess Staff",sub:"Select an existing member and assign mess duty",key:"staff",fields:[["memberId","Choose Member","member",1],["duty","Assign Duty","select",1,"Mess Commander|Mess NCO|Mess SO|Cook|Member"],["dutyDate","Duty Start Date","date",1]],cols:["name","rank","duty","dutyDate","phone","status"]},
 reports:{title:"Reports & Records",sub:"View summaries from saved mess records",key:"reports",fields:[],cols:[]},
 handover:{title:"Mess Handover",sub:"Record monthly mess commander handover",key:"handovers",fields:[["date","Handover date","date",1],["from","Outgoing commander","staff",1],["to","Incoming commander","staff",1],["cash","Cash balance (Rs)","number"],["notes","Stock / account notes","text"]],cols:["date","from","to","cash","notes"]},
 settings:{title:"Settings",sub:"Mess identity and local preferences",key:"settings",fields:[["messName","Mess name","text",1],["currency","Currency label","text",1]],cols:[]}
};
let cfg=configs[document.body.dataset.module]||configs.store;
let data=read(),editId=null;
(function removeLegacyMessAdvance(){
 let changed=false;
 (data.members||[]).forEach(member=>{if(Object.prototype.hasOwnProperty.call(member,"advance")){delete member.advance;changed=true;}});
 if(Array.isArray(data.transactions)){const before=data.transactions.length;data.transactions=data.transactions.filter(tx=>String(tx.type||"").toLowerCase()!=="advance");if(data.transactions.length!==before)changed=true;}
 if(changed){try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){console.error("Mess Advance cleanup could not be saved",e);}}
})();
function read(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}}
function save(){
  try{
    localStorage.setItem(KEY,JSON.stringify(data));
    return true;
  }catch(e){
    showAppAlert("Data save nahi hua. Browser storage full ho sakta hai. Backup lekar photo/storage size kam karein.");
    console.error(e);
    return false;
  }
}
function arr(){
  if(!Array.isArray(data[cfg.key])) data[cfg.key]=[];
  const list=data[cfg.key];
  list.forEach((x,i)=>{if(x && !x.id)x.id="R"+Date.now()+"_"+i;});
  return list;
}
function isLowStock(x){
  const qty=Number.parseFloat(x.quantity ?? x.stock ?? 0) || 0;
  const min=Number.parseFloat(x.minimum ?? x.minStock ?? x.minimumStock ?? x.min ?? x.reorderLevel ?? 0) || 0;
  return qty<=0 || (min>0 && qty<=min);
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function money(v){return "Rs "+Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:2})}
function options(f){if(f[2]==="staff")return '<option value="">Select staff</option>'+((data.staff||[]).filter(x=>(x.status||"Active")==="Active").map(x=>'<option value="'+esc(x.name)+'">'+esc(x.name)+' — '+esc(x.duty||"Staff")+'</option>').join(""));if(f[2]==="item")return '<option value="">Choose item</option>'+((data.ration||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join(""));if(f[2]==="member")return '<option value="">Choose member</option>'+((data.members||[]).filter(x=>String(x.status||"Active").toLowerCase()==="active").map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' — '+esc(x.rank||"")+(x.forceNumber?" ("+esc(x.forceNumber)+")":"")+'</option>').join(""));if(f[2]==="recipe"){let recipes=data.recipes||[];return '<option value="">Choose recipe</option>'+recipes.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' ('+money(x.costPerServing)+'/serving)</option>').join("")}const labels={office_received:"Office se liya gaya paisa",cutting_collected:"Jawan se Mess Cutting mili",office_deposited:"Office mein paisa jama",expense:"Other expense",special_expense:"Special meal expense",surplus_spend:"Surplus se approved expense"};return f[4].split("|").map(x=>'<option value="'+esc(x)+'">'+esc(labels[x]||x)+'</option>').join("")}
function input(f,v=""){let [id,label,type,required]=f;let html=type==="select"||type==="item"||type==="member"||type==="recipe"||type==="staff"?'<select id="f_'+id+'" '+(required?"required":"")+'>'+options(f)+'</select>':'<input id="f_'+id+'" type="'+type+'" value="'+esc(v)+'" '+(required?"required":"")+' '+(type==="number"?'min="0" step="any"':"")+'>';return '<div class="field"><label>'+label+(required?" *":"")+'</label>'+html+'</div>'}
function renderSettings(){
 const s=data.settings&&typeof data.settings==="object"?data.settings:{};
 const panel=document.getElementById("tablePanel"),stats=document.getElementById("stats");
 if(stats)stats.style.display="none";
 if(!panel)return;
 panel.innerHTML='<div class="pagehead"><h3 style="margin:0 0 8px">Mess Details</h3><p class="muted">Mess ka naam aur currency yahan edit karein. Mess NCO aur Mess SO ka naam Mess Staff page se aayega.</p></div>'+
 '<div class="formgrid" style="max-width:760px">'+
 '<div class="field"><label for="settingMessName">Mess Name</label><input id="settingMessName" value="'+esc(s.messName||"A Coy (CRPF)")+'" placeholder="A Coy (CRPF)"></div>'+
 '<div class="field"><label for="settingCurrency">Currency</label><input id="settingCurrency" value="'+esc(s.currency||"Rs")+'" placeholder="Rs"></div>'+
 '<div class="field"><label for="settingMonthlyLimit">Monthly Mess Limit per Member (Rs)</label><input id="settingMonthlyLimit" type="number" min="0" step="1" value="'+esc(s.monthlyLimitPerMember??5000)+'" placeholder="5000"></div>'+
 '</div><div class="notice" style="margin-top:12px">Monthly limit ko yahan kabhi bhi badal sakte hain. Handover summary mein active members × yeh limit karke monthly total niklega. Purane mahino ka hisaab unki saved monthly setting se alag rakha jayega.</div>'+
 '<div style="display:flex;justify-content:flex-end;margin-top:18px"><button type="button" onclick="saveSettings()">Save Settings</button></div>'+
 '<div class="notice" style="margin-top:16px">Mess NCO / Mess SO badalne ke liye Mess Staff page par unka naam aur duty update karein. Dashboard par naam automatic update hoga.</div>';
}
function saveSettings(){
 const previous=data.settings&&typeof data.settings==="object"?data.settings:{};
 const monthlyLimitPerMember=Number(document.getElementById("settingMonthlyLimit").value);
 if(!Number.isFinite(monthlyLimitPerMember)||monthlyLimitPerMember<0){showAppAlert("Monthly Mess Limit sahi number mein dalein.");return;}
 data.settings={...previous,messName:document.getElementById("settingMessName").value.trim(),currency:document.getElementById("settingCurrency").value.trim()||"Rs",monthlyLimitPerMember};
 delete data.settings.messNco;delete data.settings.messNCO;delete data.settings.messSo;delete data.settings.messSO;
 if(!save())return;
 showAppAlert("Settings saved successfully.");
}
function render(){
  try{
    const pageIcons={store:"📦",purchases:"🛒",recipes:"🍲",menu:"📅",accounts:"💰",staff:"👨‍🍳",reports:"📊",handover:"🔄",settings:"⚙️"};
    document.getElementById("pageTitle").textContent=(pageIcons[document.body.dataset.module]||"🛡️")+" "+cfg.title;
    document.getElementById("pageSub").textContent=cfg.sub;
    const dateNow=document.getElementById("dateNow");if(dateNow)dateNow.textContent=new Date().toLocaleDateString();
    if(cfg.key==="settings"){renderSettings();return}
    if(cfg.key==="reports"){renderReports();return}
    let list=arr(),q=(document.getElementById("search")?.value||"").toLowerCase();
    if(cfg.key==="staff")list=list.filter(x=>!!x.memberId&&!!x.duty);
    let rows=list.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
    document.getElementById("rows").innerHTML=rows.map(x=>{
      const id=String(x.id||"").replace(/\\/g,"");
      const action=(cfg.key==="recipes"?'<button class="view-btn" type="button" onclick="viewRecipe(&quot;'+id+'&quot;)">View</button>':cfg.key==="staff"?'<button class="view-btn" type="button" onclick="viewStaff(&quot;'+id+'&quot;)">View</button>':"")+'<button class="alt" type="button" onclick="editRow(&quot;'+id+'&quot;)">Edit</button><button class="danger" type="button" onclick="deleteRow(&quot;'+id+'&quot;)">Delete</button>'+
        (cfg.key==="ration"&&isLowStock(x)?' <a class="btn" style="background:#d8f3e5;color:#075b37;border:1px solid #8fd3ae" href="purchases.html?item='+encodeURIComponent(x.id||x.name)+'">Purchase</a>':'');
      return '<tr>'+cfg.cols.map(k=>'<td>'+esc(k==="amount"||k==="total"||k==="rate"||k==="price"||k==="costPerServing"||k==="totalCost"?money(x[k]):x[k])+'</td>').join("")+'<td><div class="actions">'+action+'</div></td></tr>';
    }).join("");
    document.getElementById("empty").style.display=rows.length?"none":"block";
    document.getElementById("stats").innerHTML=statsHtml(list);
    if(cfg.key==="transactions")renderAccountOverview(list);
    if(cfg.key==="handovers")renderHandoverOverview(list);
  }catch(e){
    console.error("Page render error",e);
    const empty=document.getElementById("empty");
    if(empty){empty.style.display="block";empty.textContent="Page error: "+e.message+" — reload karke dobara try karein."}
  }
}
function statsHtml(list){
  if(cfg.key==="store"){
    let low=list.filter(isLowStock).length;
    return stat("Total Items",list.length)+stat("Low Stock",low)+stat("Stock Value",money(list.reduce((sum,item)=>sum+(Number(item.quantity??item.stock??0)||0)*(Number(item.price??item.unitPrice??0)||0),0)));
  }
  if(cfg.key==="purchases")return stat("Purchase Entries",list.length)+stat("Total Purchases",money(list.reduce((s,x)=>s+Number(x.total||x.amount||0),0)));
  if(cfg.key==="recipes")return stat("Recipes",list.length)+stat("Average Cost",money(list.length?list.reduce((s,x)=>s+Number(x.costPerServing||0),0)/list.length:0));
  if(cfg.key==="menu")return stat("Menu Dates",list.length);
  if(cfg.key==="accounts"){const meals=data.mealRecords||[];const autoCutting=meals.reduce((s,r)=>s+Number(r.chargePerMember||0)*(Array.isArray(r.memberIds)?r.memberIds.length:0),0);return stat("Entries",list.length)+stat("Mess Cutting (auto)",money(autoCutting))+stat("Expenses",money(list.filter(x=>["expense","special_expense"].includes(String(x.type||"").toLowerCase())).reduce((s,x)=>s+Number(x.amount||0),0)));}
  return stat("Records",list.length);
}
function stat(a,b){return '<div class="card"><small>'+a+'</small><strong>'+b+'</strong></div>'}
function showRationRequiredPopup(){
  if(document.getElementById("rationRequiredPopup"))return;
  const wrap=document.createElement("div");wrap.id="rationRequiredPopup";
  wrap.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:18px;z-index:9999";
  wrap.innerHTML='<section style="width:min(100%,390px);background:#0b3022;border:1px solid #287b52;border-radius:18px;padding:24px;text-align:center;box-shadow:0 18px 55px #0009;color:#fff"><div style="font-size:42px;margin-bottom:8px">📦</div><h2 style="color:#e5bb19;margin:0 0 10px">Ration Store khali hai!</h2><p style="color:#d5e8dd;line-height:1.55;margin:0 0 18px">Recipe banane se pehle Ration Store mein kam se kam ek ration item add karein. Item ka unit aur rate bhi bhar dein.</p><a href="ration-store.html" style="display:block;background:#00b94f;color:#062719;text-decoration:none;font-weight:700;padding:12px;border-radius:9px;margin-bottom:9px">＋ Ration Add Karein</a><button type="button" id="closeRationRequired" style="width:100%;background:#d8f3e5;color:#075b37;border:1px solid #8fd3ae;border-radius:9px;padding:11px;font-weight:700">Baad Mein</button></section>';
  document.body.appendChild(wrap);
  document.getElementById("closeRationRequired").addEventListener("click",()=>wrap.remove());
  wrap.addEventListener("click",e=>{if(e.target===wrap)wrap.remove()});
}
function openForm(id){if(cfg.key==="recipes"&&!(data.ration||[]).length){showRationRequiredPopup();return}if(cfg.key==="menu"&&!(data.recipes||[]).length){showAppAlert("Recipe nahi hai. Pehle Recipes page mein recipe aur cost per serving add karein, phir Making Menu banayein.");return}editId=id||null;let x=id?arr().find(a=>String(a.id)===String(id)):{};document.getElementById("formTitle").textContent=id?"Edit "+cfg.title:"Add "+cfg.title;document.getElementById("fields").innerHTML=cfg.fields.map(f=>input(f,x?.[f[0]]??"")).join("")+(cfg.key==="store"?'<div class="notice" style="grid-column:1/-1">Yeh sirf Ration Store ka item register hai — yahan purchase nahi hoti. Kharidari Purchases page par karein. Stock unit item ke stock aur recipe hisaab ke liye zaroori hai. Opening stock aur rate sirf tab bharein jab item ka pehle se stock maujood ho.</div>':"")+(cfg.key==="recipes"?recipeIngredientEditor(): "");cfg.fields.forEach(f=>{let el=document.getElementById("f_"+f[0]);if(el&&x?.[f[0]]!=null)el.value=x[f[0]]});if(cfg.key==="staff"&&!id){let d=document.getElementById("f_dutyDate");if(d){const now=new Date();d.value=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0")}}if(cfg.key==="recipes"){(x?.ingredients||[]).forEach(i=>addIngredientRow(i.itemId,i.quantity));if(!(x?.ingredients||[]).length)addIngredientRow();refreshRecipeCost()}document.getElementById("modal").hidden=false}
function recipeIngredientEditor(){return '<div class="field" style="grid-column:1/-1"><label>Ration Ingredients</label><div class="notice">Yahan Ration Store se item select karein. Quantity usi base unit mein dalein (g / ml / pcs). Rate aur ingredient cost automatic calculate hoga.</div><div id="ingredientRows"></div><button type="button" class="alt" onclick="addIngredientRow()">＋ Add Ingredient</button><div id="recipeCostPreview" style="margin-top:12px;font-weight:700"></div></div>'}
function recipeUnitFor(item){const u=String(item?.unit||"").toLowerCase();if(["kg","kgs","g","gram","grams"].includes(u))return "g";if(["ltr","l","litre","liter","ml"].includes(u))return "ml";return "pcs"}
function addIngredientRow(itemId="",quantity=""){
 let box=document.getElementById("ingredientRows");if(!box)return;
 let opts='<option value="">Select ration item</option>'+(data.ration||[]).map(i=>'<option value="'+esc(i.id)+'" '+(String(i.id)===String(itemId)?'selected':'')+'>'+esc(i.name)+' — '+recipeUnitFor(i)+' (Store '+esc(i.unit)+')</option>').join("");
 let row=document.createElement("div");row.className="ingredient-row";row.style.cssText="display:grid;grid-template-columns:minmax(130px,2fr) minmax(75px,1fr) minmax(120px,1fr) auto;gap:7px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)";
 row.innerHTML='<div><select class="ingredient-item" aria-label="Ration ingredient" onchange="refreshRecipeCost()">'+opts+'</select><small class="ingredient-rate muted" style="display:block;margin-top:4px">Rate: —</small></div><input class="ingredient-qty" type="number" min="0.001" step="any" placeholder="Qty in g / ml / pcs" value="'+esc(quantity)+'" oninput="refreshRecipeCost()"><strong class="ingredient-cost">Rs 0.00</strong><button type="button" class="danger" aria-label="Remove ingredient" onclick="this.parentElement.remove();refreshRecipeCost()">✕</button>';
 box.appendChild(row);refreshRecipeCost();
}
function refreshRecipeCost(){
 let total=0;
 document.querySelectorAll("#ingredientRows .ingredient-row").forEach(row=>{
  const item=(data.ration||[]).find(i=>String(i.id)===String(row.querySelector(".ingredient-item").value));
  const q=Number(row.querySelector(".ingredient-qty").value||0),unit=item?recipeUnitFor(item):"",stockQty=item&&q>0?purchaseInBase(q,unit,item.unit):null;
  const rate=Number(item?.price||0),cost=stockQty===null?0:stockQty*rate;total+=cost;
  const rateEl=row.querySelector(".ingredient-rate"),costEl=row.querySelector(".ingredient-cost");
  if(rateEl)rateEl.textContent=item?"Store rate: "+money(rate)+" / "+item.unit+" · Recipe unit: "+unit:"Rate: —";
  if(costEl)costEl.textContent=money(cost);
 });
 const p=document.getElementById("recipeCostPreview");if(p)p.textContent="Recipe cost (1 serving): "+money(total);
}
function collectRecipeIngredients(){
 let rows=[...document.querySelectorAll("#ingredientRows .ingredient-row")],out=[];
 for(const row of rows){
  const itemId=row.querySelector(".ingredient-item").value,q=Number(row.querySelector(".ingredient-qty").value||0);
  if(!itemId&&!q)continue;
  if(!itemId||q<=0){showAppAlert("Har ingredient ke liye ration item aur quantity dono select/enter karein.");return null}
  const item=(data.ration||[]).find(i=>String(i.id)===String(itemId));
  if(!item){showAppAlert("Selected ration item Store mein nahi mila. Dobara select karein.");return null}
  const unit=recipeUnitFor(item),stockQty=purchaseInBase(q,unit,item.unit);
  if(stockQty===null){showAppAlert("Unit conversion nahi ho sakta: "+item.name);return null}
  out.push({itemId,itemName:item.name,quantity:q,unit,stockUnit:item.unit,rate:Number(item.price||0),lineCost:stockQty*Number(item.price||0)});
 }
 return out;
}
function unitFactor(unit){
 const u=String(unit||"").toLowerCase();
 if(u==="g"||u==="gram"||u==="grams")return {kind:"weight",factor:1};
 if(u==="kg"||u==="kgs")return {kind:"weight",factor:1000};
 if(u==="ml")return {kind:"volume",factor:1};
 if(u==="ltr"||u==="l"||u==="litre"||u==="liter")return {kind:"volume",factor:1000};
 if(u==="pcs"||u==="pc"||u==="piece"||u==="pieces")return {kind:"count",factor:1};
 return null;
}
function purchaseInBase(quantity,purchaseUnit,baseUnit){
 const p=unitFactor(purchaseUnit),b=unitFactor(baseUnit);
 if(!p||!b||p.kind!==b.kind)return null;
 return Number(quantity)*p.factor/b.factor;
}
function refreshAllRecipeCosts(){
 (data.recipes||[]).forEach(recipe=>{
  let total=0;
  recipe.ingredients=(recipe.ingredients||[]).map(ingredient=>{
   const item=(data.ration||[]).find(x=>String(x.id)===String(ingredient.itemId));if(!item)return ingredient;
   const target=recipeUnitFor(item),from=ingredient.unit||item.unit,qty=purchaseInBase(Number(ingredient.quantity||0),from,target);
   const stockQty=qty===null?null:purchaseInBase(qty,target,item.unit),rate=Number(item.price||0),lineCost=stockQty===null?0:stockQty*rate;
   total+=lineCost;
   return {...ingredient,itemName:item.name,quantity:qty===null?ingredient.quantity:qty,unit:target,stockUnit:item.unit,rate,lineCost};
  });
  recipe.totalCost=total;recipe.costPerServing=total;
  recipe.ingredientSummary=recipe.ingredients.map(i=>i.itemName+" "+i.quantity+" "+i.unit).join(", ");
 });
}
function migrateRecipeUnits(){
 if(Number(data.recipeUnitVersion||0)>=1)return;
 (data.recipes||[]).forEach(recipe=>{
  recipe.ingredients=(recipe.ingredients||[]).map(ingredient=>{
   const item=(data.ration||[]).find(x=>String(x.id)===String(ingredient.itemId));if(!item)return ingredient;
   const target=recipeUnitFor(item),from=ingredient.unit||item.unit,qty=purchaseInBase(Number(ingredient.quantity||0),from,target);
   return qty===null?ingredient:{...ingredient,quantity:qty,unit:target,stockUnit:item.unit};
  });
 });
 data.recipeUnitVersion=1;refreshAllRecipeCosts();
 try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){console.error("Recipe unit migration could not be saved",e);}
}
function migrateRateUnits(){
 if(Number(data.rateUnitVersion||0)>=3)return;
 // Restore all g/ml item prices to the Store base unit rate (Rs per gram/ml).
 // Previous release incorrectly multiplied these rates by 1000.
 const purchasedIds=new Set((data.purchases||[]).map(p=>String(p.itemId)));
 (data.ration||[]).forEach(item=>{
  const u=String(item.unit||"").toLowerCase();
  if(purchasedIds.has(String(item.id))&&["g","gram","grams","ml"].includes(u)){
   item.price=Number(item.price||0)/1000;
  }
 });
 data.rateUnitVersion=3;
 try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){console.error("Rate migration could not be saved",e);}
 if(typeof refreshAllRecipeCosts==="function")refreshAllRecipeCosts();
}
function saveCurrentRecord(event){
 event.preventDefault();
 const values={};
 cfg.fields.forEach(field=>{
  const id=field[0],el=document.getElementById("f_"+id);
  if(el)values[id]=el.type==="number"?Number(el.value||0):el.value.trim();
 });
 if(cfg.key==="settings"){saveSettings();return}
 if(cfg.key==="transactions"&&values.type==="surplus_spend"&&!String(values.approvedBy||"").trim()){showAppAlert("Surplus se kharch ke liye approval / receipt reference zaroor bharein.");return}
 if(cfg.key==="staff"){
  const member=(data.members||[]).find(x=>String(x.id)===String(values.memberId));
  if(!member){showAppAlert("Members list se member select karein.");return}
  const old=arr().find(x=>String(x.id)===String(editId))||{};
  const duplicate=arr().find(x=>String(x.memberId)===String(member.id)&&String(x.id)!==String(editId));
  if(duplicate){showAppAlert("Yeh member Mess Staff mein pehle se hai. Usi record ko Edit karke duty badlein.");return}
  const record={...old,memberId:member.id,name:member.name||"",rank:member.rank||"",phone:member.contact||member.mobile||member.phone||"",status:member.status||"Active",duty:values.duty,dutyDate:values.dutyDate,id:editId||("ST"+Date.now())};
  const list=arr(),index=list.findIndex(x=>String(x.id)===String(record.id));
  if(index>=0)list[index]=record;else list.push(record);
  if(!save())return;
  closeForm();render();showAppAlert("Member duty assigned successfully.");return;
 }
 if(cfg.key==="recipes"){
  const ingredients=collectRecipeIngredients();
  if(!ingredients)return;
  if(!ingredients.length){showAppAlert("Recipe mein kam se kam ek ration ingredient add karein.");return}
  const total=ingredients.reduce((sum,i)=>sum+Number(i.lineCost||0),0);
  const old=arr().find(x=>String(x.id)===String(editId))||{};
  const record={...old,...values,id:editId||("RC"+Date.now()),ingredients,totalCost:total,costPerServing:total,ingredientSummary:ingredients.map(i=>i.itemName+" "+i.quantity+" "+i.unit).join(", ")};
  const list=arr(),index=list.findIndex(x=>String(x.id)===String(record.id));
  if(index>=0)list[index]=record;else list.push(record);
 }else if(cfg.key==="purchases"){
  const item=(data.ration||[]).find(x=>String(x.id)===String(values.itemId));
  if(!item){showAppAlert("Ration Store item select karein.");return}
  if(!values.quantity||values.quantity<=0||!Number.isFinite(values.rate)||values.rate<0){showAppAlert("Purchase quantity aur rate sahi enter karein.");return}
  const baseQty=purchaseInBase(values.quantity,values.unit,item.unit);
  if(baseQty===null){const u=String(item.unit||"").toLowerCase();const compatible=(u==="g"||u==="kg")?"kg ya g":(u==="ml"||u==="ltr"||u==="l"||u==="litre"||u==="liter")?"litre ya ml":"pcs";showAppAlert("Invalid purchase unit: "+item.name+" ka Store unit "+item.unit+" hai. Is item ke liye "+compatible+" select karein.");return}
  const total=values.quantity*values.rate;
  const old=arr().find(x=>String(x.id)===String(editId));
  const currentStock=Number(item.quantity||0),currentValue=currentStock*Number(item.price||0);
  const oldBaseRaw=old?(old.baseQuantity??purchaseInBase(old.quantity,old.unit,item.unit)):0;
  if(old&&(oldBaseRaw===null||!Number.isFinite(Number(oldBaseRaw)))){showAppAlert("Purane purchase unit ka conversion available nahi hai. Is record ko safely edit nahi kar sakte.");return}
  const oldBase=Number(oldBaseRaw||0);
  const oldTotal=old?Number(old.total??(Number(old.quantity||0)*Number(old.rate||0))):0;
  const deltaQty=baseQty-oldBase,deltaValue=total-oldTotal;
  const newStock=currentStock+deltaQty,newValue=currentValue+deltaValue;
  if(newStock< -1e-9){showAppAlert("Purchase edit se stock negative ho jayega. Pehle stock balance check karein.");return}
  item.quantity=Math.max(0,newStock);
  item.price=item.quantity>0?Math.max(0,newValue)/item.quantity:0;
  const record={...(old||{}),...values,id:editId||("PU"+Date.now()),itemName:item.name,total,baseQuantity:baseQty,baseRate:total/baseQty};
  const list=arr(),index=list.findIndex(x=>String(x.id)===String(record.id));
  if(index>=0)list[index]=record;else list.push(record);
  refreshAllRecipeCosts();
 }else if(cfg.key==="menu"){
  const recipe=(data.recipes||[]).find(x=>String(x.id)===String(values.recipeId));
  if(!recipe){showAppAlert("Recipe select karein.");return}
  const servings=Number(values.servings||0);
  if(servings<=0){showAppAlert("Servings 1 ya usse zyada honi chahiye.");return}
  const old=arr().find(x=>String(x.id)===String(editId))||{};
  const record={...old,...values,id:editId||("MN"+Date.now()),recipeName:recipe.name,costPerServing:Number(recipe.costPerServing||0),totalCost:Number(recipe.costPerServing||0)*servings};
  const list=arr(),index=list.findIndex(x=>String(x.id)===String(record.id));
  if(index>=0)list[index]=record;else list.push(record);
 }else{
  const list=arr(),old=list.find(x=>String(x.id)===String(editId))||{};
  const record={...old,...values,id:editId||("R"+Date.now())};
  if(cfg.key==="handovers"){record.monthlySummary=buildMonthlyMessSummary(values.date||new Date().toISOString().slice(0,10));record.stockSnapshot=(data.ration||[]).map(x=>({itemName:x.name,quantity:Number(x.quantity||0),unit:x.unit,estimatedValue:Number(x.quantity||0)*Number(x.price||0)}));}
  if(cfg.key==="ration"){
   record.quantity=Number(values.quantity||0);record.minimum=Number(values.minimum||0);record.price=Number(values.price||0);
  }
  const index=list.findIndex(x=>String(x.id)===String(record.id));
  if(index>=0)list[index]=record;else list.push(record);
  if(cfg.key==="ration")refreshAllRecipeCosts();
 }
 if(!save())return;
 closeForm();
 render();
 showAppAlert((editId?"Record updated successfully.":"Record saved successfully."));
}

function closeForm(){document.getElementById("modal").hidden=true}
function viewStaff(id){
 const x=(data.staff||[]).find(a=>String(a.id)===String(id));if(!x)return;
 const member=(data.members||[]).find(a=>String(a.id)===String(x.memberId));
 const old=document.getElementById("staffViewModal");if(old)old.remove();
 const wrap=document.createElement("div");wrap.id="staffViewModal";wrap.style.cssText="position:fixed;inset:0;z-index:10020;background:#000b;display:flex;align-items:center;justify-content:center;padding:16px";
 wrap.innerHTML='<section style="width:min(100%,440px);background:#fff;color:#214d3b;border-radius:16px;padding:20px;max-height:85vh;overflow:auto"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Mess Duty Details</h3><button type="button" class="alt" id="closeStaffView">✕</button></div><div style="margin-top:16px;line-height:2"><b>Member:</b> '+esc(x.name||member?.name||"—")+'<br><b>Force Number:</b> '+esc(member?.forceNumber||"—")+'<br><b>Rank:</b> '+esc(x.rank||member?.rank||"—")+'<br><b>Mess Duty:</b> '+esc(x.duty||"—")+'<br><b>Duty Start Date:</b> '+esc(x.dutyDate||"—")+'<br><b>Mobile:</b> '+esc(x.phone||member?.contact||member?.mobile||"—")+'<br><b>Member Status:</b> '+esc(member?.status||x.status||"—")+'</div><div style="display:flex;justify-content:flex-end;margin-top:16px"><button type="button" id="closeStaffView2">Close</button></div></section>';
 document.body.appendChild(wrap);const close=()=>wrap.remove();wrap.querySelector("#closeStaffView").onclick=close;wrap.querySelector("#closeStaffView2").onclick=close;wrap.onclick=e=>{if(e.target===wrap)close()};
}
function editRow(id){openForm(id)}
function showDeleteConfirm(onConfirm){
 const old=document.getElementById("deleteConfirmModal");
 if(old)old.remove();
 const wrap=document.createElement("div");
 wrap.id="deleteConfirmModal";
 wrap.style.cssText="position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:18px";
 wrap.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="deleteConfirmTitle" style="width:min(100%,380px);background:#0b3022;border:1px solid #287b52;border-radius:18px;padding:23px 20px;text-align:center;box-shadow:0 18px 55px #0009;color:#fff"><div style="width:58px;height:58px;margin:0 auto 12px;border-radius:50%;display:grid;place-items:center;background:#51252a;color:#ffb5b5;font-size:29px">🗑️</div><h2 id="deleteConfirmTitle" style="font-size:20px;color:#fff;margin:0 0 10px">Confirm Delete</h2><p style="font-size:15px;line-height:1.5;color:#d5e8dd;margin:0 0 20px">Are you really sure you want to delete this item?</p><div style="display:flex;gap:10px"><button type="button" id="deleteCancel" style="flex:1;background:#d8f3e5;color:#075b37;border:1px solid #8fd3ae;border-radius:10px;padding:12px 8px;font-weight:700;font-size:14px">Cancel</button><button type="button" id="deleteConfirm" style="flex:1;background:#c93643;color:#fff;border:1px solid #ed6670;border-radius:10px;padding:12px 8px;font-weight:700;font-size:14px">Yes, Delete</button></div></section>';
 document.body.appendChild(wrap);
 const close=()=>{document.removeEventListener("keydown",keyHandler);wrap.remove()};
 const keyHandler=e=>{if(e.key==="Escape")close()};
 document.addEventListener("keydown",keyHandler);
 wrap.querySelector("#deleteCancel").addEventListener("click",close);
 wrap.querySelector("#deleteConfirm").addEventListener("click",()=>{close();onConfirm()});
 wrap.addEventListener("click",e=>{if(e.target===wrap)close()});
}
function reversePurchase(purchase){
 const item=(data.ration||[]).find(x=>String(x.id)===String(purchase.itemId));
 if(!item){showAppAlert("Purchase ka ration item Store mein nahi mila; stock change nahi kiya.");return false}
 const baseRaw=purchase.baseQuantity??purchaseInBase(purchase.quantity,purchase.unit,item.unit);
 if(baseRaw===null||!Number.isFinite(Number(baseRaw))){showAppAlert("Purchase unit conversion available nahi hai; stock change nahi kiya.");return false}
 const qty=Number(baseRaw),total=Number(purchase.total??(Number(purchase.quantity||0)*Number(purchase.rate||0)));
 const stock=Number(item.quantity||0),value=stock*Number(item.price||0);
 if(stock+1e-9<qty){showAppAlert("Is purchase ka kuch stock use ho chuka hai. Safe stock adjustment possible nahi; delete cancel kiya.");return false}
 const next=stock-qty,nextValue=value-total;
 item.quantity=Math.max(0,next);
 item.price=item.quantity>0?Math.max(0,nextValue)/item.quantity:0;
 refreshAllRecipeCosts();
 return true;
}
function resetPurchaseAndStock(){
 if(cfg.key!=="purchases"){showAppAlert("Yeh option sirf Purchases page ke liye hai.");return}
 const purchaseCount=(data.purchases||[]).length,stockCount=(data.ration||[]).length;
 const ok=confirm("FINAL CONFIRMATION\n\nSirf Purchases aur current Ration Stock reset honge.\n\n• "+purchaseCount+" purchase records delete\n• "+stockCount+" ration items ka stock 0 aur rate 0\n• Stock movement history clear\n\nMembers, Recipes, Meals, Accounts aur Ration item names/units safe rahenge.\n\nKya aapne backup bana liya hai aur reset karna chahte hain?");
 if(!ok)return;
 const old=JSON.stringify(data);
 try{
  data.purchases=[];data.stockMovements=[];
  (data.ration||[]).forEach(item=>{item.quantity=0;item.price=0});
  refreshAllRecipeCosts();
  if(!save())throw new Error("Data save nahi hua");
  render();
  showAppAlert("Purchase aur Ration Stock reset ho gaya. Members, Recipes, Meals aur Accounts safe hain. Ab fresh purchase entry kar sakte hain.");
 }catch(e){
  try{const restored=JSON.parse(old);Object.keys(data).forEach(k=>delete data[k]);Object.assign(data,restored);save()}catch(rollbackError){console.error("Reset rollback failed",rollbackError)}
  showAppAlert("Reset save nahi hua. Page refresh karke backup verify karein.");
 }
}
function clearPurchaseHistory(){
 if(cfg.key!=="purchases"){showAppAlert("Yeh option sirf Purchases page ke liye hai.");return}
 const count=arr().length;
 if(!count){showAppAlert("Purchase History pehle se khaali hai.");return}
 showDeleteConfirm(()=>{
  data.purchases=[];
  if(!save())return;
  render();
  showAppAlert(count+" purchase records cleared. Ration Store ka current stock aur rate nahi badla.");
 });
}
function deleteRow(id){
 let x=arr().find(a=>a.id===id);
 if(!x)return;
 showDeleteConfirm(()=>{
  if(cfg.key==="purchases"&&!reversePurchase(x))return;
  arr().splice(arr().findIndex(a=>a.id===id),1);
  if(!save())return;
  render();
  showAppAlert((cfg.title||"Record")+" deleted successfully.");
 });
}
function viewRecipe(id){
 const r=(data.recipes||[]).find(x=>String(x.id)===String(id));if(!r)return;
 let old=document.getElementById("recipeViewModal");if(old)old.remove();
 const rows=(r.ingredients||[]).map(i=>'<tr><td>'+esc(i.itemName)+'</td><td>'+esc(i.quantity)+' '+esc(i.unit)+'</td><td>'+money(i.rate)+' / '+esc(i.unit)+'</td><td>'+money(i.lineCost)+'</td></tr>').join("");
 const modal=document.createElement("div");modal.id="recipeViewModal";modal.className="view-overlay";
 modal.innerHTML='<section class="view-card"><div class="view-head"><div><small>RECIPE DETAILS · 1 SERVING</small><h2>'+esc(r.name)+'</h2></div><button type="button" class="alt" onclick="document.getElementById(\'recipeViewModal\').remove()">✕</button></div><div class="view-cost"><small>Cost per serving</small><strong>'+money(r.costPerServing||r.totalCost)+'</strong></div><h3>Ingredients</h3><div class="tablewrap"><table><thead><tr><th>Ration Item</th><th>Quantity</th><th>Rate</th><th>Cost</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="muted">'+esc(r.notes||"No extra notes")+'</p><button type="button" onclick="document.getElementById(\'recipeViewModal\').remove()">Close</button></section>';
 document.body.appendChild(modal);modal.addEventListener("click",e=>{if(e.target===modal)modal.remove()});
}
function renderReports(){
 const fresh=read();data=fresh&&typeof fresh==="object"?fresh:{};
 const groups=[
  ["All Mess Records","📚","__all__"],
  ["Members","👥","members"],["Ration Store","📦","ration"],
  ["Purchases","🛒","purchases"],["Recipes","🍲","recipes"],
  ["Making Menu","📅","menu"],["Meal Records","🍽️","mealRecords"],
  ["Accounts & Payments","💰","transactions"],["Mess Staff","👨‍🍳","staff"],
  ["Mess Handover","🔄","handovers"],["Stock Movements","📦","stockMovements"]
 ];
 const keys=groups.slice(1).map(g=>g[2]);
 const total=keys.reduce((n,k)=>n+(Array.isArray(data[k])?data[k].length:0),0);
 const panel=document.getElementById("tablePanel");
 const stats=document.getElementById("stats");
 if(stats)stats.style.display="grid";
 if(stats)stats.innerHTML=stat("Total Saved Records",total)+stat("Members",(data.members||[]).length)+stat("Mess Staff",(data.staff||[]).length)+stat("Meal Records",(data.mealRecords||[]).length);
 if(!panel)return;
 panel.innerHTML='<div style="padding:4px 0 14px"><h3 style="margin:0 0 5px">📊 Reports & Records</h3><p class="muted" style="margin:0">Kisi bhi card par click karein. Record ki poori details tabhi khulengi.</p></div><div class="cards reports-cards">'+groups.map(([label,icon,key])=>{
  const count=key==="__all__"?total:(Array.isArray(data[key])?data[key].length:0);
  return '<button type="button" class="card record-link" data-record-key="'+key+'" style="text-align:left;cursor:pointer;min-height:112px"><small>'+icon+' '+esc(label)+'</small><strong style="display:block;font-size:27px;margin:8px 0">'+count+'</strong><small style="color:#176747;font-weight:700">Click to view details →</small></button>';
 }).join("")+'</div><div class="empty" style="display:block;margin-top:14px">Abhi koi record open nahi hai. Details dekhne ke liye upar kisi card par click karein.</div>';
 panel.querySelectorAll(".record-link").forEach(card=>card.addEventListener("click",()=>{
  const key=card.dataset.recordKey;
  const current=read();data=current&&typeof current==="object"?current:{};
  if(key==="__all__")showAllRecordCategories();
  else showRecordCategory(key,groups.find(g=>g[2]===key)?.[0]||key,groups.find(g=>g[2]===key)?.[1]||"📄");
 }));
}
function reportFieldLabel(k){return String(k).replace(/([A-Z])/g," $1").replace(/[_-]/g," ").replace(/^./,c=>c.toUpperCase())}
function reportValue(v){
 if(v===null||v===undefined||v==="")return "—";
 if(typeof v==="boolean")return v?"Yes":"No";
 if(typeof v!=="object")return String(v);
 return "";
}
function reportNested(value){
 if(Array.isArray(value)){
  if(!value.length)return '<span class="muted">None</span>';
  if(value.every(v=>v===null||typeof v!=="object"))return '<div style="display:flex;flex-wrap:wrap;gap:6px">'+value.map(v=>'<span style="background:#eaf3ee;border:1px solid #d5e5db;border-radius:7px;padding:5px 8px;font-size:12px">'+esc(reportValue(v))+'</span>').join("")+'</div>';
  if(value.every(v=>v&&typeof v==="object"&&!Array.isArray(v))){
   return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">'+value.map((row,i)=>{
    const entries=Object.entries(row).filter(([k,v])=>!["id","createdAt","updatedAt"].includes(k)&&v!==""&&v!==null&&v!==undefined);
    const heading=row.itemName||row.name||row.ingredientName||("Ingredient "+(i+1));
    return '<div style="border:1px solid #d5e5db;border-radius:9px;padding:9px;background:#f7faf8;min-width:0"><b style="display:block;margin-bottom:5px;overflow-wrap:anywhere">'+esc(heading)+'</b>'+entries.filter(([k])=>!["itemName","name","ingredientName"].includes(k)).map(([k,v])=>'<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-top:1px solid #e6eee8;font-size:12px"><span style="color:#63766b">'+esc(reportFieldLabel(k))+'</span><b style="text-align:right;overflow-wrap:anywhere">'+esc(reportValue(v))+'</b></div>').join("")+'</div>';
   }).join("")+'</div>';
  }
  return '<div style="display:grid;gap:6px">'+value.map(v=>'<div style="padding:7px;background:#f4f8f5;border-radius:7px">'+(v&&typeof v==="object"?reportNested(v):esc(reportValue(v)))+'</div>').join("")+'</div>';
 }
 if(value&&typeof value==="object")return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px">'+Object.entries(value).filter(([k])=>!["id","createdAt","updatedAt"].includes(k)).map(([k,v])=>'<div style="padding:7px;background:#f4f8f5;border-radius:7px;min-width:0"><small style="display:block;color:#66786d">'+esc(reportFieldLabel(k))+'</small><b style="font-size:12px;overflow-wrap:anywhere">'+(v&&typeof v==="object"?reportNested(v):esc(reportValue(v)))+'</b></div>').join("")+'</div>';
 return esc(reportValue(value));
}
function reportRecordCard(x,index,label,icon){
 const name=x.name||x.itemName||x.recipeName||x.description||x.details||x.mealType||x.type||label;
 const photo=x.photo||x.photoData||x.image||"";
 const moneyFields=["totalCost","costPerServing","lineCost","rate","amount","total","price"];
 const skip=["id","photo","photoData","image","createdAt","updatedAt"];
 const fields=Object.entries(x).filter(([k,v])=>!skip.includes(k)&&v!==""&&v!==null&&v!==undefined).map(([k,v])=>{
  let content;
  if(moneyFields.includes(k)&&typeof v==="number")content=esc("Rs "+v.toFixed(2));
  else if(k==="ingredients"||k==="ingredientList")content=reportNested(v);
  else content=reportNested(v);
  return '<section style="padding:10px 0;border-bottom:1px solid #e4ebe6;min-width:0;grid-column:'+(k==="ingredients"||k==="ingredientList"?"1 / -1":"auto")+'"><small style="display:block;color:#63766b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px">'+esc(reportFieldLabel(k))+'</small><div style="overflow-wrap:anywhere">'+content+'</div></section>';
 }).join("");
 const image=photo?'<img src="'+esc(photo)+'" alt="Saved photo" style="width:88px;height:88px;object-fit:cover;border-radius:12px;border:1px solid #d5e5db;margin:8px 12px 8px 0">':"";
 return '<article style="border:1px solid #d5e5db;border-radius:12px;padding:13px;margin:10px 0;background:#fff;color:#214d3b;box-shadow:0 2px 8px #173e2510"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:11px;color:#63766b">'+icon+' '+esc(label)+' · Record '+(index+1)+'</span><b style="font-size:16px;display:block;width:100%">'+esc(name)+'</b></div><div style="display:flex;align-items:flex-start;flex-wrap:wrap">'+image+'<div style="flex:1;min-width:220px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));column-gap:14px">'+(fields||'<p class="muted">No extra details saved.</p>')+'</div></div></article>';
}

function showAllRecordCategories(){
 const groups=[["Members","👥","members"],["Ration Store","📦","ration"],["Purchases","🛒","purchases"],["Recipes","🍲","recipes"],["Making Menu","📅","menu"],["Meal Records","🍽️","mealRecords"],["Accounts & Payments","💰","transactions"],["Mess Staff","👨‍🍳","staff"],["Mess Handover","🔄","handovers"],["Stock Movements","📦","stockMovements"]];
 const fresh=read();data=fresh&&typeof fresh==="object"?fresh:{};
 const all=groups.flatMap(([label,icon,key])=>(Array.isArray(data[key])?data[key]:[]).map(record=>({label,icon,key,record})));
 const old=document.getElementById("recordCategoryPopup");if(old)old.remove();
 const wrap=document.createElement("div");wrap.id="recordCategoryPopup";
 wrap.style.cssText="position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:12px";
 const rows=all.map((entry,i)=>reportRecordCard(entry.record,i,entry.label,entry.icon)).join("");
 wrap.innerHTML='<section role="dialog" aria-modal="true" style="width:min(100%,950px);max-height:90vh;overflow:auto;background:#f4f8f5;color:#214d3b;border-radius:16px;padding:15px"><div style="position:sticky;top:-15px;background:#f4f8f5;display:flex;justify-content:space-between;align-items:center;padding:5px 0 12px;z-index:1"><h2 style="margin:0">📚 All Mess Records — '+all.length+'</h2><button type="button" id="closeAllRecords" class="alt">✕ Close</button></div>'+(rows||'<p class="empty">Abhi koi saved record nahi hai.</p>')+'</section>';
 document.body.appendChild(wrap);const close=()=>wrap.remove();wrap.querySelector("#closeAllRecords").onclick=close;wrap.onclick=e=>{if(e.target===wrap)close()};
}
function showRecordCategory(key,label,icon){
 const fresh=read();data=fresh&&typeof fresh==="object"?fresh:{};
 const sources={members:data.members||[],ration:data.ration||[],purchases:data.purchases||[],recipes:data.recipes||[],menu:data.menu||[],mealRecords:data.mealRecords||[],transactions:data.transactions||[],staff:data.staff||[],handovers:data.handovers||[],stockMovements:data.stockMovements||[]};
 const list=Array.isArray(sources[key])?sources[key]:[];
 const old=document.getElementById("recordCategoryPopup");if(old)old.remove();
 const wrap=document.createElement("div");wrap.id="recordCategoryPopup";
 wrap.style.cssText="position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:12px";
 const cards=list.map((x,index)=>reportRecordCard(x,index,label,icon)).join("");
 wrap.innerHTML='<section role="dialog" aria-modal="true" style="width:min(100%,950px);max-height:90vh;overflow:auto;background:#f4f8f5;color:#214d3b;border-radius:16px;padding:15px"><div style="position:sticky;top:-15px;background:#f4f8f5;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:5px 0 12px;z-index:1"><h2 style="margin:0;font-size:19px">'+icon+' '+esc(label)+' — '+list.length+' Records</h2><button type="button" id="closeRecordCategory" class="alt">✕ Close</button></div>'+(list.length?cards:'<div class="empty" style="display:block;padding:25px;text-align:center">Is section ka abhi koi record save nahi hai.</div>')+'</section>';
 document.body.appendChild(wrap);const close=()=>wrap.remove();wrap.querySelector("#closeRecordCategory").onclick=close;wrap.onclick=e=>{if(e.target===wrap)close()};
}


function renderAccountOverview(list){
 const meals=Array.isArray(data.mealRecords)?data.mealRecords:[];
 const members=Array.isArray(data.members)?data.members:[];
 const purchases=Array.isArray(data.purchases)?data.purchases:[];
 const tx=Array.isArray(data.transactions)?data.transactions:list;
 const num=v=>{const n=Number(String(v??0).replace(/,/g,""));return Number.isFinite(n)?n:0};
 const month=new Date().toISOString().slice(0,7);
 const inMonth=x=>String(x.date||"").slice(0,7)===month;
 const monthlyTx=tx.filter(inMonth),monthlyPurchases=purchases.filter(inMonth);
 const activeMembers=members.filter(m=>!m.status||String(m.status).toLowerCase()==="active");
 const limitPerMember=num(data.settings?.monthlyLimitPerMember??5000);
 const monthlyLimit=activeMembers.length*limitPerMember;
 const sumType=(types)=>monthlyTx.filter(x=>types.includes(String(x.type||"").toLowerCase())).reduce((s,x)=>s+num(x.amount),0);
 const officeReceived=sumType(["office_received"]);
 const cuttingCollected=meals.filter(inMonth).reduce((s,r)=>s+num(r.chargePerMember)*(Array.isArray(r.memberIds)?r.memberIds.length:0),0);
 const officeDeposited=sumType(["office_deposited"]);
 const cuttingRemaining=Math.max(0,cuttingCollected-officeDeposited);
 const otherExpenses=sumType(["expense","special_expense","surplus_spend"]);
 const purchaseTotal=monthlyPurchases.reduce((s,x)=>s+num(x.total??(num(x.quantity)*num(x.rate))),0);
 const expenseTotal=otherExpenses;
 const actualSpend=purchaseTotal+expenseTotal;
 const surplus=monthlyLimit-actualSpend;
 const mealTotal=meals.filter(inMonth).reduce((s,x)=>s+num(x.totalCost??x.cost),0);
 const memberRows=members.map(m=>{
  const id=String(m.id);
  const memberMeals=meals.filter(r=>inMonth(r)&&(r.memberIds||[]).map(String).includes(id));
  const bill=memberMeals.reduce((s,r)=>s+num(r.chargePerMember),0);
  const memberTx=tx.filter(t=>String(t.memberId)===id&&["collection","cutting_collected"].includes(String(t.type||"").toLowerCase()));
  const paid=memberTx.reduce((s,t)=>s+num(t.amount),0);
  return {name:m.name||"—",force:m.forceNo||m.forceNumber||"",bill,paid,due:Math.max(0,bill-paid),credit:Math.max(0,paid-bill)};
 });
 const labels={office_received:"Office se paisa mila",cutting_collected:"Jawan se Mess Cutting mili",office_deposited:"Office mein paisa jama",expense:"Other expense",special_expense:"Special meal expense",surplus_spend:"Surplus se approved expense",collection:"Mess Cutting (old record)"};
 const purchaseRows=monthlyPurchases.slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).map(p=>'<tr><td>'+esc(p.date||"—")+'</td><td>'+esc(p.bill||"—")+'</td><td>'+esc(p.itemName||"—")+'</td><td>'+esc(p.vendor||"—")+'</td><td>'+esc(p.quantity??"—")+' '+esc(p.unit||"")+'</td><td>'+money(p.total??(num(p.quantity)*num(p.rate)))+'</td></tr>').join("");
 const memberTable=memberRows.map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.force||"—")+'</td><td>'+money(m.bill)+'</td><td>'+money(m.paid)+'</td><td>'+money(m.due)+'</td><td>'+money(m.credit)+'</td></tr>').join("");
 const txRows=monthlyTx.slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))).map(t=>'<tr><td>'+esc(t.date||"—")+'</td><td>'+esc(labels[t.type]||t.type||"—")+'</td><td>'+esc(t.memberName||(members.find(m=>String(m.id)===String(t.memberId))||{}).name||"—")+'</td><td>'+esc(t.description||"—")+'</td><td>'+esc(t.approvedBy||"—")+'</td><td>'+money(t.amount)+'</td></tr>').join("");
 const surplusColor=surplus>=0?"#b9f5cf":"#ffb5b5";
 let box=document.getElementById("accountOverview");
 if(!box){box=document.createElement("section");box.id="accountOverview";box.className="account-auto-overview";document.getElementById("pageSub").after(box);}
 box.innerHTML='<section class="cards">'+stat("Monthly Limit · "+activeMembers.length+" × "+money(limitPerMember),money(monthlyLimit))+stat("Office se mila",money(officeReceived))+stat("Mess Cutting (auto)",money(cuttingCollected))+stat("Office mein jama",money(officeDeposited))+stat("Bacha Cutting paisa",money(cuttingRemaining))+stat("Monthly ration bills",money(purchaseTotal))+stat("Actual other expenses",money(expenseTotal))+'</section>'+
 '<section class="panel" style="margin-top:14px"><h3>🧮 Monthly Account Reconciliation · '+esc(month)+'</h3><div class="tablewrap"><table><tbody>'+
 '<tr><th>Active members × Settings monthly limit</th><td>'+money(monthlyLimit)+'</td></tr>'+
 '<tr><th>Ration purchase bills this month</th><td>'+money(purchaseTotal)+'</td></tr>'+
 '<tr><th>Other + special + approved surplus expenses</th><td>'+money(expenseTotal)+'</td></tr>'+
 '<tr><th>Total actual expenditure</th><td><b>'+money(actualSpend)+'</b></td></tr>'+
 '<tr><th>Surplus / (Limit se adhik kharch)</th><td><b style="color:'+surplusColor+'">'+(surplus<0?"Extra expenditure ":"Surplus ")+money(Math.abs(surplus))+'</b></td></tr>'+
 '</tbody></table></div><p class="notice">Surplus alag record hai. Isse cash balance na samjhein. Surplus se kharch karne ke liye Add New mein “Surplus se approved expense” chunein aur Approval / receipt reference zaroor bharein. Yeh monthly limit-based calculation hai; opening ration stock ka value handover mein alag record hoga.</p></section>'+
 '<section class="panel" style="margin-top:14px"><h3>🏦 Cash Movement · Office / Mess Cutting</h3><div class="tablewrap"><table><tbody>'+
 '<tr><th>Office se cash mila</th><td>'+money(officeReceived)+'</td></tr><tr><th>Jawanon se Mess Cutting (meal charges se automatic)</th><td>'+money(cuttingCollected)+'</td></tr><tr><th>Office mein wapas jama (manual entry)</th><td>'+money(officeDeposited)+'</td></tr>'+
 '<tr><th>Jama ke baad bacha Cutting paisa</th><td><b>'+money(cuttingRemaining)+'</b></td></tr><tr><th>Cash movement ka net (purchases/expenses se pehle)</th><td><b>'+money(officeReceived+cuttingRemaining)+'</b></td></tr></tbody></table></div><p class="muted">Har receipt aur office deposit ko alag transaction ke roop mein enter karein. Is net figure ko actual cash-in-hand tabhi maanें jab saare cash receipts/payments record ho chuke hon.</p></section>'+
 '<section class="panel" style="margin-top:14px"><h3>🧾 Ration Purchase Bills · Current month</h3><div class="tablewrap"><table><thead><tr><th>Date</th><th>Bill No.</th><th>Item</th><th>Supplier</th><th>Quantity</th><th>Amount</th></tr></thead><tbody>'+(purchaseRows||'<tr><td colspan="6">No purchase bills recorded this month.</td></tr>')+'</tbody></table></div></section>'+
 '<section class="panel" style="margin-top:14px"><h3>📒 Office / Collection / Expense Entries</h3><div class="tablewrap"><table><thead><tr><th>Date</th><th>Type</th><th>Member</th><th>Details</th><th>Approval / Ref.</th><th>Amount</th></tr></thead><tbody>'+(txRows||'<tr><td colspan="6">No entries this month.</td></tr>')+'</tbody></table></div></section>'+
 '<section class="panel" style="margin-top:14px"><h3>👥 Member Account Balance · Existing records</h3><div class="tablewrap"><table><thead><tr><th>Member</th><th>Force No.</th><th>Meal Bill</th><th>Advance / Paid</th><th>Due</th><th>Credit</th></tr></thead><tbody>'+(memberTable||'<tr><td colspan="6">No members available.</td></tr>')+'</tbody></table></div></section>'+
 '<p class="muted">Month calculation currently shows this calendar month. Previous saved transactions are not changed. Legacy collection/advance entries remain visible as old entries and are not automatically reclassified.</p>';
}
function buildMonthlyMessSummary(dateValue){
 const month=String(dateValue||new Date().toISOString().slice(0,10)).slice(0,7);
 const members=(data.members||[]).filter(m=>!m.status||String(m.status).toLowerCase()==="active");
 const limitPerMember=Number(data.settings?.monthlyLimitPerMember??5000)||0;
 const monthlyLimit=members.length*limitPerMember;
 const inMonth=x=>String(x.date||"").slice(0,7)===month;
 const purchases=(data.purchases||[]).filter(inMonth);
 const tx=(data.transactions||[]).filter(inMonth);
 const purchaseTotal=purchases.reduce((s,x)=>s+Number(x.total??(Number(x.quantity||0)*Number(x.rate||0))),0);
 const expenseTotal=tx.filter(x=>["expense","special_expense","surplus_spend"].includes(String(x.type||"").toLowerCase())).reduce((s,x)=>s+Number(x.amount||0),0);
 const officeReceived=tx.filter(x=>x.type==="office_received").reduce((s,x)=>s+Number(x.amount||0),0);
 const meals=(data.mealRecords||[]).filter(inMonth);
 const cuttingCollected=meals.reduce((s,r)=>s+Number(r.chargePerMember||0)*(Array.isArray(r.memberIds)?r.memberIds.length:0),0);
 const officeDeposited=tx.filter(x=>x.type==="office_deposited").reduce((s,x)=>s+Number(x.amount||0),0);
 const totalExpense=purchaseTotal+expenseTotal;
 return {month,activeMembers:members.length,limitPerMember,monthlyLimit,purchaseTotal,expenseTotal,totalExpense,surplus:monthlyLimit-totalExpense,officeReceived,cuttingCollected,officeDeposited};
}
function renderHandoverOverview(){
 const staff=(data.staff||[]).filter(x=>(x.status||"Active")==="Active"),ration=data.ration||[];
 const summary=buildMonthlyMessSummary(new Date().toISOString().slice(0,10));
 const state=summary.surplus>0?"Surplus":summary.surplus<0?"Extra Expense":"Balanced";
 const stateColor=summary.surplus<0?"#ffd1d1":"#b9f5cf";
 let box=document.getElementById("handoverAuto");
 if(!box){box=document.createElement("section");box.id="handoverAuto";box.className="panel handover-auto";document.getElementById("tablePanel").before(box);}
 const saved=(data.handovers||[]).filter(x=>x.monthlySummary);
 const stockValue=ration.reduce((s,x)=>s+Number(x.quantity||0)*Number(x.price||0),0);
 const stockRows=ration.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.quantity)+' '+esc(x.unit)+'</td><td>'+money(Number(x.quantity||0)*Number(x.price||0))+'</td></tr>').join("");
 const tx=(data.transactions||[]).filter(x=>String(x.date||"").slice(0,7)===summary.month);
 const officeReceived=summary.officeReceived,cuttingCollected=summary.cuttingCollected,officeDeposited=summary.officeDeposited;
 const surplusColor=summary.surplus>=0?"#f2c94c":"#ffb5b5";
 box.innerHTML='<section class="panel" style="border:3px solid #f2c94c;background:linear-gradient(145deg,#10432f,#082b20);margin-bottom:16px;padding:20px;box-shadow:0 0 18px #d6a62a55"><h2 style="color:#f2c94c;margin:0 0 14px;text-align:center">⭐ मेस Surplus / बचत निधि ⭐</h2><p style="font-size:15px;line-height:1.6;color:#fff">मासिक सीमा: '+summary.activeMembers+' जवान × '+money(summary.limitPerMember)+' = <b style="color:#f2c94c">'+money(summary.monthlyLimit)+'</b></p><p style="font-size:15px;line-height:1.6;color:#fff">राशन खरीद और दर्ज वास्तविक खर्च: <b style="color:#f2c94c">'+money(summary.totalExpense)+'</b></p><div style="text-align:center;border:2px dashed #f2c94c;border-radius:14px;padding:14px;margin:10px 0"><small style="color:#f2c94c;font-weight:700">इस महीने की Surplus / बचत</small><div style="font-size:34px;font-weight:800;color:'+surplusColor+';margin:5px 0">'+money(Math.abs(summary.surplus))+'</div><b style="color:#fff">'+(summary.surplus>=0?"यह बचत अलग रहेगी। अनुमति मिलने पर ही खर्च होगी।":"मासिक सीमा से अधिक खर्च")+'</b></div><p style="color:#fff;font-size:13px">Surplus से खर्च करने पर Accounts में “Surplus se approved expense” चुनें और अनुमति / रसीद संदर्भ दर्ज करें।</p></section>'+
 '<h3>Automatic Mess Handover Summary · '+esc(summary.month)+'</h3><div class="cards">'+stat("Monthly limit",money(summary.monthlyLimit))+stat("Office se mila",money(officeReceived))+stat("Mess Cutting collected",money(cuttingCollected))+stat("Office mein jama",money(officeDeposited))+stat("Ration purchase",money(summary.purchaseTotal))+stat("Other / special expense",money(summary.expenseTotal))+'</div>'+
 '<section class="panel" style="margin-top:14px"><h4>💰 नकद और मासिक हिसाब</h4><div class="tablewrap"><table><tbody><tr><th>मासिक सीमा (जवान × सेटिंग)</th><td>'+money(summary.monthlyLimit)+'</td></tr><tr><th>कुल राशन खरीद</th><td>'+money(summary.purchaseTotal)+'</td></tr><tr><th>अन्य / विशेष / स्वीकृत खर्च</th><td>'+money(summary.expenseTotal)+'</td></tr><tr><th>कुल वास्तविक खर्च</th><td>'+money(summary.totalExpense)+'</td></tr><tr><th>Surplus / (अधिक खर्च)</th><td><b style="color:'+surplusColor+'">'+money(Math.abs(summary.surplus))+'</b></td></tr></tbody></table></div></section>'+
 '<h4>Saved Handover Monthly Records</h4><div class="tablewrap"><table><thead><tr><th>Handover Date</th><th>Month</th><th>Monthly Limit</th><th>Purchase</th><th>Other Expense</th><th>Surplus</th></tr></thead><tbody>'+
 (saved.length?saved.slice().reverse().map(x=>{const m=x.monthlySummary;return '<tr><td>'+esc(x.date||"—")+'</td><td>'+esc(m.month||"—")+'</td><td>'+money(m.monthlyLimit)+'</td><td>'+money(m.purchaseTotal||0)+'</td><td>'+money(m.expenseTotal||0)+'</td><td>'+money(m.surplus??m.budgetBalance??0)+'</td></tr>'}).join(""):'<tr><td colspan="6">Abhi koi monthly handover snapshot nahi hua.</td></tr>')+
 '</tbody></table></div><h4>Current Staff</h4><p>'+(staff.length?staff.map(x=>esc(x.name)+" — "+esc(x.duty||"Staff")).join(" · "):"Mess Staff page par staff add karein.")+'</p><h4>📦 Handover Ration Stock Snapshot · current stock</h4><div class="tablewrap"><table><thead><tr><th>Item</th><th>Available Quantity</th><th>Estimated Stock Value</th></tr></thead><tbody>'+stockRows+'</tbody><tfoot><tr><th colspan="2">Total estimated ration stock</th><th>'+money(stockValue)+'</th></tr></tfoot></table></div><p class="notice">Handover mein pichhle NCO se mila opening ration aur agle NCO ko diya closing ration alag se quantity ke saath verify karein. Current stock value estimate hai; ise cash ya surplus ke saath na milayein. Saved monthly summary handover save karte waqt snapshot hoti hai.</p>';
}
/* Mobile app-style sidebar toggle */
(function initMobileNavigation(){
 const sidebar=document.querySelector(".sidebar"),topbar=document.querySelector(".topbar");
 if(!sidebar||!topbar||document.querySelector(".mobile-menu-toggle"))return;
 const toggle=document.createElement("button");
 toggle.type="button";toggle.className="mobile-menu-toggle";
 toggle.setAttribute("aria-label","Open navigation menu");toggle.setAttribute("aria-expanded","false");
 toggle.textContent="☰";
 const backdrop=document.createElement("div");backdrop.className="mobile-menu-backdrop";
 backdrop.setAttribute("aria-hidden","true");document.body.appendChild(backdrop);
 topbar.insertBefore(toggle,topbar.firstChild);
 function closeMenu(){document.body.classList.remove("mobile-nav-open");toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-label","Open navigation menu");toggle.textContent="☰";}
 function openMenu(){document.body.classList.add("mobile-nav-open");toggle.setAttribute("aria-expanded","true");toggle.setAttribute("aria-label","Close navigation menu");toggle.textContent="×";}
 toggle.addEventListener("click",()=>document.body.classList.contains("mobile-nav-open")?closeMenu():openMenu());
 backdrop.addEventListener("click",closeMenu);
 sidebar.querySelectorAll("a").forEach(a=>a.addEventListener("click",closeMenu));
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu();});
 window.addEventListener("resize",()=>{if(window.innerWidth>700)closeMenu();});
})();

document.getElementById("recordForm")?.addEventListener("submit",saveCurrentRecord);
migrateRateUnits();
render();
if(cfg.key==="purchases"){
  const wanted=new URLSearchParams(location.search).get("item");
  if(wanted){
    const target=(data.ration||[]).find(x=>String(x.id)===wanted||String(x.name)===wanted);
    if(target){openForm();const field=document.getElementById("f_itemId");if(field)field.value=target.id;}
  }
}
