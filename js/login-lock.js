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
   wrap.style.cssText="display:flex;align-items:center;gap:5px;flex:0 0 auto;margin-left:4px;white-space:nowrap";
   const style="border:1px solid #d8b63d;border-radius:7px;background:#06452f;color:#fff;padding:5px 8px;font:700 10px Arial;box-shadow:0 2px 5px #0005;cursor:pointer;white-space:nowrap";
   const change=document.createElement("button");change.type="button";change.textContent="🔑 Login Change";change.style.cssText=style;
   change.addEventListener("click",()=>location.href="login.html?change=1");
   const out=document.createElement("button");out.type="button";out.textContent="🔒 Logout";out.style.cssText=style;
   out.addEventListener("click",()=>{sessionStorage.removeItem(SESSION);location.replace("login.html");});
   wrap.append(change,out);
   const info=document.querySelector(".topbar>.top-info");
   const nco=info?.querySelector(".nco-pill");
   if(nco){nco.insertAdjacentElement("afterend",wrap);}
   else if(info){info.appendChild(wrap);}
   else{document.querySelector(".topbar")?.appendChild(wrap);}
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addControls);else addControls();
})();