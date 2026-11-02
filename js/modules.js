/* CRPF Mess shared local-first module engine */
const KEY="crpfMessData";
const configs={
 store:{title:"Ration Store",sub:"Manage ration stock and minimum levels",key:"ration",fields:[["name","Item name","text",1],["category","Category","text"],["unit","Base unit","select",1,"g|kg|ml|ltr|pcs"],["quantity","Opening/current stock","number"],["minimum","Minimum stock alert","number"],["price","Rate per base unit (Rs)","number"]],cols:["name","category","quantity","unit","minimum","price"],stats:["Total Items","Low Stock","Stock Value"]},
 purchases:{title:"Purchases",sub:"Record purchases and automatically update stock",key:"purchases",fields:[["date","Purchase date","date",1],["itemId","Store item","item",1],["quantity","Quantity purchased","number",1],["unit","Purchase unit","select",1,"kg|g|ltr|ml|pcs|pkt"],["rate","Rate per purchase unit (Rs)","number",1],["vendor","Supplier","text"],["bill","Bill / reference","text"]],cols:["date","itemName","quantity","unit","rate","total","vendor"]},
 recipes:{title:"Recipes",sub:"Add ration ingredients; cost is calculated from current store rates",key:"recipes",fields:[["name","Recipe name","text",1],["notes","Notes","text"]],cols:["name","ingredientSummary","totalCost","costPerServing"]},
 menu:{title:"Making Menu",sub:"Select a meal and recipe; recipe cost is calculated automatically",key:"menu",fields:[["date","Menu date","date",1],["recipeId","Select recipe","recipe",1],["servings","Number of members / servings","number",1]],cols:["date","recipeName","servings","totalCost"]},
 accounts:{title:"Accounts",sub:"Record mess collections, advances and expenses",key:"transactions",fields:[["date","Date","date",1],["type","Transaction type","select",1,"collection|expense|advance"],["memberId","Member","member"],["description","Details","text",1],["amount","Amount (Rs)","number",1]],cols:["date","type","memberName","description","amount"]},
 staff:{title:"Mess Staff",sub:"Manage cooks and mess duty assignments",key:"staff",fields:[["name","Staff name","text",1],["rank","Rank","text"],["duty","Duty","select",1,"Mess Commander|Mess NCO|Cook|Assistant Cook|Storekeeper|Mess Staff"],["phone","Mobile","tel"],["status","Status","select",1,"Active|Inactive"]],cols:["name","rank","duty","phone","status"]},
 reports:{title:"Reports & Records",sub:"View summaries from saved mess records",key:"reports",fields:[],cols:[]},
 handover:{title:"Mess Handover",sub:"Record monthly mess commander handover",key:"handovers",fields:[["date","Handover date","date",1],["from","Outgoing commander","text",1],["to","Incoming commander","text",1],["cash","Cash balance (Rs)","number"],["notes","Stock / account notes","text"]],cols:["date","from","to","cash","notes"]},
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
    alert("Data save nahi hua. Browser storage full ho sakta hai. Backup lekar photo/storage size kam karein.");
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
function options(f){if(f[2]==="item")return '<option value="">Choose item</option>'+((data.ration||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join(""));if(f[2]==="member")return '<option value="">No member selected</option>'+((data.members||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join(""));if(f[2]==="recipe"){let recipes=data.recipes||[];return '<option value="">Choose recipe</option>'+recipes.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' ('+money(x.costPerServing)+'/serving)</option>').join("")}return f[4].split("|").map(x=>'<option>'+esc(x)+'</option>').join("")}
function input(f,v=""){let [id,label,type,required]=f;let html=type==="select"||type==="item"||type==="member"||type==="recipe"?'<select id="f_'+id+'" '+(required?"required":"")+'>'+options(f)+'</select>':'<input id="f_'+id+'" type="'+type+'" value="'+esc(v)+'" '+(required?"required":"")+' '+(type==="number"?'min="0" step="any"':"")+'>';return '<div class="field"><label>'+label+(required?" *":"")+'</label>'+html+'</div>'}
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
      const action=(cfg.key==="ration"&&isLowStock(x)?'<a class="btn" style="background:#e83e49;color:#fff" href="purchases.html?item='+encodeURIComponent(x.id||x.name)+'">Purchase</a> ':'')+
        '<button class="alt" type="button" onclick="editRow(&quot;'+id+'&quot;)">Edit</button><button class="danger" type="button" onclick="deleteRow(&quot;'+id+'&quot;)">Delete</button>';
      return '<tr>'+cfg.cols.map(k=>'<td>'+esc(k==="amount"||k==="total"||k==="rate"||k==="price"||k==="costPerServing"||k==="totalCost"?money(x[k]):x[k])+'</td>').join("")+'<td><div class="actions">'+action+'</div></td></tr>';
    }).join("");
    document.getElementById("empty").style.display=rows.length?"none":"block";
    document.getElementById("stats").innerHTML=statsHtml(list);
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
function openForm(id){if(cfg.key==="recipes"&&!(data.ration||[]).length){alert("Ration Store khali hai. Pehle Ration Store mein items aur unka rate add karein.");return}if(cfg.key==="menu"&&!(data.recipes||[]).length){alert("Recipe nahi hai. Pehle Recipes page mein recipe aur cost per serving add karein, phir Making Menu banayein.");return}editId=id||null;let x=id?arr().find(a=>a.id===id):{};document.getElementById("formTitle").textContent=id?"Edit "+cfg.title:"Add "+cfg.title;document.getElementById("fields").innerHTML=cfg.fields.map(f=>input(f,x?.[f[0]]??"")).join("")+(cfg.key==="recipes"?recipeIngredientEditor(): "");cfg.fields.forEach(f=>{let el=document.getElementById("f_"+f[0]);if(el&&x?.[f[0]]!=null)el.value=x[f[0]]});if(cfg.key==="recipes"){(x?.ingredients||[]).forEach(i=>addIngredientRow(i.itemId,i.quantity));if(!(x?.ingredients||[]).length)addIngredientRow();refreshRecipeCost()}document.getElementById("modal").hidden=false}
function recipeIngredientEditor(){return '<div class="field" style="grid-column:1/-1"><label>Ration Ingredients</label><div class="notice">Yahan Ration Store se item select karein. Quantity usi base unit mein dalein (g / ml / pcs). Rate aur ingredient cost automatic calculate hoga.</div><div id="ingredientRows"></div><button type="button" class="alt" onclick="addIngredientRow()">＋ Add Ingredient</button><div id="recipeCostPreview" style="margin-top:12px;font-weight:700"></div></div>'}
function addIngredientRow(itemId="",quantity=""){let box=document.getElementById("ingredientRows");if(!box)return;let opts='<option value="">Select ration item</option>'+(data.ration||[]).map(i=>'<option value="'+esc(i.id)+'" '+(i.id===itemId?'selected':'')+'>'+esc(i.name)+' — '+esc(i.unit)+'</option>').join("");let row=document.createElement("div");row.className="ingredient-row";row.style.cssText="display:grid;grid-template-columns:minmax(130px,2fr) minmax(75px,1fr) minmax(120px,1fr) auto;gap:7px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)";row.innerHTML='<div><select class="ingredient-item" aria-label="Ration ingredient" onchange="refreshRecipeCost()">'+opts+'</select><small class="ingredient-rate muted" style="display:block;margin-top:4px">Rate: —</small></div><input class="ingredient-qty" type="number" min="0.001" step="any" placeholder="Qty" value="'+esc(quantity)+'" oninput="refreshRecipeCost()"><strong class="ingredient-cost">Rs 0.00</strong><button type="button" class="danger" aria-label="Remove ingredient" onclick="this.parentElement.remove();refreshRecipeCost()">✕</button>';box.appendChild(row);refreshRecipeCost()}
function refreshRecipeCost(){let total=0;document.querySelectorAll("#ingredientRows .ingredient-row").forEach(row=>{let item=(data.ration||[]).find(i=>i.id===row.querySelector(".ingredient-item").value),q=Number(row.querySelector(".ingredient-qty").value||0),rate=Number(item?.price||0),cost=item&&q>0?q*rate:0;total+=cost;let rateEl=row.querySelector(".ingredient-rate"),costEl=row.querySelector(".ingredient-cost");if(rateEl)rateEl.textContent=item?"Rate: "+money(rate)+" / "+item.unit:"Rate: —";if(costEl)costEl.textContent=money(cost)});let p=document.getElementById("recipeCostPreview");if(p)p.textContent="Recipe cost (1 serving): "+money(total)}
function collectRecipeIngredients(){let rows=[...document.querySelectorAll("#ingredientRows .ingredient-row")],out=[];for(let row of rows){let itemId=row.querySelector(".ingredient-item").value,q=Number(row.querySelector(".ingredient-qty").value||0);if(!itemId&&!q)continue;if(!itemId||q<=0){alert("Har ingredient ke liye ration item aur quantity dono select/enter karein.");return null}let item=(data.ration||[]).find(i=>i.id===itemId);if(!item){alert("Selected ration item Store mein nahi mila. Dobara select karein.");return null}out.push({itemId,itemName:item.name,quantity:q,unit:item.unit,rate:Number(item.price||0),lineCost:q*Number(item.price||0)})}return out}
function closeForm(){document.getElementById("modal").hidden=true}
function editRow(id){openForm(id)}
function deleteRow(id){let x=arr().find(a=>a.id===id);if(!x||!confirm("Delete this record?"))return;if(cfg.key==="purchases")reversePurchase(x);arr().splice(arr().findIndex(a=>a.id===id),1);save();render()}
function reversePurchase(p){let item=(data.ration||[]).find(x=>x.id===p.itemId);if(item){let base=toBase(p.quantity,p.unit,item.unit);item.quantity=Math.max(0,Number(item.quantity||0)-base)}}
function toBase(q,u,base){q=Number(q||0);if(base==="g")return u==="kg"?q*1000:q;if(base==="kg")return u==="g"?q/1000:q;if(base==="ml")return u==="ltr"?q*1000:q;if(base==="ltr")return u==="ml"?q/1000:q;return q}
document.getElementById("recordForm").addEventListener("submit",e=>{e.preventDefault();let x={id:editId||("R"+Date.now())};cfg.fields.forEach(f=>{let el=document.getElementById("f_"+f[0]);x[f[0]]=el?el.value:""});cfg.fields.filter(f=>f[2]==="number").forEach(f=>x[f[0]]=Number(x[f[0]]||0));if(cfg.key==="purchases"){let item=(data.ration||[]).find(a=>a.id===x.itemId);if(!item){alert("Select a valid store item.");return}if(editId){let old=arr().find(a=>a.id===editId);reversePurchase(old)}let base=toBase(x.quantity,x.unit,item.unit);let oldQty=Number(item.quantity||0),oldRate=Number(item.price||0),newRate=Number(x.rate||0)/(x.unit==="kg"||x.unit==="ltr"?1000:1);item.price=(oldQty+base)>0?((oldQty*oldRate)+(base*newRate))/(oldQty+base):newRate;item.quantity=oldQty+base;x.itemName=item.name;x.total=x.quantity*x.rate}if(cfg.key==="accounts"){let m=(data.members||[]).find(a=>a.id===x.memberId);x.memberName=m?.name||"";data.transactions=data.transactions||[]}if(cfg.key==="recipes"){x.ingredients=collectRecipeIngredients();if(x.ingredients===null)return;if(!x.ingredients.length){alert("Recipe banane ke liye kam se kam ek Ration Store item aur uski quantity add karein.");return}x.totalCost=x.ingredients.reduce((s,i)=>s+i.lineCost,0);x.servings=1;x.costPerServing=x.totalCost;x.ingredientSummary=x.ingredients.map(i=>i.itemName+" "+i.quantity+" "+i.unit).join(", ")}if(cfg.key==="menu"){let recipe=(data.recipes||[]).find(r=>r.id===x.recipeId);if(!recipe){alert("Recipe nahi mili. Pehle Recipes page mein recipe add karein.");return}x.recipeName=recipe.name;x.costPerServing=Number(recipe.costPerServing||0);x.totalCost=x.costPerServing*Number(x.servings||1);if(x.costPerServing<=0){alert("Is recipe ka cost set nahi hai. Recipes page mein cost per serving add karein.");return}}if(cfg.key==="settings"){data.settings={...(data.settings||{}),...x};save();closeForm();render();return}let list=arr();let i=list.findIndex(a=>a.id===x.id);if(i>=0)list[i]=x;else list.push(x);save();closeForm();render();});
function renderSettings(){let s=data.settings||{};document.getElementById("stats").innerHTML="";document.getElementById("tablePanel").innerHTML='<div class="formgrid">'+cfg.fields.map(f=>input(f,s[f[0]]||"")).join("")+'</div><p style="margin-top:14px"><button onclick="saveSettings()">Save Settings</button></p>'}
function saveSettings(){cfg.fields.forEach(f=>data.settings[f[0]]=document.getElementById("f_"+f[0]).value);save();alert("Settings saved on this device.");render()}
function renderReports(){let members=data.members||[],stock=data.ration||[],purchases=data.purchases||[],tx=data.transactions||[];document.getElementById("stats").innerHTML=stat("Active Members",members.filter(x=>(x.status||"Active")==="Active").length)+stat("Stock Value",money(stock.reduce((s,x)=>s+Number(x.quantity||0)*Number(x.price||0),0)))+stat("Purchases",money(purchases.reduce((s,x)=>s+Number(x.total||0),0)))+stat("Collections",money(tx.filter(x=>x.type!=="expense").reduce((s,x)=>s+Number(x.amount||0),0)))+stat("Expenses",money(tx.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount||0),0)))+stat("Low Stock",stock.filter(x=>Number(x.quantity||0)<=Number(x.minimum||0)).length);document.getElementById("tablePanel").innerHTML='<h3>Low stock items</h3><div class="tablewrap"><table><thead><tr><th>Item</th><th>Available</th><th>Minimum</th><th>Unit</th></tr></thead><tbody>'+stock.filter(x=>Number(x.quantity||0)<=Number(x.minimum||0)).map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.quantity)+'</td><td>'+esc(x.minimum)+'</td><td>'+esc(x.unit)+'</td></tr>').join("")+'</tbody></table></div><button onclick="window.print()">Print Report</button>'}
function exportBackup(){let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});let a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="crpf-mess-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href)}
function importBackup(file){let r=new FileReader();r.onload=()=>{try{let v=JSON.parse(r.result);if(!v||typeof v!=="object")throw Error();if(!confirm("Restore backup and replace current data on this device?"))return;data=v;save();alert("Backup restored.");location.reload()}catch(e){alert("Invalid backup file.")}};r.readAsText(file)}

render();
if(cfg.key==="purchases"){
  const wanted=new URLSearchParams(location.search).get("item");
  if(wanted){
    const target=(data.ration||[]).find(x=>String(x.id)===wanted||String(x.name)===wanted);
    if(target){openForm();const field=document.getElementById("f_itemId");if(field)field.value=target.id;}
  }
}
