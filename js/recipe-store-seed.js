/* Adds only missing ingredients used by the built-in recipe catalogue. Never changes existing stock, rates or records. */
(function(){
 "use strict";
 const KEY="crpfMessData";
 const items=[
  ["Toor Dal","Dal","g"],["Onion","Vegetables","g"],["Tomato","Vegetables","g"],["Oil","Oil & Spices","ml"],
  ["Garlic","Vegetables","g"],["Spices","Oil & Spices","g"],["Moong Dal","Dal","g"],["Chana Dal","Dal","g"],
  ["Rajma","Dal & Pulses","g"],["Chickpeas/Chana","Dal & Pulses","g"],["Rice","Grains","g"],["Mixed Vegetables","Vegetables","g"],
  ["Potato","Vegetables","g"],["Cauliflower","Vegetables","g"],["Green Peas","Vegetables","g"],["Okra/Bhindi","Vegetables","g"],
  ["Cabbage","Vegetables","g"],["Leafy Greens/Saag","Vegetables","g"],["Wheat Flour/Atta","Grains","g"],["Salt","Oil & Spices","g"],
  ["Besan","Grains","g"],["Ghee","Oil & Spices","ml"],["Curd","Dairy","g"],["Mustard Seeds","Oil & Spices","g"],
  ["Egg","Non-Veg","pcs"],["Chicken","Non-Veg","g"],["Fish","Non-Veg","g"],["Milk","Dairy","ml"],
  ["Tea Leaves","Tea & Beverage","g"],["Sugar","Tea & Beverage","g"],["Cumin","Oil & Spices","g"],
  ["Ginger Garlic","Vegetables","g"],["Sooji/Semolina","Grains","g"],["Dry Fruits","Dry Fruits","g"]
 ];
 const aliases={
  "toordal":["arhardal","tuvardal"],"chickpeaschana":["chana","kabulichana","chickpeas"],
  "wheatflouratta":["atta","gehunatta"],"okraBhindi":["bhindi","okra"],"leafygreenssaag":["saag","palak","spinach"],
  "oil":["cookingoil","refinedoil"],"gingergarlic":["adraklehsun","ginger","garlic"],
  "soojisemolina":["suji","sooji"],"curd":["dahi"],"egg":["anda"],"onion":["pyaz"],"tomato":["tamatar"],
  "potato":["aloo"],"cauliflower":["gobi"],"greenpeas":["matar","peas"],"rice":["chawal"],"sugar":["chini"],
  "salt":["namak"],"milk":["doodh"],"tealeaves":["chaipatti","tea"]
 };
 const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
 function addRecipeRationItems(){
  let d;try{d=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){alert("Mess data read nahi hua. Kuch change nahi kiya.");return}
  if(!d||typeof d!=="object"||Array.isArray(d)){alert("Mess data sahi format mein nahi hai. Kuch change nahi kiya.");return}
  d.ration=Array.isArray(d.ration)?d.ration:[];
  const existing=new Set(d.ration.map(x=>norm(x.name)));
  const aliasesFlat=Object.entries(aliases).flatMap(([key,vals])=>vals.map(v=>[norm(v),key]));
  const added=[];
  items.forEach((entry,i)=>{
   const [name,category,unit]=entry,key=norm(name);
   const aliasKeys=aliasesFlat.filter(([alias,target])=>target===key).map(([alias])=>alias);
   if(existing.has(key)||aliasKeys.some(a=>existing.has(a)))return;
   added.push({id:"RCP"+Date.now()+"_"+i,name,category,unit,quantity:0,minimum:unit==="pcs"?10:1000,price:0,source:"recipe-catalogue"});
   existing.add(key);
  });
  if(!added.length){alert("Recipe ke sabhi ration items pehle se Store mein hain. Koi duplicate nahi banaya.");return}
  const before=localStorage.getItem(KEY);
  try{
   d.ration.push(...added);
   const json=JSON.stringify(d);localStorage.setItem(KEY,json);
   if(localStorage.getItem(KEY)!==json)throw new Error("Save verification failed");
  }catch(e){
   try{if(before===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,before)}catch(_){}
   alert("Items save nahi hue. Existing data ko bachane ke liye change cancel kiya. Storage space check karein.");return;
  }
  if(typeof window.render==="function")window.render();
  alert(added.length+" naye recipe ration items Store mein add ho gaye. Sabka stock 0 aur rate Rs 0 rakha hai. Jo item nahi kharidna, use Store se Delete kar sakte hain. Purchase karte waqt Purchases page par quantity aur rate bharein.");
 }
 window.addRecipeRationItems=addRecipeRationItems;
})();