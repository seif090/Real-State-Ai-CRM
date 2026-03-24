const state = {
  token: localStorage.getItem("crm_token") || "",
  user: readStoredJson("crm_user"),
  dashboard: null,
  leads: [],
  properties: [],
  deals: [],
  conversations: [],
  users: [],
  aiRuns: []
};

const authSection = document.getElementById("authSection");
const dashboardSection = document.getElementById("dashboardSection");
const sessionState = document.getElementById("sessionState");
const logoutButton = document.getElementById("logoutButton");
const statsGrid = document.getElementById("statsGrid");
const toast = document.getElementById("toast");
const statusBadge = document.getElementById("statusBadge");
const dealsBoard = document.getElementById("dealsBoard");
const detailDrawer = document.getElementById("detailDrawer");
const detailEyebrow = document.getElementById("detailEyebrow");
const detailTitle = document.getElementById("detailTitle");
const detailBody = document.getElementById("detailBody");

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const leadForm = document.getElementById("leadForm");
const propertyForm = document.getElementById("propertyForm");
const dealForm = document.getElementById("dealForm");

const leadsList = document.getElementById("leadsList");
const propertiesList = document.getElementById("propertiesList");
const dealsList = document.getElementById("dealsList");
const conversationsList = document.getElementById("conversationsList");
const aiRunsList = document.getElementById("aiRunsList");

const dealLeadId = document.getElementById("dealLeadId");
const dealPropertyId = document.getElementById("dealPropertyId");
const dealOwnerUserId = document.getElementById("dealOwnerUserId");

document.getElementById("refreshLeads").addEventListener("click", () => loadLeads());
document.getElementById("refreshProperties").addEventListener("click", () => loadProperties());
document.getElementById("refreshDeals").addEventListener("click", () => loadDeals());
document.getElementById("refreshConversations").addEventListener("click", () => loadConversations());
document.getElementById("refreshBoard").addEventListener("click", () => loadDeals());
document.getElementById("refreshAiRuns").addEventListener("click", () => loadAiRuns());
document.getElementById("closeDrawer").addEventListener("click", closeDrawer);
logoutButton.addEventListener("click", logout);

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(registerForm).entries());
  const data = await api("/api/auth/register-company", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!data) return;
  establishSession(data.token, data.user);
  registerForm.reset();
  await bootDashboard();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(loginForm).entries());
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!data) return;
  establishSession(data.token, data.user);
  loginForm.reset();
  await bootDashboard();
});

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = pruneEmpty({
    ...Object.fromEntries(new FormData(leadForm).entries())
  });
  const data = await api("/api/leads", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!data) return;
  leadForm.reset();
  notify("تم حفظ العميل");
  await Promise.all([loadDashboard(), loadLeads()]);
});

propertyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const raw = Object.fromEntries(new FormData(propertyForm).entries());
  const payload = pruneEmpty({
    ...raw,
    price: Number(raw.price)
  });
  const data = await api("/api/properties", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!data) return;
  propertyForm.reset();
  notify("تم حفظ العقار");
  await Promise.all([loadDashboard(), loadProperties()]);
});

dealForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const raw = Object.fromEntries(new FormData(dealForm).entries());
  const payload = pruneEmpty({
    ...raw,
    value: raw.value ? Number(raw.value) : undefined
  });
  const data = await api("/api/deals", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!data) return;
  dealForm.reset();
  notify("تم إنشاء الصفقة");
  await Promise.all([loadDashboard(), loadDeals()]);
});

async function bootDashboard() {
  renderSession();

  if (!state.token) {
    authSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    return;
  }

  authSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  await Promise.all([
    state.user?.role === "SALES_AGENT" ? Promise.resolve(useCurrentUserAsOwner()) : loadUsers(),
    loadDashboard(),
    loadAiRuns(),
    loadLeads(),
    loadProperties(),
    loadDeals(),
    loadConversations()
  ]);
}

async function loadDashboard() {
  const data = await api("/api/dashboard/summary");
  if (!data) return;
  state.dashboard = data;
  renderStats();
}

async function loadUsers() {
  const data = await api("/api/users");
  if (!data) return;
  state.users = data;
  renderDealOptions();
}

async function loadLeads() {
  const data = await api("/api/leads");
  if (!data) return;
  state.leads = data;
  renderList(
    leadsList,
    state.leads.map((lead) => ({
      id: lead.id,
      kind: "lead",
      status: lead.status,
      title: lead.fullName || lead.phone,
      subtitle: `${lead.phone} • ${lead.status}`,
      meta: `${lead.preferredLocation || "بدون موقع"}${lead.assignedTo ? ` • ${lead.assignedTo.fullName}` : ""}`
    }))
  );
  renderDealOptions();
}

async function loadProperties() {
  const data = await api("/api/properties");
  if (!data) return;
  state.properties = data;
  renderList(
    propertiesList,
    state.properties.map((property) => ({
      id: property.id,
      kind: "property",
      title: property.title,
      subtitle: `${property.locationText} • ${property.status}`,
      meta: `${property.listingType} • ${formatMoney(property.price)} ${property.currency}`
    }))
  );
  renderDealOptions();
}

async function loadDeals() {
  const data = await api("/api/deals");
  if (!data) return;
  state.deals = data;
  renderList(
    dealsList,
    state.deals.map((deal) => ({
      id: deal.id,
      kind: "deal",
      title: deal.lead?.fullName || deal.lead?.phone || "صفقة",
      subtitle: `${deal.stage} • ${deal.owner?.fullName || "-"}`,
      meta: `${deal.property?.title || "بدون عقار"}${deal.value ? ` • ${formatMoney(deal.value)}` : ""}`
    }))
  );
  renderDealsBoard();
}

async function loadConversations() {
  const data = await api("/api/conversations");
  if (!data) return;
  state.conversations = data;
  renderList(
    conversationsList,
    state.conversations.map((conversation) => {
      const lastMessage = conversation.messages?.[0];
      return {
        id: conversation.id,
        kind: "conversation",
        title: conversation.lead?.fullName || conversation.lead?.phone || "محادثة",
        subtitle: `${conversation.channel} • ${conversation.status}`,
        meta: lastMessage ? truncate(lastMessage.content, 110) : "لا توجد رسائل بعد"
      };
    })
  );
}

async function loadAiRuns() {
  const data = await api("/api/ai/runs");
  if (!data) return;
  state.aiRuns = data;
  renderList(
    aiRunsList,
    state.aiRuns.map((run) => ({
      id: run.id,
      kind: "aiRun",
      title: `${run.taskType} • ${run.provider}`,
      subtitle: `${run.status} • ${run.lead?.fullName || run.lead?.phone || "Lead"}`,
      meta: `${formatDate(run.createdAt)}${run.recommendations?.length ? ` • ${run.recommendations.length} matches` : ""}`
    }))
  );
}

function renderSession() {
  if (!state.token || !state.user) {
    sessionState.textContent = "غير مسجل الدخول";
    logoutButton.classList.add("hidden");
    statusBadge.textContent = "جاهز";
    return;
  }

  sessionState.textContent = `${state.user.fullName} • ${state.user.role}`;
  logoutButton.classList.remove("hidden");
  statusBadge.textContent = "متصل";
}

function renderStats() {
  if (!state.dashboard) {
    statsGrid.innerHTML = "";
    return;
  }

  const items = [
    ["إجمالي العملاء", state.dashboard.totalLeads],
    ["عملاء جدد", state.dashboard.newLeads],
    ["صفقات نشطة", state.dashboard.activeDeals],
    ["صفقات مغلقة", state.dashboard.closedWonDeals],
    ["العقارات", state.dashboard.totalProperties]
  ];

  statsGrid.innerHTML = items
    .map(
      ([label, value]) => `
        <article class="stat">
          <div class="stat-label">${label}</div>
          <div class="stat-value">${value}</div>
        </article>
      `
    )
    .join("");
}

function renderDealOptions() {
  populateSelect(
    dealLeadId,
    state.leads.map((lead) => ({
      value: lead.id,
      label: `${lead.fullName || lead.phone} (${lead.status})`
    })),
    "اختر العميل"
  );

  populateSelect(
    dealPropertyId,
    state.properties.map((property) => ({
      value: property.id,
      label: property.title
    })),
    "بدون عقار"
  );

  populateSelect(
    dealOwnerUserId,
    state.users.map((user) => ({
      value: user.id,
      label: `${user.fullName} (${user.role})`
    })),
    "اختر المالك"
  );
}

function useCurrentUserAsOwner() {
  state.users = state.user ? [state.user] : [];
  renderDealOptions();
}

function renderDealsBoard() {
  const columns = [
    { key: "LEAD", label: "Lead" },
    { key: "QUALIFIED", label: "Qualified" },
    { key: "VIEWING", label: "Viewing" },
    { key: "NEGOTIATION", label: "Negotiation" }
  ];

  dealsBoard.innerHTML = columns
    .map((column) => {
      const items = state.deals.filter((deal) => deal.stage === column.key);
      return `
        <section class="kanban-column">
          <h4>${column.label} (${items.length})</h4>
          ${
            items.length
              ? items.map(renderKanbanCard).join("")
              : '<div class="list-item"><p>لا توجد صفقات.</p></div>'
          }
        </section>
      `;
    })
    .join("");

  document.querySelectorAll("[data-deal-stage]").forEach((element) => {
    element.addEventListener("change", async (event) => {
      const target = event.currentTarget;
      const dealId = target.getAttribute("data-deal-id");
      const stage = target.value;
      await updateDealStage(dealId, stage);
    });
  });

  document.querySelectorAll("[data-open-lead]").forEach((element) => {
    element.addEventListener("click", async (event) => {
      const leadId = event.currentTarget.getAttribute("data-open-lead");
      await openLeadDetails(leadId);
    });
  });
}

function renderKanbanCard(deal) {
  return `
    <article class="kanban-card">
      <h5>${escapeHtml(deal.lead?.fullName || deal.lead?.phone || "صفقة")}</h5>
      <p>${escapeHtml(deal.property?.title || "بدون عقار")}</p>
      <p>${escapeHtml(deal.owner?.fullName || "-")}${deal.value ? ` • ${formatMoney(deal.value)}` : ""}</p>
      <select class="inline-select" data-deal-stage data-deal-id="${deal.id}">
        ${["LEAD", "QUALIFIED", "VIEWING", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"]
          .map((stage) => `<option value="${stage}" ${stage === deal.stage ? "selected" : ""}>${stage}</option>`)
          .join("")}
      </select>
    </article>
  `;
}

function populateSelect(element, options, placeholder) {
  const placeholderOption = `<option value="">${placeholder}</option>`;
  element.innerHTML = placeholderOption + options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
}

function renderList(container, items) {
  if (!items.length) {
    container.innerHTML = `<div class="list-item"><p>لا توجد بيانات بعد.</p></div>`;
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <article class="list-item">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.subtitle)}</p>
          <p>${escapeHtml(item.meta)}</p>
          ${renderItemActions(item)}
        </article>
      `
    )
    .join("");

  container.querySelectorAll("[data-lead-status]").forEach((element) => {
    element.addEventListener("change", async (event) => {
      const target = event.currentTarget;
      await updateLeadStatus(target.getAttribute("data-lead-id"), target.value);
    });
  });

  container.querySelectorAll("[data-open-lead]").forEach((element) => {
    element.addEventListener("click", async (event) => {
      const leadId = event.currentTarget.getAttribute("data-open-lead");
      await openLeadDetails(leadId);
    });
  });

  container.querySelectorAll("[data-open-property]").forEach((element) => {
    element.addEventListener("click", async (event) => {
      const propertyId = event.currentTarget.getAttribute("data-open-property");
      await openPropertyDetails(propertyId);
    });
  });

  container.querySelectorAll("[data-open-conversation]").forEach((element) => {
    element.addEventListener("click", async (event) => {
      const conversationId = event.currentTarget.getAttribute("data-open-conversation");
      await openConversationDetails(conversationId);
    });
  });

  container.querySelectorAll("[data-open-ai-run]").forEach((element) => {
    element.addEventListener("click", async (event) => {
      const runId = event.currentTarget.getAttribute("data-open-ai-run");
      await openAiRunDetails(runId);
    });
  });
}

function renderItemActions(item) {
  if (item.kind === "lead") {
    return `
      <div class="list-actions">
        <button class="ghost-button" type="button" data-open-lead="${item.id}">تفاصيل العميل</button>
        <select class="inline-select" data-lead-status data-lead-id="${item.id}">
          ${["NEW", "CONTACTED", "INTERESTED", "VIEWING_SCHEDULED", "NEGOTIATION", "WON", "LOST"]
            .map((status) => `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`)
            .join("")}
        </select>
      </div>
    `;
  }

  if (item.kind === "property") {
    return `
      <div class="list-actions">
        <button class="ghost-button" type="button" data-open-property="${item.id}">تفاصيل العقار</button>
      </div>
    `;
  }

  if (item.kind === "conversation") {
    return `
      <div class="list-actions">
        <button class="ghost-button" type="button" data-open-conversation="${item.id}">فتح المحادثة</button>
      </div>
    `;
  }

  if (item.kind === "aiRun") {
    return `
      <div class="list-actions">
        <button class="ghost-button" type="button" data-open-ai-run="${item.id}">تفاصيل AI Run</button>
      </div>
    `;
  }

  return "";
}

async function updateLeadStatus(leadId, status) {
  const data = await api(`/api/leads/${leadId}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

  if (!data) return;
  notify("تم تحديث حالة العميل");
  await Promise.all([loadDashboard(), loadLeads()]);
}

async function updateDealStage(dealId, stage) {
  const data = await api(`/api/deals/${dealId}`, {
    method: "PATCH",
    body: JSON.stringify({ stage })
  });

  if (!data) return;
  notify("تم تحديث مرحلة الصفقة");
  await Promise.all([loadDashboard(), loadDeals()]);
}

async function openLeadDetails(leadId) {
  const lead = await api(`/api/leads/${leadId}`);
  if (!lead) return;

  detailEyebrow.textContent = "Lead Details";
  detailTitle.textContent = lead.fullName || lead.phone;
  detailBody.innerHTML = `
    <section class="detail-section">
      <div class="detail-card">
        <h5>${escapeHtml(lead.phone)}</h5>
        <p>${escapeHtml(lead.email || "بدون بريد إلكتروني")}</p>
        <p>${escapeHtml(lead.status)} • ${escapeHtml(lead.intent)} • ${escapeHtml(lead.temperature)}</p>
        <p>${escapeHtml(lead.preferredLocation || "بدون موقع محدد")}</p>
      </div>
    </section>
    <section class="detail-section">
      <h4>الملاحظات</h4>
      <form id="leadNoteForm" class="note-form">
        <textarea name="content" placeholder="أضف ملاحظة على العميل" required></textarea>
        <button type="submit">إضافة ملاحظة</button>
      </form>
      ${renderDetailCards(
        lead.notes.map((note) => ({
          title: note.author?.fullName || "User",
          body: note.content,
          meta: formatDate(note.createdAt)
        })),
        "لا توجد ملاحظات بعد."
      )}
    </section>
    <section class="detail-section">
      <h4>الصفقات</h4>
      ${renderDetailCards(
        lead.deals.map((deal) => ({
          title: `${deal.stage} • ${deal.property?.title || "بدون عقار"}`,
          body: `${deal.owner?.fullName || "-"}${deal.value ? ` • ${formatMoney(deal.value)} ${deal.property?.currency || ""}` : ""}`,
          meta: deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "بدون تاريخ إغلاق متوقع"
        })),
        "لا توجد صفقات مرتبطة."
      )}
    </section>
    <section class="detail-section">
      <h4>المحادثات</h4>
      ${renderDetailCards(
        lead.conversations.flatMap((conversation) =>
          conversation.messages.map((message) => ({
            title: `${message.senderType} • ${conversation.channel}`,
            body: message.content,
            meta: formatDate(message.createdAt)
          }))
        ),
        "لا توجد رسائل مرتبطة."
      )}
    </section>
  `;

  detailDrawer.classList.remove("hidden");

  const leadNoteForm = document.getElementById("leadNoteForm");
  leadNoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(leadNoteForm).entries());
    const data = await api(`/api/leads/${leadId}/notes`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!data) return;
    notify("تمت إضافة الملاحظة");
    await Promise.all([loadLeads(), openLeadDetails(leadId)]);
  });
}

async function openPropertyDetails(propertyId) {
  const property = await api(`/api/properties/${propertyId}`);
  if (!property) return;

  detailEyebrow.textContent = "Property Details";
  detailTitle.textContent = property.title;
  detailBody.innerHTML = `
    <section class="detail-section">
      <div class="detail-card">
        <h5>${escapeHtml(property.locationText)}</h5>
        <p>${escapeHtml(property.propertyType)} • ${escapeHtml(property.listingType)} • ${escapeHtml(property.status)}</p>
        <p>${formatMoney(property.price)} ${escapeHtml(property.currency)}</p>
        <p>${escapeHtml(property.description || "لا يوجد وصف")}</p>
      </div>
    </section>
    <section class="detail-section">
      <h4>التفاصيل</h4>
      ${renderDetailCards(
        [
          {
            title: "المالك",
            body: `${property.ownerName || "-"} • ${property.ownerPhone || "-"}`,
            meta: `غرف ${property.bedrooms || 0} • حمامات ${property.bathrooms || 0} • مساحة ${property.areaSqm || 0} م2`
          }
        ],
        ""
      )}
    </section>
    <section class="detail-section">
      <h4>الصفقات المرتبطة</h4>
      ${renderDetailCards(
        property.deals.map((deal) => ({
          title: `${deal.lead?.fullName || deal.lead?.phone || "Lead"} • ${deal.stage}`,
          body: deal.owner?.fullName || "-",
          meta: deal.value ? `${formatMoney(deal.value)} ${property.currency}` : "بدون قيمة"
        })),
        "لا توجد صفقات مرتبطة."
      )}
    </section>
    <section class="detail-section">
      <h4>الصور</h4>
      ${renderDetailCards(
        property.media.map((media) => ({
          title: `Media #${media.sortOrder || 0}`,
          body: media.fileUrl,
          meta: ""
        })),
        "لا توجد صور مرتبطة."
      )}
    </section>
  `;

  detailDrawer.classList.remove("hidden");
}

async function openConversationDetails(conversationId) {
  const conversation = await api(`/api/conversations/${conversationId}`);
  if (!conversation) return;

  detailEyebrow.textContent = "Conversation";
  detailTitle.textContent = conversation.lead?.fullName || conversation.lead?.phone || "محادثة";
  detailBody.innerHTML = `
    <section class="detail-section">
      <div class="detail-card">
        <h5>${escapeHtml(conversation.lead?.phone || "-")}</h5>
        <p>${escapeHtml(conversation.channel)} • ${escapeHtml(conversation.status)}</p>
        <p>${escapeHtml(conversation.lead?.status || "-")}</p>
      </div>
    </section>
    <section class="detail-section">
      <h4>Thread</h4>
      <div class="message-thread">
        ${conversation.messages.length ? conversation.messages.map(renderMessageBubble).join("") : '<div class="detail-card"><p>لا توجد رسائل بعد.</p></div>'}
      </div>
    </section>
    <section class="detail-section">
      <div class="panel-head">
        <h4>AI Assistant</h4>
        <button id="generateAiSuggestion" class="ghost-button" type="button">توليد اقتراح</button>
      </div>
      <div id="aiSuggestionBox" class="ai-box hidden"></div>
    </section>
    <section class="detail-section">
      <h4>إرسال رسالة</h4>
      <form id="conversationMessageForm" class="note-form">
        <textarea name="content" placeholder="اكتب الرد هنا" required></textarea>
        <button type="submit">إرسال</button>
      </form>
    </section>
  `;

  detailDrawer.classList.remove("hidden");

  const conversationMessageForm = document.getElementById("conversationMessageForm");
  const messageTextarea = conversationMessageForm.querySelector("textarea[name='content']");
  const generateAiSuggestion = document.getElementById("generateAiSuggestion");

  generateAiSuggestion.addEventListener("click", async () => {
    const result = await api(`/api/ai/conversations/${conversationId}/suggest`, {
      method: "POST"
    });

    if (!result) return;
    renderAiSuggestion(result.analysis, result.matches || [], messageTextarea);
    notify("تم توليد اقتراح AI");
    await Promise.all([loadLeads(), loadConversations()]);
  });

  conversationMessageForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(conversationMessageForm).entries());
    const data = await api(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!data) return;
    notify("تم إرسال الرسالة");
    await Promise.all([loadConversations(), openConversationDetails(conversationId)]);
  });
}

async function openAiRunDetails(runId) {
  const run = await api(`/api/ai/runs/${runId}`);
  if (!run) return;

  const resultSnapshot = run.resultSnapshot || {};
  const analysis = resultSnapshot.analysis || {};
  const recommendations = run.recommendations || [];

  detailEyebrow.textContent = "AI Run";
  detailTitle.textContent = `${run.taskType} • ${run.provider}`;
  detailBody.innerHTML = `
    <section class="detail-section">
      <div class="detail-card">
        <h5>${escapeHtml(run.lead?.fullName || run.lead?.phone || "Lead")}</h5>
        <p>${escapeHtml(run.status)} • ${escapeHtml(run.model || "-")}</p>
        <p>${formatDate(run.createdAt)}</p>
      </div>
    </section>
    <section class="detail-section">
      <h4>Input</h4>
      <div class="detail-card">
        <p>${escapeHtml(JSON.stringify(run.inputSnapshot, null, 2))}</p>
      </div>
    </section>
    <section class="detail-section">
      <h4>Analysis</h4>
      <div class="detail-card">
        <p>${escapeHtml(analysis.summary || "No summary")}</p>
        <p>${escapeHtml(analysis.suggestedReply || "No suggested reply")}</p>
      </div>
    </section>
    <section class="detail-section">
      <h4>Recommendations</h4>
      ${
        recommendations.length
          ? recommendations
              .map(
                (item) => `
                  <article class="detail-card">
                    <h5>${escapeHtml(item.property?.title || "Property")}</h5>
                    <p>${escapeHtml(item.property?.locationText || "-")}</p>
                    <p>Score: ${escapeHtml(String(item.score))}</p>
                    <p>${escapeHtml(item.reason)}</p>
                  </article>
                `
              )
              .join("")
          : '<div class="detail-card"><p>لا توجد توصيات محفوظة.</p></div>'
      }
    </section>
  `;

  detailDrawer.classList.remove("hidden");
}

function closeDrawer() {
  detailDrawer.classList.add("hidden");
  detailBody.innerHTML = "";
}

function renderDetailCards(items, emptyText) {
  if (!items.length) {
    return `<div class="detail-card"><p>${emptyText}</p></div>`;
  }

  return items
    .map(
      (item) => `
        <article class="detail-card">
          <h5>${escapeHtml(item.title)}</h5>
          <p>${escapeHtml(item.body)}</p>
          ${item.meta ? `<p>${escapeHtml(item.meta)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function renderAiSuggestion(analysis, matches, textarea) {
  const aiSuggestionBox = document.getElementById("aiSuggestionBox");
  aiSuggestionBox.classList.remove("hidden");
  aiSuggestionBox.innerHTML = `
    <h4>التحليل</h4>
    <p>${escapeHtml(analysis.summary)}</p>
    <h4>الرد المقترح</h4>
    <p>${escapeHtml(analysis.suggestedReply)}</p>
    <h4>العقارات المقترحة</h4>
    ${
      matches.length
        ? matches
            .map(
              (match) => `
                <div class="detail-card">
                  <h5>${escapeHtml(match.property?.title || "Property")}</h5>
                  <p>${escapeHtml(match.property?.locationText || "-")}</p>
                  <p>Score: ${escapeHtml(String(match.score))}</p>
                  <p>${escapeHtml(match.reason)}</p>
                </div>
              `
            )
            .join("")
        : "<p>لا توجد عقارات مطابقة حاليًا.</p>"
    }
    <button id="useAiReply" type="button">استخدام الرد المقترح</button>
  `;

  document.getElementById("useAiReply").addEventListener("click", () => {
    textarea.value = analysis.suggestedReply;
  });
}

async function api(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
      notify(typeof payload === "string" ? payload : payload.message || "حدث خطأ", true);
      return null;
    }

    return payload;
  } catch (error) {
    notify(error.message || "تعذر الاتصال بالخادم", true);
    return null;
  }
}

function establishSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("crm_token", token);
  localStorage.setItem("crm_user", JSON.stringify(user));
  notify("تم تسجيل الدخول");
}

function logout() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("crm_token");
  localStorage.removeItem("crm_user");
  renderSession();
  bootDashboard();
}

function pruneEmpty(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== "" && value !== undefined && value !== null));
}

function notify(message, isError = false) {
  toast.textContent = message;
  toast.style.background = isError ? "rgba(138, 26, 26, 0.94)" : "rgba(31, 26, 23, 0.92)";
  toast.classList.remove("hidden");
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => toast.classList.add("hidden"), 2600);
}

function readStoredJson(key) {
  const value = localStorage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatMoney(value) {
  const number = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("ar-EG").format(number || 0);
}

function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function renderMessageBubble(message) {
  const actor =
    message.senderUser?.fullName ||
    (message.senderType === "CUSTOMER" ? "Customer" : message.senderType);

  return `
    <article class="message-bubble ${message.direction === "OUTBOUND" ? "outbound" : "inbound"}">
      <h5>${escapeHtml(actor)}</h5>
      <p>${escapeHtml(message.content)}</p>
      <small>${escapeHtml(message.senderType)} • ${formatDate(message.createdAt)}</small>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

bootDashboard();
