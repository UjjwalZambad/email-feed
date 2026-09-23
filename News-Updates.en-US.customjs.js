
/* ============================================================
  NEWS & UPDATES FILTER
  ============================================================ */
function updateNewsFilter() {
    const selected = [];
    $(".product-checkbox:checked").each(function () {
        selected.push($(this).data("id"));
    });
    const url = new URL(window.location.href);
    /*
     * Reset pagination whenever product filter changes.
     */
    url.searchParams.delete("page");
    /*
     * Add selected products to URL.
     */
    if (selected.length > 0) {
        url.searchParams.set(
            "products",
            selected.join(",")
        );
    } else {
        url.searchParams.delete("products");
    }
    /*
     * Update browser URL without full page reload.
     */
    history.replaceState(
        null,
        "",
        url.toString()
    );
    /*
     * Refresh only News & Updates section.
     */
    $.ajax({
        url: url.toString(),
        type: "GET",
        success: function (response) {
            const responsePage = $(response);
            /*
             * Get the refreshed News & Updates month container.
             */
            let newGrid =
                responsePage
                    .find("#newsMonthContainer")
                    .html();
            /*
             * Fallback if #newsMonthContainer
             * does not exist in returned HTML.
             */
            if (newGrid === undefined) {
                newGrid =
                    responsePage
                        .find(".news-results-section")
                        .html();
            }
            /*
             * Replace existing News & Updates content.
             */
            if (newGrid !== undefined) {
                if ($("#newsMonthContainer").length > 0) {
                    $("#newsMonthContainer").html(newGrid);
                } else {
                    const refreshedGroups =
                        responsePage
                            .find(".news-results-section")
                            .html();
                    if (
                        refreshedGroups !== undefined &&
                        $(".news-results-section").length > 0
                    ) {
                        $(".news-results-section")
                            .html(refreshedGroups);
                    }
                }
            }
            sortNewsItemsByPriority();
            initializeReadMore();
            /*
             * ====================================================
             * PRODUCT SELECTED
             * ====================================================
             *
             * FetchXML has already filtered the records by:
             *
             *     Persona
             *     +
             *     Selected Product(s)
             *
             * Now remove month groups which contain
             * no returned News & Updates records.
             */
            if (selected.length > 0) {
                applyProductMonthState();
            }
            /*
             * ====================================================
             * NO PRODUCT SELECTED
             * ====================================================
             *
             * Show the normal persona-based month structure.
             */
            else {
                applyMonthState();
            }
            updateClearAllState();
            checkNoResults();
        },
        error: function (xhr, status, error) {
            console.error(
                "News & Updates filter error:",
                error
            );
        }
    });
}

/* ============================================================

   PRODUCT FILTER - MONTH STATE

   ============================================================ */

function applyProductMonthState() {

    const groups = $(".news-month-group");

    if (!groups.length) {

        return;

    }

    /*

     * First reset every month.

     */

    groups.each(function () {

        const group = $(this);

        group.removeClass("expanded");

        group.find(".news-month-header i")

            .removeClass("fa-chevron-down")

            .addClass("fa-chevron-right");

        /*

         * Determine whether this month actually contains

         * a News & Updates record returned by FetchXML.

         */

        const newsItems =

            group.find(".news-item");

        if (newsItems.length === 0) {

            /*

             * No matching record for this month.

             *

             * Hide the entire month.

             */

            group.hide();

        } else {

            /*

             * Matching News & Updates records exist.

             */

            group.show();

        }

    });

    const visibleGroups =

        groups.filter(function () {

            return $(this).find(".news-item").length > 0;

        });

    if (!visibleGroups.length) {

        return;

    }

    const latestGroup =

        $(visibleGroups.get(0));

    latestGroup.addClass("expanded");

    latestGroup.find(".news-month-header i")

        .removeClass("fa-chevron-right")

        .addClass("fa-chevron-down");

}


/* ============================================================
  CLEAR ALL STATE
  ============================================================ */
function updateClearAllState() {
    const selected =
        $(".product-checkbox:checked").length > 0;
    if (selected) {
        $("#clearAllLink")
            .removeClass("disabled");
    } else {
        $("#clearAllLink")
            .addClass("disabled");
    }
}

/* ============================================================
  MONTH EXPAND / COLLAPSE
  ============================================================ */
$(document).on("click", ".news-month-header", function () {
    const group = $(this).closest(".news-month-group");
    const icon = group.find(".news-month-header i");
    group.toggleClass("expanded");
    if (group.hasClass("expanded")) {
        icon
            .removeClass("fa-chevron-right")
            .addClass("fa-chevron-down");
    } else {
        icon
            .removeClass("fa-chevron-down")
            .addClass("fa-chevron-right");
    }
});

/* ============================================================
  DEFAULT MONTH STATE
  ============================================================ */
function applyMonthState() {
    const groups =
        $(".news-month-group");
    groups.removeClass("expanded");
    groups
        .find(".news-month-header i")
        .removeClass("fa-chevron-down")
        .addClass("fa-chevron-right");
     /*
    * No product selected:
    * Expand the latest 3 months.
    *
    * FetchXML already returns the months
    * from latest to oldest.
    */
   groups.slice(0, 3).each(function () {
       const group = $(this);
       group.addClass("expanded");
       group
           .find(".news-month-header i")
           .removeClass("fa-chevron-right")
           .addClass("fa-chevron-down");
   });
}

/* ============================================================
  LEGACY FUNCTION
  ============================================================ */
function expandMonthsWithNews() {
    expandOnlyMonthsWithFilteredNews();
}

/* ============================================================
  EXPAND ALL MONTHS
  ============================================================
  This is NOT used for product filtering.
  ============================================================ */
function expandAllNewsMonths() {
    const groups =
        $(".news-month-group");
    groups.addClass("expanded");
    groups
        .find(".news-month-header i")
        .removeClass("fa-chevron-right")
        .addClass("fa-chevron-down");
}

/* ============================================================
  NO RESULTS
  ============================================================ */
function checkNoResults() {
    const hasNews =
        $(".news-item").length > 0;
    if (hasNews) {
        $("#newsNoResults")
            .hide();
        $(".news-results-section")
            .show();
        if (
            $("#newsMonthContainer").length > 0
        ) {
            $("#newsMonthContainer")
                .show();
        }
        return;
    }
    if (
        $("#newsMonthContainer").length > 0
    ) {
        $("#newsMonthContainer")
            .hide();
    }

    const selectedNames = [];
    $(".product-checkbox:checked").each(
        function () {
            selectedNames.push(
                $(this).data("title")
            );
        }
    );

    let message;
    if (selectedNames.length > 0) {
        message =
            "No results for " +
            selectedNames.join(", ") +
            " in News & Updates";
    } else {
        message =
            "No results in News & Updates";
    }

    $("#newsNoResults")
        .text(message)
        .show();
}

/* ============================================================
  PRODUCT CHECKBOX CHANGE
  ============================================================ */
$(document).on(
    "change",
    ".product-checkbox",
    function () {
        updateNewsFilter();
    }
);

/* ============================================================
  CLEAR ALL
  ============================================================ */
$("#clearAllLink").on(
    "click",
    function () {
        if (
            $(this).hasClass("disabled")
        ) {
            return;
        }
        $(".product-checkbox")
            .prop("checked", false);
        const url =
            new URL(
                window.location.href
            );
        url.searchParams.delete(
            "products"
        );
        url.searchParams.delete(
            "page"
        );
        history.replaceState(
            null,
            "",
            url.toString()
        );
        $.ajax({
            url: url.toString(),
            type: "GET",
            success: function (response) {
                const responsePage =
                    $(response);

                let newGrid =
                    responsePage
                        .find("#newsMonthContainer")
                        .html();
                if (
                    newGrid === undefined
                ) {
                    newGrid =
                        responsePage
                            .find(".news-results-section")
                            .html();
                }
                if (
                    newGrid !== undefined
                ) {
                    if (
                        $("#newsMonthContainer")
                            .length > 0
                    ) {
                        $("#newsMonthContainer")
                            .html(newGrid);
                    } else {
                        const refreshedGroups =
                            responsePage
                                .find(".news-results-section")
                                .html();
                        if (
                            refreshedGroups !== undefined &&
                            $(".news-results-section")
                                .length > 0
                        ) {
                            $(".news-results-section")
                                .html(
                                    refreshedGroups
                                );
                        }
                    }
                }
                applyMonthState();
                updateClearAllState();
                checkNoResults();
            },
            error: function () {
                console.error(
                    "Clear All error."
                );
            }
        });
    }
);

/* =========================================================
  INITIAL PAGE LOAD
  ========================================================= */
$(document).ready(
   function () {
       const params =
           new URLSearchParams(
               window.location.search
           );
       /*
        * Existing multi-product filter.
        * Example:
        * ?products=GUID1,GUID2
        */
       const productIds =
           params.get("products");
       /*
        * AC2 - Product Context
        *
        * Example homepage URL:
        * ?product=Billing
        *
        * This is the product context coming
        * from the homepage.
        */
       const productContext =
           params.get("product") || sessionStorage.getItem("currentProduct");

       /* =====================================================
          EXISTING ?products= LOGIC
          ===================================================== */
       if (productIds) {
           productIds
               .split(",")
               .forEach(
                   function (id) {
                       $(
                           '.product-checkbox[data-id="' +
                           id +
                           '"]'
                       ).prop(
                           "checked",
                           true
                       );
                   }
               );
       }

       /* =====================================================
          AC2 - PRODUCT CONTEXT
          ===================================================== */
       if (productContext && !productIds) {
           /*
            * Decode the product from the URL.
            *
            * Example:
            * Billing
            */
           const contextProduct =
               decodeURIComponent(productContext)
                   .trim()
                   .toLowerCase();
           let matchedProduct = false;

           /*
            * Look through the available
            * product checkboxes.
            */
           $(".product-checkbox").each(
               function () {
                   const checkbox =
                       $(this);
                   const checkboxId =
                       checkbox.attr("id");

                   if (!checkboxId) {
                       return;
                   }

                   /*
                    * Find the label associated
                    * with this checkbox.
                    */
                   const productLabel =
                       $('label[for="' +
                           checkboxId +
                           '"]');

                   const productName =
                       productLabel
                           .text()
                           .trim()
                           .toLowerCase();

                   /*
                    * Compare homepage product
                    * context with product name.
                    */
                   if (
                       productName ===
                       contextProduct
                   ) {
                       checkbox.prop(
                           "checked",
                           true
                       );
                       matchedProduct = true;
                       /*
                        * Stop looping once the
                        * matching product is found.
                        */
                       return false;
                   }
               }
           );

           /*
            * If product context matched a product,
            * run the existing News & Updates
            * filtering logic.
            */
           if (matchedProduct) {
               updateNewsFilter();
               return;
           }
       }

       /* =====================================================
          EXISTING INITIAL PAGE LOAD LOGIC
          ===================================================== */
       sortNewsItemsByPriority();
       initializeReadMore();
       updateClearAllState();

       if (productIds) {
       } else {
           applyMonthState();
       }

       checkNoResults();
   }
);

/* =========================================================
  NEWS & UPDATES - PRIORITY SORTING
  ========================================================= */
function sortNewsItemsByPriority() {
   $(".news-month-content").each(function () {
       const $group = $(this);
       const items = $group.find(".news-item").get();
       if (items.length <= 1) {
           return;
       }
       items.sort(function (a, b) {
           // -----------------------------------------
           // PRIORITY
           // -----------------------------------------
           const priorityA = parseInt(
               $(a).attr("data-priority"),
               10
           );
           const priorityB = parseInt(
               $(b).attr("data-priority"),
               10
           );
           // If priority is missing / invalid,
           // treat it as lowest priority.
           const finalPriorityA =
               Number.isNaN(priorityA) ? 999 : priorityA;
           const finalPriorityB =
               Number.isNaN(priorityB) ? 999 : priorityB;

           // -----------------------------------------
           // CASE 1:
           // Different priorities
           // -----------------------------------------
           if (finalPriorityA !== finalPriorityB) {
               return finalPriorityA - finalPriorityB;
           }

           // -----------------------------------------
           // CASE 2:
           // Same priority
           // Sort by latest published date
           // -----------------------------------------
           const dateA = new Date(
               $(a).attr("data-published-date")
           ).getTime();
           const dateB = new Date(
               $(b).attr("data-published-date")
           ).getTime();
           return dateB - dateA;
       });

       // -----------------------------------------
       // Put sorted records back into the month
       // -----------------------------------------
       $.each(items, function (_, item) {
           $group.append(item);
       });
   });
}

/* ============================================================
  READ MORE / READ LESS INITIALIZATION
  ============================================================ */
function initializeReadMore() {
   /* ------------------------------------------------------------
      Add a CSS rule once.
      This is the final protection against Power Pages CSS
      overriding the button visibility.
   ------------------------------------------------------------ */
   if (!document.getElementById("news-read-more-visibility-css")) {
       $("<style>", {
           id: "news-read-more-visibility-css",
           type: "text/css",
           text:
               ".news-item.no-read-more .read-more-btn {" +
               "display: none !important;" +
               "visibility: hidden !important;" +
               "opacity: 0 !important;" +
               "pointer-events: none !important;" +
               "}" +
               ".news-item.has-read-more .read-more-btn {" +
               "display: inline-block !important;" +
               "visibility: visible !important;" +
               "opacity: 1 !important;" +
               "pointer-events: auto !important;" +
               "}"
       }).appendTo("head");
   }

   /* ------------------------------------------------------------
      Process every news item
   ------------------------------------------------------------ */
   $(".news-item").each(function () {
       const item = $(this);
       const content = item
           .find(".news-item-content")
           .first();
       const button = item
           .find(".read-more-btn")
           .first();

       if (!content.length || !button.length) {
           return;
       }

       /* --------------------------------------------------------
          RESET STATE
       -------------------------------------------------------- */
       item.removeClass("no-read-more has-read-more");
       content.removeClass("expanded");

       /*
        * Hide button immediately while calculating.
        */
       button.attr("hidden", true);
       button[0].style.setProperty(
           "display",
           "none",
           "important"
       );

       /* --------------------------------------------------------
          SET COLLAPSED CONTENT STATE FOR MEASUREMENT
       -------------------------------------------------------- */
       content[0].style.setProperty(
           "display",
           "-webkit-box",
           "important"
       );
       content[0].style.setProperty(
           "-webkit-box-orient",
           "vertical",
           "important"
       );
       content[0].style.setProperty(
           "-webkit-line-clamp",
           "3",
           "important"
       );
       content[0].style.setProperty(
           "overflow",
           "hidden",
           "important"
       );
       content[0].style.setProperty(
           "max-height",
           "none",
           "important"
       );

       /* --------------------------------------------------------
          CREATE TEMPORARY MEASUREMENT ELEMENT
       -------------------------------------------------------- */
       const measurement = $("<div></div>");
       measurement.html(content.html());

       const computed =
           window.getComputedStyle(content[0]);

       measurement.css({
           "position": "absolute",
           "visibility": "hidden",
           "display": "block",
           /*
            * Same width as actual content.
            */
           "width": content.outerWidth() + "px",
           "height": "auto",
           "max-height": "none",
           "overflow": "visible",
           /*
            * Copy typography.
            */
           "font-family": computed.fontFamily,
           "font-size": computed.fontSize,
           "font-weight": computed.fontWeight,
           "font-style": computed.fontStyle,
           "line-height": computed.lineHeight,
           "letter-spacing": computed.letterSpacing,
           "word-spacing": computed.wordSpacing,
           "padding": "0",
           "margin": "0",
           "border": "0",
           "-webkit-line-clamp": "unset",
           "-webkit-box-orient": "initial"
       });

       /*
        * Remove child margins so they don't artificially
        * increase the measured height.
        */
       measurement.find("*").css({
           "margin-top": "0",
           "margin-bottom": "0"
       });

       $("body").append(measurement);

       /* --------------------------------------------------------
          CALCULATE CONTENT HEIGHT
       -------------------------------------------------------- */
       const contentHeight =
           measurement[0].scrollHeight;

       /* --------------------------------------------------------
          CALCULATE LINE HEIGHT
       -------------------------------------------------------- */
       let lineHeight =
           parseFloat(computed.lineHeight);

       /*
        * If line-height is "normal".
        */
       if (!lineHeight || isNaN(lineHeight)) {
           const fontSize =
               parseFloat(computed.fontSize) || 16;
           lineHeight = fontSize * 1.2;
       }

       /* --------------------------------------------------------
          CALCULATE NUMBER OF LINES
       -------------------------------------------------------- */
       const lineCount = Math.ceil(
           contentHeight / lineHeight
       );

       /*
        * Remove temporary element.
        */
       measurement.remove();

       /* --------------------------------------------------------
          DEBUG
       -------------------------------------------------------- */
       console.log(
           "NEWS:",
           item.find(".news-item-title").text().trim(),
           "| Lines:",
           lineCount,
           "| Height:",
           contentHeight,
           "| Line Height:",
           lineHeight
       );

       /* ========================================================
          CASE 1:
          CONTENT IS 3 LINES OR LESS
       ======================================================== */
       if (lineCount <= 3) {
           console.log(
               "HIDING READ MORE:",
               item.find(".news-item-title").text().trim()
           );

           /*
            * Mark this article as NOT requiring Read More.
            */
           item.addClass("no-read-more");

           item.removeClass("has-read-more");

           /*
            * Show complete content.
            */
           content.removeClass("expanded");
           content[0].style.setProperty(
               "display",
               "block",
               "important"
           );
           content[0].style.setProperty(
               "-webkit-line-clamp",
               "unset",
               "important"
           );
           content[0].style.setProperty(
               "-webkit-box-orient",
               "initial",
               "important"
           );
           content[0].style.setProperty(
               "max-height",
               "none",
               "important"
           );
           content[0].style.setProperty(
               "overflow",
               "visible",
               "important"
           );

           /*
            * Hide Read More using multiple methods.
            */
           button.attr("hidden", true);
           button.attr(
               "aria-hidden",
               "true"
           );
           button[0].style.setProperty(
               "display",
               "none",
               "important"
           );
           button[0].style.setProperty(
               "visibility",
               "hidden",
               "important"
           );
           button[0].style.setProperty(
               "opacity",
               "0",
               "important"
           );
           button[0].style.setProperty(
               "pointer-events",
               "none",
               "important"
           );

           button.text("Read More");

           return;
       }

       /* ========================================================
          CASE 2:
          CONTENT IS MORE THAN 3 LINES
       ======================================================== */
       item.removeClass("no-read-more");
       item.addClass("has-read-more");

       /*
        * Keep content collapsed to 3 lines.
        */
       content.removeClass("expanded");
       content[0].style.setProperty(
           "display",
           "-webkit-box",
           "important"
       );
       content[0].style.setProperty(
           "-webkit-box-orient",
           "vertical",
           "important"
       );
       content[0].style.setProperty(
           "-webkit-line-clamp",
           "3",
           "important"
       );
       content[0].style.setProperty(
           "max-height",
           "none",
           "important"
       );
       content[0].style.setProperty(
           "overflow",
           "hidden",
           "important"
       );

       /*
        * Show Read More.
        */
       button.removeAttr("hidden");
       button.attr(
           "aria-hidden",
           "false"
       );
       button[0].style.setProperty(
           "display",
           "inline-block",
           "important"
       );
       button[0].style.setProperty(
           "visibility",
           "visible",
           "important"
       );
       button[0].style.setProperty(
           "opacity",
           "1",
           "important"
       );
       button[0].style.setProperty(
           "pointer-events",
           "auto",
           "important"
       );
       button.text("Read More");
   });
}

/* ============================================================
  INITIALIZE READ MORE AFTER PAGE CONTENT IS RENDERED
  ============================================================ */
$(document).ready(function () {
   setTimeout(function () {
       initializeReadMore();
   }, 500);
   setTimeout(function () {
       initializeReadMore();
   }, 1500);
   setTimeout(function () {
       initializeReadMore();
   }, 3000);
});

/* =========================================================
  READ MORE / READ LESS CLICK
  ========================================================= */
$(document).off(
   "click.newsReadMore",
   ".read-more-btn"
);
$(document).on(
   "click.newsReadMore",
   ".read-more-btn",
   function (event) {
       event.preventDefault();
       const button = $(this);
       const item =
           button.closest(".news-item");

        //Do nothing for articles that have 3 lines or less   
        if(item.hasClass("no-read-more")){
            return;
        }
       const content =
           item.find(".news-item-content").first();
       if (!content.length) {
           return;
       }
       /*
        * READ LESS
        */
       if (content.hasClass("expanded")) {
           content.removeClass("expanded");
           content.css({
               "display": "-webkit-box",
               "-webkit-box-orient": "vertical",
               "-webkit-line-clamp": "3",
               "max-height": "none",
               "overflow": "hidden"
           });
           button.text("Read More");
       }
       /*
        * READ MORE
        */
       else {
           content.addClass("expanded");
           content.css({
               "display": "block",
               "-webkit-line-clamp": "unset",
               "max-height": "none",
               "overflow": "visible"
           });
           button.text("Read Less");
       }
   }
);

/* ============================================================
  MOBILE FILTER
  ============================================================ */
function initializeMobileNewsFilter() {
    const mobileList = $("#mobileProductFilterList");
    if (!mobileList.length) {
        return;
    }
    /*
     * Build the mobile product list from the existing
     * desktop product filter list.
     */
    mobileList.empty();
    $(".product-filter-item").each(function () {
        const desktopItem = $(this);
        const productId =
            desktopItem.find(".product-checkbox").data("id");
        const productName =
            desktopItem.find("label").text().trim();
        if (!productId || !productName) {
            return;
        }
        const desktopCheckbox =
            desktopItem.find(".product-checkbox");
        /*
         * Get count if your existing markup contains one.
         */
        const countElement =
            desktopItem.find(".product-count");
        const count =
            countElement.length
                ? countElement.text().trim()
                : "";
        const mobileItem = $(`
<div class="mobile-product-filter-item">
<div class="mobile-product-filter-left">
<span class="mobile-product-chevron">
                       ›
</span>
<label class="mobile-product-label">
<input type="checkbox"
                              class="mobile-product-checkbox"
                              data-id="${productId}">
<span class="mobile-checkbox-custom"></span>
<span class="mobile-product-name">
                           ${productName}
</span>
</label>
</div>
               ${count
                ? `<span class="mobile-product-count">${count}</span>`
                : ""
            }
</div>
       `);
        mobileList.append(mobileItem);
        /*
         * Keep mobile checkbox synchronized with
         * the existing desktop checkbox.
         */
        const mobileCheckbox =
            mobileItem.find(".mobile-product-checkbox");
        mobileCheckbox.prop(
            "checked",
            desktopCheckbox.prop("checked")
        );
    });
    updateMobileClearAllState();
}

/* ============================================================
  OPEN MOBILE FILTER
  ============================================================ */
$(document).on("click", "#mobileFilterButton", function () {
    initializeMobileNewsFilter();
    $("#mobileFilterModal")
        .addClass("active");
    $("body").addClass("mobile-filter-open");
});

/* ============================================================
  CLOSE MOBILE FILTER
  ============================================================ */
$(document).on("click", "#mobileFilterClose", function () {
    $("#mobileFilterModal")
        .removeClass("active");
    $("body").removeClass("mobile-filter-open");
});

/*
* Close when clicking outside the white filter panel.

$(document).on("click", "#mobileFilterModal", function (event) {
    if ($(event.target).is("#mobileFilterModal")) {
        $("#mobileFilterModal")
            .removeClass("active");
        $("body").removeClass("mobile-filter-open");
    }
}); */

/* ============================================================
  MOBILE CHECKBOX CHANGE
  ============================================================ */
$(document).on(
    "change",
    ".mobile-product-checkbox",
    function () {
        const productId =
            $(this).data("id");
        const desktopCheckbox =
            $(".product-checkbox").filter(function () {
                return $(this).data("id") == productId;
            });
        /*
         * Synchronize mobile selection
         * with the existing desktop checkbox.
         */
        desktopCheckbox.prop(
            "checked",
            $(this).prop("checked")
        );
        updateMobileClearAllState();
    }
);

/* ============================================================
  MOBILE CLEAR ALL STATE
  ============================================================ */
function updateMobileClearAllState() {
    const hasSelected =
        $(".mobile-product-checkbox:checked").length > 0;
    if (hasSelected) {
        $("#mobileClearAll")
            .removeClass("disabled");
    } else {
        $("#mobileClearAll")
            .addClass("disabled");
    }
}

/* ============================================================
  MOBILE CLEAR ALL
  ============================================================ */
$(document).on("click", "#mobileClearAll", function () {
    if ($(this).hasClass("disabled")) {
        return;
    }
    /*
     * Uncheck mobile checkboxes.
     */
    $(".mobile-product-checkbox")
        .prop("checked", false);
    /*
     * Uncheck the existing desktop checkboxes.
     */
    $(".product-checkbox")
        .prop("checked", false);
    updateMobileClearAllState();
    /*
     * Update the existing Clear All state.
     */
    updateClearAllState();
});

/* ============================================================
  MOBILE APPLY
  ============================================================ */
$(document).on("click", "#mobileApplyFilter", function () {
    /*
     * Make absolutely sure the desktop checkboxes
     * contain the current mobile selection.
     */
    $(".mobile-product-checkbox").each(function () {
        const productId =
            $(this).data("id");
        $(".product-checkbox").filter(function () {
            return $(this).data("id") == productId;
        }).prop(
            "checked",
            $(this).prop("checked")
        );
    });
    /*
     * Use your existing filtering function.
     *
     * This means:
     * - URL gets updated
     * - AJAX runs
     * - News & Updates refreshes
     * - month state is recalculated
     * - no-results logic continues to work
     */
    updateNewsFilter();
    /*
     * Close modal.
     */
    $("#mobileFilterModal")
        .removeClass("active");
    $("body").removeClass("mobile-filter-open");
});

/* ============================================================
  INITIALIZE MOBILE FILTER
  ============================================================ */
$(document).ready(function () {
    initializeMobileNewsFilter();
});