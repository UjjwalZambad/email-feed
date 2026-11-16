document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("viewToggleBtn");
    if (!btn) return;
    const path = window.location.pathname.toLowerCase();
    // HOME PAGE
    if (path.includes("/") || path.includes("home")) {
        btn.onclick = function () {
            window.location.href = "/allcases";
        };
    }
    // MY CASES PAGE
    if (path.includes("allcases")) {
        btn.onclick = function () {
            window.location.href = "/";
        };
    }
});


const REL = "cat_contact_pin_incident"; // Must be exact relationship navigation property
const TABLE_ID = "dealerCasesTable";

function getCurrentContactId() {
    return ("{{ user.id }}" || "").replace(/[{}]/g, "").toLowerCase();
}

// Get token from shell if available, otherwise from /_layout/tokenhtml
async function getAntiForgeryToken() {
    try {
        if (window.shell && typeof window.shell.getTokenDeferred === "function") {
            return await window.shell.getTokenDeferred();
        }
    } catch (e) {
        console.warn("shell.getTokenDeferred failed, falling back to tokenhtml", e);
    }

    const response = await fetch("/_layout/tokenhtml", {
        method: "GET",
        credentials: "same-origin"
    });

    if (!response.ok) {
        throw new Error("Unable to load anti-forgery token.");
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const tokenInput = doc.querySelector('input[name="__RequestVerificationToken"]');

    if (!tokenInput || !tokenInput.value) {
        throw new Error("Anti-forgery token not found.");
    }

    return tokenInput.value;
}

async function getPinnedCases() {
    const contactId = getCurrentContactId();
    if (!contactId) return [];

    const response = await fetch(
        `/_api/contacts(${contactId})?$expand=${REL}($select=incidentid)`,
        {
            method: "GET",
            credentials: "same-origin",
            headers: {
                Accept: "application/json",
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0"
            }
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`getPinnedCases failed: ${response.status} ${response.statusText} :: ${errText}`);
    }

    const result = await response.json();
    return (result[REL] || []).map(x => (x.incidentid || x.incidentid_guid || "").toLowerCase());
}

async function savePin(caseId, isPinned) {
    const contactId = getCurrentContactId();
    const token = await getAntiForgeryToken();

    if (!contactId) {
        throw new Error("Current contact ID not found.");
    }

    const headers = {
        "Content-Type": "application/json",
        "__RequestVerificationToken": token,
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    };

    const baseUrl = `/_api/incidents(${caseId})/${REL}`;

    if (isPinned) {
        const response = await fetch(`${baseUrl}/$ref`, {
            method: "POST",
            credentials: "same-origin",
            headers,
            body: JSON.stringify({
                "@odata.id": `${location.origin}/_api/contacts(${contactId})`
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Pinning failed: ${response.status} ${response.statusText} :: ${errText}`);
        }

        return response;
    } else {
        const response = await fetch(`${baseUrl}(${contactId})/$ref`, {
            method: "DELETE",
            credentials: "same-origin",
            headers
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Unpinning failed: ${response.status} ${response.statusText} :: ${errText}`);
        }

        return response;
    }
}

function pinIcon(isPinned) {
    if (isPinned) {
        return `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M15.2117 1.02141C15.5563 0.97442 15.907 1.00501 16.2383 1.11094C16.5695 1.21687 16.8729 1.39547 17.1263
1.63368L17.1435 1.65039L22.1396 6.6465L22.1563 6.66373C22.3946 6.91711 22.5731 7.22051 22.6791 7.55176C22.7849 7.883 22.8156 8.23374 22.7686 8.57832C22.7216
8.92291 22.5982 9.25264 22.4075 9.54344C22.2167 9.83422 21.9635 10.0787 21.666 10.2591L21.6536 10.2666L17.6307 12.6047L16.0583 19.1907L16.0551 19.2044C15.9809
19.4925 15.8334 19.7561 15.6273 19.9705C15.4212 20.1848 15.1633 20.3423 14.8785 20.4277C14.5937 20.5132 14.2916 20.5238 14.0016 20.4582C13.7115 20.3927 13.4433
20.2534 13.2228 20.054C13.213 20.0452 13.2035 20.0361 13.1942 20.0268L3.61326 10.4302C3.40379 10.2134 3.25532 9.94506 3.18277 9.65242C3.11024 9.3598 3.11625
9.05319 3.20024 8.76364C3.28421 8.47408 3.44315 8.21184 3.66098 8.00342C3.87884 7.795 4.14785 7.64779 4.44083 7.57671L4.45513 7.57324L11.12 6.089L13.5309
2.12395C13.7113 1.82693 13.956 1.57312 14.2466 1.38253C14.5374 1.19178 14.8671 1.0684 15.2117 1.02141ZM1.34189 20.7982L6.28248 15.8575L7.93198 17.5096L2.99275
22.4491C2.53689 22.9049 1.79778 22.9049 1.34191 22.4491C0.886038 21.9932 0.886029 21.254 1.34189 20.7982Z" fill="#3F3F3F"/>
</ svg>`;
    }

    return `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M22.6263 7.45283C22.5328 7.17227 22.3458 6.89172 22.1587 6.61116L17.1087 1.56112C16.8281 1.37408 16.5476 1.18704 16.267 1.09352C15.9865 1 15.6124 1
15.2383 1C14.8642 1 14.5837 1.18704 14.3031 1.37408C14.0226 1.56112 13.742 1.84167 13.6485 2.12223L11.217 6.14356L4.39007 7.54635C4.10952 7.63987 3.82896 7.82691
3.64192 8.01395C3.45488 8.20099 3.26784 8.48154 3.17432 8.7621C3.0808 9.04266 3.0808 9.32322 3.17432 9.60378C3.26784 9.88434 3.36136 10.1649 3.64192
10.3519L8.03733 14.7473L1.21042 21.5742C0.929861 21.8548 0.929861 22.3224 1.21042 22.603C1.30394 22.6965 1.49098 22.79 1.67801 22.79C1.86505 22.79 2.05209 22.6965
2.14561 22.603L8.97252 15.7761L13.2744 20.0779C13.4614 20.265 13.742 20.3585 14.0226 20.452C14.1161 20.452 14.3031 20.452 14.3966 20.452C14.5837 20.452 14.6772
20.452 14.8642 20.3585C15.1448 20.265 15.4254 20.1715 15.6124 19.8909C15.7994 19.7039 15.9865 19.4233 15.9865 19.1427L17.5763 12.5029L21.6911 10.1649C21.9717
9.97785 22.2523 9.79082 22.4393 9.51026C22.6263 9.2297 22.7199 8.94914 22.8134 8.57506C22.8134 8.20099 22.7199 7.82691 22.6263 7.45283ZM21.2236 8.66858C21.13
8.7621 21.0365 8.85562 20.943 8.94914L16.6411 11.4742C16.4541 11.5677 16.3605 11.7547 16.267 11.9418L14.5837 18.8622C14.5837 18.8622 14.5837 18.9557 14.4902
18.9557L14.3966 19.0492H14.3031H14.2096L4.57711 9.32322L4.48359 9.2297V9.13618C4.48359 9.13618 4.48359 9.04266 4.57711 9.04266L4.67063 8.94914L11.6846
7.35931C11.8716 7.35931 12.0587 7.17227 12.1522 7.07876L14.7707 2.77687C14.8642 2.68335 14.9578 2.58983 15.0513 2.49631C15.1448 2.40279 15.2383 2.40279 15.4254
2.40279H15.5189C15.6124 2.40279 15.7059 2.40279 15.7994 2.40279C15.893 2.40279 16.08 2.49631 16.08 2.58983L21.13 7.63987C21.2235 7.73339 21.3171 7.82691 21.3171
8.01395C21.3171 8.20099 21.4106 8.29451 21.3171 8.38803C21.3171 8.48154 21.3171 8.57507 21.2236 8.66858Z" fill="#3F3F3F"/>
</ svg>`;
}

function ensureHeaderPin(table) {
    const headerRow = table.querySelector("thead tr");
    if (!headerRow) return;

    let pinTh = table.querySelector("thead th.pin-header");

    if (!pinTh) {
        pinTh = document.createElement("th");
        pinTh.className = "pin-header";
        pinTh.innerHTML = pinIcon(false);
        headerRow.insertBefore(pinTh, headerRow.firstElementChild);
    } else if (!pinTh.innerHTML.trim()) {
        pinTh.innerHTML = pinIcon(false);
    }

    pinTh.style.cursor = "pointer";
    pinTh.title = "Pin / Unpin all";
}

function updatePinIcon(cell, isPinned) {
    cell.innerHTML = pinIcon(isPinned);
    cell.classList.toggle("pinned", isPinned);
}

async function initPinning() {
    const table = document.getElementById(TABLE_ID);
    if (!table) return;

    ensureHeaderPin(table);

    const rows = [...table.querySelectorAll("tbody tr[data-id]")];
    if (!rows.length) return;

    let pinnedIds = [];
    try {
        pinnedIds = await getPinnedCases();
    } catch (e) {
        console.error("Failed to load pinned cases:", e);
        pinnedIds = [];
    }

    rows.forEach(row => {
        const caseId = (row.dataset.id || "").toLowerCase();
        if (!caseId) return;

        let pinCell = row.querySelector(".pin-cell");
        if (!pinCell) {
            pinCell = document.createElement("td");
            pinCell.className = "pin-cell";
            row.insertBefore(pinCell, row.firstElementChild);
        }

        const isPinned = pinnedIds.includes(caseId);
        pinCell.dataset.caseId = caseId;
        pinCell.dataset.pinned = isPinned ? "true" : "false";
        updatePinIcon(pinCell, isPinned);
        row.classList.toggle("pinned-row", isPinned);
    });

    bindPinEvents();
    updateHeaderState();
    enableHeaderPinToggle();

}

function bindPinEvents() {
    const table = document.getElementById(TABLE_ID);
    if (!table) return;

    table.querySelectorAll(".pin-cell").forEach(cell => {
        if (cell.dataset.bound === "true") return;
        cell.dataset.bound = "true";

        cell.addEventListener("click", async function (e) {
            e.stopPropagation();

            const caseId = this.dataset.caseId;
            const currentPinned = this.dataset.pinned === "true";
            const row = this.closest("tr");

            this.classList.add("loading");
            this.style.pointerEvents = "none";

            try {
                await savePin(caseId, !currentPinned);

                this.dataset.pinned = (!currentPinned).toString();
                updatePinIcon(this, !currentPinned);

                if (row) {
                    row.classList.toggle("pinned-row", !currentPinned);
                }
            } catch (err) {
                console.error("Pin action failed:", err);
                // alert(`Pin action failed.\n\n${err.message}`);
                alert(
                    "{{ snippets['CAT_Error_PinFailed'] }}" +
                    "\n\n" +
                    err.message
                );
            } finally {
                this.classList.remove("loading");
                this.style.pointerEvents = "auto";
            }
        });
    });
}

function updateHeaderState() {
    const table = document.getElementById("dealerCasesTable");
    if (!table) return;

    const rows = [...table.querySelectorAll("tbody tr[data-id]")];
    const header = table.querySelector("thead th.pin-header");

    if (!header) return;

    const allPinned = rows.length > 0 && rows.every(row =>
        row.querySelector(".pin-cell")?.classList.contains("pinned")
    );

    // Correct logic:
    // filled icon when all pinned
    // outline icon when not all pinned
    updatePinIcon(header, allPinned);
    header.dataset.pinned = allPinned ? "true" : "false";
}

function ensureStatusMessageContainer() {
    let container = document.getElementById("pinStatusMessage");

    if (!container) {
        container = document.createElement("div");
        container.id = "pinStatusMessage";
        container.style.display = "none";
        container.style.margin = "10px 0";
        container.style.padding = "10px 14px";
        container.style.borderRadius = "6px";
        container.style.fontSize = "14px";
        container.style.fontWeight = "500";
        container.style.zIndex = "9999";

        const table = document.getElementById("dealerCasesTable");
        if (table && table.parentNode) {
            table.parentNode.insertBefore(container, table);
        }
    }

    return container;
}

function showPinStatus(message, type) {
    const container = ensureStatusMessageContainer();

    container.textContent = message;
    container.style.display = "block";

    if (type === "loading") {
        container.style.background = "#eef5ff";
        container.style.border = "1px solid #b6d4fe";
        container.style.color = "#084298";
    } else if (type === "success") {
        container.style.background = "#edf7ed";
        container.style.border = "1px solid #a3cfbb";
        container.style.color = "#0f5132";
    } else if (type === "error") {
        container.style.background = "#f8d7da";
        container.style.border = "1px solid #f1aeb5";
        container.style.color = "#842029";
    }

    if (type !== "loading") {
        clearTimeout(window.__pinStatusTimer);
        window.__pinStatusTimer = setTimeout(() => {
            container.style.display = "none";
        }, 2500);
    }
}

function enableHeaderPinToggle() {
    const table = document.getElementById("dealerCasesTable");
    if (!table) return;

    if (table.dataset.headerPinBound === "true") return;
    table.dataset.headerPinBound = "true";

    table.addEventListener("click", async function (e) {
        const header = e.target.closest("th.pin-header");
        if (!header || !table.contains(header)) return;

        e.stopPropagation();

        const rows = [...table.querySelectorAll("tbody tr[data-id]")];
        if (!rows.length) return;

        const allPinned = rows.every(row =>
            row.querySelector(".pin-cell")?.classList.contains("pinned")
        );

        const targetState = !allPinned; // if all are pinned -> unpin all, otherwise pin all

        header.style.pointerEvents = "none";
        showPinStatus(
            targetState ? "Pinning all cases..." : "Unpinning all cases...",
            "loading"
        );

        try {
            let successCount = 0;

            for (const row of rows) {
                const caseId = (row.dataset.id || "").toLowerCase();
                const pinCell = row.querySelector(".pin-cell");

                if (!caseId || !pinCell) continue;

                const currentState = pinCell.classList.contains("pinned");

                // Skip if already in desired state
                if (currentState === targetState) continue;

                await savePin(caseId, targetState);

                pinCell.classList.toggle("pinned", targetState);
                updatePinIcon(pinCell, targetState);
                row.classList.toggle("pinned-row", targetState);

                successCount++;
            }

            // Correct icon state:
            // if targetState = true (pin all), header should be filled
            // if targetState = false (unpin all), header should be outline
            updatePinIcon(header, targetState);
            header.dataset.pinned = targetState ? "true" : "false";

            showPinStatus(
                targetState
                    ? `Successfully pinned ${successCount} case(s).`
                    : `Successfully unpinned ${successCount} case(s).`,
                "success"
            );
        } catch (err) {
            console.error("Header pin toggle failed:", err);
            showPinStatus(`Header pin action failed: ${err.message}`, "error");
            // alert(`Header pin action failed.\n\n${err.message}`);
            alert(
                "{{ snippets['CAT_Error_HeaderPinFailed'] }}" +
                "\n\n" +
                err.message
            );
        } finally {
            header.style.pointerEvents = "auto";
        }
    });
}
document.addEventListener("DOMContentLoaded", function () {
    setTimeout(initPinning, 500);
});
//pinned functionality end here

function getPlainTextFromHtml(value) {
    if (!value) return "";

    const temp = document.createElement("div");
    temp.innerHTML = value;

    return (temp.textContent || temp.innerText || "")
        .replace(/\s+/g, " ")
        .trim();
}

$(document).on("mouseenter", "#dealerCasesTable td.truncate-cell", function () {

    const fullText = ($(this).attr("data-full") || "").trim();

    // Do not show popup if null/empty
    if (!fullText || fullText.toLowerCase() === "null") {
        $("#customTooltip").remove();
        return;
    }

    $("#customTooltip").remove();

    $("body").append(
        $("<div>", {
            id: "customTooltip",
            text: fullText
        })
    );

    const tooltip = $("#customTooltip");
    const rect = this.getBoundingClientRect();

    const tooltipWidth = 350;
    const margin = 12;

    let top = rect.bottom + 8;
    let left = rect.left;

    // Keep inside right edge
    if (left + tooltipWidth > window.innerWidth - margin) {
        left = window.innerWidth - tooltipWidth - margin;
    }

    // Keep inside left edge
    if (left < margin) {
        left = margin;
    }

    // If bottom overflows, show above
    const tooltipHeight = tooltip.outerHeight();
    if (top + tooltipHeight > window.innerHeight - margin) {
        top = rect.top - tooltipHeight - 8;
    }

    if (top < margin) {
        top = margin;
    }

    tooltip.css({
        top: top + "px",
        left: left + "px"
    });
});

$(document).on("mouseleave", "#dealerCasesTable td.truncate-cell", function () {
    $("#customTooltip").remove();
});

$(document).on(
    "mouseleave",
    ".entity-grid table td[data-attribute='description'], .entity-grid table td[data-attribute='title']",
    function () {
        $("#customTooltip").remove();
    }
);

$(document).ready(function () {
    setTimeout(prepareHoverTextForList, 500);
});

$(document).ajaxComplete(function () {
    setTimeout(prepareHoverTextForList, 200);
});

// Run after full page load
$(window).on("load", function () {
    fixDescriptionInList();

    // Run a couple more times in case the list renders late
    setTimeout(fixDescriptionInList, 500);
    setTimeout(fixDescriptionInList, 1200);
});

// Re-run whenever the list content changes
const observer = new MutationObserver(function (mutations) {
    let shouldRun = false;

    mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
            if (
                node.nodeType === 1 &&
                (
                    node.matches?.("td[data-attribute='description']") ||
                    node.querySelector?.("td[data-attribute='description']")
                )
            ) {
                shouldRun = true;
            }
        });
    });

    if (shouldRun) {
        fixDescriptionInList();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});