(function(){
 "use strict";
 const STORE="crpfMessLoginV1", SESSION="crpfMessLoginSessionV1";
 const path=location.pathname.split("/").pop()||"index.html";
 if(path==="login.html") return;
 if(sessionStorage.getItem(SESSION)!=="yes"){
   location.replace("login.html?next="+encodeURIComponent(path+location.search+location.hash));
   return;
 }
 function addControls(){
   if(document.getElementById("messLoginControls"))return;
   const wrap=document.createElement("div");wrap.id="messLoginControls";
   wrap.style.cssText="position:fixed;right:12px;bottom:12px;z-index:99999;display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end";
   const style="border:1px solid #d8b63d;border-radius:9px;background:#06452f;color:#fff;padding:10px 12px;font:700 12px Arial;box-shadow:0 3px 12px #0007;cursor:pointer";
   const change=document.createElement("button");change.type="button";change.textContent="🔑 NCO Login Change";change.style.cssText=style;
   change.addEventListener("click",()=>location.href="login.html?change=1");
   const out=document.createElement("button");out.type="button";out.textContent="🔒 Logout";out.style.cssText=style;
   out.addEventListener("click",()=>{sessionStorage.removeItem(SESSION);location.replace("login.html");});
   wrap.append(change,out);document.body.appendChild(wrap);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addControls);else addControls();
})();