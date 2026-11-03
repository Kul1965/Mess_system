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
    const pageIcons={store:"📦",purchases:"🛒",recipes:"🍲",menu:"📅",accounts:"💰",staff:"👨‍🍳",reports:"📊",handover:"🔄",settings:"⚙️"};
    document.getElementById("pageTitle").textContent=(pageIcons[document.body.dataset.module]||"🛡️")+" "+cfg.title;
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
    document.getElementById("stats").innerHTML=statsHtml(list);
    if(cfg.key==="purchases")renderLowPurchase();
    if(cfg.key==="accounts")renderAccountOverview(list);
    if(cfg.key==="handover")renderHandoverOverview(list);
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
function deleteRow(id){
 let x=arr().find(a=>a.id===id);
 if(!x)return;
 showDeleteConfirm(()=>{
  if(cfg.key==="purchases")reversePurchase(x);
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
 const fresh=read();
 data=fresh&&typeof fresh==="object"?fresh:{};
 const groups=[
  ["Members","👥","members","members.html"],["Ration Store","📦","ration","ration-store.html"],
  ["Purchases","🛒","purchases","purchases.html"],["Recipes","🍲","recipes","recipes.html"],
  ["Making Menu","📅","menu","making-menu.html"],["Meal Records","🍽️","mealRecords","making-menu.html"],
  ["Accounts & Payments","💰","transactions","accounts.html"],["Mess Staff","👨‍🍳","staff","mess-staff.html"],
  ["Mess Handover","🔄","handovers","mess-handover.html"],["Stock Movements","📦","stockMovements","ration-store.html"]
 ];
 const members=data.members||[];
 const memberName=id=>members.find(x=>String(x.id)===String(id))?.name||"";
 const fmtDate=x=>x.date||x.joiningDate||x.createdAt?.slice?.(0,10)||"—";
 const details=(key,x)=>{
  if(key==="members")return [x.forceNo,x.rank,x.status,x.contact,x.remarks].filter(Boolean).join(" · ");
  if(key==="ration")return [x.category,"Stock: "+(x.quantity??0)+" "+(x.unit||""),"Minimum: "+(x.minimum??x.minStock??0),"Rate: "+money(x.price||x.unitPrice||0)].join(" · ");
  if(key==="purchases")return [x.itemName,x.quantity+" "+(x.unit||""),"Rate: "+money(x.rate||0),x.vendor,x.bill].filter(Boolean).join(" · ");
  if(key==="recipes")return (x.ingredients||[]).map(i=>i.itemName+" "+i.quantity+" "+i.unit).join(", ")||x.notes||"Recipe details";
  if(key==="menu")return [x.recipeName,x.servings?x.servings+" servings":"",x.notes].filter(Boolean).join(" · ");
  if(key==="mealRecords")return [x.mealType,(x.recipeNames||[x.recipeName||""]).filter(Boolean).join(" + "),(x.memberIds||[]).map(memberName).filter(Boolean).join(", "),(x.ingredientUsage||[]).map(i=>i.itemName+" "+i.quantity+" "+i.unit).join(", ")].filter(Boolean).join(" · ");
  if(key==="transactions")return [x.type,x.memberName||memberName(x.memberId),x.description||x.details].filter(Boolean).join(" · ");
  if(key==="staff")return [x.rank,x.duty,x.phone,x.status].filter(Boolean).join(" · ");
  if(key==="handovers")return ["From: "+(x.from||""),"To: "+(x.to||""),x.notes].filter(Boolean).join(" · ");
  if(key==="stockMovements")return [x.type,x.itemName,x.quantity+" "+(x.unit||""),x.reference].filter(Boolean).join(" · ");
  return Object.entries(x).filter(([k,v])=>!["id","photo","createdAt"].includes(k)&&["string","number","boolean"].includes(typeof v)).map(([k,v])=>k+": "+v).join(" · ");
 };
 let records=[];
 groups.forEach(([label,icon,key,link])=>(Array.isArray(data[key])?data[key]:[]).forEach(x=>{
  const name=x.name||x.itemName||x.recipeName||x.description||x.details||x.mealType||x.type||label;
  let amount="";
  if(key==="purchases")amount=money(x.total??x.amount??0);
  else if(key==="transactions")amount=money(x.amount||0);
  else if(key==="recipes")amount=money(x.costPerServing??x.totalCost??0)+" / serving";
  else if(key==="mealRecords"||key==="menu")amount=money(x.totalCost??0);
  const date=fmtDate(x),detail=details(key,x);
  records.push({label,icon,key,link,date,name,details:detail,amount,searchable:[label,name,date,detail,amount].join(" ").toLowerCase()});
 }));
 const settings=data.settings&&typeof data.settings==="object"?data.settings:{};
 if(Object.keys(settings).length)records.push({label:"Settings",icon:"⚙️",key:"settings",link:"settings.html",date:"—",name:settings.messName||"Mess Settings",details:Object.entries(settings).map(([k,v])=>k+": "+v).join(" · "),amount:"",searchable:JSON.stringify(settings).toLowerCase()+" settings"});
 const q=(document.getElementById("search")?.value||"").trim().toLowerCase();
 const filtered=records.filter(x=>!q||x.searchable.includes(q));
 const counts=groups.map(([label,icon,key])=>({label,icon,count:(data[key]||[]).length}));
 document.getElementById("stats").innerHTML=stat("Total Records",records.length)+stat("Showing",filtered.length)+stat("Members",members.length)+stat("Meal Records",(data.mealRecords||[]).length);
 const panel=document.getElementById("tablePanel"),toolbar=panel.querySelector(".toolbar");
 if(toolbar){
  toolbar.style.flexWrap="wrap";
  let heading=toolbar.querySelector(".reports-heading");
  if(!heading){heading=document.createElement("div");heading.className="reports-heading";heading.innerHTML='<h3 style="margin:0 0 5px">🔍 All Mess Records</h3><small class="muted">Search by member, item, recipe, date, transaction or any detail.</small>';toolbar.insertBefore(heading,toolbar.firstChild);}
  const search=toolbar.querySelector("#search");if(search){search.placeholder="🔍 Search all records...";search.style.flex="1";search.style.minWidth="190px";}
  const add=toolbar.querySelector("button");if(add)add.style.display="none";
 }
 let content=panel.querySelector("#reportsContent");
 if(!content){content=document.createElement("div");content.id="reportsContent";panel.appendChild(content);}
 content.innerHTML='<div class="cards" style="margin:14px 0">'+counts.map(x=>'<div class="card"><small>'+x.icon+' '+esc(x.label)+'</small><strong>'+x.count+'</strong></div>').join("")+'</div><div class="tablewrap"><table><thead><tr><th>Section</th><th>Date</th><th>Name / Record</th><th>Details</th><th>Amount</th><th>Open</th></tr></thead><tbody>'+filtered.map(x=>'<tr><td>'+x.icon+' '+esc(x.label)+'</td><td>'+esc(x.date)+'</td><td><b>'+esc(x.name)+'</b></td><td>'+esc(x.details||"—")+'</td><td>'+esc(x.amount)+'</td><td><a class="btn" href="'+x.link+'">View</a></td></tr>').join("")+'</tbody></table></div><div class="empty" style="display:'+(filtered.length?"none":"block")+'">'+(records.length?"Is search se koi record nahi mila. Search text badal kar dekhein.":"Abhi is browser mein koi saved record nahi mila. Pehle relevant page par record add karein.")+'</div><p class="muted" style="margin-top:12px">Saved records automatically isi device ke browser storage se read hote hain. Total saved entries: '+records.length+'.</p>';
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
