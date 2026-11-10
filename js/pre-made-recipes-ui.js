/* Pre-made recipe picker for CRPF Mess. Saves selected catalogue recipes into the same recipe register used by Making Menu. */
(function(){
 "use strict";
 const KEY="crpfMessData", catalogue=window.CRPF_PREMADE_RECIPES||[];
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=v=>"Rs "+Number(v||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
 const read=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||"{}");return d&&typeof d==="object"&&!Array.isArray(d)?d:{}}catch(e){return null}};
 function factor(unit){
  const u=String(unit||"").toLowerCase();
  if(["g","gram","grams"].includes(u))return {kind:"weight",factor:1};
  if(["kg","kgs"].includes(u))return {kind:"weight",factor:1000};
  if(u==="ml")return {kind:"volume",factor:1};
  if(["ltr","l","litre","liter"].includes(u))return {kind:"volume",factor:1000};
  if(["pcs","pc","piece","pieces"].includes(u))return {kind:"count",factor:1};
  return null;
 }
 const toBase=(qty,from,to)=>{const a=factor(from),b=factor(to);return !a||!b||a.kind!==b.kind?null:Number(qty)*a.factor/b.factor};
 const recipeUnit=item=>{const f=factor(item.unit);return f?.kind==="weight"?"g":f?.kind==="volume"?"ml":"pcs"};
 const aliases={
  "toor dal":["arhar dal","tuvar dal","toor dal"],"moong dal":["mung dal","moong dal"],"chana dal":["gram dal","chana dal"],
  "chickpeas/chana":["chana","kabuli chana","chickpeas"],"rice":["chawal","rice"],"wheat flour/atta":["atta","gehun atta","wheat flour"],
  "oil/ghee":["oil","cooking oil","refined oil","ghee"],"oil":["oil","cooking oil","refined oil"],"ghee":["ghee","clarified butter"],
  "onion":["pyaz","onion"],"tomato":["tamatar","tomato"],"potato":["aloo","potato"],"cauliflower":["gobi","cauliflower"],
  "green peas":["matar","peas","green peas"],"okra/bhindi":["bhindi","okra"],"mixed vegetables":["mix veg","mixed vegetables","seasonal vegetables"],
  "cabbage":["patta gobhi","cabbage"],"leafy greens/saag":["saag","palak","spinach","leafy greens"],"besan":["gram flour","besan"],
  "egg":["anda","egg"],"chicken":["chicken"],"fish":["fish","machhli"],"milk":["doodh","milk"],"tea leaves":["chai patti","tea","tea leaves"],
  "sugar":["chini","sugar"],"curd":["dahi","curd"],"sooji/semolina":["suji","sooji","semolina"],"dry fruits":["dry fruits","meva"],
  "ginger garlic":["adrak lehsun","ginger garlic","ginger","garlic"],"garlic":["lahsun","garlic"],"salt":["namak","salt"],
  "spices":["masala","spices","garam masala"],"cumin":["jeera","cumin"],"mustard seeds":["rai","mustard seeds"]
 };
 const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
 function matchItem(name,items){
  const candidates=[name,...(aliases[String(name).toLowerCase()]||[])].map(norm);
  return items.find(it=>candidates.includes(norm(it.name)))||items.find(it=>candidates.some(a=>a.length>3&&norm(it.name).includes(a)))||null;
 }
 let selected=0,activeData=null;
 function open(){
  activeData=read();
  if(!activeData){alert("Mess data read nahi hua. Page refresh karke dobara try karein.");return}
  const items=Array.isArray(activeData.ration)?activeData.ration:[];
  if(!items.length){alert("Pehle Ration Store mein items add karein. Pre-made recipe ke ingredients ko aapke store items se map karna zaroori hai.");return}
  if(!catalogue.length){alert("Recipe catalogue load nahi hui. Page refresh karein.");return}
  const old=$("premadeRecipeModal");if(old)old.remove();
  const wrap=document.createElement("div");wrap.id="premadeRecipeModal";
  wrap.style.cssText="position:fixed;inset:0;z-index:12000;background:#000c;display:flex;align-items:center;justify-content:center;padding:10px";
  wrap.innerHTML='<section style="width:min(100%,850px);max-height:94vh;overflow:auto;background:#f5faf6;color:#214d3b;border:1px solid #b9d5c4;border-radius:16px;padding:15px;box-shadow:0 15px 50px #0008"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><h2 style="margin:0;color:#176747">📚 Pre-made Recipe Library</h2><small>31 ready recipes · ingredients per 1 serving</small></div><button type="button" id="premadeClose" style="border:0;border-radius:8px;padding:9px 12px">✕</button></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0"><input id="premadeSearch" placeholder="Recipe search karein…"><select id="premadeCategory"><option value="all">All recipes</option><option value="Veg">Vegetarian</option><option value="Non-Veg">Non-Vegetarian</option></select></div><div id="premadeRecipeList" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px"></div><div id="premadeEditor" style="display:none;margin-top:14px;padding:12px;background:#fff;border:1px solid #dce8df;border-radius:12px"><h3 id="premadeTitle" style="margin:0 0 5px"></h3><p style="margin:0 0 10px;color:#65796d;font-size:12px">Har ingredient ko apne Ration Store item se match karein. Rate aapke Store se liya jayega; koi rate ya stock khud se nahi banega.</p><div id="premadeIngredientRows" style="display:grid;grid-template-columns:1fr;gap:10px"></div><div id="premadeTotal" style="font-weight:800;text-align:right;padding:12px 0">Cost / serving: Rs 0.00</div><button type="button" id="premadeSave" style="width:100%;background:#176747;color:white;border:0;border-radius:9px;padding:13px;font-weight:800">✓ Add to My Recipes & Menu</button></div><p style="font-size:11px;color:#65796d;margin:12px 0 0">Note: Quantities are suggested starting portions. Cook / Mess NCO can adjust them to your mess standard before saving. This action adds a recipe only; stock is deducted only when meal attendance is saved.</p></section>';
  document.body.appendChild(wrap);
  $("premadeClose").onclick=()=>wrap.remove();
  wrap.addEventListener("click",e=>{if(e.target===wrap)wrap.remove()});
  $("premadeSearch").addEventListener("input",renderList);$("premadeCategory").addEventListener("change",renderList);
  renderList();
 }
 function renderList(){
  const q=norm($("premadeSearch").value),cat=$("premadeCategory").value;
  const list=catalogue.map((r,i)=>({...r,_i:i})).filter(r=>(cat==="all"||r.type===cat)&&(!q||norm(r.name).includes(q)||norm(r.category).includes(q)));
  $("premadeRecipeList").innerHTML=list.map(r=>'<button type="button" data-recipe="'+r._i+'" style="text-align:left;background:#fff;color:#214d3b;border:1px solid #d5e4d9;border-radius:10px;padding:10px"><b>'+esc(r.name)+'</b><small style="display:block;color:#6d7e73;margin-top:4px">'+esc(r.type)+' · '+r.ingredients.length+' ingredients</small></button>').join("")||'<p>No recipes found.</p>';
  $("premadeRecipeList").querySelectorAll("[data-recipe]").forEach(b=>b.addEventListener("click",()=>choose(Number(b.dataset.recipe))));
 }
 function choose(index){
  selected=index;const r=catalogue[index],items=activeData.ration||[];
  $("premadeTitle").textContent=r.name+" · "+r.type;
  $("premadeIngredientRows").innerHTML=r.ingredients.map((ing,i)=>{
   const auto=matchItem(ing.n,items),wantedKind=factor(ing.u)?.kind;
   const options=items.filter(it=>factor(it.unit)?.kind===wantedKind);
   const opts='<option value="">👇 Yahan apna Ration Store item chunein</option>'+options.map(it=>'<option value="'+esc(it.id)+'" '+(auto&&String(auto.id)===String(it.id)?"selected":"")+'>'+esc(it.name)+' · '+esc(it.unit)+'</option>').join("");
   return '<div data-index="'+i+'" style="padding:11px;border:1px solid #dce8df;border-radius:10px;background:#fbfefc"><b style="display:block;margin-bottom:7px">'+esc(ing.n)+'</b><label style="display:block;font-size:12px;color:#65796d">Quantity per serving</label><div style="display:flex;align-items:center;gap:8px;margin:5px 0 9px"><input class="pm-qty" type="number" min="0.001" step="any" value="'+ing.q+'" style="width:110px;padding:9px"> <b>'+esc(ing.u)+'</b></div><label style="display:block;font-size:12px;color:#65796d">Ration Store mein is item ko select karein</label><select class="pm-item" style="width:100%;padding:11px;margin-top:5px">'+opts+'</select><div class="pm-cost" style="text-align:right;font-weight:700;margin-top:7px">Store item select karein</div></div>';
  }).join("");
  $("premadeEditor").style.display="block";
  $("premadeIngredientRows").querySelectorAll("select,input").forEach(el=>el.addEventListener("change",calcTotal));
  $("premadeIngredientRows").querySelectorAll("input").forEach(el=>el.addEventListener("input",calcTotal));
  $("premadeSave").onclick=saveSelected;calcTotal();
  $("premadeEditor").scrollIntoView({behavior:"smooth",block:"start"});
 }
 function calcTotal(){
  let total=0;
  $("premadeIngredientRows").querySelectorAll("tr").forEach(row=>{
   const ing=catalogue[selected].ingredients[Number(row.dataset.index)],item=(activeData.ration||[]).find(x=>String(x.id)===String(row.querySelector(".pm-item").value));
   const qty=Number(row.querySelector(".pm-qty").value||0),base=item?toBase(qty,ing.u,item.unit):null;
   const cost=base===null?0:base*Number(item.price||0);total+=cost;
   row.querySelector(".pm-cost").textContent=item&&base!==null?money(cost):"Map item";
  });
  $("premadeTotal").textContent="Cost / serving: "+money(total);
  return total;
 }
 function saveSelected(){
  const d=read();if(!d){alert("Mess data read nahi hua; save cancel kiya.");return}
  const template=catalogue[selected],rows=[...$("premadeIngredientRows").querySelectorAll("tr")],ingredients=[];
  for(const row of rows){
   const ing=template.ingredients[Number(row.dataset.index)],item=(d.ration||[]).find(x=>String(x.id)===String(row.querySelector(".pm-item").value)),qty=Number(row.querySelector(".pm-qty").value||0);
   if(!item||qty<=0){alert("Is ingredient ke liye dropdown se Ration Store item chunein aur quantity check karein: "+ing.n);row.querySelector(".pm-item").focus();return}
   const base=toBase(qty,ing.u,item.unit);if(base===null){alert("Unit match nahi hai: "+ing.n+". Store item ka unit check karein.");return}
   ingredients.push({itemId:item.id,itemName:item.name,quantity:qty,unit:ing.u,stockUnit:item.unit,rate:Number(item.price||0),lineCost:base*Number(item.price||0)});
  }
  const total=ingredients.reduce((s,x)=>s+x.lineCost,0);
  if(!(total>0)){alert("Recipe cost zero aa rahi hai. Store items ke rates check karein; recipe save nahi ki.");return}
  d.recipes=Array.isArray(d.recipes)?d.recipes:[];
  if(d.recipes.some(x=>norm(x.name)===norm(template.name))){alert("Is naam ki recipe pehle se maujood hai. Existing recipe ko edit karein ya uska naam badlein.");return}
  d.recipes.push({id:"PM"+Date.now(),name:template.name,notes:"Pre-made "+template.type+" recipe · suggested 1-serving quantities; verify local cooking standard.",ingredients,totalCost:total,costPerServing:total,ingredientSummary:ingredients.map(x=>x.itemName+" "+x.quantity+" "+x.unit).join(", "),source:"premade",catalogId:selected+1});
  try{
   const json=JSON.stringify(d);localStorage.setItem(KEY,json);
   if(localStorage.getItem(KEY)!==json)throw new Error("Save verification failed");
  }catch(e){alert("Recipe save nahi hui. Browser storage full ho sakta hai. Existing data ko change nahi kiya gaya ho sakta; Backup check karein. "+e.message);return}
  alert("Recipe My Recipes mein add ho gayi. Ab Making Menu page par is dish ko choose kar sakte hain. Stock abhi deduct nahi hua; Meal Save karne par hoga.");
  $("premadeRecipeModal").remove();location.reload();
 }
 window.openPremadeRecipePicker=open;
})();
