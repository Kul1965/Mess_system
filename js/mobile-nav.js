/* Shared mobile app navigation for every CRPF Mess page */
(function(){
 const sidebar=document.querySelector(".sidebar"),topbar=document.querySelector(".topbar");
 if(!sidebar||!topbar||document.querySelector(".mobile-menu-toggle"))return;
 const button=document.createElement("button");
 button.type="button";button.className="mobile-menu-toggle";button.textContent="☰";
 button.setAttribute("aria-label","Open navigation menu");button.setAttribute("aria-expanded","false");
 const backdrop=document.createElement("div");backdrop.className="mobile-menu-backdrop";backdrop.setAttribute("aria-hidden","true");
 document.body.appendChild(backdrop);topbar.insertBefore(button,topbar.firstChild);
 function close(){document.body.classList.remove("mobile-nav-open");button.textContent="☰";button.setAttribute("aria-expanded","false");button.setAttribute("aria-label","Open navigation menu");}
 function open(){document.body.classList.add("mobile-nav-open");button.textContent="×";button.setAttribute("aria-expanded","true");button.setAttribute("aria-label","Close navigation menu");}
 button.addEventListener("click",()=>document.body.classList.contains("mobile-nav-open")?close():open());
 backdrop.addEventListener("click",close);
 sidebar.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));
 document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
 window.addEventListener("resize",()=>{if(window.innerWidth>700)close();});
})();