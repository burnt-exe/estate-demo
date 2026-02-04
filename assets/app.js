/* ---- Utilities ---- */
const LS_KEY = "bc_demo_v1";
const THEME_KEY = "bc_theme";
const ADMIN_KEY = "bc_admin";

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
const uid = (p="x") => `${p}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
const today = () => new Date().toISOString().slice(0,10);

function loadState(){
  const raw = localStorage.getItem(LS_KEY);
  if(raw) return JSON.parse(raw);
  // first run: seed
  return {
    activeComplexId: window.DEMO_SEED.complexes[0].id,
    ...JSON.parse(JSON.stringify(window.DEMO_SEED)),
    leadLog: []
  };
}
function saveState(s){ localStorage.setItem(LS_KEY, JSON.stringify(s)); }
function setTheme(t){ document.documentElement.dataset.theme = t; localStorage.setItem(THEME_KEY, t); }
function getTheme(){ return localStorage.getItem(THEME_KEY) || "light"; }
function isAdmin(){ return localStorage.getItem(ADMIN_KEY) === "1"; }

let state = loadState();

/* ---- Router ---- */
const routes = {
  "#/dashboard": renderDashboard,
  "#/announcements": renderAnnouncements,
  "#/tickets": renderTickets,
  "#/bookings": renderBookings,
  "#/documents": renderDocuments,
  "#/directory": renderDirectory,
  "#/billing": renderBilling,
  "#/settings": renderSettings,
};

function go(hash){
  location.hash = hash;
}
function activeComplex(){
  return state.complexes.find(c => c.id === state.activeComplexId) || state.complexes[0];
}

/* ---- Layout ---- */
function mount(){
  setTheme(getTheme());
  $("#year").textContent = new Date().getFullYear();

  // topbar
  $("#complexName").textContent = activeComplex().name;
  $("#complexMeta").textContent = `${activeComplex().city} • ${activeComplex().units} units`;

  // complex switcher
  const sel = $("#complexSelect");
  sel.innerHTML = state.complexes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  sel.value = state.activeComplexId;
  sel.addEventListener("change", (e)=>{
    state.activeComplexId = e.target.value;
    saveState(state);
    mount(); // refresh header
    route();
  });

  $("#btnTheme").onclick = ()=>{
    const next = (getTheme() === "light") ? "dark" : "light";
    setTheme(next);
    $("#btnTheme").textContent = next === "light" ? "Dark Mode" : "Light Mode";
  };
  $("#btnTheme").textContent = getTheme() === "light" ? "Dark Mode" : "Light Mode";

  $("#adminBadge").textContent = isAdmin() ? "Admin Mode" : "Demo Mode";
  $("#adminBadge").className = `badge`;
  route();
}

function route(){
  const hash = location.hash || "#/dashboard";
  (routes[hash] || renderDashboard)();
  // active nav
  $$(".snav a").forEach(a=>{
    a.dataset.active = (a.getAttribute("href") === hash) ? "1" : "0";
    a.style.background = a.dataset.active==="1" ? "rgba(37,99,235,.10)" : "transparent";
    a.style.color = a.dataset.active==="1" ? "var(--fg)" : "var(--muted)";
  });
}

/* ---- Renderers ---- */
function setMain(html){ $("#main").innerHTML = html; }

function renderDashboard(){
  const c = activeComplex();
  const open = state.tickets.filter(t => t.status !== "Closed").length;
  const urgent = state.tickets.filter(t => t.priority === "High" && t.status !== "Closed").length;
  const ann = state.announcements.slice(0,2);

  setMain(`
    <div class="row">
      <div class="kpi" style="flex:1">
        <div class="small">Open issues</div>
        <div class="h2">${open}</div>
        <div class="p small">Tracked maintenance + security incidents.</div>
      </div>
      <div class="kpi" style="flex:1">
        <div class="small">High priority</div>
        <div class="h2">${urgent}</div>
        <div class="p small">Fast response keeps residents happy.</div>
      </div>
      <div class="kpi" style="flex:1">
        <div class="small">Residents directory</div>
        <div class="h2">${state.residents.length}</div>
        <div class="p small">Controlled visibility + contact info.</div>
      </div>
    </div>

    <div class="hr"></div>

    <div class="split">
      <div class="card">
        <div class="row" style="align-items:center;justify-content:space-between">
          <div>
            <div class="h2">Latest announcements</div>
            <div class="p">Broadcast important updates instantly.</div>
          </div>
          ${isAdmin() ? `<button class="btn" id="newAnn">Post announcement</button>` : `<a class="btn" href="#/announcements">View all</a>`}
        </div>
        <div class="hr"></div>
        ${ann.map(a=>`
          <div style="padding:12px 0;border-bottom:1px solid var(--line)">
            <div class="row" style="align-items:center;justify-content:space-between">
              <strong>${escapeHtml(a.title)}</strong>
              <span class="pill">${escapeHtml(a.tag)}</span>
            </div>
            <div class="small">${a.date}</div>
            <div class="p">${escapeHtml(a.body)}</div>
          </div>
        `).join("")}
      </div>

      <div class="card">
        <div class="h2">Quick actions</div>
        <div class="p">Demo flows that sell the platform in 60 seconds.</div>
        <div class="hr"></div>
        <div class="row">
          <a class="btn" href="#/tickets">Log an issue</a>
          <a class="btn secondary" href="#/bookings">Book a facility</a>
          <a class="btn secondary" href="#/documents">Docs & rules</a>
        </div>
        <div class="hr"></div>
        <div class="card soft">
          <div class="small">Sales hook</div>
          <div><strong>Bundle:</strong> Profile + Website + Tenant Portal + Microsoft 365</div>
          <div class="p small">One vendor, one support channel, one invoice. Cleaner governance.</div>
        </div>
      </div>
    </div>
  `);

  if(isAdmin()){
    const btn = $("#newAnn");
    if(btn) btn.onclick = ()=> go("#/announcements");
  }
}

function renderAnnouncements(){
  setMain(`
    <div class="row" style="align-items:center;justify-content:space-between">
      <div>
        <div class="h2">Announcements</div>
        <div class="p">Send important notices to all residents.</div>
      </div>
      ${isAdmin()? `<button class="btn" id="btnAddAnn">+ New</button>` : ``}
    </div>

    <div class="hr"></div>

    <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${state.announcements.map(a=>`
        <div class="card">
          <div class="row" style="align-items:center;justify-content:space-between">
            <strong>${escapeHtml(a.title)}</strong>
            <span class="pill">${escapeHtml(a.tag)}</span>
          </div>
          <div class="small">${a.date}</div>
          <div class="hr"></div>
          <div class="p">${escapeHtml(a.body)}</div>
          ${isAdmin()? `<div class="hr"></div><button class="btn secondary" data-del="${a.id}">Delete</button>`:``}
        </div>
      `).join("")}
    </div>

    ${isAdmin()? `
      <div class="hr"></div>
      <div class="card">
        <div class="h2">Post new announcement</div>
        <div class="p">This sells “instant comms” hard.</div>
        <div class="hr"></div>
        <div class="row">
          <div style="flex:1">
            <div class="small">Title</div>
            <input class="input" id="annTitle" placeholder="e.g., Lift maintenance schedule" />
          </div>
          <div style="width:220px">
            <div class="small">Tag</div>
            <select id="annTag">
              <option>Maintenance</option>
              <option>Security</option>
              <option>Finance</option>
              <option>Community</option>
            </select>
          </div>
        </div>
        <div class="small" style="margin-top:10px">Message</div>
        <textarea id="annBody" class="input" placeholder="Write the notice..."></textarea>
        <div class="row" style="margin-top:10px;justify-content:flex-end">
          <button class="btn" id="annPost">Post</button>
        </div>
      </div>
    `:``}
  `);

  if(isAdmin()){
    $("#annPost")?.addEventListener("click", ()=>{
      const title = $("#annTitle").value.trim();
      const body = $("#annBody").value.trim();
      const tag = $("#annTag").value;
      if(!title || !body) return alert("Please enter title + message.");
      state.announcements.unshift({ id: uid("a"), title, body, tag, date: today() });
      saveState(state);
      route();
    });

    $$("[data-del]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-del");
        state.announcements = state.announcements.filter(a => a.id !== id);
        saveState(state);
        route();
      });
    });

    $("#btnAddAnn")?.addEventListener("click", ()=>{
      $("#annTitle").focus();
    });
  }
}

function renderTickets(){
  setMain(`
    <div class="row" style="align-items:center;justify-content:space-between">
      <div>
        <div class="h2">Issues & Tickets</div>
        <div class="p">Turn chaos into trackable work (and fewer angry WhatsApps).</div>
      </div>
      <button class="btn" id="btnNewTicket">+ New ticket</button>
    </div>

    <div class="hr"></div>

    <div class="card">
      <div class="row" style="gap:12px;align-items:flex-end">
        <div style="flex:1">
          <div class="small">Search</div>
          <input class="input" id="q" placeholder="Search by title, unit, status..." />
        </div>
        <div style="width:220px">
          <div class="small">Status</div>
          <select id="statusFilter">
            <option value="">All</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Closed</option>
          </select>
        </div>
        <div style="width:220px">
          <div class="small">Priority</div>
          <select id="prioFilter">
            <option value="">All</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
      </div>
      <div class="hr"></div>
      <table class="table" id="ticketTable"></table>
    </div>

    <div class="hr"></div>

    <div class="card" id="ticketForm" style="display:none">
      <div class="h2">Log a new issue</div>
      <div class="p">This is the “instant value” flow during a sales demo.</div>
      <div class="hr"></div>
      <div class="row">
        <div style="flex:1">
          <div class="small">Title</div>
          <input class="input" id="tTitle" placeholder="e.g., Intercom not working" />
        </div>
        <div style="width:220px">
          <div class="small">Category</div>
          <select id="tCat">
            <option>Security</option>
            <option>Electrical</option>
            <option>Plumbing</option>
            <option>General</option>
          </select>
        </div>
        <div style="width:220px">
          <div class="small">Priority</div>
          <select id="tPrio">
            <option>High</option>
            <option selected>Medium</option>
            <option>Low</option>
          </select>
        </div>
      </div>
      <div class="row" style="margin-top:10px">
        <div style="width:220px">
          <div class="small">Unit</div>
          <input class="input" id="tUnit" placeholder="e.g., B-204" />
        </div>
        <div style="flex:1">
          <div class="small">Details</div>
          <input class="input" id="tDetails" placeholder="Short description..." />
        </div>
      </div>
      <div class="row" style="margin-top:12px;justify-content:flex-end">
        <button class="btn secondary" id="tCancel">Cancel</button>
        <button class="btn" id="tSubmit">Submit</button>
      </div>
    </div>
  `);

  const renderTable = ()=>{
    const q = ($("#q").value || "").toLowerCase().trim();
    const sf = $("#statusFilter").value;
    const pf = $("#prioFilter").value;

    const rows = state.tickets
      .filter(t => !sf || t.status === sf)
      .filter(t => !pf || t.priority === pf)
      .filter(t => !q || `${t.title} ${t.unit} ${t.status} ${t.category}`.toLowerCase().includes(q));

    const pill = (t)=>{
      const cls = t.status === "Closed" ? "good" : (t.priority === "High" ? "bad" : "warn");
      return `<span class="pill ${cls}">${t.status}</span>`;
    };

    $("#ticketTable").innerHTML = `
      <tr>
        <td><strong>Ticket</strong></td>
        <td><strong>Unit</strong></td>
        <td><strong>Category</strong></td>
        <td><strong>Priority</strong></td>
        <td><strong>Status</strong></td>
        <td><strong>Actions</strong></td>
      </tr>
      ${rows.map(t=>`
        <tr>
          <td>${escapeHtml(t.title)}<div class="small">${t.created}</div></td>
          <td>${escapeHtml(t.unit || "-")}</td>
          <td>${escapeHtml(t.category)}</td>
          <td>${escapeHtml(t.priority)}</td>
          <td>${pill(t)}</td>
          <td>
            ${isAdmin() ? `
              <button class="btn secondary" data-next="${t.id}">Next status</button>
              <button class="btn secondary" data-close="${t.id}">Close</button>
            ` : `
              <span class="small">Admin can update</span>
            `}
          </td>
        </tr>
      `).join("")}
    `;

    if(isAdmin()){
      $$("[data-next]").forEach(b=>{
        b.onclick = ()=>{
          const id = b.getAttribute("data-next");
          const t = state.tickets.find(x=>x.id===id);
          if(!t) return;
          t.status = (t.status==="Open") ? "In Progress" : (t.status==="In Progress" ? "Closed" : "Closed");
          saveState(state);
          renderTable();
        };
      });
      $$("[data-close]").forEach(b=>{
        b.onclick = ()=>{
          const id = b.getAttribute("data-close");
          const t = state.tickets.find(x=>x.id===id);
          if(!t) return;
          t.status = "Closed";
          saveState(state);
          renderTable();
        };
      });
    }
  };

  $("#q").oninput = renderTable;
  $("#statusFilter").onchange = renderTable;
  $("#prioFilter").onchange = renderTable;

  $("#btnNewTicket").onclick = ()=>{
    $("#ticketForm").style.display = "block";
    $("#tTitle").focus();
  };
  $("#tCancel").onclick = ()=> $("#ticketForm").style.display = "none";
  $("#tSubmit").onclick = ()=>{
    const title = $("#tTitle").value.trim();
    const category = $("#tCat").value;
    const priority = $("#tPrio").value;
    const unit = $("#tUnit").value.trim();
    const details = $("#tDetails").value.trim();
    if(!title) return alert("Please enter a ticket title.");
    state.tickets.unshift({
      id: uid("t"),
      title,
      category,
      priority,
      status: "Open",
      created: today(),
      unit: unit || "-",
      details
    });
    saveState(state);
    $("#ticketForm").style.display = "none";
    renderTable();
  };

  renderTable();
}

function renderBookings(){
  setMain(`
    <div class="row" style="align-items:center;justify-content:space-between">
      <div>
        <div class="h2">Facility bookings</div>
        <div class="p">Clubhouse, braai area, meeting room — whatever the complex has.</div>
      </div>
      <button class="btn" id="btnBook">+ New booking</button>
    </div>

    <div class="hr"></div>

    <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${state.bookings.map(b=>`
        <div class="card">
          <div class="row" style="align-items:center;justify-content:space-between">
            <strong>${escapeHtml(b.facility)}</strong>
            <span class="pill good">${escapeHtml(b.status)}</span>
          </div>
          <div class="hr"></div>
          <div><span class="small">Date</span><div><strong>${b.date}</strong></div></div>
          <div style="margin-top:8px"><span class="small">Time</span><div><strong>${escapeHtml(b.time)}</strong></div></div>
          <div style="margin-top:8px"><span class="small">Unit</span><div><strong>${escapeHtml(b.unit)}</strong></div></div>
        </div>
      `).join("")}
    </div>

    <div class="hr"></div>

    <div class="card" id="bookForm" style="display:none">
      <div class="h2">Request a booking</div>
      <div class="p">Instant “wow” feature for residents.</div>
      <div class="hr"></div>
      <div class="row">
        <div style="flex:1">
          <div class="small">Facility</div>
          <select id="bFac">
            <option>Clubhouse</option>
            <option>Braai Area</option>
            <option>Meeting Room</option>
            <option>Sports Court</option>
          </select>
        </div>
        <div style="width:220px">
          <div class="small">Date</div>
          <input class="input" id="bDate" type="date" />
        </div>
        <div style="width:220px">
          <div class="small">Time</div>
          <input class="input" id="bTime" placeholder="e.g., 14:00–16:00" />
        </div>
        <div style="width:220px">
          <div class="small">Unit</div>
          <input class="input" id="bUnit" placeholder="e.g., B-204" />
        </div>
      </div>
      <div class="row" style="margin-top:12px;justify-content:flex-end">
        <button class="btn secondary" id="bCancel">Cancel</button>
        <button class="btn" id="bSubmit">Submit</button>
      </div>
    </div>
  `);

  $("#btnBook").onclick = ()=>{
    $("#bookForm").style.display="block";
    $("#bDate").value = today();
    $("#bTime").value = "16:00–18:00";
    $("#bUnit").focus();
  };
  $("#bCancel").onclick = ()=> $("#bookForm").style.display="none";
  $("#bSubmit").onclick = ()=>{
    const facility = $("#bFac").value;
    const date = $("#bDate").value || today();
    const time = $("#bTime").value.trim() || "TBD";
    const unit = $("#bUnit").value.trim() || "-";
    state.bookings.unshift({ id: uid("b"), facility, date, time, unit, status:"Confirmed" });
    saveState(state);
    route();
  };
}

function renderDocuments(){
  setMain(`
    <div class="row" style="align-items:center;justify-content:space-between">
      <div>
        <div class="h2">Documents</div>
        <div class="p">House rules, levy statements, minutes, policies.</div>
      </div>
      ${isAdmin()? `<button class="btn" id="btnAddDoc">+ Add</button>`:""}
    </div>

    <div class="hr"></div>

    <div class="card">
      <table class="table">
        <tr>
          <td><strong>Name</strong></td>
          <td><strong>Type</strong></td>
          <td><strong>Updated</strong></td>
          <td><strong>Link</strong></td>
        </tr>
        ${state.docs.map(d=>`
          <tr>
            <td>${escapeHtml(d.name)}</td>
            <td>${escapeHtml(d.type)}</td>
            <td>${d.updated}</td>
            <td><a class="btn secondary" href="${d.link}" onclick="return false;">Open</a></td>
          </tr>
        `).join("")}
      </table>
      <div class="small">In production, these would be stored in SharePoint/OneDrive with access control.</div>
    </div>

    ${isAdmin()? `
      <div class="hr"></div>
      <div class="card" id="docForm" style="display:none">
        <div class="h2">Add document link</div>
        <div class="p">For demo: store a placeholder link. For production: SharePoint.</div>
        <div class="hr"></div>
        <div class="row">
          <div style="flex:1">
            <div class="small">Name</div>
            <input class="input" id="dName" placeholder="e.g., AGM Minutes (PDF)" />
          </div>
          <div style="width:220px">
            <div class="small">Type</div>
            <select id="dType">
              <option>Policy</option>
              <option>Finance</option>
              <option>Meeting</option>
              <option>Forms</option>
            </select>
          </div>
        </div>
        <div class="row" style="margin-top:10px">
          <div style="flex:1">
            <div class="small">Link</div>
            <input class="input" id="dLink" placeholder="https://..." />
          </div>
        </div>
        <div class="row" style="margin-top:12px;justify-content:flex-end">
          <button class="btn secondary" id="dCancel">Cancel</button>
          <button class="btn" id="dSubmit">Add</button>
        </div>
      </div>
    `:""}
  `);

  if(isAdmin()){
    $("#btnAddDoc").onclick = ()=> $("#docForm").style.display="block";
    $("#dCancel").onclick = ()=> $("#docForm").style.display="none";
    $("#dSubmit").onclick = ()=>{
      const name = $("#dName").value.trim();
      const type = $("#dType").value;
      const link = $("#dLink").value.trim() || "#";
      if(!name) return alert("Add a document name.");
      state.docs.unshift({ id: uid("d"), name, type, link, updated: today() });
      saveState(state);
      route();
    };
  }
}

function renderDirectory(){
  setMain(`
    <div class="row" style="align-items:center;justify-content:space-between">
      <div>
        <div class="h2">Resident directory</div>
        <div class="p">Controlled visibility: residents + body corporate contacts.</div>
      </div>
      ${isAdmin()? `<button class="btn" id="btnAddRes">+ Add</button>`:""}
    </div>

    <div class="hr"></div>

    <div class="card">
      <div class="row" style="gap:12px;align-items:flex-end">
        <div style="flex:1">
          <div class="small">Search</div>
          <input class="input" id="rq" placeholder="Search name, unit, role..." />
        </div>
        <div style="width:220px">
          <div class="small">Role</div>
          <select id="rRole">
            <option value="">All</option>
            <option>Resident</option>
            <option>Body Corporate</option>
          </select>
        </div>
      </div>
      <div class="hr"></div>
      <div class="grid" id="resGrid" style="grid-template-columns:repeat(2,minmax(0,1fr))"></div>
    </div>

    ${isAdmin()? `
      <div class="hr"></div>
      <div class="card" id="resForm" style="display:none">
        <div class="h2">Add resident</div>
        <div class="hr"></div>
        <div class="row">
          <div style="flex:1"><div class="small">Name</div><input class="input" id="rName" /></div>
          <div style="width:220px"><div class="small">Unit</div><input class="input" id="rUnit" /></div>
          <div style="width:220px"><div class="small">Role</div>
            <select id="rNewRole"><option>Resident</option><option>Body Corporate</option></select>
          </div>
        </div>
        <div class="row" style="margin-top:10px">
          <div style="flex:1"><div class="small">Phone</div><input class="input" id="rPhone" /></div>
        </div>
        <div class="row" style="margin-top:12px;justify-content:flex-end">
          <button class="btn secondary" id="rCancel">Cancel</button>
          <button class="btn" id="rSubmit">Add</button>
        </div>
      </div>
    `:""}
  `);

  const render = ()=>{
    const q = ($("#rq").value||"").toLowerCase().trim();
    const role = $("#rRole").value;

    const list = state.residents
      .filter(r => !role || r.role === role)
      .filter(r => !q || `${r.name} ${r.unit} ${r.role}`.toLowerCase().includes(q));

    $("#resGrid").innerHTML = list.map(r=>`
      <div class="card soft" style="background:var(--bg)">
        <div class="row" style="align-items:center;justify-content:space-between">
          <strong>${escapeHtml(r.name)}</strong>
          <span class="pill">${escapeHtml(r.role)}</span>
        </div>
        <div class="small">Unit: ${escapeHtml(r.unit)}</div>
        <div class="small">Phone: ${escapeHtml(r.phone)}</div>
      </div>
    `).join("");
  };

  $("#rq").oninput = render;
  $("#rRole").onchange = render;
  render();

  if(isAdmin()){
    $("#btnAddRes").onclick = ()=> $("#resForm").style.display="block";
    $("#rCancel").onclick = ()=> $("#resForm").style.display="none";
    $("#rSubmit").onclick = ()=>{
      const name = $("#rName").value.trim();
      const unit = $("#rUnit").value.trim();
      const phone = $("#rPhone").value.trim();
      const rrole = $("#rNewRole").value;
      if(!name || !unit) return alert("Name + unit are required.");
      state.residents.unshift({ id: uid("r"), name, unit, phone: phone||"-", role: rrole });
      saveState(state);
      route();
    };
  }
}

function renderBilling(){
  setMain(`
    <div class="card">
      <div class="h2">Billing & Levy Payments</div>
      <div class="p">This page is designed to sell the bundle: portal + comms + M365.</div>
      <div class="hr"></div>

      <div class="row">
        <div style="flex:1">
          <div class="small">Levy statement</div>
          <div class="card soft" style="background:var(--bg)">
            <div class="row" style="align-items:center;justify-content:space-between">
              <strong>Sample levy statement</strong>
              <span class="pill good">Up to date</span>
            </div>
            <div class="small">Generated: ${today()}</div>
            <div class="hr"></div>
            <div class="p small">Production: pull statements from accounting system + send via email automation.</div>
          </div>
        </div>

        <div style="flex:1">
          <div class="small">Payment options</div>
          <div class="card soft" style="background:var(--bg)">
            <div class="p">Promote “one click pay” integrations (PayFast / Ozow / EFT reference).</div>
            <div class="row">
              <button class="btn" onclick="alert('Demo: redirect to payment gateway')">Pay levy</button>
              <button class="btn secondary" onclick="alert('Demo: generate EFT reference')">Generate EFT ref</button>
            </div>
            <div class="hr"></div>
            <div class="small">Upsell: automated reminders + receipts + monthly statement email.</div>
          </div>
        </div>
      </div>
    </div>
  `);
}

function renderSettings(){
  setMain(`
    <div class="card">
      <div class="h2">Settings</div>
      <div class="p">Theme, demo reset, admin mode.</div>
      <div class="hr"></div>

      <div class="row">
        <div style="flex:1">
          <div class="card soft" style="background:var(--bg)">
            <div><strong>Admin Mode</strong></div>
            <div class="p small">Enable to post announcements, manage tickets, add residents.</div>
            <div class="row">
              <button class="btn" id="enableAdmin">Enable Admin Mode</button>
              <button class="btn secondary" id="disableAdmin">Disable</button>
            </div>
            <div class="small">Demo PIN: <span style="font-family:var(--mono)">3650</span></div>
          </div>
        </div>

        <div style="flex:1">
          <div class="card soft" style="background:var(--bg)">
            <div><strong>Reset demo data</strong></div>
            <div class="p small">Wipe localStorage and reseed default demo content.</div>
            <div class="row">
              <button class="btn secondary" id="reset">Reset</button>
              <button class="btn ghost" id="seedLink">Generate “Demo Link”</button>
            </div>
            <div class="small" id="seedOut"></div>
          </div>
        </div>
      </div>

      <div class="hr"></div>

      <div class="card soft" style="background:var(--bg)">
        <div><strong>Sales script (built in)</strong></div>
        <ol class="p">
          <li>Switch complex → show multi-site management.</li>
          <li>Log a ticket → show tracking and status changes.</li>
          <li>Post announcement (Admin) → show instant comms.</li>
          <li>Bookings + Documents → show resident self-service.</li>
          <li>Billing page → pitch payment automation + M365 bundle.</li>
        </ol>
      </div>
    </div>
  `);

  $("#enableAdmin").onclick = ()=>{
    const pin = prompt("Enter Admin PIN");
    if(pin === "3650"){
      localStorage.setItem(ADMIN_KEY,"1");
      $("#adminBadge").textContent="Admin Mode";
      alert("Admin Mode enabled.");
      route();
    } else alert("Wrong PIN.");
  };
  $("#disableAdmin").onclick = ()=>{
    localStorage.removeItem(ADMIN_KEY);
    $("#adminBadge").textContent="Demo Mode";
    alert("Admin Mode disabled.");
    route();
  };
  $("#reset").onclick = ()=>{
    if(!confirm("Reset demo data?")) return;
    localStorage.removeItem(LS_KEY);
    state = loadState();
    saveState(state);
    alert("Reset complete.");
    mount();
  };

  // Demo seed link (so sales can send a URL that sets context)
  $("#seedLink").onclick = ()=>{
    const payload = btoa(JSON.stringify({
      complex: state.activeComplexId,
      ts: Date.now()
    }));
    const url = `${location.origin}${location.pathname}?seed=${encodeURIComponent(payload)}#/dashboard`;
    $("#seedOut").textContent = `Copy: ${url}`;
  };
}

/* ---- Helpers ---- */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

/* ---- Seed via URL ---- */
function applySeedFromUrl(){
  const u = new URL(location.href);
  const seed = u.searchParams.get("seed");
  if(!seed) return;
  try{
    const decoded = JSON.parse(atob(seed));
    if(decoded.complex){
      state.activeComplexId = decoded.complex;
      saveState(state);
    }
  }catch(e){}
}

/* ---- PWA ---- */
async function registerSW(){
  if("serviceWorker" in navigator){
    try{ await navigator.serviceWorker.register("./pwa/sw.js"); }catch(e){}
  }
}

window.addEventListener("hashchange", route);
applySeedFromUrl();
saveState(state);
registerSW();
window.addEventListener("DOMContentLoaded", mount);
