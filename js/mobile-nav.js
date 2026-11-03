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

 /* Mobile header alignment for phone screens */
 (function(){
  if(document.getElementById("mobile-header-alignment"))return;
  const style=document.createElement("style");
  style.id="mobile-header-alignment";
  style.textContent=`
   @media(max-width:850px){
    .topbar{
     display:grid!important;
     grid-template-columns:46px minmax(0,1fr)!important;
     grid-template-rows:auto auto!important;
     align-items:center!important;
     justify-content:initial!important;
     flex-direction:initial!important;
     gap:6px 10px!important;
     padding:10px 12px!important;
     min-height:0!important;
     width:100%!important;
    }
    .topbar>.mobile-menu-toggle{
     grid-column:1!important;grid-row:1!important;
     align-self:center!important;justify-self:start!important;
     margin:0!important;
    }
    .topbar>:not(.mobile-menu-toggle):first-of-type,
    .topbar>h1{
     grid-column:2!important;grid-row:1!important;
     min-width:0!important;width:100%!important;
     align-self:center!important;margin:0!important;
    }
    .topbar>:not(.mobile-menu-toggle):nth-child(3){
     grid-column:2!important;grid-row:2!important;
     min-width:0!important;width:100%!important;
    }
    .topbar h1,.topbar .heading h1{
     font-size:clamp(15px,4.2vw,18px)!important;
     line-height:1.2!important;
     margin:0 0 2px!important;
     overflow-wrap:anywhere!important;
    }
    .topbar p,.topbar small{
     font-size:10px!important;line-height:1.3!important;
     margin:2px 0 0!important;
    }
    .topbar #dateNow,.topbar #date,.topbar #dateDisplay{
     font-size:11px!important;line-height:1.3!important;
     white-space:normal!important;
     justify-self:start!important;
    }
    .topbar .top-info{
     display:flex!important;grid-column:1/-1!important;grid-row:2!important;
     width:100%!important;min-width:0!important;
     justify-content:flex-start!important;gap:6px!important;
     flex-wrap:wrap!important;margin:0!important;
    }
    .topbar .info-pill{
     padding:6px 8px!important;font-size:10px!important;
     white-space:normal!important;max-width:100%!important;
    }
   }
  `;
  document.head.appendChild(style);
 })();
 