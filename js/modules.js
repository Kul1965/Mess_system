/* CRPF Mess shared local-first module engine */
function showAppAlert(message){
 const old=document.getElementById("appAlertBackdrop");if(old)old.remove();
 const wrap=document.createElement("div");wrap.id="appAlertBackdrop";wrap.className="app-alert-backdrop";
 wrap.innerHTML='<section class="app-alert" role="alertdialog" aria-modal="true"><p></p><button type="button">OK</button></section>';
 wrap.querySelector("p").textContent=String(message??"");
 const close=()=>wrap.remove();wrap.querySelector("button").addEventListener("click",close);
 wrap.addEventListener("click",e=>{if(e.target===wrap)close()});document.body.appendChild(wrap);wrap.querySelector("button").focus();
}
const KEY="crpfMessData";
const configs={
 store:{title:"Ration Store",sub:"Manage ration stock and minimum levels",key:"ration",fields:[["name","Item name","text",1],["category","Category","text"],["unit","Base unit","select",1,"g|kg|ml|ltr|pcs"],["quantity","Opening/current stock","number"],["minimum","Minimum stock alert","number"],["price","Rate per base unit (Rs)","number"]],cols:["name","category","quantity","unit","minimum","price"],stats:["Total Items","Low Stock","Stock Value"]},
 purchases:{title:"Purchases",sub:"Record purchases and automatically update stock",key:"purchases",fields:[["date","Purchase date","date",1],["itemId","Store item","item",1],["quantity","Quantity purchased","number",1],["unit","Purchase unit","select",1,"kg|g|ltr|ml|pcs|pkt"],["rate","Rate per purchase unit (Rs)","number",1],["vendor","Supplier","text"],["bill","Bill / reference","text"]],cols:["date","itemName","quantity","unit","rate","total","vendor"]},
 recipes:{title:"Recipes",sub:"Add ration ingredients; cost is calculated from current store rates",key:"recipes",fields:[["name","Recipe name","text",1],["notes","Notes","text"]],cols:["name","ingredientSummary","totalCost","costPerServing"]},
 menu:{title:"Making Menu",sub:"Select a meal and recipe; recipe cost is calculated automatically",key:"menu",fields:[["date","Menu date","date",1],["recipeId","Select recipe","recipe",1],["servings","Number of members / servings","number",1]],cols:["date","recipeName","servings","totalCost"]},
 accounts:{title:"Accounts",sub:"Record mess collections, advances and expenses",key:"transactions",fields:[["date","Date","date",1],["type","Transaction type","select",1,"collection|expense|advance"],["memberId","Member","member"],["description","Details","text",1],["amount","Amount (Rs)","number",1]],cols:["date","type","memberName","description","amount"]},
 staff:{title:"Mess Staff",sub:"Manage cooks and mess duty assignments",key:"staff",fields:[["name","Staff name","text",1],["rank","Rank","text"],["duty","Duty","select",1,"Mess Commander|Mess NCO|Cook|Assistant Cook|Storekeeper|Mess Staff"],["phone","Mobile","tel"],["status","Status","select",1,"Active|Inactive"]],cols:["name","rank","duty","phone","status"]},
 reports:{title:"Reports & Records",sub:"View summaries from saved mess records",key:"reports",fields:[],cols:[]},
 handover:{title:"Mess Handover",sub:"Record monthly mess commander handover",key:"handovers",fields:[["date","Handover date","date",1],["from","Outgoing commander","staff",1],["to","Incoming commander","staff",1],["cash","Cash balance (Rs)","number"],["notes","Stock / account notes","text"]],cols:["date","from","to","cash","notes"]},
 settings:{title:"Settings",sub:"Mess identity and local preferences",key:"settings",fields:[["messName","Mess name","text",1],["currency","Currency label","text",1]],cols:[]}
};
let cfg=configs[document.body.dataset.module]||configs.store;
let data=read(),editId=null;
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
function options(f){if(f[2]==="staff")return '<option value="">Select staff</option>'+((data.staff||[]).filter(x=>(x.status||"Active")==="Active").map(x=>'<option value="'+esc(x.name)+'">'+esc(x.name)+' — '+esc(x.duty||"Staff")+'</option>').join(""));if(f[2]==="item")return '<option value="">Choose item</option>'+((data.ration||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join(""));if(f[2]==="member")return '<option value="">No member selected</option>'+((data.members||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join(""));if(f[2]==="recipe"){let recipes=data.recipes||[];return '<option value="">Choose recipe</option>'+recipes.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' ('+money(x.costPerServing)+'/serving)</option>').join("")}return f[4].split("|").map(x=>'<option>'+esc(x)+'</option>').join("")}
function input(f,v=""){let [id,label,type,required]=f;let html=type==="select"||type==="item"||type==="member"||type==="recipe"||type==="staff"?'<select id="f_'+id+'" '+(required?"required":"")+'>'+options(f)+'</select>':'<input id="f_'+id+'" type="'+type+'" value="'+esc(v)+'" '+(required?"required":"")+' '+(type==="number"?'min="0" step="any"':"")+'>';return '<div class="field"><label>'+label+(required?" *":"")+'</label>'+html+'</div>'}
function render(){
  try{
    document.getElementById("pageTitle").textContent=cfg.title;
    document.getElementById("pageSub").textContent=cfg.sub;
    document.getElementById("dateNow").textContent=new Date().toLocaleDateString();
    if(cfg.key==="settings"){renderSettings();return}
    if(cfg.key==="reports"){renderReports();return}
    let list=arr(),q=(document.getElementById("search")?.value||"").toLowerCase();
    let rows=list.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
    document.getElementById("rows").innerHTML=rows.map(x=>{
      const id=String(x.id||"").replace(/\\/g,"");
      const action=(cfg.key==="recipes"?'<button class="view-btn" type="button" onclick="viewRecipe(&quot;'+id+'&quot;)">View</button>':"")+'<button class="alt" type="button" onclick="editRow(&quot;'+id+'&quot;)">Edit</button><button class="danger" type="button" onclick="deleteRow(&quot;'+id+'&quot;)">Delete</button>'+
        (cfg.key==="ration"&&isLowStock(x)?' <a class="btn" style="background:#d8f3e5;color:#075b37;border:1px solid #8fd3ae" href="purchases.html?item='+encodeURIComponent(x.id||x.name)+'">Purchase</a>':'');
      return '<tr>'+cfg.cols.map(k=>'<td>'+esc(k==="amount"||k==="total"||k==="rate"||k==="price"||k==="costPerServing"||k==="totalCost"?money(x[k]):x[k])+'</td>').join("")+'<td><div class="actions">'+action+'</div></td></tr>';
    }).join("");
    document.getElementById("empty").style.display=rows.length?"none":"block";
    document.getElementById("stats").innerHTML=statsHtml(list);\n    if(cfg.key==="purchases")renderLowPurchase();\n    if(cfg.key==="accounts")renderAccountOverview(list);\n    if(cfg.key==="handover")renderHandoverOverview(list);
  }catch(e){
    console.error("Page render error",e);
    const empty=document.getElementById("empty");
    if(empty){empty.style.display="block";empty.textContent="Page error: "+e.message+" — reload karke dobara try karein."}
  }
}
function statsHtml(list){
  if(cfg.key==="store"){
    let low=list.filter(isLowStock).length;
    return stat("Total Items",list.length)+stat("Low Stock",low)+stat("Stock Value",money(list.reduce((s,x)=>s+Number(x.quantity||0)*Number(x.price||x.unitPrice||0),0)));
  }
  if(cfg.key==="purchases")return stat("Purchase Entries",list.length)+stat("Total Purchases",money(list.reduce((s,x)=>s+Number(x.total||x.amount||0),0)));
  if(cfg.key==="recipes")return stat("Recipes",list.length)+stat("Average Cost",money(list.length?list.reduce((s,x)=>s+Number(x.costPerServing||0),0)/list.length:0));
  if(cfg.key==="menu")return stat("Menu Dates",list.length);
  if(cfg.key==="accounts")return stat("Entries",list.length)+stat("Collections",money(list.filter(x=>x.type==="collection"||x.type==="advance").reduce((s,x)=>s+Number(x.amount||0),0)))+stat("Expenses",money(list.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount||0),0)));
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
function openForm(id){if(cfg.key==="recipes"&&!(data.ration||[]).length){showRationRequiredPopup();return}if(cfg.key==="menu"&&!(data.recipes||[]).length){showAppAlert("Recipe nahi hai. Pehle Recipes page mein recipe aur cost per serving add karein, phir Making Menu banayein.");return}editId=id||null;let x=id?arr().find(a=>a.id===id):{};document.getElementById("formTitle").textContent=id?"Edit "+cfg.title:"Add "+cfg.title;document.getElementById("fields").innerHTML=cfg.fields.map(f=>input(f,x?.[f[0]]??"")).join("")+(cfg.key==="recipes"?recipeIngredientEditor(): "");cfg.fields.forEach(f=>{let el=document.getElementById("f_"+f[0]);if(el&&x?.[f[0]]!=null)el.value=x[f[0]]});if(cfg.key==="recipes"){(x?.ingredients||[]).forEach(i=>addIngredientRow(i.itemId,i.quantity));if(!(x?.ingredients||[]).length)addIngredientRow();refreshRecipeCost()}document.getElementById("modal").hidden=false}
function recipeIngredientEditor(){return '<div class="field" style="grid-column:1/-1"><label>Ration Ingredients</label><div class="notice">Yahan Ration Store se item select karein. Quantity usi base unit mein dalein (g / ml / pcs). Rate aur ingredient cost automatic calculate hoga.</div><div id="ingredientRows"></div><button type="button" class="alt" onclick="addIngredientRow()">＋ Add Ingredient</button><div id="recipeCostPreview" style="margin-top:12px;font-weight:700"></div></div>'}
function addIngredientRow(itemId="",quantity=""){let box=document.getElementById("ingredientRows");if(!box)return;let opts='<option value="">Select ration item</option>'+(data.ration||[]).map(i=>'<option value="'+esc(i.id)+'" '+(i.id===itemId?'selected':'')+'>'+esc(i.name)+' — '+esc(i.unit)+'</option>').join("");let row=document.createElement("div");row.className="ingredient-row";row.style.cssText="display:grid;grid-template-columns:minmax(130px,2fr) minmax(75px,1fr) minmax(120px,1fr) auto;gap:7px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)";row.innerHTML='<div><select class="ingredient-item" aria-label="Ration ingredient" onchange="refreshRecipeCost()">'+opts+'</select><small class="ingredient-rate muted" style="display:block;margin-top:4px">Rate: —</small></div><input class="ingredient-qty" type="number" min="0.001" step="any" placeholder="Qty" value="'+esc(quantity)+'" oninput="refreshRecipeCost()"><strong class="ingredient-cost">Rs 0.00</strong><button type="button" class="danger" aria-label="Remove ingredient" onclick="this.parentElement.remove();refreshRecipeCost()">✕</button>';box.appendChild(row);refreshRecipeCost()}
function refreshRecipeCost(){let total=0;document.querySelectorAll("#ingredientRows .ingredient-row").forEach(row=>{let item=(data.ration||[]).find(i=>i.id===row.querySelector(".ingredient-item").value),q=Number(row.querySelector(".ingredient-qty").value||0),rate=Number(item?.price||0),cost=item&&q>0?q*rate:0;total+=cost;let rateEl=row.querySelector(".ingredient-rate"),costEl=row.querySelector(".ingredient-cost");if(rateEl)rateEl.textContent=item?"Rate: "+money(rate)+" / "+item.unit:"Rate: —";if(costEl)costEl.textContent=money(cost)});let p=document.getElementById("recipeCostPreview");if(p)p.textContent="Recipe cost (1 serving): "+money(total)}
function collectRecipeIngredients(){let rows=[...document.querySelectorAll("#ingredientRows .ingredient-row")],out=[];for(let row of rows){let itemId=row.querySelector(".ingredient-item").value,q=Number(row.querySelector(".ingredient-qty").value||0);if(!itemId&&!q)continue;if(!itemId||q<=0){showAppAlert("Har ingredient ke liye ration item aur quantity dono select/enter karein.");return null}let item=(data.ration||[]).find(i=>i.id===itemId);if(!item){showAppAlert("Selected ration item Store mein nahi mila. Dobara select karein.");return null}out.push({itemId,itemName:item.name,quantity:q,unit:item.unit,rate:Number(item.price||0),lineCost:q*Number(item.price||0)})}return out}
function closeForm(){document.getElementById("modal").hidden=true}
function editRow(id){openForm(id)}
function deleteRow(id){let x=arr().find(a=>a.id===id);if(!x||!confirm("Delete this record?"))return;if(cfg.key==="purchases")reversePurchase(x);arr().splice(arr().findIndex(a=>a.id===id),1);save();render()}
function reversePurchase(p){let item=(data.ration||[]).find(x=>x.id===p.itemId);if(item){let base=toBase(p.quantity,p.unit,item.unit);item.quantity=Math.max(0,Number(item.quantity||0)-base)}}
function toBase(q,u,base){q=Number(q||0);if(base==="g")return u==="kg"?q*1000:q;if(base==="kg")return u==="g"?q/1000:q;if(base==="ml")return u==="ltr"?q*1000:q;if(base==="ltr")return u==="ml"?q/1000:q;return q}
document.getElementById("recordForm").addEventListener("submit",e=>{e.preventDefault();let x={id:editId||("R"+Date.now())};cfg.fields.forEach(f=>{let el=document.getElementById("f_"+f[0]);x[f[0]]=el?el.value:""});cfg.fields.filter(f=>f[2]==="number").forEach(f=>x[f[0]]=Number(x[f[0]]||0));if(cfg.key==="purchases"){let item=(data.ration||[]).find(a=>a.id===x.itemId);if(!item){showAppAlert("Select a valid store item.");return}if(editId){let old=arr().find(a=>a.id===editId);reversePurchase(old)}let base=toBase(x.quantity,x.unit,item.unit);let oldQty=Number(item.quantity||0),oldRate=Number(item.price||0),newRate=Number(x.rate||0)/(x.unit==="kg"||x.unit==="ltr"?1000:1);item.price=(oldQty+base)>0?((oldQty*oldRate)+(base*newRate))/(oldQty+base):newRate;item.quantity=oldQty+base;x.itemName=item.name;x.total=x.quantity*x.rate}if(cfg.key==="accounts"){let m=(data.members||[]).find(a=>a.id===x.memberId);x.memberName=m?.name||"";data.transactions=data.transactions||[]}if(cfg.key==="recipes"){x.ingredients=collectRecipeIngredients();if(x.ingredients===null)return;if(!x.ingredients.length){showAppAlert("Recipe banane ke liye kam se kam ek Ration Store item aur uski quantity add karein.");return}x.totalCost=x.ingredients.reduce((s,i)=>s+i.lineCost,0);x.servings=1;x.costPerServing=x.totalCost;x.ingredientSummary=x.ingredients.map(i=>i.itemName+" "+i.quantity+" "+i.unit).join(", ")}if(cfg.key==="menu"){let recipe=(data.recipes||[]).find(r=>r.id===x.recipeId);if(!recipe){showAppAlert("Recipe nahi mili. Pehle Recipes page mein recipe add karein.");return}x.recipeName=recipe.name;x.costPerServing=Number(recipe.costPerServing||0);x.totalCost=x.costPerServing*Number(x.servings||1);if(x.costPerServing<=0){showAppAlert("Is recipe ka cost set nahi hai. Recipes page mein cost per serving add karein.");return}}if(cfg.key==="settings"){data.settings={...(data.settings||{}),...x};save();closeForm();render();return}let list=arr();let i=list.findIndex(a=>a.id===x.id);if(i>=0)list[i]=x;else list.push(x);save();closeForm();render();});
function renderSettings(){let s=data.settings||{};document.getElementById("stats").innerHTML="";document.getElementById("tablePanel").innerHTML='<div class="formgrid">'+cfg.fields.map(f=>input(f,s[f[0]]||"")).join("")+'</div><p style="margin-top:14px"><button onclick="saveSettings()">Save Settings</button></p>'}
function saveSettings(){cfg.fields.forEach(f=>data.settings[f[0]]=document.getElementById("f_"+f[0]).value);save();showAppAlert("Settings saved on this device.");render()}
function renderReports(){let members=data.members||[],stock=data.ration||[],purchases=data.purchases||[],tx=data.transactions||[];document.getElementById("stats").innerHTML=stat("Active Members",members.filter(x=>(x.status||"Active")==="Active").length)+stat("Stock Value",money(stock.reduce((s,x)=>s+Number(x.quantity||0)*Number(x.price||0),0)))+stat("Purchases",money(purchases.reduce((s,x)=>s+Number(x.total||0),0)))+stat("Collections",money(tx.filter(x=>x.type!=="expense").reduce((s,x)=>s+Number(x.amount||0),0)))+stat("Expenses",money(tx.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount||0),0)))+stat("Low Stock",stock.filter(x=>Number(x.quantity||0)<=Number(x.minimum||0)).length);document.getElementById("tablePanel").innerHTML='<h3>Low stock items</h3><div class="tablewrap"><table><thead><tr><th>Item</th><th>Available</th><th>Minimum</th><th>Unit</th></tr></thead><tbody>'+stock.filter(x=>Number(x.quantity||0)<=Number(x.minimum||0)).map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.quantity)+'</td><td>'+esc(x.minimum)+'</td><td>'+esc(x.unit)+'</td></tr>').join("")+'</tbody></table></div><button onclick="window.print()">Print Report</button>'}
function exportBackup(){let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});let a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="crpf-mess-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href)}
function importBackup(file){let r=new FileReader();r.onload=()=>{try{let v=JSON.parse(r.result);if(!v||typeof v!=="object")throw Error();if(!confirm("Restore backup and replace current data on this device?"))return;data=v;save();showAppAlert("Backup restored.");location.reload()}catch(e){showAppAlert("Invalid backup file.")}};r.readAsText(file)}


function renderLowPurchase(){
 const low=(data.ration||[]).filter(isLowStock);
 let box=document.getElementById("lowPurchasePanel");
 if(!box){box=document.createElement("section");box.id="lowPurchasePanel";box.className="panel low-purchase";document.getElementById("tablePanel").before(box);}
 box.innerHTML="<h3>🟢 Low Stock — Purchase Now</h3>"+(low.length?'<div class="low-purchase-grid">'+low.map(x=>'<div class="low-purchase-item"><div><b>'+esc(x.name)+'</b><small>Available: '+esc(x.quantity)+' '+esc(x.unit)+'</small></div><a class="btn purchase-now" href="purchases.html?item='+encodeURIComponent(x.id||x.name)+'">Purchase</a></div>').join("")+'</div>':'<p class="muted">Abhi koi ration item low stock mein nahi hai.</p>');
}
function viewRecipe(id){
 const r=(data.recipes||[]).find(x=>String(x.id)===String(id));if(!r)return;
 let old=document.getElementById("recipeViewModal");if(old)old.remove();
 const rows=(r.ingredients||[]).map(i=>'<tr><td>'+esc(i.itemName)+'</td><td>'+esc(i.quantity)+' '+esc(i.unit)+'</td><td>'+money(i.rate)+' / '+esc(i.unit)+'</td><td>'+money(i.lineCost)+'</td></tr>').join("");
 const modal=document.createElement("div");modal.id="recipeViewModal";modal.className="view-overlay";
 modal.innerHTML='<section class="view-card"><div class="view-head"><div><small>RECIPE DETAILS · 1 SERVING</small><h2>'+esc(r.name)+'</h2></div><button type="button" class="alt" onclick="document.getElementById(\'recipeViewModal\').remove()">✕</button></div><div class="view-cost"><small>Cost per serving</small><strong>'+money(r.costPerServing||r.totalCost)+'</strong></div><h3>Ingredients</h3><div class="tablewrap"><table><thead><tr><th>Ration Item</th><th>Quantity</th><th>Rate</th><th>Cost</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="muted">'+esc(r.notes||"No extra notes")+'</p><button type="button" onclick="document.getElementById(\'recipeViewModal\').remove()">Close</button></section>';
 document.body.appendChild(modal);modal.addEventListener("click",e=>{if(e.target===modal)modal.remove()});
}
function renderAccountOverview(list){
 const meals=data.mealRecords||[],members=data.members||[];
 const mealTotal=meals.reduce((s,m)=>s+Number(m.totalCost||0),0);
 const collected=list.filter(x=>x.type==="collection"||x.type==="advance").reduce((s,x)=>s+Number(x.amount||0),0);
 const expenses=list.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount||0),0);
 let box=document.getElementById("accountOverview");
 if(!box){box=document.createElement("section");box.id="accountOverview";box.className="cards";document.getElementById("pageSub").after(box);}
 box.innerHTML=stat("Meal Charges",money(mealTotal))+stat("Advance / Collection",money(collected))+stat("Expenses",money(expenses))+stat("Members",members.length);
}
function renderHandoverOverview(){
 const staff=(data.staff||[]).filter(x=>(x.status||"Active")==="Active"),ration=data.ration||[],tx=data.transactions||[];
 const cash=tx.reduce((s,x)=>s+(x.type==="expense"?-1:1)*Number(x.amount||0),0);
 let box=document.getElementById("handoverAuto");
 if(!box){box=document.createElement("section");box.id="handoverAuto";box.className="panel handover-auto";document.getElementById("tablePanel").before(box);}
 box.innerHTML='<h3>Automatic Mess Handover Summary</h3><div class="cards">'+stat("Active Mess Staff",staff.length)+stat("Ration Items",ration.length)+stat("Available Cash (ledger)",money(cash))+stat("Transactions",tx.length)+'</div><h4>Current Staff</h4><p>'+(staff.length?staff.map(x=>esc(x.name)+" — "+esc(x.duty||"Staff")).join(" · "):"Mess Staff page par staff add karein.")+'</p><h4>Ration Stock Snapshot</h4><div class="tablewrap"><table><thead><tr><th>Item</th><th>Available</th><th>Minimum</th></tr></thead><tbody>'+ration.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.quantity)+' '+esc(x.unit)+'</td><td>'+esc(x.minimum||0)+' '+esc(x.unit)+'</td></tr>').join("")+'</tbody></table></div><p class="muted">Yeh summary saved staff, ration aur account transactions se automatic read hoti hai.</p>';
}

render();
if(cfg.key==="purchases"){
  const wanted=new URLSearchParams(location.search).get("item");
  if(wanted){
    const target=(data.ration||[]).find(x=>String(x.id)===wanted||String(x.name)===wanted);
    if(target){openForm();const field=document.getElementById("f_itemId");if(field)field.value=target.id;}
  }
}
