// ============================================================
// HOME GLOBAL PRODUCT CONTEXT
// ============================================================
(function () {
    "use strict";

    const HOME_PRODUCT_CONTEXT_KEY =
        "CAT_HOME_PRODUCT_CONTEXT";

    function normalizeGuid(value) {
        return String(value || "")
            .replace(/[{}]/g, "")
            .trim()
            .toLowerCase();
    }

    function normalizeProductName(value) {
        return String(value || "")
            .replace(/\+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function saveHomeProductContext(productId, productName) {
        const normalizedProductId =
            normalizeGuid(productId);

        const normalizedProductName =
            String(productName || "").trim();

        if (
            !normalizedProductId &&
            !normalizedProductName
        ) {
            return;
        }

        const context = {
            productId: normalizedProductId,
            productName: normalizedProductName
        };

        sessionStorage.setItem(
            HOME_PRODUCT_CONTEXT_KEY,
            JSON.stringify(context)
        );

        console.log(
            "HOME: Global Product context stored.",
            context
        );
    }

    function getHomeProductContext() {
        let storedContext = {};

        try {
            storedContext = JSON.parse(
                sessionStorage.getItem(
                    HOME_PRODUCT_CONTEXT_KEY
                ) || "{}"
            );
        } catch (error) {
            storedContext = {};
        }

        return {
            productId: normalizeGuid(
                window.CAT_GA_ProductID ||
                sessionStorage.getItem(
                    "CAT_GA_ProductID"
                ) ||
                storedContext.productId
            ),

            productName: String(
                window.CAT_GA_ProductName ||
                sessionStorage.getItem(
                    "CAT_GA_ProductName"
                ) ||
                sessionStorage.getItem(
                    "currentProduct"
                ) ||
                storedContext.productName ||
                ""
            ).trim()
        };
    }

    function findHomeProductOption(context) {
        const productOptions =
            document.querySelectorAll(
                "#dashboardFilterOptionSource " +
                ".dashboard-product-option"
            );

        let matchedOption = null;

        productOptions.forEach(function (option) {
            if (matchedOption) {
                return;
            }

            const optionId = normalizeGuid(
                option.getAttribute("data-value")
            );

            const optionName =
                normalizeProductName(
                    option.getAttribute("data-label")
                );

            if (
                context.productId &&
                optionId === context.productId
            ) {
                matchedOption = option;
                return;
            }

            if (
                context.productName &&
                optionName ===
                    normalizeProductName(
                        context.productName
                    )
            ) {
                matchedOption = option;
            }
        });

        return matchedOption;
    }

    function applyGlobalProductToHome(
        eventContext
    ) {
        eventContext = eventContext || {};

        saveHomeProductContext(
            eventContext.productId,
            eventContext.productName
        );

        const context =
            getHomeProductContext();

        if (!context.productId &&
            !context.productName) {
            console.log(
                "HOME: No global Product context found."
            );

            return false;
        }

        const matchedOption =
            findHomeProductOption(context);

        if (!matchedOption) {
            console.log(
                "HOME: Global Product is not available " +
                "in Product Tech options.",
                context
            );

            return false;
        }

        const matchedProductId =
            normalizeGuid(
                matchedOption.getAttribute(
                    "data-value"
                )
            );

        const matchedProductName =
            matchedOption.getAttribute(
                "data-label"
            ) || "";

        saveHomeProductContext(
            matchedProductId,
            matchedProductName
        );

        const params =
            new URLSearchParams(
                window.location.search
            );

        const currentProductIds =
            String(
                params.get("productTech") || ""
            )
                .split(",")
                .map(normalizeGuid)
                .filter(Boolean);

        if (
            currentProductIds.includes(
                matchedProductId
            )
        ) {
            console.log(
                "HOME: Product Tech already applied.",
                {
                    productId:
                        matchedProductId,
                    productName:
                        matchedProductName
                }
            );

            return true;
        }

        params.set(
            "productTech",
            matchedProductId
        );

        sessionStorage.setItem(
            "CAT_HOME_HIDE_PRODUCT_QUERY",
            "1"
        );

        console.log(
            "HOME: Applying global Product " +
            "to Product Tech.",
            {
                productId:
                    matchedProductId,
                productName:
                    matchedProductName
            }
        );

        window.location.replace(
            window.location.pathname +
            "?" +
            params.toString()
        );

        return true;
    }

    function initializeHomeProductContext() {
        applyGlobalProductToHome();
    }

    window.addEventListener(
        "CAT_GA_ProductContextReady",
        function (event) {
            applyGlobalProductToHome(
                event.detail || {}
            );
        }
    );

    document.addEventListener(
        "catGaProductResolved",
        function (event) {
            applyGlobalProductToHome(
                event.detail || {}
            );
        }
    );

    window.addEventListener(
        "CAT_GA_ProductContextChanged",
        function () {
            sessionStorage.removeItem(
                HOME_PRODUCT_CONTEXT_KEY
            );
        }
    );

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeHomeProductContext
        );
    } else {
        initializeHomeProductContext();
    }
})();
// ============================================================
// END HOME GLOBAL PRODUCT CONTEXT
// ============================================================
    
 document.addEventListener("DOMContentLoaded", function () {
 
  const banner = document.getElementById("home-alert-banner");
  const arrow = document.getElementById("toggleArrow");
 
  // Safety check
  if (!banner || !arrow) return;
 
  // Toggle click
  arrow.addEventListener("click", function () {
 
    if (banner.classList.contains("collapsed")) {
      banner.classList.remove("collapsed");
      banner.classList.add("expanded");
      arrow.innerHTML = "^";
      sessionStorage.setItem("bannerState", "expanded");
    } else {
      banner.classList.remove("expanded");
      banner.classList.add("collapsed");
      arrow.innerHTML = "⌄";
      sessionStorage.setItem("bannerState", "collapsed");
    }
 
  });
 
  // Restore state
  if (sessionStorage.getItem("bannerState") === "expanded") {
    banner.classList.remove("collapsed");
    banner.classList.add("expanded");
    arrow.innerHTML = "^";
  }
 
});
 

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

function applyHandupAlert()
{
  console.log("Apply Handup alert funtion called");
  var link=document.querySelector('a[href="/opencustomerhandups"].tile-link');
  if(!link)
  {
    console.error("Could not find a tile link");
    return;
  }
  var tile=link ? link.closest(".dashboard-tile") : null;
  if(!tile)
  {
    console.error("Could not find the Open Customer Handup Tile");
    return;
  }
  var countCase=tile.querySelector(".tile-count");
  if(!countCase)
  {
    console.error("tile count not found");
    return;
  }

  var count=parseInt(countCase.textContent.trim()) || 0;
  console.log("handup count is", count);
  if(count > 0)
  {
    tile.classList.add("is-aging-alert");
  }
  else{
    tile.classList.remove("is-aging-alert");
  }
}
document.addEventListener("DOMContentLoaded", function () {
   console.log("Handup alert script started");
   // Find Open Handups tile directly
   var handupTile = document.querySelector(
       '.dashboard-tile[data-tile-key="openHandups"]'
   );
   console.log("Handup Tile:", handupTile);
   if (!handupTile) {
       console.error(
           'Open Handups tile not found: [data-tile-key="openHandups"]'
       );
       return;
   }

   // Find count element
   var handupCountElement =
       document.getElementById("openHandupsCount");
   console.log(
       "Handup Count Element:",
       handupCountElement
   );
   if (!handupCountElement) {
       console.error(
           "openHandupsCount element not found"
       );
       return;
   }

   // Find alert icon
   var handupIcon =
       handupTile.querySelector(".handup-icon");
   console.log(
       "Handup Icon:",
       handupIcon
   );

   // Get current count
   var handupCount =
       parseInt(
           handupCountElement.textContent
               .trim()
               .replace(/,/g, ""),
           10
       ) || 0;

   console.log(
       "Handup Count:",
       handupCount
   );

   // Apply alert
   if (handupCount > 0) {
       handupTile.classList.add(
           "is-aging-alert"
       );
       handupTile.style.setProperty(
           "border",
           "4px solid #d10000",
           "important"
       );
       if (handupIcon) {
           handupIcon.style.display = "block";
       }
       console.log(
           "Open Handups alert enabled"
       );
   }
   else {
       handupTile.classList.remove(
           "is-aging-alert"
       );
       handupTile.style.removeProperty(
           "border"
       );
       if (handupIcon) {
           handupIcon.style.display = "none";
       }
       console.log(
           "Open Handups alert disabled"
       );
   }
});


// Dashboard real time refresh code

// ============================================================
// DASHBOARD REAL-TIME REFRESH
// OPEN HANDUPS AGING ALERT
// ============================================================
(function () {
   "use strict";

   // ----------------------------------------------------------
   // Configuration
   // ----------------------------------------------------------
   // During testing use 30 seconds if required:
   // const REFRESH_INTERVAL_MS = 30 * 1000;
   // Production: 15 minutes
   const REFRESH_INTERVAL_MS = 15 * 30 * 1000;
   const DASHBOARD_ENDPOINT =
       "/dashboard-tile-counts/";

   let refreshInProgress = false;
   function hasActiveDashboardFilters() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const dashboardFilterKeys = [
        "status",
        "dealerCode",
        "productTech",
        "supportType",
        "secondarySupportType",
        "caseOrigin",
        "persona",
        "createdFrom",
        "createdTo"
    ];

    return dashboardFilterKeys.some(
        function (key) {
            const value =
                params.get(key);

            return Boolean(
                value &&
                String(value).trim()
            );
        }
    );
}

   // ----------------------------------------------------------
   // Update tile count
   // ----------------------------------------------------------
   function updateTileCount(elementId, value) {
       const countElement =
           document.getElementById(elementId);
       if (!countElement) {
           console.warn(
               "Count element not found:",
               elementId
           );
           return;
       }

       const numericValue =
           Number(value);

       if (!Number.isFinite(numericValue)) {
           console.warn(
               "Invalid count received for " +
               elementId +
               ":",
               value
           );
           return;
       }

       const currentValue =
           Number(
               countElement.textContent
                   .replace(/,/g, "")
                   .trim()
           );

       // No DOM update required if value is unchanged
       if (
           Number.isFinite(currentValue) &&
           currentValue === numericValue
       ) {
           return;
       }

       countElement.textContent =
           numericValue.toLocaleString();

       // Existing count animation
       countElement.classList.remove(
           "count-updated"
       );
       void countElement.offsetWidth;
       countElement.classList.add(
           "count-updated"
       );
   }

   // ----------------------------------------------------------
   // Update Open Handups alert
   // ----------------------------------------------------------
   function updateOpenHandupsAlert(count) {
   const handupTile =
       document.getElementById("handupTile");
   const handupIcon =
       document.getElementById("handupIcon");
   if (!handupTile) {
       console.warn(
           "handupTile not found"
       );
       return;
   }

   const numericCount =
       Number(count);

   console.log(
       "Updating Open Handups alert. Count:",
       numericCount
   );

   if (numericCount > 0) {
       handupTile.classList.add(
           "is-aging-alert"
       );

       handupTile.style.setProperty(
           "border",
           "4px solid #d10000",
           "important"
       );

       if (handupIcon) {
           handupIcon.style.display =
               "block";
       }

       console.log(
           "Open Handups RED ALERT enabled"
       );
   }
   else {
       handupTile.classList.remove(
           "is-aging-alert"
       );

       handupTile.style.removeProperty(
           "border"
       );

       if (handupIcon) {
           handupIcon.style.display =
               "none";
       }

       console.log(
           "Open Handups RED ALERT disabled"
       );
   }
}

   // ----------------------------------------------------------
   // Refresh dashboard counts
   // ----------------------------------------------------------
   async function refreshDashboardCounts() {
    if (hasActiveDashboardFilters()) {
    console.log(
        "Dashboard real-time refresh skipped because dashboard filters are active."
    );

    return;
}
       // Prevent overlapping requests
       if (refreshInProgress) {
           return;
       }

       refreshInProgress = true;

       try {
           const requestUrl =
               DASHBOARD_ENDPOINT +
               "?timestamp=" +
               encodeURIComponent(
                   Date.now()
               );

           const response =
               await fetch(
                   requestUrl,
                   {
                       method: "GET",
                       credentials:
                           "same-origin",
                       cache:
                           "no-store",
                       headers: {
                           "Accept":
                               "application/json"
                       }
                   }
               );

           // --------------------------------------------------
           // Validate HTTP response
           // --------------------------------------------------
           if (!response.ok) {
               throw new Error(
                   "Dashboard endpoint returned HTTP " +
                   response.status
               );
           }

           // --------------------------------------------------
           // Read response
           // --------------------------------------------------
           const responseText =
               await response.text();

           const data =
               JSON.parse(
                   responseText
               );

           // --------------------------------------------------
           // Validate API response
           // --------------------------------------------------
           if (
               !data.success ||
               !data.counts
           ) {
               throw new Error(
                   "Dashboard endpoint response is invalid."
               );
           }

           // --------------------------------------------------
           // Update Open Handups count
           // --------------------------------------------------
           if (
               Object.prototype.hasOwnProperty.call(
                   data.counts,
                   "openHandups"
               )
           ) {
               const openHandupsCount =
                   Number(
                       data.counts.openHandups
                   );

               updateTileCount(
                   "openHandupsCount",
                   openHandupsCount
               );

               updateOpenHandupsAlert(
                   openHandupsCount
               );
           }

           // --------------------------------------------------
           // Update Dealer Attention Cases
           // --------------------------------------------------
           if (
               Object.prototype.hasOwnProperty.call(
                   data.counts,
                   "dealerAttentionCases"
               )
           ) {
               updateTileCount(
                   "dealerCasesAttentionCount",
                   data.counts
                       .dealerAttentionCases
               );
           }

           console.log(
               "Dashboard tile counts refreshed:",
               data.counts,
               data.generatedAt
           );
       }

       catch (error) {
           console.error(
               "Unable to refresh dashboard tile counts:",
               error
           );
       }

       finally {
           refreshInProgress =
               false;
       }
   }

   // ----------------------------------------------------------
   // Initialize
   // ----------------------------------------------------------
   function initializeDashboardCountRefresh() {
       // Initial load
       refreshDashboardCounts();

       // Periodic refresh
       window.setInterval(
           refreshDashboardCounts,
           REFRESH_INTERVAL_MS
       );
   }

   // ----------------------------------------------------------
   // Page load
   // ----------------------------------------------------------
   if (
       document.readyState ===
       "loading"
   ) {
       document.addEventListener(
           "DOMContentLoaded",
           initializeDashboardCountRefresh
       );
   }
   else {
       initializeDashboardCountRefresh();
   }

   // ----------------------------------------------------------
   // Refresh when user returns to the tab
   // ----------------------------------------------------------
   document.addEventListener(
       "visibilitychange",
       function () {
           if (
               document.visibilityState ===
               "visible"
           ) {
               refreshDashboardCounts();
           }
       }
   );
})();