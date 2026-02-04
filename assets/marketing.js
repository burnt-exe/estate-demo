const LEADS = "bc_leads";
const $ = (s, el=document)=> el.querySelector(s);

function saveLead(lead){
  const arr = JSON.parse(localStorage.getItem(LEADS) || "[]");
  arr.unshift({ ...lead, ts: new Date().toISOString() });
  localStorage.setItem(LEADS, JSON.stringify(arr));
}

function bindLeadForms(){
  document.querySelectorAll("[data-lead-form]").forEach(form=>{
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if(!data.name || !data.email) return alert("Please add name + email.");
      saveLead(data);
      alert("Lead captured (demo). In production, this submits to Microsoft Forms / CRM.");
      form.reset();
    });
  });
}

window.addEventListener("DOMContentLoaded", bindLeadForms);
