
function categoryChanged(checkbox)
{
   const checked = checkbox.checked;
   const currentId = checkbox.dataset.id;
   if (checked)
{
   checkDescendants(currentId);
   const container =
       document.getElementById(
           "cat-" + currentId
       );
   if(container)
   {
       container.style.display = "block";
   }
   const icon =
       document.querySelector(
           '[onclick*="cat-' +
           currentId +
           '"] i'
       );
   if(icon)
   {
       icon.classList.remove(
           "fa-chevron-right"
       );
       icon.classList.add(
           "fa-chevron-down"
       );
   }
}
   else
   {
       uncheckDescendants(currentId);
       uncheckAncestors(checkbox);
       collapseBranch(currentId);
   }
   updateFilter();
    updateClearAllState(); // Add this
}

function checkDescendants(parentId)
{
   const container =
       document.getElementById("cat-" + parentId);
   if (!container)
       return;
   const descendants =
       container.querySelectorAll(
           ".cat-checkbox"
       );
   descendants.forEach(cb => {
       cb.checked = true;
   });
}

function uncheckDescendants(parentId)
{
    const container =
        document.getElementById("cat-" + parentId);
    if (!container)
        return;
    const descendants =
        container.querySelectorAll(
            ".cat-checkbox"
        );
    descendants.forEach(cb => {
        cb.checked = false;
    });
}
 
function uncheckAncestors(checkbox)
{
   let parentId =
       checkbox.dataset.parent;
   while(parentId)
   {
       const parentCheckbox =
           document.querySelector(
               '.cat-checkbox[data-id="' +
               parentId +
               '"]'
           );
       if(parentCheckbox)
       {
           parentCheckbox.checked = false;
           parentId =
               parentCheckbox.dataset.parent;
       }
       else
       {
           break;
       }
   }
}

function collapseBranch(categoryId)
{
   const container =
       document.getElementById(
           "cat-" + categoryId
       );
   if(container)
   {
       container.style.display = "none";
   }
   const iconContainer =
       document.querySelector(
           '[onclick*="cat-' +
           categoryId +
           '"] i'
       );
   if(iconContainer)
   {
       iconContainer.classList.remove(
           "fa-chevron-down"
       );
       iconContainer.classList.add(
           "fa-chevron-right"
       );
   }
}

// function updateFilter()
// {
//    const selected = [];
//    document
//        .querySelectorAll(
//            ".cat-checkbox:checked"
//        )
//        .forEach(cb => {
//            selected.push(
// cb.dataset.id
//            );
//        });
//    const url = new URL(window.location.href);
// url.searchParams.delete("page");

//    if(selected.length > 0)
// {
//    url.searchParams.set(
//        "categoryids",
//        selected.join(",")
//    );
// }
// else
// {
//    url.searchParams.delete("categoryids");
// }
// history.replaceState(
//    null,
//    "",
//    url.toString()
// );
// console.log(url.toString());
// $.ajax({
//    url: url.toString(),
//    type: "GET",
//    success: function(response)
//    { 
//    var newGrid =
//        $(response)
//            .find("#articleGrid")
//            .html();
   
//    $("#articleGrid").html(newGrid);
   
//    },
//    error: function(xhr,status,error)
//    {
//        console.error(
//            "Filter Error:",
//            error
//        );
//    }
// });
// }
function updateFilter()
{
   const selected = [];

   document
       .querySelectorAll(".cat-checkbox:checked")
       .forEach(cb => {
           selected.push(cb.dataset.id);
       });

   // Save selected categories
   sessionStorage.setItem(
       "selectedCategories",
       JSON.stringify(selected)
   );

   const url = new URL(window.location.href);
   url.searchParams.delete("page");

   if (selected.length > 0)
   {
       url.searchParams.set(
           "categoryids",
           selected.join(",")
       );
   }
   else
   {
       url.searchParams.delete("categoryids");
   }

   history.replaceState(
       null,
       "",
       url.toString()
   );

   console.log(url.toString());

   $.ajax({
       url: url.toString(),
       type: "GET",
             success: function(response)
       {
           var newGrid =
               $(response)
                   .find("#articleGrid")
                   .html();
 
           $("#articleGrid").html(newGrid);
 
           // Naye cards par pagination dobara lagao
           if (typeof showArticlePage === "function") {
               showArticlePage(1);
           }
       },
       error: function(xhr, status, error)
       {
           console.error(
               "Filter Error:",
               error
           );
 
           // Error par loader turant hatao (10s wait na kare)
           if (typeof hideKbLoader === "function") {
               hideKbLoader();
           }
       }
 
   });
}
document.addEventListener(
    "DOMContentLoaded",
    function () {
        const productCategoryId = (
            sessionStorage.getItem(
                "CAT_GA_CategoryID"
            ) || ""
        )
            .replace(/[{}]/g, "")
            .trim()
            .toLowerCase();

        /*
         * Product category selection is handled by the global
         * product filter block.
         */
        if (productCategoryId) {
            updateClearAllState();
            return;
        }

        const saved = JSON.parse(
            sessionStorage.getItem(
                "selectedCategories"
            ) || "[]"
        );

        saved.forEach(function (id) {
            const cb =
                document.querySelector(
                    '.cat-checkbox[data-id="' +
                    id +
                    '"]'
                );

            if (cb) {
                cb.checked = true;
            }
        });

        updateClearAllState();

        if (saved.length > 0) {
            updateFilter();
        }
    }
);

function clearFilters() {
   // Uncheck all boxes
   document
       .querySelectorAll(".cat-checkbox")
       .forEach(cb => {
           cb.checked = false;
       });
   // Collapse all branches
   /*document
       .querySelectorAll(".child-container")
       .forEach(container => {
           container.style.display = "none";
       });
   // Reset all expand icons
   document
       .querySelectorAll(".expand-icon i")
       .forEach(icon => {
           icon.classList.remove("fa-chevron-down");
           icon.classList.add("fa-chevron-right");
       });*/
   // Remove categoryids from URL
   const url =
       new URL(window.location.href);
   url.searchParams.delete(
       "categoryids"
   );
   url.searchParams.delete("page");
   history.replaceState(
       null,
       "",
       url.pathname
   );
   // Reload default article list
     $.ajax({
       url: url.pathname,
       type: "GET",
       success: function(response) {
           var newGrid =
               $(response)
               .find("#articleGrid")
               .html();
           $("#articleGrid")
               .html(newGrid);
 
           // Clear All ke baad bhi pagination dobara lagao
           if (typeof showArticlePage === "function") {
               showArticlePage(1);
           }
       },
       error: function(xhr, status, error) {
           console.error("Clear Filter Error:", error);
 
           if (typeof hideKbLoader === "function") {
               hideKbLoader();
           }
       }
   });
 
   
sessionStorage.removeItem("selectedCategories");
sessionStorage.removeItem("appliedProductCategory");

    updateClearAllState();

}

document.addEventListener(
   "DOMContentLoaded",
   function ()
   {
       document
           .querySelectorAll(
               ".cat-checkbox:checked"
           )
           .forEach(cb =>
           {
               let parentId =
cb.dataset.id;
               const container =
                   document.getElementById(
                       "cat-" + parentId
                   );
               if(container)
               {
                   container.style.display =
                       "block";
               }
               const icon =
                   document.querySelector(
                       '[onclick*="cat-' +
                       parentId +
                       '"] i'
                   );
               if(icon)
               {
                   icon.classList.remove(
                       "fa-chevron-right"
                   );
                   icon.classList.add(
                       "fa-chevron-down"
                   );
               }
           });
   }
);

//breadcrumb back btn code st
$(document).ready(function () {

    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get("categoryid");

    if (!categoryId) return;

    // Prevent reapplying same breadcrumb filter
    if (sessionStorage.getItem("breadcrumbFilterApplied") === categoryId) {
        return;
    }

    setTimeout(function () {

        // Clear existing filters first
        $('.cat-checkbox').prop('checked', false);

        $('.cat-checkbox').each(function () {

            if ($(this).attr('data-id') === categoryId) {

                $(this).prop('checked', true);

                sessionStorage.setItem(
                    "breadcrumbFilterApplied",
                    categoryId
                );

                $(this).trigger('change');

                if (typeof categoryChanged === "function") {
                    categoryChanged(this);
                }
            }

        });

    }, 1000);

});



// $(document).ready(function () {
 
//     const params = new URLSearchParams(window.location.search);
//     const categoryId = params.get("categoryid");
 
//     if (!categoryId) return;
 
//     setTimeout(function () {
 
//         $('.cat-checkbox').each(function () {
 
//             if ($(this).attr('data-id') === categoryId) {
 
//                 $(this).prop('checked', true);
 
//                 // Trigger existing onchange logic
//                 $(this).trigger('change');
 
//                 // If needed, call directly
//                 if (typeof categoryChanged === "function") {
//                     categoryChanged(this);
//                 }
//             }
 
//         });
 
//     }, 1000);
 
// });
//breadcrumb back btn code end
//Global Product Filter (GUID based) Starts

(function () {
    "use strict";

    var CATEGORY_STORAGE_KEY = "CAT_GA_CategoryID";
    var PRODUCT_STORAGE_KEY = "CAT_GA_ProductParameter";
    var APPLIED_STORAGE_KEY = "appliedProductCategory";

    var filterApplied = false;
    var retryCount = 0;
    var maximumRetries = 50;
    var retryTimer = null;

    function normalizeGuid(value) {
        return String(value || "")
            .replace(/[{}]/g, "")
            .trim()
            .toLowerCase();
    }

    function getStoredCategoryId() {
        return normalizeGuid(
            sessionStorage.getItem(
                CATEGORY_STORAGE_KEY
            )
        );
    }

    function getStoredProductParameter() {
        return String(
            sessionStorage.getItem(
                PRODUCT_STORAGE_KEY
            ) || ""
        ).trim();
    }

    function findCategoryCheckbox(categoryId) {
        var checkboxes = document.querySelectorAll(
            ".cat-checkbox[data-id]"
        );

        for (
            var index = 0;
            index < checkboxes.length;
            index++
        ) {
            var checkboxCategoryId = normalizeGuid(
                checkboxes[index].getAttribute(
                    "data-id"
                )
            );

            if (checkboxCategoryId === categoryId) {
                return checkboxes[index];
            }
        }

        return null;
    }

    function expandParentHierarchy(checkbox) {
        var currentCheckbox = checkbox;

        while (currentCheckbox) {
            var parentId = normalizeGuid(
                currentCheckbox.getAttribute(
                    "data-parent"
                )
            );

            if (!parentId) {
                break;
            }

            var parentCheckbox =
                findCategoryCheckbox(parentId);

            var parentContainer =
                document.getElementById(
                    "cat-" + parentId
                );

            if (parentContainer) {
                parentContainer.style.display =
                    "block";
            }

            var parentIcon =
                document.querySelector(
                    '[onclick*="cat-' +
                    parentId +
                    '"] i'
                );

            if (parentIcon) {
                parentIcon.classList.remove(
                    "fa-chevron-right"
                );

                parentIcon.classList.add(
                    "fa-chevron-down"
                );
            }

            currentCheckbox = parentCheckbox;
        }
    }

    function expandSelectedCategory(checkbox) {
        var categoryId = normalizeGuid(
            checkbox.getAttribute("data-id")
        );

        var ownContainer =
            document.getElementById(
                "cat-" + categoryId
            );

        if (ownContainer) {
            ownContainer.style.display = "block";
        }

        var ownIcon =
            document.querySelector(
                '[onclick*="cat-' +
                categoryId +
                '"] i'
            );

        if (ownIcon) {
            ownIcon.classList.remove(
                "fa-chevron-right"
            );

            ownIcon.classList.add(
                "fa-chevron-down"
            );
        }

        expandParentHierarchy(checkbox);
    }

    function applyCategoryFromSession() {
        if (filterApplied) {
            return true;
        }

        var categoryId =
            getStoredCategoryId();

        if (!categoryId) {
            console.log(
                "CAT_GA KA: Category GUID is not available yet."
            );

            return false;
        }

        var checkbox =
            findCategoryCheckbox(categoryId);

        if (!checkbox) {
            console.log(
                "CAT_GA KA: Waiting for category checkbox:",
                categoryId
            );

            return false;
        }

        /*
         * Clear previous checkbox selections.
         */
        document
            .querySelectorAll(
                ".cat-checkbox"
            )
            .forEach(function (item) {
                item.checked = false;
            });

        /*
         * Select only the mapped category.
         */
        checkbox.checked = true;

        /*
         * Expand the parent hierarchy so that the selected category
         * is visible.
         */
        expandSelectedCategory(checkbox);

        /*
         * Save the selected category.
         */
        sessionStorage.setItem(
            "selectedCategories",
            JSON.stringify([categoryId])
        );

        sessionStorage.setItem(
            APPLIED_STORAGE_KEY,
            categoryId
        );

        filterApplied = true;

        if (retryTimer) {
            clearInterval(retryTimer);
            retryTimer = null;
        }

        console.log(
            "CAT_GA KA: Category preselected successfully:",
            categoryId,
            checkbox
        );

        /*
         * Use the existing filter functionality after the checkbox
         * has visibly been selected.
         */
        if (
            typeof window.categoryChanged ===
            "function"
        ) {
            window.categoryChanged(checkbox);
        } else if (
            typeof window.updateFilter ===
            "function"
        ) {
            window.updateFilter();
        }

        if (
            typeof window.updateClearAllState ===
            "function"
        ) {
            window.updateClearAllState();
        }

        return true;
    }

    function startCategorySelection() {
        /*
         * categoryids or categoryid explicitly provided in the URL
         * should take priority.
         */
        var parameters =
            new URLSearchParams(
                window.location.search
            );

        if (
            parameters.has("categoryids") ||
            parameters.has("categoryid")
        ) {
            console.log(
                "CAT_GA KA: Explicit category URL filter found."
            );

            return;
        }

        /*
         * Do not check params.get("product") here.
         * The header may already have removed product from the URL.
         */
        var productParameter =
            getStoredProductParameter();

        if (!productParameter) {
            console.log(
                "CAT_GA KA: No stored product context found."
            );

            return;
        }

        if (applyCategoryFromSession()) {
            return;
        }

        retryTimer = setInterval(
            function () {
                retryCount++;

                if (
                    applyCategoryFromSession() ||
                    retryCount >= maximumRetries
                ) {
                    clearInterval(retryTimer);
                    retryTimer = null;

                    if (
                        retryCount >=
                        maximumRetries &&
                        !filterApplied
                    ) {
                        console.warn(
                            "CAT_GA KA: Category could not be preselected.",
                            {
                                productParameter:
                                    getStoredProductParameter(),
                                categoryId:
                                    getStoredCategoryId(),
                                checkboxCount:
                                    document.querySelectorAll(
                                        ".cat-checkbox[data-id]"
                                    ).length
                            }
                        );
                    }
                }
            },
            200
        );
    }

    /*
     * Register these listeners immediately.
     * Do not wait for DOMContentLoaded.
     */
    window.addEventListener(
        "CAT_GA_ProductContextReady",
        function (event) {
            var detail =
                event.detail || {};

            console.log(
                "CAT_GA KA: Product context ready event received:",
                detail
            );

            filterApplied = false;
            retryCount = 0;

            startCategorySelection();
        }
    );

    window.addEventListener(
        "CAT_GA_ProductContextChanged",
        function (event) {
            console.log(
                "CAT_GA KA: Product context changed:",
                event.detail || {}
            );

            filterApplied = false;
            retryCount = 0;

            sessionStorage.removeItem(
                APPLIED_STORAGE_KEY
            );

            sessionStorage.removeItem(
                "selectedCategories"
            );

            startCategorySelection();
        }
    );

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            startCategorySelection
        );
    } else {
        startCategorySelection();
    }
})();

//Global Product Filter (GUID based) Ends

function updateClearAllState() {
    const clearLink = document.getElementById("clearAllLink");

    const hasSelection =
        document.querySelectorAll(".cat-checkbox:checked").length > 0;

    if (hasSelection) {
        clearLink.classList.remove("disabled");
    } else {
        clearLink.classList.add("disabled");
    }
}


//new
   

  document.addEventListener("DOMContentLoaded", function () {
    const mobileBtn = document.getElementById("mobileFilterBtn");
    const sidebar = document.getElementById("filterSidebar");
    const closeBtn = document.getElementById("closeFilterPanel");
    const applyBtn = document.getElementById("applyFiltersBtn");
    
    const overlay = document.getElementById("kbOverlay");

    function openSidebar() {
      if (sidebar) sidebar.classList.add("mobile-open");
      if (overlay) overlay.classList.add("active");
      document.body.classList.add("no-scroll");
    }

    function closeSidebar() {
      if (sidebar) sidebar.classList.remove("mobile-open");
      if (overlay) overlay.classList.remove("active");
      document.body.classList.remove("no-scroll");
    }

    if (mobileBtn) mobileBtn.addEventListener("click", openSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (applyBtn) applyBtn.addEventListener("click", closeSidebar);
    if (overlay) overlay.addEventListener("click", closeSidebar);
  });



      function toggleCategory(id, element) {

        const container = document.getElementById(id);
        const icon = element.querySelector("i");

        if (container.style.display === "block") {

          container.style.display = "none";
          icon.classList.remove("fa-chevron-down");
          icon.classList.add("fa-chevron-right");

        } else {

          container.style.display = "block";
          icon.classList.remove("fa-chevron-right");
          icon.classList.add("fa-chevron-down");
        }
      }

  
// ==================== ARTICLE PAGINATION (same functionality/CSS as All Cases) ====================

let articleRowsPerPage = 8;
let articleCurrentPage = 1;

function getAllArticleCards() {
    return document.querySelectorAll("#articleGrid .kb-card");
}

function showArticlePage(page) {
    var allCards = Array.prototype.slice.call(getAllArticleCards());
    var totalRecords = allCards.length;

    var paginationEl = document.getElementById("articlePagination");

    if (totalRecords === 0) {
        if (paginationEl) {
            paginationEl.innerHTML = "";
            paginationEl.style.display = "none";
        }
        return;
    }
        if (paginationEl) {
        paginationEl.style.display = "";
    }
 

    var totalPages = Math.ceil(totalRecords / articleRowsPerPage) || 1;

    if (page < 1) {
        page = 1;
    }

    if (page > totalPages) {
        page = totalPages;
    }

    articleCurrentPage = page;

    var start = (articleCurrentPage - 1) * articleRowsPerPage;
    var end = start + articleRowsPerPage;

    allCards.forEach(function (card, index) {
        if (index >= start && index < end) {
            card.classList.remove("article-card-hidden");
        } else {
            card.classList.add("article-card-hidden");
        }
    });

    renderArticlePagination(totalPages, totalRecords);
}

function renderArticlePagination(totalPages, totalRecords) {
    var paginationEl = document.getElementById("articlePagination");
    if (!paginationEl) return;

    if (totalRecords === 0) {
        paginationEl.innerHTML = "";
        return;
    }

    var startRecord = ((articleCurrentPage - 1) * articleRowsPerPage) + 1;
    var endRecord = Math.min(articleCurrentPage * articleRowsPerPage, totalRecords);

    var html = "";

    html += `
        <div class="pagination-footer">
            <div class="record-info">
                Viewing ${startRecord}-${endRecord} Of ${totalRecords}
            </div>

            <div class="pagination-buttons">

                <button class="page-btn prev-btn"
                    ${articleCurrentPage === 1 ? "disabled" : ""}
                    data-page="${articleCurrentPage - 1}">
                    &#10094;
                </button>
    `;

    // Always show first page
    html += `
        <button class="page-btn page-number ${articleCurrentPage === 1 ? "active" : ""}"
            data-page="1">
            1
        </button>
    `;

    let startPage = Math.max(2, articleCurrentPage - 1);
    let endPage = Math.min(totalPages - 1, articleCurrentPage + 1);

    // Beginning pages
    if (articleCurrentPage <= 3) {
        startPage = 2;
        endPage = Math.min(4, totalPages - 1);
    }

    // Ending pages
    if (articleCurrentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 3);
        endPage = totalPages - 1;
    }

    // Left ellipsis
    if (startPage > 2) {
        html += `
            <button class="page-btn page-ellipsis"
                data-page="${startPage - 2}">
                ...
            </button>
        `;
    }

    // Middle pages
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="page-btn page-number ${articleCurrentPage === i ? 'active' : ''}"
                data-page="${i}">
                ${i}
            </button>
        `;
    }

    // Right ellipsis
    if (endPage < totalPages - 1) {
        html += `
            <button class="page-btn page-ellipsis"
                data-page="${endPage + 2}">
                ...
            </button>
        `;
    }

    // Last page
    if (totalPages > 1) {
        html += `
            <button class="page-btn page-number ${articleCurrentPage === totalPages ? 'active' : ''}"
                data-page="${totalPages}">
                ${totalPages}
            </button>
        `;
    }

    html += `
                <button class="page-btn next-btn"
                    ${articleCurrentPage === totalPages ? "disabled" : ""}
                    data-page="${articleCurrentPage + 1}">
                    &#10095;
                </button>
            </div>
        </div>
    `;

    paginationEl.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", function () {
    showArticlePage(1);
});

document.addEventListener("click", function (e) {
    var target = e.target.closest(
        "#articlePagination .page-number, #articlePagination .page-ellipsis"
    );

    if (target) {
        showArticlePage(parseInt(target.getAttribute("data-page"), 10));
        return;
    }

    var prevBtn = e.target.closest("#articlePagination .prev-btn");
    if (prevBtn && articleCurrentPage > 1) {
        showArticlePage(articleCurrentPage - 1);
        return;
    }

    var nextBtn = e.target.closest("#articlePagination .next-btn");
    if (nextBtn) {
        var totalPages = Math.ceil(getAllArticleCards().length / articleRowsPerPage) || 1;
        if (articleCurrentPage < totalPages) {
            showArticlePage(articleCurrentPage + 1);
        }
    }
});

//Loader Script
 
(function () {
  var KB_MIN_LOADER_MS = 400;   // kam se kam itni der dikhe (flicker na ho)
  var KB_MAX_LOADER_MS = 10000; // safety: kuch na aaye toh 10s baad hat jaaye
  var loaderShownAt = 0;
  var hideTimer = null;
  var maxTimer = null;
  var isLoading = false;
 
  function getLoader() {
    return document.getElementById("kbLoader");
  }
 
  function hideNow() {
    var loader = getLoader();
    isLoading = false;
    clearTimeout(maxTimer);
    if (!loader) return;
    loader.classList.remove("active");
    loader.setAttribute("aria-hidden", "true");
  }
 
  function showKbLoader() {
    var loader = getLoader();
    if (!loader) return;
    isLoading = true;
    loaderShownAt = Date.now();
    clearTimeout(hideTimer);
    clearTimeout(maxTimer);
    loader.classList.add("active");
    loader.setAttribute("aria-hidden", "false");
    maxTimer = setTimeout(hideNow, KB_MAX_LOADER_MS);
        var previewPopup = document.getElementById("kbArticlePreviewPopup");
    if (previewPopup) {
      previewPopup.classList.remove("active");
      previewPopup.setAttribute("aria-hidden", "true");
    }
 
  }
 
  function hideKbLoader() {
    if (!isLoading) return;
    var wait = Math.max(0, KB_MIN_LOADER_MS - (Date.now() - loaderShownAt));
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideNow, wait);
  }
 
  // Kahin aur se bhi call kar sako
  window.showKbLoader = showKbLoader;
  window.hideKbLoader = hideKbLoader;
 
  // Existing filter functions ke upar loader lagao
  function wrapWithLoader(fnName) {
    var original = window[fnName];
    if (typeof original !== "function" || original.__kbWrapped) return;
 
    var wrapped = function () {
      showKbLoader();
      return original.apply(this, arguments);
    };
    wrapped.__kbWrapped = true;
    window[fnName] = wrapped;
  }
 
  document.addEventListener("DOMContentLoaded", function () {
    wrapWithLoader("categoryChanged");
    wrapWithLoader("clearFilters");
 
    // Articles area mein naya content aate hi loader hatao
    var target = document.querySelector(".kb-wrapper");
    if (!target) return;
 
    new MutationObserver(function (mutations) {
      if (!isLoading) return;
 
      var resultsChanged = mutations.some(function (m) {
        return !(m.target.closest &&
                 m.target.closest("#articlePagination, #kbArticlePreviewPopup"));
      });
 
      if (resultsChanged) hideKbLoader();
    }).observe(target, { childList: true, subtree: true });
  });
})();
//loader end

document.addEventListener("DOMContentLoaded", function () {
    const popup = document.getElementById("kbArticlePreviewPopup");

    if (!popup) return;

    const popupTitle = popup.querySelector(".kb-preview-popup-title");
    const popupContent = popup.querySelector(".kb-preview-popup-content");

    const titleLinks = document.querySelectorAll(".kb-title-preview-trigger");

    let hideTimeout;

    function placePopupNearTile(titleLink) {
        const card = titleLink.closest(".kb-card");
        if (!card) return;

        const cardRect = card.getBoundingClientRect();

        const popupWidth = popup.offsetWidth || 420;
        const popupHeight = popup.offsetHeight || 300;
        const gap = 14;

        let left = cardRect.right + gap;
        let top = cardRect.top;

        // If there is no space on right, show on left side
        if (left + popupWidth > window.innerWidth - 16) {
            left = cardRect.left - popupWidth - gap;
        }

        // Keep inside viewport
        if (left < 16) {
            left = 16;
        }

        if (top + popupHeight > window.innerHeight - 16) {
            top = window.innerHeight - popupHeight - 16;
        }

        if (top < 16) {
            top = 16;
        }

        popup.style.left = left + "px";
        popup.style.top = top + "px";
    }

    function showPopup() {
        clearTimeout(hideTimeout);
        popup.classList.add("active");
        popup.setAttribute("aria-hidden", "false");
    }

    function hidePopup() {
        hideTimeout = setTimeout(() => {
            popup.classList.remove("active");
            popup.setAttribute("aria-hidden", "true");
        }, 200);
    }

        // Delegated events: grid replace hone ke baad bhi kaam karega
    document.addEventListener("mouseover", function (e) {
        const titleLink = e.target.closest(".kb-title-preview-trigger");
        if (!titleLink || titleLink.contains(e.relatedTarget)) return;
 
        clearTimeout(hideTimeout);
 
        const card = titleLink.closest(".kb-card");
        if (!card) return;
 
        const source = card.querySelector(".kb-preview-source");
        if (!source) return;
 
        const titleElement = source.querySelector(".kb-preview-source-title");
        const contentElement = source.querySelector(".kb-preview-source-content");
 
        popupTitle.textContent = titleElement ? titleElement.textContent.trim() : "";
        popupContent.innerHTML = contentElement ? contentElement.innerHTML : "";
 
        showPopup();
        placePopupNearTile(titleLink);
    });
 
    document.addEventListener("mouseout", function (e) {
        const titleLink = e.target.closest(".kb-title-preview-trigger");
        if (!titleLink || titleLink.contains(e.relatedTarget)) return;
        hidePopup();
    });
 

    // Keep popup open when cursor moves into it
    popup.addEventListener("mouseenter", function () {
        clearTimeout(hideTimeout);
    });

    // Hide when cursor leaves popup
    popup.addEventListener("mouseleave", hidePopup);

    window.addEventListener("scroll", function () {
        popup.classList.remove("active");
        popup.setAttribute("aria-hidden", "true");
    });

    window.addEventListener("resize", function () {
        popup.classList.remove("active");
        popup.setAttribute("aria-hidden", "true");
    });
});
