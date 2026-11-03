/* Shared mobile app navigation for every CRPF Mess page */
(function(){
 function init(){
  const sidebar=document.querySelector(".sidebar");
  const topbar=document.querySelector(".topbar");
  if(!sidebar||!topbar)return;
  let button=document.querySelector(".mobile-menu-toggle");
  if(!button){
   button=document.createElement("button");
   button.type="button";
   button.className="mobile-menu-toggle";
   button.textContent="☰";
   button.setAttribute("aria-label","Open navigation menu");
   button.setAttribute("aria-expanded","false");
   topbar.insertBefore(button,topbar.firstChild);
  }
  let backdrop=document.querySelector(".mobile-menu-backdrop");
  if(!backdrop){
   backdrop=document.createElement("div");
   backdrop.className="mobile-menu-backdrop";
   backdrop.setAttribute("aria-hidden","true");
   document.body.appendChild(backdrop);
  }
  if(button.dataset.mobileNavReady==="yes")return;
  button.dataset.mobileNavReady="yes";
  function close(){
   document.body.classList.remove("mobile-nav-open");
   button.textContent="☰";
   button.setAttribute("aria-expanded","false");
   button.setAttribute("aria-label","Open navigation menu");
  }
  function open(){
   document.body.classList.add("mobile-nav-open");
   button.textContent="×";
   button.setAttribute("aria-expanded","true");
   button.setAttribute("aria-label","Close navigation menu");
  }
  button.addEventListener("click",function(e){
   e.preventDefault();
   if(document.body.classList.contains("mobile-nav-open"))close();else open();
  });
  backdrop.addEventListener("click",close);
  sidebar.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
  window.addEventListener("resize",()=>{if(window.innerWidth>850)close()});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
 else init();
})();
