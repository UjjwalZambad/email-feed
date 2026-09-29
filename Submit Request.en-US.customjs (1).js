
 (function (webapi, $) {
    function safeAjax(ajaxOptions) {
        var deferredAjax = $.Deferred();

        shell.getTokenDeferred().done(function (token) {
            ajaxOptions.headers = ajaxOptions.headers || {};
            ajaxOptions.headers["__RequestVerificationToken"] = token;
            ajaxOptions.headers["OData-Version"] = "4.0";
            ajaxOptions.headers["OData-MaxVersion"] = "4.0";
            ajaxOptions.headers["Accept"] = "application/json";

            $.ajax(ajaxOptions)
                .done(function (data, textStatus, jqXHR) {
                    deferredAjax.resolve(data, textStatus, jqXHR);
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    deferredAjax.reject(jqXHR, textStatus, errorThrown);
                });
        }).fail(function () {
            deferredAjax.rejectWith(this, arguments);
        });

        return deferredAjax.promise();
    }

    webapi.safeAjax = safeAjax;
})(window.webapi = window.webapi || {}, jQuery);

$(document)
    .off("click.catAdditionalEmailsToggle")
    .on("click.catAdditionalEmailsToggle", "#addAdditionalEmailsLink", function (e) {
        e.preventDefault();
        $("#additionalEmailsWrapper").slideToggle(200);
    });

(function () {
    "use strict";

    // ============================================================
    // PRODUCT CONTEXT STATE
    // ============================================================

    let lastNotifiedProductId = "";
    let lastNotifiedCategoryId = "";
    let lastSelectedProductId = "";
    let productSelectionTimer = null;
    

    // ============================================================
    // NORMALIZE DATAVERSE GUID
    // ============================================================

    function normalizeCatGaGuid(value) {
        return String(value || "")
            .replace(/[{}]/g, "")
            .trim()
            .toLowerCase();
    }
    


    // ============================================================
    // GET PRODUCT CONTEXT
    // ============================================================

    function getStoredProductContext(contextFromEvent) {
        const eventContext =
            contextFromEvent || {};

        const productId =
            normalizeCatGaGuid(
                eventContext.productId ||
                window.CAT_GA_ProductID ||
                sessionStorage.getItem(
                    "CAT_GA_ProductID"
                )
            );

        const categoryId =
            normalizeCatGaGuid(
                eventContext.categoryId ||
                window.CAT_GA_CategoryID ||
                sessionStorage.getItem(
                    "CAT_GA_CategoryID"
                )
            );

        return {
            productId: productId,
            categoryId: categoryId
        };
    }

    // PRESELECT CUSTOM PRODUCT LOOKUP

    function preselectCustomProduct(productIdFromContext) {
    const resolvedProductId =
        normalizeCatGaGuid(
            productIdFromContext ||
            window.CAT_GA_ProductID ||
            sessionStorage.getItem("CAT_GA_ProductID")
        );

    if (!resolvedProductId) {
        return false;
    }

    const $productSelect = $("#productTech");
    const $productInput = $("#productInput");

    // Wait until both custom controls are rendered.
    if (
        !$productSelect.length ||
        !$productInput.length
    ) {
        return false;
    }

    const $productOptions =
        $productSelect.find("option");

    // Wait until the Liquid-generated options are available.
    if (!$productOptions.length) {
        return false;
    }

    let matchedOption = null;

    $productOptions.each(function () {
        const optionProductId =
            normalizeCatGaGuid(this.value);

        if (
            optionProductId ===
            resolvedProductId
        ) {
            matchedOption = this;
            return false;
        }
    });

    if (!matchedOption) {
        console.warn(
            "WEBPAGE: Product was not found in productTech.",
            {
                resolvedProductId:
                    resolvedProductId,

                availableProducts:
                    $productOptions
                        .map(function () {
                            return {
                                productId:
                                    this.value,

                                productName:
                                    $(this)
                                        .text()
                                        .trim()
                            };
                        })
                        .get()
            }
        );

        return true;
    }

    const matchedProductId =
        matchedOption.value || "";

    const matchedProductName =
        $(matchedOption)
            .text()
            .trim();

    // Prevent duplicate change events.
    if (
        lastSelectedProductId ===
            resolvedProductId &&
        normalizeCatGaGuid(
            $productSelect.val()
        ) === resolvedProductId &&
        String(
            $productInput.val() || ""
        ).trim() === matchedProductName
    ) {
        return true;
    }

    // Set the Product GUID in the hidden select.
    $productSelect.val(
        matchedProductId
    );

    // Show the Product name in the visible input.
    $productInput.val(
        matchedProductName
    );

    lastSelectedProductId =
        resolvedProductId;

    // Close any open custom lookup results.
    $("#productResults")
        .empty()
        .hide();

    // Run existing dependent logic.
    $productSelect.trigger("change");
    $productInput.trigger("input");
    $productInput.trigger("change");

    console.log(
        "WEBPAGE: Custom Product preselected successfully.",
        {
            productId:
                matchedProductId,

            productName:
                matchedProductName,

            hiddenSelectValue:
                $productSelect.val(),

            visibleInputValue:
                $productInput.val()
        }
    );

    return true;
    }    

    // INITIALIZE CUSTOM PRODUCT LOOKUP

    function initializeCustomProductSelection(
        productIdFromContext
    ) {
        // Stop any previous retry timer.
        if (productSelectionTimer) {
            clearInterval(
                productSelectionTimer
            );

            productSelectionTimer = null;
        }

        // First attempt immediately.
        const completedImmediately =
            preselectCustomProduct(
                productIdFromContext
            );

        if (completedImmediately) {
            return;
        }

        let attempts = 0;
        const maximumAttempts = 50;

        // Retry every 200 milliseconds for up to 10 seconds.
        productSelectionTimer =
            setInterval(function () {
                attempts++;

                const completed =
                    preselectCustomProduct(
                        productIdFromContext
                    );

                if (
                    completed ||
                    attempts >= maximumAttempts
                ) {
                    clearInterval(
                        productSelectionTimer
                    );

                    productSelectionTimer = null;

                    if (!completed) {
                        console.warn(
                            "WEBPAGE: Custom Product initialization stopped after 10 seconds."
                        );
                    }
                }
            }, 200);
    }

    // ============================================================
    // NOTIFY EXISTING WEBPAGE LOGIC
    // ============================================================

    function notifyProductResolved(contextFromEvent) {
        const context =
            getStoredProductContext(
                contextFromEvent
            );

        /*
         * Product ID may still be resolving in the Header
         * Web Template. Do not notify the webpage with an
         * incomplete context.
         */
        if (!context.productId) {
            return false;
        }

        /*
         * Restore the global variables from sessionStorage.
         */

        window.CAT_GA_ProductID =
            context.productId;

        window.CAT_GA_CategoryID =
            context.categoryId;

        // Apply the Product ID and name to the custom lookup.
        initializeCustomProductSelection(
            context.productId
        );

        /*
         * Avoid notifying the webpage multiple times with
         * the same Product ID and Category ID.
         */
        if (
            lastNotifiedProductId ===
                context.productId &&
            lastNotifiedCategoryId ===
                context.categoryId
        ) {
            return true;
        }

        lastNotifiedProductId =
            context.productId;

        lastNotifiedCategoryId =
            context.categoryId;

        /*
         * Keep the existing webpage event.
         *
         * Any current webpage functionality listening for
         * catGaProductResolved will continue to work.
         */
        document.dispatchEvent(
            new CustomEvent(
                "catGaProductResolved",
                {
                    detail: {
                        productId:
                            context.productId,
                        categoryId:
                            context.categoryId
                    }
                }
            )
        );

        console.log(
            "WEBPAGE: Product context applied.",
            {
                productId:
                    context.productId,
                categoryId:
                    context.categoryId
            }
        );

        return true;
    }


    // ============================================================
    // LISTEN FOR HEADER PRODUCT RESOLUTION
    // ============================================================

    window.addEventListener(
        "CAT_GA_ProductContextReady",
        function (event) {
            const detail =
                event.detail || {};

            notifyProductResolved(
                detail
            );
        }
    );


    // ============================================================
    // HANDLE PRODUCT PARAMETER CHANGE
    // ============================================================

  // HANDLE PRODUCT PARAMETER CHANGE

    window.addEventListener(
        "CAT_GA_ProductContextChanged",
        function () {
            lastNotifiedProductId = "";
            lastNotifiedCategoryId = "";
            lastSelectedProductId = "";

            // Stop attempts related to the previous Product ID.
            if (productSelectionTimer) {
                clearInterval(
                    productSelectionTimer
                );

                productSelectionTimer = null;
            }

            console.log(
                "WEBPAGE: Product context changed. Waiting for the newly resolved Product ID."
            );
        }
    );


    // ============================================================
    // INITIAL PAGE LOAD
    // ============================================================

    function initializeWebpageProductContext() {
        const initialized =
            notifyProductResolved();

        if (!initialized) {
            console.log(
                "WEBPAGE: Product context is not available yet. Waiting for CAT_GA_ProductContextReady."
            );
        }
    }

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeWebpageProductContext
        );
    } else {
        initializeWebpageProductContext();
    }
})();

const DIGITAL_MARKETPLACE_REDIRECT_URL =
    "https://digital.cat.com/contact/contact_admin" +
    "?refer=apis&destination=/apis";

function normalizeMarketplaceProductName(value) {
    return String(value || "")
        .replace(/[®™℠]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function isDigitalMarketplaceSelected() {
    const productInput =
        document.getElementById(
            "productInput"
        );

    const productSelect =
        document.getElementById(
            "productTech"
        );

    const visibleProductName =
        productInput
            ? productInput.value
            : "";

    const selectedProductName =
        productSelect &&
        productSelect.selectedIndex >= 0
            ? productSelect.options[
                productSelect.selectedIndex
            ].text
            : "";

    const normalizedVisibleName =
        normalizeMarketplaceProductName(
            visibleProductName
        );

    const normalizedSelectedName =
        normalizeMarketplaceProductName(
            selectedProductName
        );

    const marketplaceNames = [
        "cat digital marketplace",
        "cat digital marketplace / apis",
        "cat digital marketplace/apis",
        "digital marketplace",
        "digital marketplace / apis",
        "digital marketplace/apis"
    ];

    return (
        marketplaceNames.includes(
            normalizedVisibleName
        ) ||
        marketplaceNames.includes(
            normalizedSelectedName
        )
    );
}

function showDigitalMarketplaceRedirect() {
    const modal =
        document.getElementById(
            "digitalMarketplaceRedirectModal"
        );

    const redirectButton =
        document.getElementById(
            "digitalMarketplaceRedirectButton"
        );

    if (!modal) {
        return;
    }

    modal.classList.add("show");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "marketplace-redirect-open"
    );

    if (redirectButton) {
        window.setTimeout(function () {
            redirectButton.focus();
        }, 0);
    }
}

function hideDigitalMarketplaceRedirect() {
    const modal =
        document.getElementById(
            "digitalMarketplaceRedirectModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove("show");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "marketplace-redirect-open"
    );
}

function applyDigitalMarketplaceRedirectRule() {
    if (isDigitalMarketplaceSelected()) {
        showDigitalMarketplaceRedirect();
        return true;
    }

    hideDigitalMarketplaceRedirect();
    return false;
}

$(document).ready(function () {
    $("#digitalMarketplaceRedirectButton")
    .off("click.digitalMarketplace")
    .on(
        "click.digitalMarketplace",
        function () {
            window.location.href =
                DIGITAL_MARKETPLACE_REDIRECT_URL;
        }
    );

$(document).on(
    "change.digitalMarketplace",
    "#productTech",
    function () {
        applyDigitalMarketplaceRedirectRule();
    }
);

// existing, unchanged:
$(document).on(
    "input.digitalMarketplace " +
    "change.digitalMarketplace " +
    "blur.digitalMarketplace",
    "#productInput",
    function () {
        applyDigitalMarketplaceRedirectRule();
    }
);

// NEW — click on the backdrop (not the dialog box) closes it and
// clears Product so the blur it just caused doesn't reopen it
$(document).on("click.digitalMarketplace", "#digitalMarketplaceRedirectModal", function (e) {
    if (e.target !== this) return; // click landed inside .marketplace-redirect-dialog, ignore

    hideDigitalMarketplaceRedirect();

    $("#productTech").val("");
    $("#productInput").val("");
});
    

    const $form = $("#catSupportForm");
    const $dropZone = $("#drop-zone");
    const $fileInput = $("#file-input");
    const $uploadBtn = $("#btn-upload-all");
    

    let filesArray = [];

    // --- Submit button lock while attachments are uploading ---
    let activeUploads = 0;
    const $submitBtn = $form.find("button[type='submit']");

    window.allowedFileTypes = "{{ snippets['CAT Webform Upload Allow File Type'] }}";

    const ALLOWED_EXT = new Set(
        (window.allowedFileTypes || "pdf,txt")
            .split(",")
            .map(x => x.trim().replace(".", "").toLowerCase())
            .filter(x => x.length > 0)
    );

   const MAX_FILES = parseInt("{{ snippets['CAT Webform Upload Allow Max Files'] }}") || 5;

const MAX_FILE_SIZE_BYTES =
    (parseInt("{{ snippets['CAT Webform Upload Allow File Size (MB)'] }}") || 25) * 1024 * 1024;

const MAX_TOTAL_SIZE_BYTES = MAX_FILES * MAX_FILE_SIZE_BYTES;


    function cleanGuid(id) {
        return (id || "").replace(/[{}]/g, "").trim();
    }

    function formatBytes(bytes) {
        const units = ["B", "KB", "MB", "GB", "TB"];
        let i = 0;
        let num = bytes;

        while (num >= 1024 && i < units.length - 1) {
            num /= 1024;
            i++;
        }

        const dp = i > 0 && num < 10 ? 2 : 0;
        return `${num.toFixed(dp)} ${units[i]}`;
    }

    function getExt(fileName) {
        const index = fileName.lastIndexOf(".");
        return index >= 0 ? fileName.substring(index + 1).toLowerCase() : "";
    }

    function currentTotalSize() {
        return filesArray.reduce((sum, file) => {
            if (!file) return sum;
            return sum + (file.size || 0);
        }, 0);
    }

    function showError(message) {
        $("#file-errors").text(message);

        setTimeout(function () {
            $("#file-errors").text("");
        }, 6000);
    }

    function isAllowed(file) {
        return ALLOWED_EXT.has(getExt(file.name));
    }

    function getSelectedFiles() {
        return filesArray.filter(f => !!f);
    }

    function readFileAsBase64(file) {
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();

            reader.onload = function (e) {
                const base64Content = e.target.result.split(",")[1];
                resolve(base64Content);
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function getCreatedRecordId(xhr) {
        let id = xhr.getResponseHeader("entityid") || xhr.getResponseHeader("EntityId");

        if (!id) {
            const entityUri =
                xhr.getResponseHeader("OData-EntityId") ||
                xhr.getResponseHeader("odata-entityid");

            if (entityUri) {
                const match = entityUri.match(/\(([^)]+)\)/);
                if (match && match[1]) {
                    id = match[1];
                }
            }
        }

        return cleanGuid(id);
    }


    function getForesightSerialNumbers() {
    const rawValue =
        ($("#foresightSerialNumberInput").val() || "").trim();

    if (!rawValue) {
        return [];
    }

    const serialNumbers = rawValue
        .split(/[\n,;]+/)
        .map(function (value) {
            return value.trim();
        })
        .filter(function (value) {
            return value.length > 0;
        });

    return Array.from(new Set(serialNumbers));
}

function createAssetForCase(
    caseId,
    serialNumber,
    providedCcid
) {
    const cleanCaseId =
        cleanGuid(caseId);

    const cleanSerialNumber =
        (serialNumber || "").trim();

    const cleanProvidedCcid =
        (providedCcid || "").trim();

    const assetPayload = {
    "cat_case@odata.bind":
        "/incidents(" + cleanCaseId + ")",
    "statecode": 0,
    "statuscode": 1
};

if (cleanSerialNumber) {
    assetPayload["cat_serialnumber"] =
        cleanSerialNumber;
}

    if (cleanProvidedCcid) {
        assetPayload["cat_providedccid"] =
            cleanProvidedCcid;
    }

    console.log(
        "ASSET PAYLOAD:",
        JSON.stringify(assetPayload, null, 2)
    );

    return webapi.safeAjax({
        type: "POST",
        url: "/_api/cat_assets",
        contentType: "application/json",
        data: JSON.stringify(assetPayload),
        processData: false
    });
}

async function createForesightAssets(caseId) {
    const serialNumbers =
        getForesightSerialNumbers();

    const providedCcid =
        ($("#foresightCcidInput").val() || "").trim();

    if (serialNumbers.length === 0) {
        console.log(
            "CAT: No Asset serial numbers were entered."
        );
        return;
    }

    const invalidSerialNumber =
        serialNumbers.find(function (serialNumber) {
            return serialNumber.length > 100;
        });

    if (invalidSerialNumber) {
        throw new Error(
            "Asset serial numbers cannot exceed 100 characters: " +
            invalidSerialNumber
        );
    }

    for (const serialNumber of serialNumbers) {
       await createAssetForCase(
    caseId,
    serialNumber,
    providedCcid
);


        console.log(
            "CAT: Asset created for serial number:",
            serialNumber
        );
    }
}

function getSosSerialNumbers() {
    const rawValue =
        ($("#sosSerialNumberInput").val() || "").trim();

    if (!rawValue) {
        return [];
    }

    const serialNumbers = rawValue
        .split(/[\n,;]+/)
        .map(function (value) {
            return value.trim();
        })
        .filter(function (value) {
            return value.length > 0;
        });

    return Array.from(
        new Set(serialNumbers)
    );
}

async function createSosAssets(caseId) {
    if (!isSosServicesSelected()) {
        return;
    }

    const serialNumbers =
        getSosSerialNumbers();

    const providedCcid =
        ($("#sosCcidInput").val() || "").trim();

    if (serialNumbers.length === 0) {
        console.log(
            "CAT: No SOS Asset serial numbers were entered."
        );

        return;
    }

    const invalidSerialNumber =
        serialNumbers.find(function (serialNumber) {
            return serialNumber.length > 100;
        });

    if (invalidSerialNumber) {
        throw new Error(
            "Asset serial numbers cannot exceed 100 characters: " +
            invalidSerialNumber
        );
    }

    for (const serialNumber of serialNumbers) {
        await createAssetForCase(
            caseId,
            serialNumber,
            providedCcid
        );

        console.log(
            "CAT: SOS Asset created:",
            serialNumber
        );
    }
}

async function createDigitalAuthAsset(caseId) {
    if (!isDigitalAuthorizationSelected()) {
        return;
    }

    const providedCcid =
        ($("#digitalAuthCcidInput").val() || "").trim();

    if (!providedCcid) {
        console.log(
            "CAT: No Digital Authorization CCID was entered."
        );

        return;
    }

    await createAssetForCase(
        caseId,
        "",
        providedCcid
    );

    console.log(
        "CAT: Digital Authorization Asset created:",
        providedCcid
    );
}

function getDealerServicesPortalSerialNumbers() {
    const rawValue =
        (
            $("#dspSerialNumberInput").val() ||
            ""
        ).trim();

    if (!rawValue) {
        return [];
    }

    const serialNumbers = rawValue
        .split(/[\n,;]+/)
        .map(function (value) {
            return value.trim();
        })
        .filter(function (value) {
            return value.length > 0;
        });

    return Array.from(
        new Set(serialNumbers)
    );
}

async function createDealerServicesPortalAssets(
    caseId
) {
    if (!isDealerServicesPortalSelected()) {
        return;
    }

    const serialNumbers =
        getDealerServicesPortalSerialNumbers();

    if (serialNumbers.length === 0) {
        console.log(
            "CAT: No Dealer Services Portal serial numbers entered."
        );

        return;
    }

    const invalidSerialNumber =
        serialNumbers.find(function (serialNumber) {
            return serialNumber.length > 100;
        });

    if (invalidSerialNumber) {
        throw new Error(
            "Asset serial numbers cannot exceed 100 characters: " +
            invalidSerialNumber
        );
    }

    const deviceSerialNumber =
        (
            $("#dspDeviceSerialNumberInput").val() ||
            ""
        ).trim();


const deviceModelValue =
    (
        $("#dspDeviceModelSelect").val() ||
        ""
    ).trim();

const deviceModelLabel =
    (
        $(
            "#dspDeviceModelSelect " +
            "option:selected"
        ).text() || ""
    ).trim();

    const dataPointValue =
        (
            $("#dspDataIncorrectSelect").val() ||
            ""
        ).trim();

    const dataPointLabel =
        (
            $(
                "#dspDataIncorrectSelect option:selected"
            ).text() || ""
        ).trim();

    for (const serialNumber of serialNumbers) {
        const assetPayload = {
            "cat_serialnumber": serialNumber,

            "cat_case@odata.bind":
                "/incidents(" +
                cleanGuid(caseId) +
                ")",

            "statecode": 0,
            "statuscode": 1
        };

        const assetDescriptionLines = [
            "Asset ID/Serial Number: " +
            serialNumber
        ];

        if (deviceSerialNumber) {
            assetDescriptionLines.push(
                "Product Link Device Serial Number: " +
                deviceSerialNumber
            );
        }


        if (deviceModelValue) {
    assetDescriptionLines.push(
        "Product Link Device Model: " +
        deviceModelLabel
    );
}
        if (dataPointValue) {
            assetDescriptionLines.push(
                "What data is incorrect?: " +
                dataPointLabel
            );
        }

        assetPayload["cat_description"] =
            assetDescriptionLines.join("<br>");

        if (deviceSerialNumber) {
            assetPayload[
                "cat_provideddeviceserialnumber"
            ] = deviceSerialNumber;
        }

        if (deviceModelValue) {
    assetPayload[
        "cat_provideddevicemodel"
    ] = Number(
        deviceModelValue
    );
}

        if (dataPointValue) {
            assetPayload["cat_data_point"] =
                Number(dataPointValue);
        }

        console.log(
            "CAT: Dealer Services Portal Asset payload:",
            JSON.stringify(
                assetPayload,
                null,
                2
            )
        );

        await webapi.safeAjax({
            type: "POST",
            url: "/_api/cat_assets",
            contentType: "application/json",
            data: JSON.stringify(
                assetPayload
            ),
            processData: false
        });
    }
}

function getCustomerAdminSerialNumbers() {
    const rawValue =
        (
            $("#customerAdminSerialNumberInput")
                .val() || ""
        ).trim();

    if (!rawValue) {
        return [];
    }

    const serialNumbers =
        rawValue
            .split(/[\n,;]+/)
            .map(function (serialNumber) {
                return serialNumber.trim();
            })
            .filter(function (serialNumber) {
                return serialNumber.length > 0;
            });

    return Array.from(
        new Set(serialNumbers)
    );
}

async function createCustomerAdminAssets(
    caseId
) {
    if (
        !isCaterpillarCustomerAdminToolSelected()
    ) {
        return;
    }

    const issueTypeValue =
        ($("#issueType").val() || "")
            .trim();

    const rule =
        CUSTOMER_ADMIN_FIELD_RULES[
            issueTypeValue
        ];

    if (
        !rule ||
        !rule.showAssetFields
    ) {
        return;
    }

    const serialNumbers =
        getCustomerAdminSerialNumbers();

    const invalidSerialNumber =
        serialNumbers.find(
            function (serialNumber) {
                return serialNumber.length > 100;
            }
        );

    if (invalidSerialNumber) {
        throw new Error(
            "Asset serial numbers cannot exceed " +
            "100 characters: " +
            invalidSerialNumber
        );
    }

    const ccid =
        (
            $("#customerAdminCcidInput")
                .val() || ""
        ).trim();

    const dcn =
        (
            $("#customerAdminDcnInput")
                .val() || ""
        ).trim();

    const hasAssetInformation =
        serialNumbers.length > 0 ||
        Boolean(ccid) ||
        Boolean(dcn);

    if (!hasAssetInformation) {
        console.log(
            "CAT: No Caterpillar Customer Admin " +
            "Tool Asset information entered."
        );

        return;
    }

    const assetRecords =
        serialNumbers.length > 0
            ? serialNumbers
            : [""];

    for (const serialNumber of assetRecords) {
        const assetPayload = {
            "cat_case@odata.bind":
                "/incidents(" +
                cleanGuid(caseId) +
                ")",

            "statecode": 0,
            "statuscode": 1
        };

        const assetDescriptionLines = [];

        if (serialNumber) {
            assetPayload[
                "cat_serialnumber"
            ] = serialNumber;

            assetDescriptionLines.push(
                "Asset ID/Serial Number: " +
                    serialNumber
            );
        }

        if (ccid) {
            assetPayload[
                "cat_providedccid"
            ] = ccid;

            assetDescriptionLines.push(
                "CCID: " + ccid
            );
        }

        if (dcn) {
            assetPayload[
                "cat_provideddcn"
            ] = dcn;

            assetDescriptionLines.push(
                "DCN: " + dcn
            );
        }

        if (
            assetDescriptionLines.length > 0
        ) {
            assetPayload[
                "cat_description"
            ] =
                assetDescriptionLines.join(
                    "<br>"
                );
        }

        console.log(
            "CAT: Caterpillar Customer Admin " +
            "Tool Asset payload:",
            JSON.stringify(
                assetPayload,
                null,
                2
            )
        );

        await webapi.safeAjax({
            type: "POST",
            url: "/_api/cat_assets",
            contentType:
                "application/json",
            data:
                JSON.stringify(
                    assetPayload
                ),
            processData: false
        });
    }
}

function getSubscriptionAssetSerialNumbers() {
    const rawValue =
        (
            $("#subscriptionAssetSerialNumberInput")
                .val() || ""
        ).trim();

    if (!rawValue) {
        return [];
    }

    const serialNumbers = rawValue
        .split(/[\n,;]+/)
        .map(function (serialNumber) {
            return serialNumber.trim();
        })
        .filter(function (serialNumber) {
            return serialNumber.length > 0;
        });

    return Array.from(
        new Set(serialNumbers)
    );
}

async function createSubscriptionAssetRecords(
    caseId
) {
    if (
        !isSubscriptionAssetAdministrationSelected()
    ) {
        return;
    }

    const issueTypeValue =
        ($("#issueType").val() || "")
            .trim();

    const serialNumbers =
        getSubscriptionAssetSerialNumbers();

    const serialRequired =
        issueTypeValue === "100000017";

    if (
        serialRequired &&
        serialNumbers.length === 0
    ) {
        throw new Error(
            "Asset ID or Serial Number is required."
        );
    }

    const invalidSerialNumber =
        serialNumbers.find(
            function (serialNumber) {
                return serialNumber.length > 100;
            }
        );

    if (invalidSerialNumber) {
        throw new Error(
            "Asset serial numbers cannot exceed " +
            "100 characters: " +
            invalidSerialNumber
        );
    }

    const dcn =
        (
            $("#subscriptionAssetDcnInput")
                .val() || ""
        ).trim();

    const ccid =
        (
            $("#subscriptionAssetCcidInput")
                .val() || ""
        ).trim();

    const deviceModelValue =
        (
            $("#subscriptionAssetDeviceModelSelect")
                .val() || ""
        ).trim();

    const deviceModelLabel =
        (
            $(
                "#subscriptionAssetDeviceModelSelect " +
                "option:selected"
            ).text() || ""
        ).trim();

    const deviceSerialNumber =
        (
            $("#subscriptionAssetDeviceSerialInput")
                .val() || ""
        ).trim();

    const hasAssetInformation =
        serialNumbers.length > 0 ||
        Boolean(dcn) ||
        Boolean(ccid) ||
        Boolean(deviceModelValue) ||
        Boolean(deviceSerialNumber);

    if (!hasAssetInformation) {
        console.log(
            "CAT: No Subscription and Asset " +
            "Administration Asset information entered."
        );

        return;
    }

    const assetRecords =
        serialNumbers.length > 0
            ? serialNumbers
            : [""];

    for (const serialNumber of assetRecords) {
        const assetPayload = {
            "cat_case@odata.bind":
                "/incidents(" +
                cleanGuid(caseId) +
                ")",

            "statecode": 0,
            "statuscode": 1
        };

        const assetDescriptionLines = [];

        if (serialNumber) {
            assetPayload[
                "cat_serialnumber"
            ] = serialNumber;

            assetDescriptionLines.push(
                "Asset ID/Serial Number: " +
                    serialNumber
            );
        }

        if (dcn) {
            assetPayload[
                "cat_provideddcn"
            ] = dcn;

            assetDescriptionLines.push(
                "DCN: " + dcn
            );
        }

        if (ccid) {
            assetPayload[
                "cat_providedccid"
            ] = ccid;

            assetDescriptionLines.push(
                "CCID: " + ccid
            );
        }

        if (deviceModelValue) {
            assetPayload[
                "cat_provideddevicemodel"
            ] = Number(
                deviceModelValue
            );

            if (deviceModelLabel) {
                assetDescriptionLines.push(
                    "Product Link Device Model: " +
                        deviceModelLabel
                );
            }
        }

        if (deviceSerialNumber) {
            assetPayload[
                "cat_provideddeviceserialnumber"
            ] = deviceSerialNumber;

            assetDescriptionLines.push(
                "Product Link Device Serial Number: " +
                    deviceSerialNumber
            );
        }

        if (assetDescriptionLines.length > 0) {
            assetPayload["cat_description"] =
                assetDescriptionLines.join(
                    "<br>"
                );
        }

        console.log(
            "CAT: Subscription and Asset " +
            "Administration Asset payload:",
            JSON.stringify(
                assetPayload,
                null,
                2
            )
        );

        await webapi.safeAjax({
            type: "POST",
            url: "/_api/cat_assets",
            contentType:
                "application/json",
            data:
                JSON.stringify(
                    assetPayload
                ),
            processData: false
        });
    }
}

function getVisionLinkSerialNumbers() {
    const rawValue =
        (
            $("#visionLinkSerialNumberInput")
                .val() || ""
        ).trim();

    if (!rawValue) {
        return [];
    }

    const serialNumbers = rawValue
        .split(/[\n,;]+/)
        .map(function (value) {
            return value.trim();
        })
        .filter(function (value) {
            return value.length > 0;
        });

    return Array.from(
        new Set(serialNumbers)
    );
}
async function createVisionLinkAssets(
    caseId
) {


    
    if (!isVisionLinkSelected()) {
        return;
    }

    const issueTypeValue =
        ($("#issueType").val() || "").trim();

    const deviceModelValue =
    (
        $("#visionLinkDeviceModelSelect")
            .val() || ""
    ).trim();

const deviceModelLabel =
    (
        $(
            "#visionLinkDeviceModelSelect " +
            "option:selected"
        ).text() || ""
    ).trim();

    const serialNumbers =
        getVisionLinkSerialNumbers();

    const requiresAsset =
        VISION_LINK_ASSET_REQUIRED_TYPES.includes(
            issueTypeValue
        );

    if (
        requiresAsset &&
        serialNumbers.length === 0
    ) {
        throw new Error(
            "Asset ID or Serial Number is required."
        );
    }

    if (serialNumbers.length === 0) {
        return;
    }

    const invalidSerialNumber =
        serialNumbers.find(function (
            serialNumber
        ) {
            return serialNumber.length > 100;
        });

    if (invalidSerialNumber) {
        throw new Error(
            "Asset serial numbers cannot exceed " +
            "100 characters: " +
            invalidSerialNumber
        );
    }

   const equipmentTypeValue =
    (
        $("#visionLinkEquipmentTypeSelect")
            .val() || ""
    ).trim();

const equipmentTypeLabel =
    (
        $(
            "#visionLinkEquipmentTypeSelect " +
            "option:selected"
        ).text() || ""
    ).trim();

    const deviceSerialNumber =
        (
            $("#visionLinkDeviceSerialInput")
                .val() || ""
        ).trim();

    const dataPointValue =
        (
            $("#visionLinkDataPointSelect")
                .val() || ""
        ).trim();

    const dataPointLabel =
        (
            $(
                "#visionLinkDataPointSelect " +
                "option:selected"
            ).text() || ""
        ).trim();

    for (const serialNumber of serialNumbers) {
        const assetPayload = {
            "cat_serialnumber":
                serialNumber,

            "cat_case@odata.bind":
                "/incidents(" +
                cleanGuid(caseId) +
                ")",

            "statecode": 0,
            "statuscode": 1
        };

        const assetDescriptionLines = [
            "Asset ID/Serial Number: " +
                serialNumber
        ];

       if (equipmentTypeValue) {
    assetDescriptionLines.push(
        "Equipment Type: " +
            equipmentTypeLabel
    );
}

if (
    deviceModelValue &&
    deviceModelLabel
) {
    assetDescriptionLines.push(
        "Product Link Device Model: " +
            deviceModelLabel
    );
}

if (deviceSerialNumber) {
    assetDescriptionLines.push(
        "Product Link Device Serial Number: " +
            deviceSerialNumber
    );
}

if (
    dataPointValue &&
    dataPointLabel
) {
    assetDescriptionLines.push(
        "What data is incorrect?: " +
            dataPointLabel
    );
}
        assetPayload["cat_description"] =
            assetDescriptionLines.join(
                "<br>"
            );

       if (equipmentTypeValue) {
    assetPayload[
        "cat_equipmenttype"
    ] = Number(
        equipmentTypeValue
    );
}

if (deviceModelValue) {
    assetPayload[
        "cat_provideddevicemodel"
    ] = Number(
        deviceModelValue
    );
}

if (deviceSerialNumber) {
    assetPayload[
        "cat_provideddeviceserialnumber"
    ] = deviceSerialNumber;
}

if (dataPointValue) {
    assetPayload[
        "cat_data_point"
    ] = Number(
        dataPointValue
    );
}

        console.log(
            "CAT: VisionLink Asset payload:",
            JSON.stringify(
                assetPayload,
                null,
                2
            )
        );

        await webapi.safeAjax({
            type: "POST",
            url: "/_api/cat_assets",
            contentType:
                "application/json",
            data: JSON.stringify(
                assetPayload
            ),
            processData: false
        });
    }
}

function toDataverseDate(inputValue) {
    const value = (inputValue || "").trim();
    if (!value) return null;

    const parsed = new Date(value + "T00:00:00");
    if (isNaN(parsed.getTime())) return null;

    return parsed.toISOString();
}

async function createRentalsAsset(caseId) {
    if (!isCatRentalsSelected()) {
        return;
    }

    const equipmentType =
        ($("#rentalsEquipmentTypeSelect").val() || "").trim();

    const productFamily =
        ($("#rentalsProductFamilySelect").val() || "").trim();

    const generatorSize =
        ($("#rentalsGeneratorSizeSelect").val() || "").trim();

    const startDate =
        toDataverseDate($("#rentalsStartDateInput").val());

    const endDate =
        toDataverseDate($("#rentalsEndDateInput").val());

    if (
        !equipmentType &&
        !productFamily &&
        !generatorSize &&
        !startDate &&
        !endDate
    ) {
        return;
    }

    const assetPayload = {
        "cat_case@odata.bind":
            "/incidents(" + cleanGuid(caseId) + ")",
        "statecode": 0,
        "statuscode": 1
    };

    if (equipmentType) {
        assetPayload["cat_equipmenttype"] = Number(equipmentType);
    }

    if (productFamily) {
        assetPayload["cat_productfamily"] = Number(productFamily);
    }

    if (generatorSize) {
        assetPayload["cat_generatorsize"] = Number(generatorSize);
    }

    if (startDate) {
        assetPayload["cat_startdate"] = startDate;
    }

    if (endDate) {
        assetPayload["cat_enddate"] = endDate;
    }

    console.log(
        "CAT: Cat Rentals Asset payload:",
        JSON.stringify(assetPayload, null, 2)
    );


    await webapi.safeAjax({
        type: "POST",
        url: "/_api/cat_assets",
        contentType: "application/json",
        data: JSON.stringify(assetPayload),
        processData: false
    });
} 


function getCatProductLinkSerialNumbers() {
    const rawValue =
        (
            $("#productLinkSerialNumberInput").val() ||
            ""
        ).trim();

    if (!rawValue) {
        return [];
    }

    const serialNumbers = rawValue
        .split(/[\n,;]+/)
        .map(function (value) {
            return value.trim();
        })
        .filter(function (value) {
            return value.length > 0;
        });

    return Array.from(
        new Set(serialNumbers)
    );
}
async function createCatProductLinkAssets(
    caseId
) {
    if (!isCatProductLinkSelected()) {
        return;
    }

    const serialNumbers =
        getCatProductLinkSerialNumbers();

    if (serialNumbers.length === 0) {
        throw new Error(
            "Asset ID or Serial Number is required."
        );
    }

    const invalidSerialNumber =
        serialNumbers.find(function (serialNumber) {
            return serialNumber.length > 100;
        });

    if (invalidSerialNumber) {
        throw new Error(
            "Asset serial numbers cannot exceed " +
            "100 characters: " +
            invalidSerialNumber
        );
    }

    const deviceSerialNumber =
        (
            $("#productLinkDeviceSerialInput").val() ||
            ""
        ).trim();

    const dataPointValue =
        (
            $("#productLinkDataPointSelect").val() ||
            ""
        ).trim();

    const deviceModelValue =
        (
            $("#productLinkDeviceModelSelect").val() ||
            ""
        ).trim();

   

    const dataPointLabel =
    (
        $(
            "#productLinkDataPointSelect " +
            "option:selected"
        ).text() || ""
    ).trim();

const deviceModelLabel =
    (
        $(
            "#productLinkDeviceModelSelect " +
            "option:selected"
        ).text() || ""
    ).trim();



    for (const serialNumber of serialNumbers) {
        const assetPayload = {
            "cat_serialnumber": serialNumber,

            "cat_case@odata.bind":
                "/incidents(" +
                cleanGuid(caseId) +
                ")",

            "statecode": 0,
            "statuscode": 1
        };
        const assetDescriptionLines = [
    "Asset ID/Serial Number: " +
        serialNumber
];

if (deviceSerialNumber) {
    assetDescriptionLines.push(
        "Product Link Device Serial Number: " +
        deviceSerialNumber
    );
}

if (dataPointValue) {
    assetDescriptionLines.push(
        "What data is incorrect?: " +
        dataPointLabel
    );
}

if (deviceModelValue) {
    assetDescriptionLines.push(
        "Product Link Device Model: " +
        deviceModelLabel
    );
}



assetPayload["cat_description"] =
    assetDescriptionLines.join("<br>");

        if (deviceSerialNumber) {
            assetPayload[
                "cat_provideddeviceserialnumber"
            ] = deviceSerialNumber;
        }

        if (dataPointValue) {
            assetPayload[
                "cat_data_point"
            ] = Number(dataPointValue);
        }

        if (deviceModelValue) {
            assetPayload[
                "cat_provideddevicemodel"
            ] = Number(deviceModelValue);
        }

        

        console.log(
            "CAT: Product Link Asset payload:",
            JSON.stringify(
                assetPayload,
                null,
                2
            )
        );

        await webapi.safeAjax({
            type: "POST",
            url: "/_api/cat_assets",
            contentType: "application/json",
            data: JSON.stringify(
                assetPayload
            ),
            processData: false
        });
    }
}

function getCheckedRadioValue(
    radioName
) {
    return (
        $(
            'input[name="' +
            radioName +
            '"]:checked'
        ).val() || ""
    ).trim();
}

/* -------------------------------------------
   APPEND ADDITIONAL FORM VALUES TO DESCRIPTION
-------------------------------------------- */
function buildFinalDescription() {
    const additionalDetails = [];

    const customerDescription =
        ($("#description").val() || "").trim();

    if (customerDescription) {
        additionalDetails.push(customerDescription);
    }

    const aftermarketExpert =
        ($("#aftermarketPartExpert").val() || "").trim();

    if (aftermarketExpert) {
        additionalDetails.push(
            "Aftermarket Part Expert Option: " +
            aftermarketExpert
        );
    }

    const stuDsd =
        ($("#stuDsdSelect").val() || "").trim();

    if (stuDsd) {
        additionalDetails.push(
            "DSD: " + stuDsd
        );
    }

    const stuVertical =
        ($("#stuVerticalInput").val() || "").trim();

    if (stuVertical) {
        additionalDetails.push(
            "Vertical: " + stuVertical
        );
    }

    const biProductUrl =
        ($("#biProductUrlInput").val() || "").trim();

    if (biProductUrl) {
        additionalDetails.push(
            "URL of BI Product: " + biProductUrl
        );
    }

    const onBehalf =
    ($("#onBehalfSelect").val() || "").trim();

if (onBehalf) {
    additionalDetails.push(
        "Are you submitting on behalf of another user?: " +
        onBehalf
    );
}

const foresightCcid =
    ($("#foresightCcidInput").val() || "").trim();

if (foresightCcid) {
    additionalDetails.push(
        "CCID: " + foresightCcid
    );
}

const foresightUserEmail =
    ($("#foresightUserEmailInput").val() || "").trim();

if (foresightUserEmail) {
    additionalDetails.push(
        "User Email: " + foresightUserEmail
    );
}

const foresightUrl =
    ($("#urlInput").val() || "").trim();

if (foresightUrl) {
    additionalDetails.push(
        "URL: " + foresightUrl
    );
}

const foresightIssueDateTime =
    ($("#foresightIssueDateTimeInput").val() || "").trim();

if (foresightIssueDateTime) {
    additionalDetails.push(
        "Date & Time Issue Occurred: " +
        foresightIssueDateTime
    );
}

if (isSosServicesSelected()) {
    const sosDescriptionFields = [
       
        {
            inputId: "sosUserProfileInput",
            label: "User Profile to Mirror"
        },
        {
            inputId: "sosNumberOfSamplesInput",
            label: "Number of Samples"
        },
        {
            inputId: "sosInstrumentVendorInput",
            label: "Instrument Vendor"
        },
        {
            inputId: "sosInstrumentModelInput",
            label: "Instrument Model"
        },
        {
            inputId: "sosTestAnalysisInput",
            label: "Test/Analysis"
        },
        {
            inputId: "sosFluidBrandInput",
            label: "Fluid Brand"
        },
        {
            inputId: "sosFluidTypeInput",
            label: "Fluid Type"
        },
        {
            inputId: "sosFluidWeightInput",
            label: "Fluid Weight"
        },
        {
            inputId: "sosCatModelInput",
            label: "Cat Model"
        },
        {
            inputId: "sosSerialPrefixInput",
            label: "Serial Number Prefix"
        },
        {
            inputId: "sosComponentInput",
            label: "Component"
        }
    ];

    sosDescriptionFields.forEach(function (field) {
        const value =
            ($("#" + field.inputId).val() || "").trim();

        if (value) {
            additionalDetails.push(
                field.label + ": " + value
            );
        }
    });
}

if (isIntegratedProcurementSelected()) {
    const environment =
        ($("#environmentSelect").val() || "").trim();

    const transactionType =
        ($("#ipTransactionTypeSelect").val() || "").trim();

    const multipleCustomers =
        $(
            'input[name="ipMultipleCustomers"]:checked'
        ).val() || "";

    const intermittent =
        $(
            'input[name="ipIntermittent"]:checked'
        ).val() || "";

    const partNumberSpecific =
        $(
            'input[name="ipPartNumberSpecific"]:checked'
        ).val() || "";

    const otherNetworkIssues =
        $(
            'input[name="ipOtherNetworkIssues"]:checked'
        ).val() || "";

    const integratedProcurementFields = [
        {
            label:
                "What environment is the issue occurring in?",
            value: environment
        },
        {
            label: "What is the transaction type?",
            value: transactionType
        },
        {
            label:
                "Is the issue affecting multiple customers?",
            value: multipleCustomers
        },
        {
            label: "IP Customer Name",
            value:
                ($("#ipCustomerInput").val() || "").trim()
        },
        {
            label: "IP Profile (FMI)",
            value:
                ($("#ipProfileInput").val() || "").trim()
        },
        {
            label: "Impacted CWS ID",
            value:
                ($("#impactedCwsInput").val() || "").trim()
        },
        {
            label: "Impacted DCN(s)",
            value:
                ($("#impactedDcnInput").val() || "").trim()
        },
        {
            label: "Impacted Username",
            value:
                ($("#impactedUsernameInput").val() || "").trim()
        },
        {
            label: "Date and Time issue occurred",
            value:
                ($("#ipIssueDateTimeInput").val() || "").trim()
        },
        {
            label: "Is the issue intermittent?",
            value: intermittent
        },
        {
            label: "Is this part number specific?",
            value: partNumberSpecific
        },
        {
            label: "Part Number",
            value:
                ($("#ipPartNumberInput").val() || "").trim()
        },
        {
            label:
                "Is the IP Customer experiencing any other " +
                "network issues?",
            value: otherNetworkIssues
        },
        {
            label: "What is the invoice number?",
            value:
                ($("#ipInvoiceNumberInput").val() || "").trim()
        }
    ];

    integratedProcurementFields.forEach(
        function (field) {
            if (field.value) {
                additionalDetails.push(
                    field.label + ": " + field.value
                );
            }
        }
    );
}

if (isDealerCollaborationSelected()) {
    const dealerDescriptionFields = [
        {
            wrapperId: "dealerCommunityFieldWrapper",
            label: "Which Community?",
            value:
                ($("#dealerCommunitySelect option:selected").text() || "")
    .trim()
        },
        {
            wrapperId: "dealerOnBehalfFieldWrapper",
            label:
                "Are you submitting a case on behalf of another user?",
            value:
                $(
                    'input[name="dealerOnBehalf"]:checked'
                ).val() || ""
        },
        {
            wrapperId: "dealerRequestedForFieldWrapper",
            label: "Requested For",
            value:
                ($("#dealerRequestedForInput").val() || "").trim()
        },
        {
            wrapperId: "dealerJobRoleFieldWrapper",
            label: "Job Role",
            value:
                ($("#dealerJobRoleSelect").val() || "").trim()
        },
        {
            wrapperId: "dealerAccessRequiredFieldWrapper",
            label: "Access Required",
            value:
                ($("#dealerAccessRequiredSelect").val() || "").trim()
        },
        {
            wrapperId: "dealerUserFirstNameFieldWrapper",
            label: "User First Name",
            value:
                ($("#dealerUserFirstNameInput").val() || "").trim()
        },
        {
            wrapperId: "dealerUserLastNameFieldWrapper",
            label: "User Last Name",
            value:
                ($("#dealerUserLastNameInput").val() || "").trim()
        },
        {
            wrapperId: "dealerUserEmailFieldWrapper",
            label: "User Email Address",
            value:
                ($("#dealerUserEmailInput").val() || "").trim()
        },
        {
            wrapperId: "dealerUserCwsIdFieldWrapper",
            label: "User CWS ID",
            value:
                ($("#dealerUserCwsIdInput").val() || "").trim()
        },
        {
            wrapperId: "dealerUserCountryFieldWrapper",
            label: "User Country",
            value:
                ($("#dealerUserCountryInput").val() || "").trim()
        }
    ];

    dealerDescriptionFields.forEach(function (field) {
        const wrapper =
            document.getElementById(field.wrapperId);

        if (
            wrapper &&
            wrapper.classList.contains("show-field") &&
            field.value
        ) {
            additionalDetails.push(
                field.label + ": " + field.value
            );
        }
    });
}

if (isDealerServicesPortalSelected()) {
    const dealerServicesImpacts =
        getDealerServicesPortalImpacts();

    dealerServicesImpacts.forEach(function (impact) {
        additionalDetails.push(
            impact + ": Yes"
        );
    });

   const dspDescriptionFields = [
    {
        wrapperId:
            "dspInvoiceCreditMemoFieldWrapper",

        label:
            "Invoice # or Credit Memo #",

        value:
            (
                $("#dspInvoiceCreditMemoInput")
                    .val() || ""
            ).trim()
    },

    {
        wrapperId:
            "dspIndustryFieldWrapper",

        label:
            "Industry",

        value:
            (
                $(
                    "#dspIndustrySelect " +
                    "option:selected"
                ).text() || ""
            ).trim(),

        hasValue:
            Boolean(
                $("#dspIndustrySelect")
                    .val()
            )
    }
];


    dspDescriptionFields.forEach(
    function (field) {
        const wrapper =
            document.getElementById(
                field.wrapperId
            );

        const hasValue =
            field.hasValue !== undefined
                ? field.hasValue
                : Boolean(field.value);

        if (
            wrapper &&
            wrapper.classList.contains(
                "show-field"
            ) &&
            hasValue &&
            field.value
        ) {
            additionalDetails.push(
                field.label +
                ": " +
                field.value
            );
        }
    }
);
}

if (isCatProductLinkSelected()) {
    const productLinkDescriptionFields = [
        {
            wrapperId:
                "productLinkImpactFieldsWrapper",
            label:
                "I am a Tech on Site",
            value:
                $("#productLinkTechOnSiteInput")
                    .is(":checked")
                    ? "Yes"
                    : ""
        },
        {
    wrapperId:
        "productLinkIndustryFieldWrapper",

    label:
        "Industry",

    value:
        (
            $(
                "#productLinkIndustrySelect " +
                "option:selected"
            ).text() || ""
        ).trim(),

    hasValue:
        Boolean(
            $("#productLinkIndustrySelect")
                .val()
        )
},
        {
            wrapperId:
                "productLinkImpactFieldsWrapper",
            label:
                "Impacting Multiple Assets",
            value:
                $("#productLinkMultipleAssetsInput")
                    .is(":checked")
                    ? "Yes"
                    : ""
        },
       
        {
            wrapperId:
                "productLinkIncorrectDataLocationFieldWrapper",
            label:
                "Where are you seeing incorrect data?",
            value:
                (
                    $("#productLinkIncorrectDataLocationInput")
                        .val() || ""
                ).trim()
        }
    ];

  productLinkDescriptionFields.forEach(
    function (field) {
        const wrapper =
            document.getElementById(
                field.wrapperId
            );

        const hasValue =
            field.hasValue !== undefined
                ? field.hasValue
                : Boolean(field.value);

        if (
            wrapper &&
            wrapper.classList.contains(
                "show-field"
            ) &&
            hasValue &&
            field.value
        ) {
            additionalDetails.push(
                field.label +
                ": " +
                field.value
            );
        }
    }
);
}

if (isVisionLinkSelected()) {
    const visionLinkDescriptionFields = [
        {
            wrapperId:
                "visionLinkTechOnSiteFieldWrapper",
            label:
                "I am a Tech on Site",
            value:
                $("#visionLinkTechOnSiteInput")
                    .is(":checked")
                    ? "Yes"
                    : ""
        },
        {
    wrapperId:
        "visionLinkIndustryFieldWrapper",

    label:
        "Industry",

    value:
        (
            $(
                "#visionLinkIndustrySelect " +
                "option:selected"
            ).text() || ""
        ).trim(),

    hasValue:
        Boolean(
            $("#visionLinkIndustrySelect")
                .val()
        )
}
    ];

    visionLinkDescriptionFields.forEach(
    function (field) {
        const wrapper =
            document.getElementById(
                field.wrapperId
            );

        const hasValue =
            field.hasValue !== undefined
                ? field.hasValue
                : Boolean(field.value);

        if (
            wrapper &&
            wrapper.classList.contains(
                "show-field"
            ) &&
            hasValue &&
            field.value
        ) {
            additionalDetails.push(
                field.label +
                ": " +
                field.value
            );
        }
    }
);
}

if (isFuelPromiseProgramSelected()) {
    const fuelPromiseDescriptionFields = [
        {
            wrapperId:
                "fuelPromiseSerialNumberFieldWrapper",
            label:
                "Serial Number",
            value:
                (
                    $("#fuelPromiseSerialNumberInput")
                        .val() || ""
                ).trim()
        },
        {
            wrapperId:
                "fuelPromisePlDeviceFieldWrapper",
            label:
                "PL Device",
            value:
                (
                    $("#fuelPromisePlDeviceInput")
                        .val() || ""
                ).trim()
        },
        {
            wrapperId:
                "fuelPromiseDcnFieldWrapper",
            label:
                "DCN",
            value:
                (
                    $("#fuelPromiseDcnInput")
                        .val() || ""
                ).trim()
        },
        {
            wrapperId:
                "fuelPromiseCcidFieldWrapper",
            label:
                "CCID",
            value:
                (
                    $("#fuelPromiseCcidInput")
                        .val() || ""
                ).trim()
        }
    ];

    fuelPromiseDescriptionFields.forEach(
        function (field) {
            const wrapper =
                document.getElementById(
                    field.wrapperId
                );

            if (
                wrapper &&
                wrapper.classList.contains(
                    "show-field"
                ) &&
                field.value
            ) {
                additionalDetails.push(
                    field.label +
                    ": " +
                    field.value
                );
            }
        }
    );
}

if (isEnterpriseQrSelected()) {
    const applicationValue =
        (
            $("#enterpriseQrApplicationSelect")
                .find("option:selected")
                .text() || ""
        ).trim();

    const applicationWrapper =
        document.getElementById(
            "enterpriseQrApplicationFieldWrapper"
        );

    if (
        applicationWrapper &&
        applicationWrapper.classList.contains(
            "show-field"
        ) &&
        applicationValue &&
        $("#enterpriseQrApplicationSelect").val()
    ) {
        additionalDetails.push(
            "What application is this regarding?: " +
            applicationValue
        );
    }
}

if (
    isSubscriptionAssetAdministrationSelected()
) {
    const applicationValue =
        (
            $(
                "#subscriptionAssetApplicationSelect " +
                "option:selected"
            ).text() || ""
        ).trim();

    const applicationId =
        (
            $("#subscriptionAssetApplicationSelect")
                .val() || ""
        ).trim();

    const applicationWrapper =
        document.getElementById(
            "subscriptionAssetApplicationFieldWrapper"
        );

    if (
        applicationWrapper &&
        applicationWrapper.classList.contains(
            "show-field"
        ) &&
        applicationId &&
        applicationValue
    ) {
        additionalDetails.push(
            "What application does this issue pertain?: " +
            applicationValue
        );
    }
}
if (isCatConvergeSuiteSelected()) {
    const convergeDescriptionFields = [
        {
            wrapperId:
                "convergeEnvironmentFieldWrapper",
            label:
                "What environment is the issue occurring in?",
            value:
                (
                    $(
                        "#convergeEnvironmentSelect " +
                        "option:selected"
                    ).text() || ""
                ).trim(),
            hasValue:
                Boolean(
                    $("#convergeEnvironmentSelect")
                        .val()
                )
        },
        {
            wrapperId:
                "convergeOnBehalfFieldWrapper",
            label:
                "Are you submitting a case on behalf of another user?",
            value:
                getCheckedRadioValue(
                    "convergeOnBehalf"
                )
        },
        {
            wrapperId:
                "convergeRequestedForFieldWrapper",
            label:
                "Requested For",
            value:
                (
                    $("#convergeRequestedForInput")
                        .val() || ""
                ).trim()
        },
        {
            wrapperId:
                "convergeMultipleUsersFieldWrapper",
            label:
                "Is the issue affecting multiple dealer users?",
            value:
                getCheckedRadioValue(
                    "convergeMultipleUsers"
                )
        },
        {
            wrapperId:
                "convergeRecentChangesFieldWrapper",
            label:
                "Have there been any recent changes to infrastructure/software at your location?",
            value:
                getCheckedRadioValue(
                    "convergeRecentChanges"
                )
        },
        {
            wrapperId:
                "convergeAllItemsFieldWrapper",
            label:
                "Is the issue affecting all items and transactions?",
            value:
                getCheckedRadioValue(
                    "convergeAllItems"
                )
        },
        {
            wrapperId:
                "convergeThirdPartyFieldWrapper",
            label:
                "Does this involve an ISV or third-party application?",
            value:
                getCheckedRadioValue(
                    "convergeThirdParty"
                )
        },
        {
            wrapperId:
                "convergeVersionFieldWrapper",
            label:
                "What version of the application are you using?",
            value:
                (
                    $("#convergeVersionInput")
                        .val() || ""
                ).trim()
        },
        {
            wrapperId:
                "convergeDeviceTypeFieldWrapper",
            label:
                "Are you on a desktop or mobile?",
            value:
                getCheckedRadioValue(
                    "convergeDeviceType"
                )
        },
        {
            wrapperId:
                "convergeErrorMessageFieldWrapper",
            label:
                "Are you getting an error message?",
            value:
                getCheckedRadioValue(
                    "convergeErrorMessage"
                )
        },
        {
            wrapperId:
                "convergeErrorDetailsFieldWrapper",
            label:
                "Error log details",
            value:
                (
                    $("#convergeErrorDetailsInput")
                        .val() || ""
                ).trim()
        },
        {
            wrapperId:
                "convergeUserActionsFieldWrapper",
            label:
                "User actions taken",
            value:
                (
                    $("#convergeUserActionsInput")
                        .val() || ""
                ).trim()
        },
        {
            wrapperId:
                "convergeWorkingExamplesFieldWrapper",
            label:
                "Examples of functioning correctly",
            value:
                (
                    $("#convergeWorkingExamplesInput")
                        .val() || ""
                ).trim()
        }
    ];

    convergeDescriptionFields.forEach(
        function (field) {
            const wrapper =
                document.getElementById(
                    field.wrapperId
                );

            const fieldHasValue =
                field.hasValue !== undefined
                    ? field.hasValue
                    : Boolean(field.value);

            if (
                wrapper &&
                wrapper.classList.contains(
                    "show-field"
                ) &&
                fieldHasValue &&
                field.value
            ) {
                additionalDetails.push(
                    field.label +
                    ": " +
                    field.value
                );
            }
        }
    );
}

if (
    isCaterpillarCustomerAdminToolSelected()
) {
    const moduleValue =
        (
            $(
                "#customerAdminModuleSelect " +
                "option:selected"
            ).text() || ""
        ).trim();

    const moduleId =
        (
            $("#customerAdminModuleSelect")
                .val() || ""
        ).trim();

    const moduleWrapper =
        document.getElementById(
            "customerAdminModuleFieldWrapper"
        );

    if (
        moduleWrapper &&
        moduleWrapper.classList.contains(
            "show-field"
        ) &&
        moduleId &&
        moduleValue
    ) {
        additionalDetails.push(
            "What Module do you need assistance with?: " +
            moduleValue
        );
    }

    const reportTypeValue =
        (
            $(
                "#customerAdminReportTypeSelect " +
                "option:selected"
            ).text() || ""
        ).trim();

    const reportTypeId =
        (
            $("#customerAdminReportTypeSelect")
                .val() || ""
        ).trim();

    const reportTypeWrapper =
        document.getElementById(
            "customerAdminReportTypeFieldWrapper"
        );

    if (
        reportTypeWrapper &&
        reportTypeWrapper.classList.contains(
            "show-field"
        ) &&
        reportTypeId &&
        reportTypeValue
    ) {
        additionalDetails.push(
            "Report Type: " +
            reportTypeValue
        );
    }
}

if (
    isCaterpillarInsightsHubSelected()
) {
    const requestId =
        String(
            $("#insightsHubRequestIdInput")
                .val() || ""
        ).trim();

    const biProductValue =
        String(
            $("#insightsHubBiProductSelect")
                .val() || ""
        ).trim();

    const biProductLabel =
        String(
            $(
                "#insightsHubBiProductSelect " +
                "option:selected"
            ).text() || ""
        ).trim();

    const insightValue =
        String(
            $("#insightsHubInsightSelect")
                .val() || ""
        ).trim();

    const insightLabel =
        String(
            $(
                "#insightsHubInsightSelect " +
                "option:selected"
            ).text() || ""
        ).trim();

    const url =
        String(
            $("#insightsHubUrlInput")
                .val() || ""
        ).trim();

    const requestIdWrapper =
        document.getElementById(
            "insightsHubRequestIdFieldWrapper"
        );

    const biProductWrapper =
        document.getElementById(
            "insightsHubBiProductFieldWrapper"
        );

    const insightWrapper =
        document.getElementById(
            "insightsHubInsightFieldWrapper"
        );

    const urlWrapper =
        document.getElementById(
            "insightsHubUrlFieldWrapper"
        );

    if (
        requestIdWrapper &&
        requestIdWrapper.classList.contains(
            "show-field"
        ) &&
        requestId
    ) {
        additionalDetails.push(
            "Request ID: " +
            requestId
        );
    }

    if (
        biProductWrapper &&
        biProductWrapper.classList.contains(
            "show-field"
        ) &&
        biProductValue &&
        biProductLabel
    ) {
        additionalDetails.push(
            "What BI Product is this regarding?: " +
            biProductLabel
        );
    }

    if (
        insightWrapper &&
        insightWrapper.classList.contains(
            "show-field"
        ) &&
        insightValue &&
        insightLabel
    ) {
        additionalDetails.push(
            "Which Insight is this regarding?: " +
            insightLabel
        );
    }

    if (
        urlWrapper &&
        urlWrapper.classList.contains(
            "show-field"
        ) &&
        url
    ) {
        additionalDetails.push(
            "URL: " +
            url
        );
    }
}

const oneSiteUrl =
    ($("#oneSiteUrlInput").val() || "").trim();

if (oneSiteUrl) {
    additionalDetails.push(
        "URL: " + oneSiteUrl
    );
}

if (isCatDealerSelected()) {
    const dealerUrl = ($("#dealerUrlInput").val() || "").trim();
    if (dealerUrl) {
        additionalDetails.push("URL: " + dealerUrl);
    }

    const dealerErrorMessage =
        ($("#dealerErrorMessageInput").val() || "").trim();
    if (dealerErrorMessage) {
        additionalDetails.push(
            "Error Message Displayed: " + dealerErrorMessage
        );
    }

    const dealerSiteUpdate =
        ($("#dealerSiteUpdateSelect").val() || "").trim();
    if (dealerSiteUpdate) {
        additionalDetails.push(
            "Which Site Update is Needed: " + dealerSiteUpdate
        );
    }
}

if (isCatInspectSelected()) {
    const inspectNumber = ($("#inspectNumberInput").val() || "").trim();
    if (inspectNumber) {
        additionalDetails.push("Inspection Number: " + inspectNumber);
    }

    const inspectType = ($("#inspectTypeSelect").val() || "").trim();
    if (inspectType) {
        additionalDetails.push("What Type of Inspection: " + inspectType);
    }

    const multipleAssets =
        $("input[name='inspectMultipleAssets']:checked").val() || "";
    if (multipleAssets) {
        additionalDetails.push(
            "Is this Impacting Multiple Assets?: " + multipleAssets
        );
    }

}
    if (isCatRentalsSelected()) {
    const rentalsUrl = ($("#rentalsUrlInput").val() || "").trim();
    if (rentalsUrl) {
        additionalDetails.push("URL: " + rentalsUrl);
    }

    const rentedOrOwned =
        $("input[name='rentalsRentedOwned']:checked").val() || "";
    if (rentedOrOwned) {
        additionalDetails.push("Rented or Owned Machine: " + rentedOrOwned);
    }

    const jobsiteAddress = ($("#rentalsJobsiteAddressInput").val() || "").trim();
    if (jobsiteAddress) {
        additionalDetails.push("Jobsite Address: " + jobsiteAddress);
    }

    const contractInvoice = ($("#rentalsContractInvoiceInput").val() || "").trim();
    if (contractInvoice) {
        additionalDetails.push("Contract/Invoice Number: " + contractInvoice);
    }
    /* Cat Rentals - Dealer/Internal only */
    const rentalsDealerOnBehalf =
        $("input[name='rentalsDealerOnBehalf']:checked").val() || "";
    if (rentalsDealerOnBehalf) {
        additionalDetails.push(
            "Are you submitting a case on behalf of another user?: " +
            rentalsDealerOnBehalf
        );
    }

    const rentalsDealerRequestedFor =
        ($("#rentalsDealerRequestedForInput").val() || "").trim();
    if (rentalsDealerRequestedFor) {
        additionalDetails.push(
            "Requested For: " + rentalsDealerRequestedFor
        );
    }
    const rentalsDealerRequestLeadId =
        ($("#rentalsDealerRequestLeadIdInput").val() || "").trim();
    if (rentalsDealerRequestLeadId) {
        additionalDetails.push(
            "Request/Lead ID Number: " + rentalsDealerRequestLeadId
        );
    }

    const rentalsDealerAssetId =
        ($("#rentalsDealerAssetIdInput").val() || "").trim();
    if (rentalsDealerAssetId) {
        additionalDetails.push(
            "Asset ID/Serial Number: " + rentalsDealerAssetId
        );
    }
}

if (isCatCentralSelected()) {
    const centralEnvironment =
        ($("#centralEnvironmentSelect option:checked").text() || "").trim();
    if (centralEnvironment && centralEnvironment !== "Select Option") {
        additionalDetails.push(
            "What environment is the issue occurring in?: " + centralEnvironment
        );
    }

    const centralDateTime = ($("#centralDateTimeInput").val() || "").trim();
    if (centralDateTime) {
        additionalDetails.push("Date & Time Issue Occurred: " + centralDateTime);
    }

    const centralTimeZone = ($("#centralTimeZoneInput").val() || "").trim();
    if (centralTimeZone) {
        additionalDetails.push("Time Zone: " + centralTimeZone);
    }

    const centralInfraChanges =
        $("input[name='centralInfraChanges']:checked").val() || "";
    if (centralInfraChanges) {
        additionalDetails.push(
            "Have there been any recent changes to infrastructure/software at your location?: " +
            centralInfraChanges
        );
    }

    const centralAppVersion = ($("#appVersionInput").val() || "").trim();
    if (centralAppVersion) {
        additionalDetails.push("App Version: " + centralAppVersion);
    }

    const centralCustomerEmail = ($("#customerEmailInput").val() || "").trim();
    if (centralCustomerEmail) {
        additionalDetails.push("Customer Email Address: " + centralCustomerEmail);
    }

    const centralCustomerCwsId = ($("#centralCustomerCwsIdInput").val() || "").trim();
    if (centralCustomerCwsId) {
        additionalDetails.push("Customer CWS ID: " + centralCustomerCwsId);
    }

    const centralMultipleUsers =
        $("input[name='centralMultipleUsers']:checked").val() || "";
    if (centralMultipleUsers) {
        additionalDetails.push(
            "Is the issue affecting multiple users?: " + centralMultipleUsers
        );
    }

    if (isCustomerOrGuestPersona()) {
        const centralCustomerAssetId = ($("#centralCustomerAssetIdInput").val() || "").trim();
        if (centralCustomerAssetId) {
            additionalDetails.push("Asset ID/Serial Number: " + centralCustomerAssetId);
        }

        const centralCustomerOrderNumber = ($("#centralCustomerOrderNumberInput").val() || "").trim();
        if (centralCustomerOrderNumber) {
            additionalDetails.push("Order Number: " + centralCustomerOrderNumber);
        }
    }
}

    return additionalDetails.join(" | ");
}

function buildCasePayload() {
    const productId =
        cleanGuid($("#productTech").val());

    const selectedIssueType =
        getSelectedIssueTypeConfig();

// AFTER
const titleValue =
    ($("#subject").val() || "").trim() ||
    "Cat® Customer Support Request";
const data = {
        "title": titleValue,
        "cat_additionalemail1": ($("#additionalEmail1").val() || "").trim(),      
        "cat_additionalemail2": ($("#additionalEmail2").val() || "").trim(),
        "description": buildFinalDescription(),
        "customerid_contact@odata.bind":
            "/contacts({{ user.id }})",
        "cat_RequestedFrom@odata.bind":
            "/contacts({{ user.id }})"
    };

   const LANGUAGE_CODE_TO_LCID = {
        "ar-sa": 1025,
        "eu-es": 1069,
        "bg-bg": 1026,
        "ca-es": 1027,
        "zh-cn": 2052,
        "zh-hk": 3076,
        "zh-tw": 1028,
        "hr-hr": 1050,
        "cs-cz": 1029,
        "da-dk": 1030,
        "nl-nl": 1043,
        "en-us": 1033,
        "et-ee": 1061,
        "fi-fi": 1035,
        "fr-fr": 1036,
        "gl-es": 1110,
        "de-de": 1031,
        "el-gr": 1032,
        "he-il": 1037,
        "hi-in": 1081,
        "hu-hu": 1038,
        "id-id": 1057,
        "it-it": 1040,
        "ja-jp": 1041,
        "kn-in": 1099,
        "kk-kz": 1087,
        "ko-kr": 1042,
        "lv-lv": 1062,
        "lt-lt": 1063,
        "ms-my": 1086,
        "nb-no": 1044,
        "pl-pl": 1045,
        "pt-br": 1046,
        "pt-pt": 2070,
        "ro-ro": 1048,
        "ru-ru": 1049,
        "sr-cyrl-rs": 3098,
        "sr-latn-rs": 2074,
        "sk-sk": 1051,
        "sl-si": 1060,
        "es-es": 3082,
        "sv-se": 1053,
        "ta-in": 1097,
        "te-in": 1098,
        "th-th": 1054,
        "tr-tr": 1055,
        "uk-ua": 1058,
        "vi-vn": 1066
    };

    const languageValue =
        ($("#languageInput").val() || "")
            .trim()
            .toLowerCase();

    data["cat_language"] =
        LANGUAGE_CODE_TO_LCID[languageValue] || 1033;

   const sourceProductId =
        catInitialSourceProductId ||
        "8874ff1c-10ac-f111-aaac-7ced8d6fd504";

    data["cat_Source@odata.bind"] =
        "/products(" +
        sourceProductId +
        ")";

    if (productId) {
        data["productid@odata.bind"] =
            "/products(" + productId + ")";
    }
   const dealerId=
   cleanGuid($("#dealer").val());

   if(dealerId) {
    data["cat_DealerName@odata.bind"] = "/accounts(" + dealerId + ")";
   }
    if (
    isCaterpillarCustomerAdminToolSelected()
) {
    const selectedModule =
        (
            $("#customerAdminModuleSelect")
                .val() || ""
        ).trim();

    if (selectedModule) {
        const secondaryProductId =
            getCustomerAdminSecondaryProductId(
                selectedModule
            );

        if (!secondaryProductId) {
            throw new Error(
                "Caterpillar Customer Admin Tool " +
                "routing failed: the Secondary " +
                "Product Technology for " +
                selectedModule +
                " could not be found."
            );
        }

        data[
            "cat_secondaryproducttechnology_id@odata.bind"
        ] =
            "/products(" +
            secondaryProductId +
            ")";
    }
}

    if (isCatConvergeSuiteSelected()) {
    const applicationName =
        (
            $("#convergeApplicationSelect")
                .val() || ""
        ).trim();

    if (applicationName) {
        const secondaryProductId =
            getConvergeSecondaryProductId(
                applicationName
            );

        if (!secondaryProductId) {
            throw new Error(
                "Cat Converge Suite routing failed: " +
                "the Secondary Product Technology for " +
                applicationName +
                " could not be found."
            );
        }

        data[
            "cat_secondaryproducttechnology_id@odata.bind"
        ] =
            "/products(" +
            secondaryProductId +
            ")";
    }
}

if (isFuelPromiseProgramSelected()) {
    const primaryOtherProductId =
        getFuelPromiseRoutingProductId(
            "Other"
        );

    const secondaryOtherProductId =
        getFuelPromiseRoutingProductId(
            "Other"
        );

    if (!primaryOtherProductId) {
        throw new Error(
            "Fuel Promise Program routing failed: " +
            "the Other Product Technology record " +
            "could not be found."
        );
    }

    if (!secondaryOtherProductId) {
        throw new Error(
            "Fuel Promise Program routing failed: " +
            "the Other - Other Secondary Product " +
            "Technology record could not be found."
        );
    }

    data["productid@odata.bind"] =
        "/products(" +
        primaryOtherProductId +
        ")";

    data[
        "cat_secondaryproducttechnology_id@odata.bind"
    ] =
        "/products(" +
        secondaryOtherProductId +
        ")";

    data[
        "cat_AdditionalApplications@odata.bind"
    ] =
        "/cat_additionalapplications(" +
        "9f6a6b38-3497-f111-8076-00224804a04f" +
        ")";
}

if (isEnterpriseQrSelected()) {
    const primaryOtherProductId =
        getFuelPromiseRoutingProductId(
            "Other"
        );

    const secondaryOtherProductId =
        getFuelPromiseRoutingProductId(
            "Other - Other"
        );

    const enterpriseQrApplicationId =
        getEnterpriseQrAdditionalApplicationId();

    if (!primaryOtherProductId) {
        throw new Error(
            "Enterprise QR routing failed: " +
            "the Other Product Technology record " +
            "could not be found."
        );
    }

    if (!secondaryOtherProductId) {
        throw new Error(
            "Enterprise QR routing failed: " +
            "the Other - Other Secondary Product " +
            "Technology record could not be found."
        );
    }

    if (!enterpriseQrApplicationId) {
        throw new Error(
            "Enterprise QR routing failed: " +
            "the Enterprise QR Additional " +
            "Application record could not be found."
        );
    }

    data["productid@odata.bind"] =
        "/products(" +
        primaryOtherProductId +
        ")";

    data[
        "cat_secondaryproducttechnology_id@odata.bind"
    ] =
        "/products(" +
        secondaryOtherProductId +
        ")";

    data[
        "cat_AdditionalApplications@odata.bind"
    ] =
        "/cat_additionalapplications(" +
        enterpriseQrApplicationId +
        ")";
}

if (
    isSubscriptionAssetAdministrationSelected()
) {
    const issueTypeValue =
        ($("#issueType").val() || "")
            .trim();

    let routedProductName = "";

    if (issueTypeValue === "100000017") {
        routedProductName =
            "Dealer Services Portal";
    }

    if (issueTypeValue === "100000008") {
        routedProductName =
            (
                $(
                    "#subscriptionAssetApplicationSelect"
                ).val() || ""
            ).trim();
    }

    if (routedProductName) {
        const routedProductId =
            getProductTechnologyIdByName(
                routedProductName
            );

        if (!routedProductId) {
            throw new Error(
                "Subscription and Asset Administration " +
                "routing failed: the Product Technology " +
                routedProductName +
                " could not be found."
            );
        }

        data["productid@odata.bind"] =
            "/products(" +
            routedProductId +
            ")";
    }
}

    if (isCatInspectSelected()) {
        const secondaryProductId =
            cleanGuid($("#inspectAppSelect").val());

        if (secondaryProductId) {
            data["cat_secondaryproducttechnology_id@odata.bind"] =
                "/products(" + secondaryProductId + ")";
        }
    }

    if (isDealerCollaborationSelected()) {
    const secondaryProductId =
        cleanGuid(
            $("#dealerCommunitySelect").val()
        );

    if (secondaryProductId) {
        data[
            "cat_secondaryproducttechnology_id@odata.bind"
        ] =
            "/products(" +
            secondaryProductId +
            ")";
    }
}
if (isCatRentalsSelected()) {
        const rentalsSecondaryProductId =
            cleanGuid($("#rentalsDealerAppSelect").val());

        if (rentalsSecondaryProductId) {
            data["cat_secondaryproducttechnology_id@odata.bind"] =
                "/products(" + rentalsSecondaryProductId + ")";
        }
    }

if (selectedIssueType) {
        data["cat_whattypeofissueareyoureporting"] =
            Number(selectedIssueType.value);

        if (
            selectedIssueType.priorityValue !== undefined &&
            selectedIssueType.priorityValue !== null
        ) {
            data["prioritycode"] =
                Number(selectedIssueType.priorityValue);
        }

        if (
            selectedIssueType.caseTypeValue !== undefined &&
            selectedIssueType.caseTypeValue !== null
        ) {
            data["casetypecode"] =
                Number(selectedIssueType.caseTypeValue);
        }
        if (
    isDealerServicesPortalSelected() &&
    getDealerServicesPortalImpacts().length > 0
) {
    data["prioritycode"] = 2;
}
    }

    if (isDigitalAuthorizationSelected()) {
    const dataPointValue =
        ($("#digitalAuthDataPointSelect").val() || "").trim();

    if (dataPointValue) {
        data["cat_datapoint"] =
            Number(dataPointValue);
    }
}

if (
    isCaterpillarInsightsHubSelected()
) {
    const selectedInsight =
        String(
            $("#insightsHubInsightSelect")
                .val() || ""
        ).trim();

    if (selectedInsight) {
        /*
         * Temporary mapping:
         * Caterpillar Insights Hub Insight
         * maps to Dataverse Data Point = Other.
         *
         * The actual Insight name is retained
         * in Case Description.
         */
        data["cat_datapoint"] =
            100000007;
    }
}

if (isDealerCollaborationSelected()) {
    const dealerCode =
        ($("#dealerAdditionalCodeInput").val() || "").trim();

    const dealerCodeWrapper =
        document.getElementById(
            "dealerAdditionalCodeFieldWrapper"
        );

    if (
        dealerCode &&
        dealerCodeWrapper &&
        dealerCodeWrapper.classList.contains("show-field")
    ) {
        data["cat_dealercode"] =
            dealerCode;
    }
}

if (isDealerServicesPortalSelected()) {
    const bestDescribesValue =
        (
            $("#dspBestDescribesSelect").val() ||
            ""
        ).trim();

    const bestDescribesWrapper =
        document.getElementById(
            "dspBestDescribesFieldWrapper"
        );

    if (
        bestDescribesValue &&
        bestDescribesWrapper &&
        bestDescribesWrapper.classList.contains(
            "show-field"
        )
    ) {
        data["cat_whatbestdescribesyourissue"] =
            Number(bestDescribesValue);
    }
}

if (isCatProductLinkSelected()) {
    const isTechOnSite =
        $("#productLinkTechOnSiteInput")
            .is(":checked");

    if (isTechOnSite) {
        data["prioritycode"] = 2;
    }
}

if (isVisionLinkSelected()) {
    const isTechOnSite =
        $("#visionLinkTechOnSiteInput")
            .is(":checked");

    if (isTechOnSite) {
        data["prioritycode"] = 2;
    }
}

data["cat_subjectenglish"] = data["title"];
data["cat_descriptionenglish"] =data["description"];
data["caseorigincode"]= 2483;

    console.log(
        "CASE PAYLOAD:",
        JSON.stringify(data, null, 2)
    );

    return data;
}

async function uploadAttachmentToCase(caseId, file, index) {
    // convert to base64
    const content = await readFileAsBase64(file);

    // sanitize filename (remove special chars)
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    // approximate bytes check (base64 -> bytes)
    const approxBytes = Math.ceil((content.length * 3) / 4);
    if (approxBytes > 5 * 1024 * 1024) { // 5 MB safety limit
        $(`#file-${index} .status`).text("(Too large)");
      throw new Error("Dynamics CRM only allows max 5MB per attachment.");

    }

    // build annotation payload bound to the case (Timeline note)
    const annotation = {
        "subject": "Attachment: " + safeName,
        "filename": safeName,
        "notetext": "Uploaded via Portal on submit",
        "documentbody": content,
        "mimetype": file.type || "application/octet-stream",
        "objectid_incident@odata.bind": "/incidents(" + caseId + ")"
    };

    // POST to annotations
    return webapi.safeAjax({
        type: "POST",
        url: "/_api/annotations",
        contentType: "application/json",
        data: JSON.stringify(annotation),
        processData: false,
        success: function () {
            $(`#file-${index} .status`).text("(Uploaded)");
        },
        error: function (xhr) {
            $(`#file-${index} .status`).text("(Failed)");
            console.error("Annotation upload failed:", xhr.responseText || xhr);
            throw xhr;
        }
    });
}

  async function uploadAllAttachments(caseId) {
    const uploadPromises = [];

    filesArray.forEach(function (file, index) {
        if (!file) return;

        $(`#file-${index} .status`).text("(Uploading)");
        // retry up to 2 times
        const p = retryAsync(() => uploadAttachmentToCase(caseId, file, index), 2);
        uploadPromises.push(p);
    });

    return Promise.allSettled(uploadPromises).then(results => {
        const failed = results.filter(r => r.status === "rejected");
        if (failed.length) {
            throw new Error(`${failed.length} attachment(s) failed to upload.`);
        }
        return true;
    });
}

// helper: retry wrapper
function retryAsync(fn, retries) {
    return new Promise((resolve, reject) => {
        const attempt = (n) => {
            fn().then(resolve).catch(err => {
                if (n <= 0) return reject(err);
                setTimeout(() => attempt(n - 1), 500 * (3 - n)); // small backoff
            });
        };
        attempt(retries);
    });
}


    function handleFiles(files) {

        // ✅ FIRST: enforce max file count
    if (filesArray.filter(f => !!f).length + files.length > MAX_FILES) {
        showError(`You can upload a maximum of ${MAX_FILES} files.`);
        return;
    }
        const rejectedType = [];
        const rejectedTooBig = [];
        const wouldExceedTotal = [];

        for (let file of files) {
            if (!isAllowed(file)) {
                rejectedType.push(file.name);
                continue;
            }

            const size = file.size || 0;

            if (size > MAX_FILE_SIZE_BYTES) {
                rejectedTooBig.push(`${file.name} (${formatBytes(size)})`);
                continue;
            }

            const nextTotal = currentTotalSize() + size;

            if (nextTotal > MAX_TOTAL_SIZE_BYTES) {
                wouldExceedTotal.push(`${file.name} (${formatBytes(size)})`);
                continue;
            }

            const previewIndex = filesArray.length;
            filesArray.push(file);

            $dropZone.removeClass("error");

   $("#file-previews").append(`
    <div class="file-item" id="file-${previewIndex}">
        <span class="filename">${file.name} (${formatBytes(size)})</span>
        <span class="cat-progress" id="prog-${previewIndex}">
        <span class="cat-progress-bar">
        <span class="cat-progress-fill"></span>
         <span class="cat-progress-text">0%</span>
        </span>
        <span class="cat-progress-tick">&#10003;</span>
        </span>
        <span class="remove-file" data-index="${previewIndex}">X</span>
      
        
    </div>
`);
startCatProgress(previewIndex);


        }

        if (rejectedType.length > 0) {
            showError(`Allowed file types: ${Array.from(ALLOWED_EXT).join(", ")}. Blocked: ${rejectedType.join(", ")}`);
        }

        if (rejectedTooBig.length > 0) {
            showError(`These files exceed ${formatBytes(MAX_FILE_SIZE_BYTES)}: ${rejectedTooBig.join(", ")}`);
        }

        if (wouldExceedTotal.length > 0) {
            showError(`Adding these files exceeds total limit ${formatBytes(MAX_TOTAL_SIZE_BYTES)}: ${wouldExceedTotal.join(", ")}`);
        }
    }

    $("#browse-link").on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        $fileInput.trigger("click");
    });

    $fileInput.on("change", function (e) {
        handleFiles(e.target.files);
        $fileInput.val("");
    });

    $dropZone.on("dragover", function (e) {
        e.preventDefault();
        $dropZone.addClass("hover");
    });

    $dropZone.on("dragleave", function () {
        $dropZone.removeClass("hover");
    });

    $dropZone.on("drop", function (e) {
        e.preventDefault();
        $dropZone.removeClass("hover");
        handleFiles(e.originalEvent.dataTransfer.files);
    });

    function lockSubmitForUpload() {
        activeUploads++;
        $submitBtn.addClass("cat-btn-uploading").prop("disabled", true);
    }

    function unlockSubmitAfterUpload() {
        if (activeUploads > 0) activeUploads--;
        if (activeUploads === 0) {
            $submitBtn.removeClass("cat-btn-uploading").prop("disabled", false);
        }
    }

    function startCatProgress(index) {
       const $wrap =$("#prog-" + index);
        const $fill = $wrap.find(".cat-progress-fill");
        const $text = $wrap.find(".cat-progress-text");
        let pct=0;

        lockSubmitForUpload();

        const timer= setInterval(function () {
            pct += 10;
            if (pct >=100) {
                pct=100;
                clearInterval(timer);
                $wrap.addClass("done");
                unlockSubmitAfterUpload();
            }
            $fill.css("width" ,pct + "%");
            $text.text(pct + "%");
        }, 120);
    }

 $(document).on("click", ".remove-file", function () {
        const index = $(this).data("index");
        const $wrap = $("#prog-" + index);

        if ($wrap.length && !$wrap.hasClass("done")) {
            unlockSubmitAfterUpload();
        }

        filesArray[index] = null;
        $(`#file-${index}`).remove();
    });

function detectRequiredFields() {
    const requiredFields = [];

    $(".cat-field").each(function () {
        const $wrapper = $(this);
        const $label = $wrapper.find("label").first();
        const $radioGroup = $wrapper.find(".cat-radio-group").first();

        if ($radioGroup.length) {
            const $radios = $radioGroup.find("input[type='radio']");
            if (!$radios.length) return;

            const groupName = $radios.first().attr("name");
            if (!groupName) return;

            const hasAsterisk = $label.length && $label.text().indexOf("*") !== -1;
            const hasRequiredAttr = $radios.filter("[required], [aria-required='true']").length > 0;

            if (!hasAsterisk && !hasRequiredAttr) return;

            requiredFields.push({
                type: "radio",
                groupName: groupName,
                labelFallback: $label.length ? ($label.clone().children().remove().end().text().trim() || groupName) : groupName,
                wrapper: $wrapper
            });

            return;
        }

        const $lookupInput = $wrapper.find(".lookup-input").first();
        const $plainControl = $wrapper.find("input, textarea, select")
            .not(".lookup-input")
            .filter(function () { return !!this.id; })
            .first();

        const $control = $lookupInput.length ? $lookupInput : $plainControl;
        if (!$control.length) return;

        const hasAsterisk = $label.length && $label.text().indexOf("*") !== -1;
        const hasRequiredAttr = $control.prop("required") || $control.attr("aria-required") === "true";

        if (!hasAsterisk && !hasRequiredAttr) return;

        const id = $control.attr("id");
        if (!id) return;

        const hiddenSelectId = Object.keys(lookupMap).find(key => lookupMap[key] === ("#" + id));

        requiredFields.push({
            type: "field",
            id: id,
            labelFallback: $label.length ? ($label.clone().children().remove().end().text().trim() || id) : id,
            lookupSelectId: hiddenSelectId || undefined,
            visibleSelector: "#" + id
        });
    });

    return requiredFields;
}
function runCustomValidation() {
    const errors = [];

    const requiredFields = detectRequiredFields();

    requiredFields.forEach(f => {

        if (f.type === "radio") {
            const $wrapper = f.wrapper;

            if (!$wrapper.is(":visible")) {
                return;
            }

            $wrapper.find(".field-error-message").remove();

            const isChecked = $("input[name='" + f.groupName + "']:checked").length > 0;

            if (!isChecked) {
                errors.push(`${f.labelFallback} – Complete this field.`);

                $wrapper.addClass("error");
            } else {
                $wrapper.removeClass("error");
            }

            return;
        }

        const dealerWrapper =
    $(f.visibleSelector || ("#" + f.id))
        .closest(".cat-field");
if (
    dealerWrapper.length &&
    dealerWrapper.attr("id") &&
    dealerWrapper.attr("id").indexOf("dealer") === 0 &&
    !dealerWrapper.hasClass("show-field")
) {
    return;
}
        // 1) determine value: safe visible-first lookup handling
        let value = "";
        const $visibleControl = $(f.visibleSelector || ("#" + f.id));

        // safe visible value (guard against missing element or non-input)
        const visibleVal = ($visibleControl.length && typeof $visibleControl.val === "function")
            ? (($visibleControl.val() || "").toString().trim())
            : "";

        if (f.lookupSelectId) {
            const $hiddenSelect = $("#" + f.lookupSelectId);

            // visible wins if it has a real value
            if (visibleVal !== "" && visibleVal !== "-" && visibleVal.toLowerCase() !== "select") {
                value = visibleVal;
            } else if ($hiddenSelect.length) {
                const hidVal = (($hiddenSelect.val() || "").toString().trim());
                if (hidVal !== "" && hidVal !== "-" && hidVal.toLowerCase() !== "select") {
                    value = hidVal;
                } else {
                    value = "";
                }
            } else {
                value = "";
            }
        } else {
            // non-lookup fields: use visible value safely
            value = visibleVal;
        }

        // 2) get clean label text (remove child spans like asterisk)
        let labelText = f.labelFallback;
        const $visibleWrapper = $(f.visibleSelector || ("#" + f.id)).closest(".cat-field");
        if ($visibleWrapper.length) {
            const raw = $visibleWrapper.find("label").first();
            if (raw.length) labelText = raw.clone().children().remove().end().text().trim() || f.labelFallback;
        } else {
            const $forLabel = $(`label[for='${f.id}']`).first();
            if ($forLabel.length) labelText = $forLabel.clone().children().remove().end().text().trim() || f.labelFallback;
        }

        // 3) choose element to highlight and where to place message
        const $lookupInput = $visibleControl.hasClass("lookup-input") ? $visibleControl : $visibleControl.closest(".lookup-wrapper").find(".lookup-input");
        const $messageContainer = $visibleWrapper.length ? $visibleWrapper : ($visibleControl.length ? $visibleControl.parent() : null);

        // remove any previous inline message first
        if ($messageContainer) $messageContainer.find(".field-error-message").remove();

        // 4) if empty -> add error, highlight and append plain message
        if (!value) {
            errors.push(`${labelText} – Complete this field.`);

            // add highlight classes
            if ($visibleControl.length) {
                $visibleControl.addClass("error-field");
                $visibleControl.closest(".cat-field").addClass("error");
            } else if ($lookupInput.length) {
                $lookupInput.addClass("error-field");
                $lookupInput.closest(".cat-field").addClass("error");
            } else {
                $(`[name='${f.id}']`).addClass("error-field").closest(".cat-field").addClass("error");
            }

            // append plain inline message (no pointer)
            if ($messageContainer && $messageContainer.find(".field-error-message").length === 0) {
                const msgHtml = `<span class="field-error-message">Complete this field.</span>`;
                if ($visibleControl.length) {
                    $visibleControl.after(msgHtml);
                } else if ($lookupInput.length) {
                    $lookupInput.after(msgHtml);
                } else {
                    $messageContainer.append(msgHtml);
                }
            }
        } else {
            // remove highlight and message
            if ($visibleControl.length) {
                $visibleControl.removeClass("error-field");
                $visibleControl.closest(".cat-field").removeClass("error");
            }
            if ($lookupInput && $lookupInput.length) {
                $lookupInput.removeClass("error-field");
                $lookupInput.closest(".cat-field").removeClass("error");
            }
            if ($messageContainer) $messageContainer.find(".field-error-message").remove();
            $(`[name='${f.id}']`).removeClass("error-field").closest(".cat-field").removeClass("error");
        }
    });

    const requiredRadioGroups = [
    {
        wrapperId: "ipMultipleCustomersFieldWrapper",
        name: "ipMultipleCustomers",
        label: "Is the issue affecting multiple customers?"
    },
    {
        wrapperId: "ipIntermittentFieldWrapper",
        name: "ipIntermittent",
        label: "Is the issue intermittent?"
    },
    {
        wrapperId: "ipPartNumberSpecificFieldWrapper",
        name: "ipPartNumberSpecific",
        label: "Is this part number specific?"
    },
    {
        wrapperId: "ipOtherNetworkIssuesFieldWrapper",
        name: "ipOtherNetworkIssues",
        label:
            "Is the IP Customer experiencing any other network issues?"
    },
    {
    wrapperId: "dealerOnBehalfFieldWrapper",
    name: "dealerOnBehalf",
    label:
        "Are you submitting a case on behalf of another user?"
},
{
    wrapperId: "inspectMultipleAssetsFieldWrapper",
    name: "inspectMultipleAssets",
    label:
        "Is this Impacting Multiple Assets?"
}
];

requiredRadioGroups.forEach(function (group) {
    const wrapper =
        document.getElementById(group.wrapperId);

    if (
        !wrapper ||
        !wrapper.classList.contains("show-field")
    ) {
        return;
    }

    const requiredRadio =
        wrapper.querySelector(
            'input[name="' + group.name + '"][required]'
        );

    if (!requiredRadio) {
        return;
    }

    const selectedRadio =
        wrapper.querySelector(
            'input[name="' + group.name + '"]:checked'
        );

    wrapper
        .querySelectorAll(".field-error-message")
        .forEach(function (message) {
            message.remove();
        });

    if (!selectedRadio) {
        errors.push(
            group.label + " - Complete this field."
        );

        wrapper.classList.add("error");

        wrapper.insertAdjacentHTML(
            "beforeend",
            '<span class="field-error-message">' +
            "Complete this field." +
            "</span>"
        );
    } else {
        wrapper.classList.remove("error");
    }
});
    // 5) clear inline message and highlight on user edit (idempotent)
    $(".cat-field input, .cat-field textarea, .cat-field select, .lookup-input")
      .off("input.validation change.validation")
      .on("input.validation change.validation", function () {
          const $el = $(this);
          $el.removeClass("error-field");
          $el.closest(".cat-field").removeClass("error");
          $el.closest(".cat-field").find(".field-error-message").remove();
      });

    return errors;
}
// When visible lookup is cleared, clear the corresponding hidden select and UI immediately
$(document).on("input change blur focusout", "#productInput, #issueTypeInput, .lookup-input", function () {
  const $visible = $(this);
  const visVal = (typeof $visible.val === "function" && $visible.val())
    ? $visible.val().toString().trim()
    : $visible.text().toString().trim();

  if (visVal === "" || visVal === "-" || visVal.toLowerCase() === "select") {
    const map = { "#productInput": "#productTech", "#issueTypeInput": "#issueType" };
    Object.keys(map).forEach(visSel => {
      if ($visible.is(visSel)) {
        const $hidden = $(map[visSel]);
        if ($hidden.length && ($hidden.val() || "") !== "") {
          $hidden.val("").trigger("change");
        }
      }
    });

    $visible.removeClass("error-field");
    $visible.closest(".cat-field").removeClass("error");
    $visible.closest(".cat-field").find(".field-error-message").remove();
  }
});

// Also handle common widget clear/unselect events (Select2 / Choices / autocomplete)
$(document).on("select2:unselect select2:clear choices:remove choices:clear autocomplete:clear", function (e) {
  const $t = $(e.target);
  if ($t.is("#productInput") || $t.is("#issueTypeInput") || $t.hasClass("lookup-input")) {
    $t.removeClass("error-field");
    $t.closest(".cat-field").removeClass("error");
    $t.closest(".cat-field").find(".field-error-message").remove();
    const map = { "#productInput": "#productTech", "#issueTypeInput": "#issueType" };
    Object.keys(map).forEach(visSel => {
      if ($t.is(visSel)) {
        const $hidden = $(map[visSel]);
        if ($hidden.length && ($hidden.val() || "") !== "") {
          $hidden.val("").trigger("change");
        }
      }
    });
  }
});

/* ---------- Clear lookup errors: robust handlers (paste after runCustomValidation) ---------- */

function clearFieldErrorByVisible($visible) {
  if (!$visible || !$visible.length) return;
  $visible.removeClass("error-field");
  $visible.closest(".cat-field").removeClass("error");
  $visible.closest(".cat-field").find(".field-error-message").remove();
}

/* Map hidden select id -> visible input selector (update if your IDs differ) */
const lookupMap = {
  productTech: "#productInput",
  issueType: "#issueTypeInput"
};

/* 1) Native select change (hidden select used by the widget) */
$(document).on("change", Object.keys(lookupMap).map(id => `#${id}`).join(","), function () {
  const id = $(this).attr("id");
  const visibleSel = lookupMap[id];
  if (visibleSel) clearFieldErrorByVisible($(visibleSel));
  $(this).removeClass("error-field").closest(".cat-field").removeClass("error");
});

/* 2) Visible lookup input change / input (covers typing and some widget updates) */
$(document).on("input change", ".lookup-input, #productInput, #issueTypeInput", function () {
  clearFieldErrorByVisible($(this));
});

/* 3) Common widget events (Select2, Choices, Autocomplete, etc.) */
$(document).on("select2:select select2:close choices:select choices:change autocomplete:select", function (e) {
  // try to clear based on event target
  const $t = $(e.target);
  if ($t.is(".lookup-input") || $t.is("#productInput") || $t.is("#issueTypeInput")) {
    clearFieldErrorByVisible($t);
  } else {
    // if event fired on hidden select, map to visible
    const id = $t.attr("id");
    if (id && lookupMap[id]) clearFieldErrorByVisible($(lookupMap[id]));
  }
});

/* 4) Click on option items inside common dropdowns (covers custom option lists) */
$(document).on("click", ".dropdown-item, .choices__item--selectable, .option, .ms-ListItem, .lookup-option", function () {
  // find nearest visible lookup input in the same field wrapper
  const $wrap = $(this).closest(".cat-field");
  if ($wrap.length) {
    const $visible = $wrap.find(".lookup-input, input, textarea, select").first();
    clearFieldErrorByVisible($visible);
  }
});

/* 5) MutationObserver fallback for widgets that update DOM without events */
(function attachObservers() {
  const selectors = ["#productInput", "#issueTypeInput", ".lookup-input"];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(node => {
      if (node.__lookupObserverAttached) return;
      node.__lookupObserverAttached = true;

      const observer = new MutationObserver(muts => {
        // if visible text/value changed, clear errors
        const $n = $(node);
        clearFieldErrorByVisible($n);
      });

      observer.observe(node, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["value", "aria-activedescendant", "aria-selected"]
      });
    });
  });
})();

/* 6) Polling fallback (last resort) — checks hidden selects for value changes */
(function attachSelectPoll() {
  const tracked = Object.keys(lookupMap).map(id => ({ id, last: $("#" + id).val() }));
  setInterval(() => {
    tracked.forEach(t => {
      const $s = $("#" + t.id);
      if (!$s.length) return;
      const cur = $s.val();
      if (String(cur) !== String(t.last)) {
        t.last = cur;
        const visibleSel = lookupMap[t.id];
        if (visibleSel) clearFieldErrorByVisible($(visibleSel));
        $s.removeClass("error-field").closest(".cat-field").removeClass("error");
      }
    });
  }, 300); // 300ms is responsive but light on CPU
})();

function showCustomErrors(errors) {
    const box = $("#customValidationBox");

    if (errors.length === 0) {
        box.hide();
        box.html("");
        return false;
    }

    const html = `<strong>Submission failed.</strong> One or more required fields are missing or contain invalid values`;

    box.html(html);
    box.show();

  
// box ko screen ke center me smoothly le aao - device/screen size se independent
    if (box.length && typeof box[0].scrollIntoView === "function") {
        box[0].scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
        $('html, body').animate({
            scrollTop: box.offset().top - 50
        }, 300);
}

    return true;
}


    $form.on("submit", async function (e) {
        e.preventDefault();

 // 🔥 CUSTOM VALIDATION
    const errors = runCustomValidation();
    const selectedIssueTypeValue =
    ($("#issueType").val() || "").trim();

if (
    isSosServicesSelected() &&
    SOS_FILE_REQUIRED_ISSUE_TYPES.includes(
        selectedIssueTypeValue
    ) &&
    getSelectedFiles().length === 0
) {
    errors.push(
        "File attachment - Attach the required example file."
    );

    $dropZone.addClass("error");
}

if (
    isCaterpillarInsightsHubSelected() &&
    getSelectedFiles().length === 0
) {
    errors.push(
        "File Upload - Upload a full snapshot " +
        "of the screen with the insight you are " +
        "concerned about, including the URL."
    );
}
    const hasErrors = showCustomErrors(errors);

    if (hasErrors) {
        return; // stop submit
    }
    
       const submitButton =
    $form.find(
        "button[type='submit']"
    );

submitButton
    .prop("disabled", true)
    .text("Submitting...");

let casePayload;

try {
    casePayload =
        buildCasePayload();
} catch (error) {
    console.error(
        "CAT: Case payload error:",
        error
    );

    alert(
        error &&
        error.message
            ? error.message
            : "The Case routing configuration " +
              "could not be prepared."
    );

    submitButton
        .prop("disabled", false)
        .text("Submit");

    return;
}

webapi.safeAjax({
            type: "POST",
            url: "/_api/incidents",
            contentType: "application/json",
            data: JSON.stringify(casePayload),
            processData: false,
success: async function (res, status, xhr) {
    const caseId = getCreatedRecordId(xhr);

    if (!caseId) {
        alert("Case created, but Case ID was not returned. Attachments could not be uploaded.");
        submitButton.prop("disabled", false).text("Submit");
        return;
    }

    try {
        await createForesightAssets(caseId);
        await createSosAssets(caseId);
        await createDigitalAuthAsset(caseId);
        await createDealerServicesPortalAssets(caseId);
        await createCatProductLinkAssets(caseId);
        await createVisionLinkAssets(caseId);
        await createSubscriptionAssetRecords(caseId);
        await createCustomerAdminAssets(caseId);
        await createRentalsAsset(caseId);
        if (getSelectedFiles().length > 0) {
            await uploadAllAttachments(caseId);
        }

        //alert("Case submitted successfully!");

        //Reset UI
        $form[0].reset();
        $("#file-previews").empty();
        filesArray = [];

        // Redirect to Case Summary
        window.location.href = "/request-summary?caseid=" + encodeURIComponent(caseId);
        
        // optional: reload to show Timeline notes if user is viewing the case
        // window.location.reload();

    } catch (ex) {
    console.error(
        "Post-case processing error:",
        ex
    );

    alert(
        "The Case was created, but one or more Asset records " +
        "or attachments could not be created."
    );
}

submitButton
    .prop("disabled", false)
    .text("Submit");
},


            error: function (xhr) {
                console.log("Status:", xhr.status);
                console.log("Response Text:", xhr.responseText);

                let message = xhr.responseText;

                try {
                    const parsed = JSON.parse(xhr.responseText);
                    message =
                        parsed.error?.message ||
                        parsed.error?.innererror?.message ||
                        xhr.responseText;
                } catch (e) {}

                alert("Something went wrong while submitting your request, and the support case was not created. Please try again.");

                submitButton.prop("disabled", false).text("Submit");
            }
        });
    });

    // Auto-select Product Technology from sessionStorage

// Auto-select Product Technology once CAT_GA_ProductID has resolved
    let catInitialSourceProductId = "";

    function autoSelectCustomProductFromResolvedId() {
        const resolvedProductId = (window.CAT_GA_ProductID || "").toLowerCase();

        if (resolvedProductId) {
            const dropdown = document.getElementById("productTech");
            const inputBox = document.getElementById("productInput");

            if (dropdown && inputBox) {
                const matchedOption = Array.from(dropdown.options).find(
                    (option) => option.value.toLowerCase() === resolvedProductId
                );

                if (matchedOption) {
                    dropdown.value = matchedOption.value;
                    inputBox.value = matchedOption.text;

                    dropdown.dispatchEvent(new Event("change", { bubbles: true }));
                    inputBox.dispatchEvent(new Event("change", { bubbles: true }));

                    applyDigitalMarketplaceRedirectRule();
                }
            }
        }

        catInitialSourceProductId = cleanGuid($("#productTech").val() || "");
    }

    document.addEventListener("catGaProductResolved", autoSelectCustomProductFromResolvedId);

/* -------------------------------------------
   FULL LOOKUP DROPDOWN (typing + filtering)
-------------------------------------------- */

(function () {
    const input = document.getElementById("productInput");
    const select = document.getElementById("productTech");
    const results = document.getElementById("productResults");
    const arrow = document.querySelector(".lookup-arrow");

    if (!input || !select || !results || !arrow) return;

    function showList(filterText = "") {
        results.innerHTML = "";
        results.style.display = "block";
        arrow.classList.add("open");

        const options = [...select.options].filter(opt => opt.value);

        const filtered = options.filter(opt =>
            opt.text.toLowerCase().includes(filterText.toLowerCase())
        );

        if (filtered.length === 0) {
            results.innerHTML = `<div class="lookup-item">No matching record found</div>`;
            return;
        }

        filtered.forEach(opt => {
            const div = document.createElement("div");
            div.className = "lookup-item";
            div.textContent = opt.text;

            div.addEventListener("click", function () {
                input.value = opt.text;
                select.value = opt.value;
                results.style.display = "none";
                arrow.classList.remove("open");

                input.dispatchEvent(new Event("input", { bubbles: true }));
            });

            results.appendChild(div);
        });
    }

    // Typing → filter list
    input.addEventListener("input", function () {
        const typedValue = input.value.trim();
        const matchingOption = [...select.options].find(opt => opt.text=== typedValue);

        if (!matchingOption) {
            select.value = "";
        }
        showList(typedValue);
    });

    // Clicking input → open full list
    input.addEventListener("focus", function () {
        showList("");
    });

    // Clicking arrow → toggle list
    arrow.addEventListener("click", function () {
        if (results.style.display === "block") {
            results.style.display = "none";
            arrow.classList.remove("open");
        } else {
            input.focus();
            showList("");
        }
    });

    // Hide list when clicking outside
    document.addEventListener("click", function (e) {
        if (!input.contains(e.target) &&
            !results.contains(e.target) &&
            !arrow.contains(e.target)) {
            results.style.display = "none";
            arrow.classList.remove("open");
        }
    });
})();

/* -------------------------------------------
   ISSUE TYPE LOOKUP (same behavior as product)
-------------------------------------------- */

(function () {
    const input = document.getElementById("issueTypeInput");
    const select = document.getElementById("issueType");
    const results = document.getElementById("issueTypeResults");
    const arrow = document.querySelector(".issue-arrow");

    if (!input || !select || !results || !arrow) return;

    function showList(filterText = "") {
        results.innerHTML = "";
        results.style.display = "block";
        arrow.classList.add("open");

        const options = [...select.options].filter(opt => opt.value);

        const filtered = options.filter(opt =>
            opt.text.toLowerCase().includes(filterText.toLowerCase())
        );

        if (filtered.length === 0) {
            results.innerHTML = `<div class="lookup-item">No matching record found</div>`;
            return;
        }

        filtered.forEach(opt => {
            const div = document.createElement("div");
            div.className = "lookup-item";
            div.textContent = opt.text;

          div.addEventListener("click", function () {
    input.value = opt.text;
    select.value = opt.value;
    results.style.display = "none";
    arrow.classList.remove("open");

    select.dispatchEvent(
        new Event("change", { bubbles: true })
    );
});

            results.appendChild(div);
        });
    }

    input.addEventListener("input", function () {
        showList(input.value.trim());
    });

    input.addEventListener("focus", function () {
        showList("");
    });

    arrow.addEventListener("click", function () {
        if (results.style.display === "block") {
            results.style.display = "none";
            arrow.classList.remove("open");
        } else {
            input.focus();
            showList("");
        }
    });

    document.addEventListener("click", function (e) {
        if (!input.contains(e.target) &&
            !results.contains(e.target) &&
            !arrow.contains(e.target)) {
            results.style.display = "none";
            arrow.classList.remove("open");
        }
    });
})();


/* -------------------------------------------
   DEALER LOOKUP (same behavior as product)
-------------------------------------------- */

(function () {
    const input = document.getElementById("dealerInput");
    const select = document.getElementById("dealer");
    const results = document.getElementById("dealerResults");
    const arrow = document.querySelector(".dealer-arrow");

    if (!input || !select || !results || !arrow) return;

    (function applyDefaultDealerFromCompany() {
        if (select.value) {
            return;
        }

        var defaultId = ($("#catDealerDefaultId").val() || "").trim();
        var defaultName = ($("#catDealerDefaultName").val() || "").trim();

        if (!defaultId || !defaultName) {
            return;
        }

        var matchExists = [...select.options].some(function (opt) {
            return opt.value === defaultId;
        });

        if (!matchExists) {
            return;
        }

        select.value = defaultId;
        input.value = defaultName;

        select.dispatchEvent(new Event("change", { bubbles: true }));
    })();

    function showList(filterText = "") {
        results.innerHTML = "";
        results.style.display = "block";
        arrow.classList.add("open");

        // ⭐ IMPORTANT: include first option ("Select Dealer")
          const options = [...select.options].filter(opt => opt.value);

        const filtered = options.filter(opt =>
            opt.text.toLowerCase().includes(filterText.toLowerCase())
        );

        if (filtered.length === 0) {
            results.innerHTML = `<div class="lookup-item">No matching record found</div>`;
            return;
        }

        filtered.forEach(opt => {
            const div = document.createElement("div");
            div.className = "lookup-item";
            div.textContent = opt.text;

            div.addEventListener("click", function () {
                input.value = opt.text;
                select.value = opt.value;
                results.style.display = "none";
                arrow.classList.remove("open");
            });

            results.appendChild(div);
        });
    }

    input.addEventListener("input", function () {
        showList(input.value.trim());
    });

    input.addEventListener("focus", function () {
        showList("");
    });

    arrow.addEventListener("click", function () {
        if (results.style.display === "block") {
            results.style.display = "none";
            arrow.classList.remove("open");
        } else {
            input.focus();
            showList("");
        }
    });

    document.addEventListener("click", function (e) {
        if (!input.contains(e.target) &&
            !results.contains(e.target) &&
            !arrow.contains(e.target)) {
            results.style.display = "none";
            arrow.classList.remove("open");
        }
    });
})();

function loadProductFormConfig() {
    const configElements =
        document.querySelectorAll(
            "#catProductFormConfigurations " +
            ".cat-product-config-record"
        );

    const combinedConfig = {};

    if (!configElements.length) {
        console.error(
            "CAT: No product configuration records were found."
        );

        return combinedConfig;
    }

    configElements.forEach(function (configElement) {
        const configKey =
            configElement.getAttribute("data-config-key") ||
            "Unknown configuration";

        const rawConfig =
            (configElement.value || "").trim();

        if (!rawConfig) {
            console.error(
                "CAT: Empty product configuration:",
                configKey
            );

            return;
        }

        try {
            const parsedConfig =
                JSON.parse(rawConfig);

            Object.keys(parsedConfig).forEach(
                function (productKey) {
                    const normalizedProductKey =
                        productKey.trim().toLowerCase();

                    combinedConfig[normalizedProductKey] =
                        parsedConfig[productKey];
                }
            );
        } catch (error) {
            console.error(
                "CAT: Invalid JSON in configuration:",
                configKey,
                error
            );
        }
    });

    console.log(
        "CAT: Product configurations loaded:",
        Object.keys(combinedConfig)
    );

    return combinedConfig;
}

const PRODUCT_FORM_CONFIG =
    loadProductFormConfig();

const FORESIGHT_FIELD_RULES = {
    "100000041": {
        foresightSerialNumberFieldWrapper: {
            inputId: "foresightSerialNumberInput",
            required: true
        },
        foresightCcidFieldWrapper: {
            inputId: "foresightCcidInput",
            required: false
        },
        urlFieldWrapper: {
            inputId: "urlInput",
            required: true
        }
    },

    "100000010": {
        foresightSerialNumberFieldWrapper: {
            inputId: "foresightSerialNumberInput",
            required: false
        },
        urlFieldWrapper: {
            inputId: "urlInput",
            required: true
        }
    },

    "100000014": {
        foresightCcidFieldWrapper: {
            inputId: "foresightCcidInput",
            required: true
        },
        foresightUserEmailFieldWrapper: {
            inputId: "foresightUserEmailInput",
            required: true
        }
    },

    "100000008": {
        urlFieldWrapper: {
            inputId: "urlInput",
            required: true
        },
        foresightIssueDateTimeFieldWrapper: {
            inputId: "foresightIssueDateTimeInput",
            required: false
        }
    },

    "100000009": {
        foresightSerialNumberFieldWrapper: {
            inputId: "foresightSerialNumberInput",
            required: false
        },
        foresightCcidFieldWrapper: {
            inputId: "foresightCcidInput",
            required: false
        },
        foresightUserEmailFieldWrapper: {
            inputId: "foresightUserEmailInput",
            required: false
        },
        urlFieldWrapper: {
            inputId: "urlInput",
            required: true
        }
    }
};

const SOS_FIELD_RULES = {
    /* Password Reset */
    "100000033": {},

    /* Application Access */
    "100000029": {
        sosUserProfileFieldWrapper: {
            inputId: "sosUserProfileInput",
            required: true
        }
    },

    /* Transfer an Asset */
    "100000039": {
        sosSerialNumberFieldWrapper: {
            inputId: "sosSerialNumberInput",
            required: true
        }
    },

    /* Reserve Sample Numbers */
    "100000038": {
        sosNumberOfSamplesFieldWrapper: {
            inputId: "sosNumberOfSamplesInput",
            required: true
        }
    },

    /* Request an Instrument File Parser */
    "100000035": {
        sosInstrumentVendorFieldWrapper: {
            inputId: "sosInstrumentVendorInput",
            required: true
        },
        sosInstrumentModelFieldWrapper: {
            inputId: "sosInstrumentModelInput",
            required: true
        },
        sosTestAnalysisFieldWrapper: {
            inputId: "sosTestAnalysisInput",
            required: true
        }
    },

    /* New Fluid (Brand, Type, Weight) Added */
    "100000032": {
        sosFluidBrandFieldWrapper: {
            inputId: "sosFluidBrandInput",
            required: true
        },
        sosFluidTypeFieldWrapper: {
            inputId: "sosFluidTypeInput",
            required: false
        },
        sosFluidWeightFieldWrapper: {
            inputId: "sosFluidWeightInput",
            required: false
        }
    },

    /* Request Cat Model Template */
    "100000036": {
        sosCatModelFieldWrapper: {
            inputId: "sosCatModelInput",
            required: true
        }
    },

    /* Issue with Reporting */
    "100000031": {},

    /* Data Sync */
    "100000030": {
        sosSerialNumberFieldWrapper: {
            inputId: "sosSerialNumberInput",
            required: true
        }
    },

    /* Request a Wear Table */
    "100000034": {
        sosCatModelFieldWrapper: {
            inputId: "sosCatModelInput",
            required: true
        },
        sosSerialPrefixFieldWrapper: {
            inputId: "sosSerialPrefixInput",
            required: true
        },
        sosComponentFieldWrapper: {
            inputId: "sosComponentInput",
            required: true
        }
    },

    /* Wear Table Issue */
    "100000040": {
        sosCatModelFieldWrapper: {
            inputId: "sosCatModelInput",
            required: true
        },
        sosSerialPrefixFieldWrapper: {
            inputId: "sosSerialPrefixInput",
            required: true
        },
        sosComponentFieldWrapper: {
            inputId: "sosComponentInput",
            required: true
        }
    },

    /* Data is Incorrect or Missing */
    "100000010": {
        sosSerialNumberFieldWrapper: {
            inputId: "sosSerialNumberInput",
            required: false
        },
        sosTestAnalysisFieldWrapper: {
            inputId: "sosTestAnalysisInput",
            required: false
        }
    },

    /* Request Training */
    "100000037": {},

    /* Something Else */
    "100000009": {}
};

const DIGITAL_AUTH_FIELD_RULES = {
    /* Access Issue */
    "100000014": {
        ccidRequired: false
    },

    /* Data is Incorrect or Missing */
    "100000010": {
        ccidRequired: false,
        showDataPoint: true
    },

    /* Declined Authorization */
    "100000020": {
        ccidRequired: true
    },

    /* Submit Feedback */
    "100000006": {
        ccidRequired: false
    },

    /* Subscription Cancellation Request */
    "100000021": {
        ccidRequired: false
    },

    /* Website/Application Issue */
    "100000008": {
        ccidRequired: false
    },

    /* Something Else */
    "100000009": {
        ccidRequired: false
    }
};

const DEALER_FIELD_RULES = {
    /* Access Issue */
    "100000014": {
        dealerErrorMessageFieldWrapper: {
            inputId: "dealerErrorMessageInput",
            required: true
        }
    },

    /* Request for Site Content */
    "100000026": {
        dealerSiteUpdateFieldWrapper: {
            inputId: "dealerSiteUpdateInput",
            required: true
        }
    },

    /* Website/Application Issue */
    "100000008": {
        dealerErrorMessageFieldWrapper: {
            inputId: "dealerErrorMessageInput",
            required: false
        }
    }

    /* Submit Feedback (100000006) and Something Else (100000009)
       show no extra fields */
};

function isCatDealerSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return (
       productName === "catdealer.com" ||
       productName === "cat dealer.com"
    );
}

function resetDealerConditionalFields() {
    const fieldIds = [
        "dealerErrorMessageFieldWrapper",
        "dealerSiteUpdateFieldWrapper"
    ];

    fieldIds.forEach(function (wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;

        wrapper.classList.remove("show-field");
        wrapper.classList.remove("error");

        const input = wrapper.querySelector("input, textarea, select");
        if (input) {
            input.removeAttribute("required");
            input.removeAttribute("aria-required");
            input.value = "";
            input.classList.remove("error-field");
        }

        wrapper.querySelectorAll(".field-error-message")
            .forEach(function (m) { m.remove(); });

        const marker = wrapper.querySelector("label > .req");
        if (marker) marker.remove();

        const results = wrapper.querySelector(".lookup-results");
        if (results) {
            results.style.display = "none";
            results.innerHTML = "";
        }

        const arrow = wrapper.querySelector(".lookup-arrow");
        if (arrow) arrow.classList.remove("open");
    });
}

function showDealerField(wrapperId, fieldRule) {
    const wrapper = document.getElementById(wrapperId);
    const input = document.getElementById(fieldRule.inputId);
    if (!wrapper || !input) return;

    wrapper.classList.add("show-field");
    if (!fieldRule.required) return;

    input.setAttribute("required", "required");
    input.setAttribute("aria-required", "true");

    const label = wrapper.querySelector("label");
    if (label && !label.querySelector(".req")) {
        label.insertAdjacentHTML(
            "beforeend",
            ' <span class="req">*</span>'
        );
    }
}

function applyDealerFieldRules() {
    resetDealerConditionalFields();
    if (!isCatDealerSelected()) return;

    const issueTypeValue = ($("#issueType").val() || "").trim();
    const issueRule = DEALER_FIELD_RULES[issueTypeValue];
    if (!issueRule) return;

    Object.keys(issueRule).forEach(function (wrapperId) {
        showDealerField(wrapperId, issueRule[wrapperId]);
    });
}

$(document).on("change", "#productTech, #issueType", applyDealerFieldRules);
$(document).on("input change blur", "#productInput", applyDealerFieldRules);

const INSPECT_FIELD_RULES = {
    /* Access Issue */
    "100000014": {
        inspectNumberFieldWrapper: { inputId: "inspectNumberInput", required: false },
        inspectTypeFieldWrapper:   { inputId: "inspectTypeInput",   required: false }
    },

    /* Inspection Form */
    "100000044": {
        inspectNumberFieldWrapper:         { inputId: "inspectNumberInput", required: false },
        inspectTypeFieldWrapper:           { inputId: "inspectTypeInput",   required: false },
        inspectMultipleAssetsFieldWrapper: { inputId: "inspectMultipleAssetsYes", required: true, isRadio: true }
    },

    /* Inspection Report */
    "100000045": {
        inspectNumberFieldWrapper:         { inputId: "inspectNumberInput", required: false },
        inspectTypeFieldWrapper:           { inputId: "inspectTypeInput",   required: false },
        inspectMultipleAssetsFieldWrapper: { inputId: "inspectMultipleAssetsYes", required: true, isRadio: true }
    },

    /* Website/Application Issue */
    "100000008": {
        inspectNumberFieldWrapper:         { inputId: "inspectNumberInput", required: false },
        inspectTypeFieldWrapper:           { inputId: "inspectTypeInput",   required: false },
        inspectMultipleAssetsFieldWrapper: { inputId: "inspectMultipleAssetsYes", required: true, isRadio: true }
    },

    /* Something Else */
    "100000009": {
        inspectNumberFieldWrapper:         { inputId: "inspectNumberInput", required: false },
        inspectTypeFieldWrapper:           { inputId: "inspectTypeInput",   required: false },
        inspectMultipleAssetsFieldWrapper: { inputId: "inspectMultipleAssetsYes", required: true, isRadio: true }
    }

    /* Submit Feedback (100000006) and User Account Setup (100000007)
       show no extra fields */
};

function isCatInspectSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return (
        productName === "cat inspect" ||
        productName === "cat® inspect"
    );
}

function resetInspectConditionalFields() {
    const fieldIds = [
        "inspectNumberFieldWrapper",
        "inspectTypeFieldWrapper",
        "inspectMultipleAssetsFieldWrapper"
    ];

    fieldIds.forEach(function (wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;

        wrapper.classList.remove("show-field");
        wrapper.classList.remove("error");

        wrapper
            .querySelectorAll("input, textarea, select")
            .forEach(function (control) {
                control.removeAttribute("required");
                control.removeAttribute("aria-required");
                control.classList.remove("error-field");

                if (control.type === "radio" || control.type === "checkbox") {
                    control.checked = false;
                } else {
                    control.value = "";
                }
            });

        wrapper.querySelectorAll(".field-error-message")
            .forEach(function (m) { m.remove(); });

        const marker = wrapper.querySelector("label > .req");
        if (marker) marker.remove();

        const results = wrapper.querySelector(".lookup-results");
        if (results) {
            results.style.display = "none";
            results.innerHTML = "";
        }

        const arrow = wrapper.querySelector(".lookup-arrow");
        if (arrow) arrow.classList.remove("open");
    });
}

function showInspectField(wrapperId, fieldRule) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    wrapper.classList.add("show-field");
    if (!fieldRule.required) return;

    if (fieldRule.isRadio) {
        wrapper
            .querySelectorAll("input[type='radio']")
            .forEach(function (radio) {
                radio.setAttribute("required", "required");
                radio.setAttribute("aria-required", "true");
            });
    } else {
        const input = document.getElementById(fieldRule.inputId);
        if (input) {
            input.setAttribute("required", "required");
            input.setAttribute("aria-required", "true");
        }
    }

    const label = wrapper.querySelector("label");
    if (label && !label.querySelector(".req")) {
        label.insertAdjacentHTML(
            "beforeend",
            ' <span class="req">*</span>'
        );
    }
}

function applyInspectFieldRules() {
    resetInspectConditionalFields();
    if (!isCatInspectSelected()) return;

    const issueTypeValue = ($("#issueType").val() || "").trim();
    const issueRule = INSPECT_FIELD_RULES[issueTypeValue];
    if (!issueRule) return;

    Object.keys(issueRule).forEach(function (wrapperId) {
        showInspectField(wrapperId, issueRule[wrapperId]);
    });
}

$(document).on("change", "#productTech, #issueType", applyInspectFieldRules);
$(document).on("input change blur", "#productInput", applyInspectFieldRules);

/* =====================================================
   CAT RENTALS FIELD RULES
===================================================== */

const RENTALS_FIELD_RULES = {
    /* Dealer/Rental Locator */
    "100000000": {
        rentalsJobsiteAddressFieldWrapper: { inputId: "rentalsJobsiteAddressInput", required: true }
    },
    /* Equipment Pickup/Delivery */
    "100000001": {
        rentalsJobsiteAddressFieldWrapper: { inputId: "rentalsJobsiteAddressInput", required: true }
    },
    /* Notifications/Alerts */
    "100000002": {
        rentalsUrlFieldWrapper: { inputId: "rentalsUrlInput", required: true }
    },
    /* Rental Inquiry */
    "100000003": {
        rentalsJobsiteAddressFieldWrapper: { inputId: "rentalsJobsiteAddressInput", required: true },
        rentalsEquipmentTypeFieldWrapper:  { inputId: "rentalsEquipmentTypeInput",  required: true },
        rentalsProductFamilyFieldWrapper:  { inputId: "rentalsProductFamilyInput",  required: true },
        rentalsGeneratorSizeFieldWrapper:  { inputId: "rentalsGeneratorSizeInput",  required: true },
        rentalsStartDateFieldWrapper:      { inputId: "rentalsStartDateInput",      required: true },
        rentalsEndDateFieldWrapper:        { inputId: "rentalsEndDateInput",        required: true }
    },
    /* Service Request — Jobsite Address sirf Rented pe */
    "100000004": {
        rentalsRentedOwnedFieldWrapper: { inputId: "rentalsRentedOwnedRented", required: true, isRadio: true }
    },
    /* Shopping Cart */
    "100000005": {
        rentalsUrlFieldWrapper: { inputId: "rentalsUrlInput", required: true }
    },
    /* User Account Setup */
    "100000007": {
        rentalsUrlFieldWrapper: { inputId: "rentalsUrlInput", required: true }
    },
    /* Website/Application Issue */
    "100000008": {
        rentalsUrlFieldWrapper: { inputId: "rentalsUrlInput", required: true }
    },
    /* Something Else */
    "100000009": {
        rentalsUrlFieldWrapper: { inputId: "rentalsUrlInput", required: false }
    },
    /* Data is Incorrect or Missing */
    "100000010": {
        rentalsUrlFieldWrapper:             { inputId: "rentalsUrlInput",             required: true },
        rentalsContractInvoiceFieldWrapper: { inputId: "rentalsContractInvoiceInput", required: false }
    }
    /* Submit Feedback (100000006) me koi extra field nahi */

    
};

const RENTALS_FIELD_WRAPPERS = [
    "rentalsUrlFieldWrapper",
    "rentalsRentedOwnedFieldWrapper",
    "rentalsJobsiteAddressFieldWrapper",
    "rentalsEquipmentTypeFieldWrapper",
    "rentalsProductFamilyFieldWrapper",
    "rentalsGeneratorSizeFieldWrapper",
    "rentalsStartDateFieldWrapper",
    "rentalsEndDateFieldWrapper",
    "rentalsContractInvoiceFieldWrapper"
];

function isCatRentalsSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return (
        productName === "cat rentals" ||
        productName === "cat rentals℠"
    );
}

function resetRentalsConditionalFields() {
    RENTALS_FIELD_WRAPPERS.forEach(function (wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;

        wrapper.classList.remove("show-field");
        wrapper.classList.remove("error");

        wrapper
            .querySelectorAll("input, textarea, select")
            .forEach(function (control) {
                control.removeAttribute("required");
                control.removeAttribute("aria-required");
                control.classList.remove("error-field");

                if (control.type === "radio" || control.type === "checkbox") {
                    control.checked = false;
                } else {
                    control.value = "";
                }
            });

        wrapper.querySelectorAll(".field-error-message")
            .forEach(function (m) { m.remove(); });

        const marker = wrapper.querySelector("label > .req");
        if (marker) marker.remove();

        const results = wrapper.querySelector(".lookup-results");
        if (results) {
            results.style.display = "none";
            results.innerHTML = "";
        }

        const arrow = wrapper.querySelector(".lookup-arrow");
        if (arrow) arrow.classList.remove("open");
    });
}

function showRentalsField(wrapperId, fieldRule) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    wrapper.classList.add("show-field");
    if (!fieldRule.required) return;

    if (fieldRule.isRadio) {
        wrapper
            .querySelectorAll("input[type='radio']")
            .forEach(function (radio) {
                radio.setAttribute("required", "required");
                radio.setAttribute("aria-required", "true");
            });
    } else {
        const input = document.getElementById(fieldRule.inputId);
        if (input) {
            input.setAttribute("required", "required");
            input.setAttribute("aria-required", "true");
        }
    }

    const label = wrapper.querySelector("label");
    if (label && !label.querySelector(".req")) {
        label.insertAdjacentHTML("beforeend", ' <span class="req">*</span>');
    }
}

function applyRentalsRentedOwnedRules() {
    const wrapper = document.getElementById("rentalsRentedOwnedFieldWrapper");
    if (!wrapper || !wrapper.classList.contains("show-field")) return;

    const selected = $("input[name='rentalsRentedOwned']:checked").val() || "";

    if (selected === "Owned") {
        const overlay = document.getElementById("rentalsOwnedRedirectOverlay");
        if (overlay) {
            overlay.classList.add("show-modal");
        }
        return;
    }

    if (selected === "Rented") {
        showRentalsField("rentalsJobsiteAddressFieldWrapper", {
            inputId: "rentalsJobsiteAddressInput",
            required: true
        });
    } else {
        const jobsiteWrapper =
            document.getElementById("rentalsJobsiteAddressFieldWrapper");

        if (jobsiteWrapper) {
            jobsiteWrapper.classList.remove("show-field");

            const jobsiteInput =
                document.getElementById("rentalsJobsiteAddressInput");

            if (jobsiteInput) {
                jobsiteInput.value = "";
                jobsiteInput.removeAttribute("required");
                jobsiteInput.removeAttribute("aria-required");
            }

            const marker = jobsiteWrapper.querySelector("label > .req");
            if (marker) marker.remove();
        }
    }
}

function applyRentalsFieldRules() {
    resetRentalsConditionalFields();
    if (!isCatRentalsSelected()) return;

    const issueTypeValue = ($("#issueType").val() || "").trim();
    const issueRule = RENTALS_FIELD_RULES[issueTypeValue];

    if (issueRule) {
        Object.keys(issueRule).forEach(function (wrapperId) {
            showRentalsField(wrapperId, issueRule[wrapperId]);
        });
    }

    applyRentalsRentedOwnedRules();
}

$(document).on("change", "#productTech, #issueType", applyRentalsFieldRules);
$(document).on("input change blur", "#productInput", applyRentalsFieldRules);
$(document).on("change", "input[name='rentalsRentedOwned']", applyRentalsRentedOwnedRules);


$(document).on("click", "#rentalsOwnedRedirectOk", function() {
    try {
        sessionStorage.removeItem("CAT_GA_ProductID");
    } catch (e) {}

    window.CAT_GA_ProductID = "";

    $("#productTech").val("");
    $("#productInput").val("");
    resetRentalsConditionalFields();

    window.location.href = "https://www.cat.com/en_US.html";
});

$(document).on("click", "#rentalsOwnedRedirectOverlay", function (e) {
    if (e.target !== this) return;

    $(this).removeClass("show-modal");
    $("input[name='rentalsRentedOwned']").prop("checked", false);
});

/* =====================================================
   CAT RENTALS DEALER/INTERNAL FIELD RULES
===================================================== */
const RENTALS_DEALER_ALWAYS_SHOWN_WRAPPERS = [
    "rentalsDealerOnBehalfFieldWrapper",
    "rentalsDealerRequestedForFieldWrapper"
];

const RENTALS_DEALER_CONDITIONAL_WRAPPERS = [
    "rentalsDealerRequestLeadIdFieldWrapper",
    "rentalsDealerAssetIdFieldWrapper",
    "rentalsUrlFieldWrapper",
    "rentalsContractInvoiceFieldWrapper"
];

const RENTALS_DEALER_FIELD_WRAPPERS =
    RENTALS_DEALER_ALWAYS_SHOWN_WRAPPERS.concat(
        RENTALS_DEALER_CONDITIONAL_WRAPPERS
    );

function isDealerInternalPersona() {
    const flag = document.getElementById("catPersonaFlag");
    const value = (flag ? flag.value : "").trim().toLowerCase();
    return value === "dealer" || value === "internal";
}

/* Dealer/Internal now owns URL + Contract/Invoice fully for its
   own 9 issue types — it no longer inherits Customer's rules,
   which is what caused the Shopping Cart bug. */
const RENTALS_DEALER_FIELD_RULES = {
    /* Notification/Alerts — confirmed from your screenshot */
    "100000002": {
        rentalsUrlFieldWrapper: { inputId: "rentalsUrlInput", required: true }
    },

    /* Requests/Leads — confirmed from your screenshot */
    "TODO_REQUESTS_LEADS_VALUE": {
        rentalsUrlFieldWrapper: { inputId: "rentalsUrlInput", required: true },
        rentalsDealerRequestLeadIdFieldWrapper: {
            inputId: "rentalsDealerRequestLeadIdInput",
            required: true
        }
    },

    /* Shopping Cart — confirmed nothing extra */
    "100000005": {},

    /* Telematics Data Issue/Inquiry — confirmed, URL not required */
    "TODO_TELEMATICS_VALUE": {
        rentalsDealerAssetIdFieldWrapper: {
            inputId: "rentalsDealerAssetIdInput",
            required: true
        }
    },

    /* Data is Incorrect or Missing — carried over, already working */
    "100000010": {
        rentalsUrlFieldWrapper: { inputId: "rentalsUrlInput", required: true },
        rentalsContractInvoiceFieldWrapper: { inputId: "rentalsContractInvoiceInput", required: false }
    },

    /* Something Else — carried over, already working */
    "100000009": {
        rentalsDealerAssetIdFieldWrapper: {
            inputId: "rentalsDealerAssetIdInput",
            required: false
        }
    },

    /* PENDING — defaulted to "nothing extra" for now so they can't
       block submission with a wrong required field. Send a clear
       zoomed screenshot of these 3 columns (like your last one) and
       I'll fill in the real behavior:
       "TODO_AUTHORING_VALUE": {},
       "100000007": {}, // User Account Setup
       "100000008": {}  // Website/Application Issue
    */
};

function resetRentalsDealerConditionalFields() {
    RENTALS_DEALER_FIELD_WRAPPERS.forEach(function (wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;

        wrapper.classList.remove("show-field");
        wrapper.classList.remove("error");

        wrapper
            .querySelectorAll("input, textarea, select")
            .forEach(function (control) {
                control.removeAttribute("required");
                control.removeAttribute("aria-required");
                control.classList.remove("error-field");

                if (control.type === "radio" || control.type === "checkbox") {
                    control.checked = false;
                } else {
                    control.value = "";
                }
            });

        wrapper.querySelectorAll(".field-error-message")
            .forEach(function (m) { m.remove(); });

        const marker = wrapper.querySelector("label > .req");
        if (marker) marker.remove();
    });
}

function showRentalsDealerField(wrapperId, fieldRule) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    wrapper.classList.add("show-field");
    if (!fieldRule || !fieldRule.required) return;

    const input = document.getElementById(fieldRule.inputId);
    if (input) {
        input.setAttribute("required", "required");
        input.setAttribute("aria-required", "true");
    }

    const label = wrapper.querySelector("label");
    if (label && !label.querySelector(".req")) {
        label.insertAdjacentHTML("beforeend", ' <span class="req">*</span>');
    }
}

function applyRentalsDealerFieldRules() {
    if(!isDealerInternalPersona()) return;
    resetRentalsDealerConditionalFields();

    if (!isCatRentalsSelected()) return;

    RENTALS_DEALER_ALWAYS_SHOWN_WRAPPERS.forEach(function (wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        if (wrapper) {
            wrapper.classList.add("show-field");
        }
    });

    const issueTypeValue = ($("#issueType").val() || "").trim();
    const issueRule = RENTALS_DEALER_FIELD_RULES[issueTypeValue];
    if (!issueRule) return;

    Object.keys(issueRule).forEach(function (wrapperId) {
        showRentalsDealerField(wrapperId, issueRule[wrapperId]);
    });
}

$(document).on("change", "#productTech, #issueType", applyRentalsDealerFieldRules);
$(document).on("input change blur", "#productInput", applyRentalsDealerFieldRules);

/* =====================================================
   CAT CENTRAL DEALER/INTERNAL FIELD RULES
===================================================== */
const CENTRAL_DEALER_FIELD_WRAPPERS = [
    "centralEnvironmentFieldWrapper",
    "centralDateTimeFieldWrapper",
    "centralTimeZoneFieldWrapper",
    "centralInfraChangesFieldWrapper",
    "appVersionFieldWrapper",
    "customerEmailFieldWrapper",
    "centralCustomerCwsIdFieldWrapper",
    "centralMultipleUsersFieldWrapper"
];

/* Group A from your matrix — all 8 fields required.
   Everything else in the dropdown (Group B) gets none. */
const CENTRAL_DEALER_REQUIRED_ISSUE_TYPES = [
    "100000014", // Access Issue
    "100000022", // Order Issue
    "100000024", // Payment Issue
    "100000025"  // Promo Codes
];

function isCatCentralSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return (
        productName === "cat central" ||
        productName === "cat® central"
    );
}

function resetCentralDealerConditionalFields() {
    CENTRAL_DEALER_FIELD_WRAPPERS.forEach(function (wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;

        wrapper.classList.remove("show-field");
        wrapper.classList.remove("error");

        wrapper
            .querySelectorAll("input, textarea, select")
            .forEach(function (control) {
                control.removeAttribute("required");
                control.removeAttribute("aria-required");
                control.classList.remove("error-field");

                if (control.type === "radio" || control.type === "checkbox") {
                    control.checked = false;
                } else {
                    control.value = "";
                }
            });

        wrapper.querySelectorAll(".field-error-message")
            .forEach(function (m) { m.remove(); });

        const marker = wrapper.querySelector("label > .req");
        if (marker) marker.remove();
    });
}

function showCentralDealerField(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    wrapper.classList.add("show-field");

    const radios = wrapper.querySelectorAll("input[type='radio']");

    if (radios.length) {
        radios.forEach(function (radio) {
            radio.setAttribute("required", "required");
            radio.setAttribute("aria-required", "true");
        });
    } else {
        const control = wrapper.querySelector("input, select, textarea");
        if (control) {
            control.setAttribute("required", "required");
            control.setAttribute("aria-required", "true");
        }
    }

    const label = wrapper.querySelector("label");
    if (label && !label.querySelector(".req")) {
        label.insertAdjacentHTML("beforeend", ' <span class="req">*</span>');
    }
}

function applyCentralDealerFieldRules() {
    if (!isDealerInternalPersona()) return;

    resetCentralDealerConditionalFields();

    if (!isCatCentralSelected()) return;

    const issueTypeValue = ($("#issueType").val() || "").trim();

    if (CENTRAL_DEALER_REQUIRED_ISSUE_TYPES.indexOf(issueTypeValue) !== -1) {
        CENTRAL_DEALER_FIELD_WRAPPERS.forEach(function (wrapperId) {
            showCentralDealerField(wrapperId);
        });
    }
}

$(document).on("change", "#productTech, #issueType", applyCentralDealerFieldRules);
$(document).on("input change blur", "#productInput", applyCentralDealerFieldRules);

/* =====================================================
   CAT CENTRAL CUSTOMER FIELD RULES
===================================================== */
function isCustomerOrGuestPersona() {
    const flag = document.getElementById("catPersonaFlag");
    const value = (flag ? flag.value : "").trim().toLowerCase();
    return value === "customer" || value === "guest";
}

const CENTRAL_CUSTOMER_FIELD_WRAPPERS = [
    "centralCustomerAssetIdFieldWrapper",
    "centralCustomerOrderNumberFieldWrapper"
];

/* Empty for now — Machine Information / Order Assistance /
   Quote-Purchase codes aren't available yet. Once you have
   them, add entries like:
   "TODO_MACHINE_INFORMATION_VALUE": {
       centralCustomerAssetIdFieldWrapper: { inputId: "centralCustomerAssetIdInput", required: true }
   },
   "TODO_ORDER_ASSISTANCE_VALUE": {
       centralCustomerOrderNumberFieldWrapper: { inputId: "centralCustomerOrderNumberInput", required: true }
   },
   "TODO_QUOTE_PURCHASE_VALUE": {
       centralCustomerOrderNumberFieldWrapper: { inputId: "centralCustomerOrderNumberInput", required: true }
   }
*/
const CENTRAL_CUSTOMER_FIELD_RULES = {};

function resetCentralCustomerConditionalFields() {
    CENTRAL_CUSTOMER_FIELD_WRAPPERS.forEach(function (wrapperId) {
        const wrapper = document.getElementById(wrapperId);
        if (!wrapper) return;

        wrapper.classList.remove("show-field");
        wrapper.classList.remove("error");

        wrapper
            .querySelectorAll("input, textarea, select")
            .forEach(function (control) {
                control.removeAttribute("required");
                control.removeAttribute("aria-required");
                control.classList.remove("error-field");
                control.value = "";
            });

        wrapper.querySelectorAll(".field-error-message")
            .forEach(function (m) { m.remove(); });

        const marker = wrapper.querySelector("label > .req");
        if (marker) marker.remove();
    });
}

function showCentralCustomerField(wrapperId, fieldRule) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    wrapper.classList.add("show-field");
    if (!fieldRule || !fieldRule.required) return;

    const input = document.getElementById(fieldRule.inputId);
    if (input) {
        input.setAttribute("required", "required");
        input.setAttribute("aria-required", "true");
    }

    const label = wrapper.querySelector("label");
    if (label && !label.querySelector(".req")) {
        label.insertAdjacentHTML("beforeend", ' <span class="req">*</span>');
    }
}

function applyCentralCustomerFieldRules() {
    if (!isCustomerOrGuestPersona()) return;

    resetCentralCustomerConditionalFields();

    if (!isCatCentralSelected()) return;

    const issueTypeValue = ($("#issueType").val() || "").trim();
    const issueRule = CENTRAL_CUSTOMER_FIELD_RULES[issueTypeValue];
    if (!issueRule) return;

    Object.keys(issueRule).forEach(function (wrapperId) {
        showCentralCustomerField(wrapperId, issueRule[wrapperId]);
    });
}

$(document).on("change", "#productTech, #issueType", applyCentralCustomerFieldRules);
$(document).on("input change blur", "#productInput", applyCentralCustomerFieldRules);

const INTEGRATED_PROCUREMENT_INCIDENT_TYPES = [
    "100000047",
    "100000048",
    "100000049",
    "100000050",
    "100000051"
];

const INTEGRATED_PROCUREMENT_REQUEST_TYPES = [
    "100000046",
    "100000052",
    "100000053",
    "100000054",
    "100000009"
];

function isIntegratedProcurementSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return (
        productName === "cat integrated procurement" ||
        productName === "cat® integrated procurement"
    );
}

const INTEGRATED_PROCUREMENT_FIELDS = [
    {
        wrapperId: "environmentFieldWrapper"
    },
    {
        wrapperId: "ipTransactionTypeFieldWrapper"
    },
    {
        wrapperId: "ipMultipleCustomersFieldWrapper"
    },
    {
        wrapperId: "ipCustomerFieldWrapper"
    },
    {
        wrapperId: "ipProfileFieldWrapper"
    },
    {
        wrapperId: "impactedCwsFieldWrapper"
    },
    {
        wrapperId: "impactedDcnFieldWrapper"
    },
    {
        wrapperId: "impactedUsernameFieldWrapper"
    },
    {
        wrapperId: "ipIssueDateTimeFieldWrapper"
    },
    {
        wrapperId: "ipIntermittentFieldWrapper"
    },
    {
        wrapperId: "ipPartNumberSpecificFieldWrapper"
    },
    {
        wrapperId: "ipPartNumberFieldWrapper"
    },
    {
        wrapperId: "ipOtherNetworkIssuesFieldWrapper"
    },
    {
        wrapperId: "ipInvoiceNumberFieldWrapper"
    }
];
function setIntegratedProcurementRequired(
    wrapper,
    required
) {
    if (!wrapper) {
        return;
    }

    const controls = Array.from(
        wrapper.querySelectorAll(
            "input, textarea, select"
        )
    ).filter(function (control) {
        return control.type !== "hidden";
    });

    controls.forEach(function (control) {
        control.removeAttribute("required");
        control.removeAttribute("aria-required");
    });

    const existingMarker =
        wrapper.querySelector("label > .req");

    if (existingMarker) {
        existingMarker.remove();
    }

    if (!required) {
        return;
    }

    controls.forEach(function (control) {
        control.setAttribute("required", "required");
        control.setAttribute("aria-required", "true");
    });

    const label =
        wrapper.querySelector("label");

    if (label && !label.querySelector(".req")) {
        label.insertAdjacentHTML(
            "beforeend",
            ' <span class="req">*</span>'
        );
    }
}
function showIntegratedProcurementField(
    wrapperId,
    required
) {
    const wrapper =
        document.getElementById(wrapperId);

    if (!wrapper) {
        return;
    }

    wrapper.classList.add("show-field");

    setIntegratedProcurementRequired(
        wrapper,
        required
    );
}

function resetIntegratedProcurementFields() {
    INTEGRATED_PROCUREMENT_FIELDS.forEach(
        function (field) {
            const wrapper =
                document.getElementById(
                    field.wrapperId
                );

            if (!wrapper) {
                return;
            }

            wrapper.classList.remove("show-field");
            wrapper.classList.remove("error");

            wrapper
                .querySelectorAll(
                    ".field-error-message"
                )
                .forEach(function (message) {
                    message.remove();
                });

            const requiredMarker =
                wrapper.querySelector(
                    "label > .req"
                );

            if (requiredMarker) {
                requiredMarker.remove();
            }

            wrapper
                .querySelectorAll(
                    "input, textarea, select"
                )
                .forEach(function (control) {
                    control.removeAttribute(
                        "required"
                    );

                    control.removeAttribute(
                        "aria-required"
                    );

                    control.classList.remove(
                        "error-field"
                    );

                    if (
                        control.type === "radio" ||
                        control.type === "checkbox"
                    ) {
                        control.checked = false;
                    } else {
                        control.value = "";
                    }
                });

            const results =
                wrapper.querySelector(
                    ".lookup-results"
                );

            if (results) {
                results.style.display = "none";
                results.innerHTML = "";
            }

            const arrow =
                wrapper.querySelector(
                    ".lookup-arrow"
                );

            if (arrow) {
                arrow.classList.remove("open");
            }
        }
    );
}
function applyIntegratedProcurementDependencies() {
    if (!isIntegratedProcurementSelected()) {
        return;
    }

    const issueTypeValue =
        ($("#issueType").val() || "").trim();

    const isIncidentType =
        INTEGRATED_PROCUREMENT_INCIDENT_TYPES.includes(
            issueTypeValue
        );

    if (!isIncidentType) {
        return;
    }

    const partNumberSpecific =
        $(
            'input[name="ipPartNumberSpecific"]:checked'
        ).val() || "";

    const partNumberWrapper =
        document.getElementById(
            "ipPartNumberFieldWrapper"
        );

    const partNumberInput =
        document.getElementById(
            "ipPartNumberInput"
        );

    if (partNumberSpecific === "Yes") {
        showIntegratedProcurementField(
            "ipPartNumberFieldWrapper",
            true
        );
    } else if (partNumberWrapper) {
        partNumberWrapper.classList.remove(
            "show-field"
        );

        setIntegratedProcurementRequired(
            partNumberWrapper,
            false
        );

        if (partNumberInput) {
            partNumberInput.value = "";
            partNumberInput.classList.remove(
                "error-field"
            );
        }

        partNumberWrapper.classList.remove(
            "error"
        );

        partNumberWrapper
            .querySelectorAll(
                ".field-error-message"
            )
            .forEach(function (message) {
                message.remove();
            });
    }

    const otherNetworkIssues =
        $(
            'input[name="ipOtherNetworkIssues"]:checked'
        ).val() || "";

    const invoiceNumberWrapper =
        document.getElementById(
            "ipInvoiceNumberFieldWrapper"
        );

    const invoiceNumberInput =
        document.getElementById(
            "ipInvoiceNumberInput"
        );

    if (otherNetworkIssues === "Yes") {
        showIntegratedProcurementField(
            "ipInvoiceNumberFieldWrapper",
            true
        );
    } else if (invoiceNumberWrapper) {
        invoiceNumberWrapper.classList.remove(
            "show-field"
        );

        setIntegratedProcurementRequired(
            invoiceNumberWrapper,
            false
        );

        if (invoiceNumberInput) {
            invoiceNumberInput.value = "";
            invoiceNumberInput.classList.remove(
                "error-field"
            );
        }

        invoiceNumberWrapper.classList.remove(
            "error"
        );

        invoiceNumberWrapper
            .querySelectorAll(
                ".field-error-message"
            )
            .forEach(function (message) {
                message.remove();
            });
    }
}
function applyIntegratedProcurementFieldRules() {
    resetIntegratedProcurementFields();

    if (!isIntegratedProcurementSelected()) {
        return;
    }

    showIntegratedProcurementField(
        "environmentFieldWrapper",
        true
    );

    const issueTypeValue =
        ($("#issueType").val() || "").trim();

    if (
        INTEGRATED_PROCUREMENT_INCIDENT_TYPES.includes(
            issueTypeValue
        )
    ) {
        showIntegratedProcurementField(
            "ipTransactionTypeFieldWrapper",
            true
        );

        showIntegratedProcurementField(
            "ipMultipleCustomersFieldWrapper",
            true
        );

        showIntegratedProcurementField(
            "ipCustomerFieldWrapper",
            true
        );

        showIntegratedProcurementField(
            "ipProfileFieldWrapper",
            true
        );

        showIntegratedProcurementField(
            "impactedCwsFieldWrapper",
            true
        );

        showIntegratedProcurementField(
            "impactedDcnFieldWrapper",
            true
        );

        showIntegratedProcurementField(
            "impactedUsernameFieldWrapper",
            true
        );

        showIntegratedProcurementField(
            "ipIssueDateTimeFieldWrapper",
            true
        );

        showIntegratedProcurementField(
            "ipIntermittentFieldWrapper",
            true
        );

        showIntegratedProcurementField(
            "ipPartNumberSpecificFieldWrapper",
            true
        );

        showIntegratedProcurementField(
            "ipOtherNetworkIssuesFieldWrapper",
            true
        );

        applyIntegratedProcurementDependencies();
        return;
    }

    if (
        INTEGRATED_PROCUREMENT_REQUEST_TYPES.includes(
            issueTypeValue
        )
    ) {
        showIntegratedProcurementField(
            "impactedCwsFieldWrapper",
            false
        );
    }
}
$(document).on(
    "change",
    "#productTech, #issueType",
    applyIntegratedProcurementFieldRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applyIntegratedProcurementFieldRules
);

$(document).on(
    "change",
    'input[name="ipPartNumberSpecific"], ' +
    'input[name="ipOtherNetworkIssues"]',
    applyIntegratedProcurementDependencies
);

const PROVIDED_DEVICE_MODEL_OPTIONS = [
    { value: "100000000", label: "3PDATA" },
    { value: "100000001", label: "PL083" },
    { value: "100000002", label: "PL121" },
    { value: "100000003", label: "PL131" },
    { value: "100000004", label: "PL141" },
    { value: "100000005", label: "PL143" },
    { value: "100000006", label: "PL161" },
    { value: "100000007", label: "PL240" },
    { value: "100000008", label: "PL240B" },
    { value: "100000009", label: "PL241" },
    { value: "100000010", label: "PL243" },
    { value: "100000011", label: "PL321" },
    { value: "100000012", label: "PL420" },
    { value: "100000013", label: "PL421" },
    { value: "100000014", label: "PL444" },
    { value: "100000015", label: "PL522" },
    { value: "100000016", label: "PL523" },
    { value: "100000017", label: "PL542" },
    { value: "100000018", label: "PL631" },
    { value: "100000019", label: "PL641" },
    { value: "100000020", label: "PL645" },
    { value: "100000021", label: "PL645+PL631" },
    { value: "100000022", label: "PL645+SLM" },
    { value: "100000023", label: "PL671" },
    { value: "100000024", label: "PLE601" },
    { value: "100000025", label: "PLE601+PL243" },
    { value: "100000026", label: "PLE601+PL671" },
    { value: "100000027", label: "PLE602" },
    { value: "100000028", label: "PLE602+PL671" },
    { value: "100000029", label: "PLE602+SLM" },
    { value: "100000030", label: "PLE602p" },
    { value: "100000031", label: "PLE602p+SLM" },
    { value: "100000032", label: "PLE631" },
    { value: "100000033", label: "PLE631+PL671" },
    { value: "100000034", label: "PLE632" },
    { value: "100000035", label: "PLE632+PL671" },
    { value: "100000036", label: "PLE632+SLM" },
    { value: "100000037", label: "PLE632p" },
    { value: "100000038", label: "PLE641" },
    { value: "100000039", label: "PLE641+PL631" },
    { value: "100000040", label: "PLE641+PL671" },
    { value: "100000041", label: "PLE642" },
    { value: "100000042", label: "PLE642+PL671" },
    { value: "100000043", label: "PLE642p" },
    { value: "100000044", label: "PLE643" },
    { value: "100000045", label: "PLE643+PL671" },
    { value: "100000046", label: "PLE643+SLM" },
    { value: "100000047", label: "PLE643p" },
    { value: "100000048", label: "PLE643p+SLM" },
    { value: "100000049", label: "PLE645" },
    { value: "100000050", label: "PLE645+PL631" },
    { value: "100000051", label: "PLE645+SLM" },
    { value: "100000052", label: "PLE645p" },
    { value: "100000053", label: "PLE645p+PL631" },
    { value: "100000054", label: "PLE682" },
    { value: "100000055", label: "PLE682+PL671" },
    { value: "100000056", label: "PLE682P" },
    { value: "100000057", label: "PLE683" },
    { value: "100000058", label: "PLE683+PL671" },
    { value: "100000059", label: "PLE683+SLM" },
    { value: "100000060", label: "PLE683p" },
    { value: "100000061", label: "PLE702" },
    { value: "100000062", label: "PLE702+PL671" },
    { value: "100000063", label: "PLE702+SLM" },
    { value: "100000064", label: "PLE732" },
    { value: "100000065", label: "PLE732+PL671" },
    { value: "100000066", label: "PLE732+SLM" },
    { value: "100000067", label: "PLE742" },
    { value: "100000068", label: "PLE742+PL671" },
    { value: "100000069", label: "PLE743" },
    { value: "100000070", label: "PLE743+PL671" },
    { value: "100000071", label: "PLE743+SLM" },
    { value: "100000072", label: "PLE745" },
    { value: "100000073", label: "PLE745+PL083" },
    { value: "100000074", label: "PLE745+PL631" },
    { value: "100000075", label: "PLE745+SLM" },
    { value: "100000076", label: "PLE782" },
    { value: "100000077", label: "PLE783" },
    { value: "100000078", label: "PLE783+PL671" },
    { value: "100000079", label: "PLE783+SLM" },
    { value: "100000080", label: "PLG601" },
    { value: "100000081", label: "PLG641" },
    { value: "100000082", label: "SLM" }
];

const EQUIPMENT_TYPE_OPTIONS = [
    { value: "100000000", label: "Accommodation" },
    { value: "100000001", label: "Air Conditioners" },
    { value: "100000002", label: "Aluminum Trench Boxes" },
    { value: "100000003", label: "Arrow Panels" },
    { value: "100000004", label: "Articulated Trucks" },
    { value: "100000005", label: "Asphalt Pavers" },
    { value: "100000006", label: "Augers" },
    { value: "100000007", label: "Backhoe Loaders" },
    { value: "100000008", label: "Bedding Boxes" },
    { value: "100000009", label: "Blades" },
    { value: "100000010", label: "Boom Lifts" },
    { value: "100000011", label: "Brooms" },
    { value: "100000012", label: "Brush Chippers" },
    { value: "100000013", label: "Buckets - Backhoe Rear" },
    { value: "100000014", label: "Buckets - Excavator" },
    { value: "100000015", label: "Buckets - Loader" },
    { value: "100000016", label: "Buckets - Skid Steer Loader" },
    { value: "100000017", label: "Buckets - Telehandler" },
    { value: "100000018", label: "Cold Planers" },
    { value: "100000019", label: "Cold-Water Pressure Washers" },
    { value: "100000020", label: "Compact Track and Multi Terrain Loaders" },
    { value: "100000021", label: "Compact Track Loaders" },
    { value: "100000022", label: "Compact Utility Equipment" },
    { value: "100000023", label: "Compactors" },
    { value: "100000024", label: "Concrete Buggies" },
    { value: "100000025", label: "Containers" },
    { value: "100000026", label: "Core Drills" },
    { value: "100000027", label: "Cranes" },
    { value: "100000028", label: "Dozers" },
    { value: "100000029", label: "Drum Cutters" },
    { value: "100000030", label: "Dump Trucks" },
    { value: "100000031", label: "Electric Heaters" },
    { value: "100000032", label: "Electric Power Generators" },
    { value: "100000033", label: "Electric Tools" },
    { value: "100000034", label: "Excavators" },
    { value: "100000035", label: "Floor Scrubbers" },
    { value: "100000036", label: "Forced Air Heaters" },
    { value: "100000037", label: "Forklifts: Straight Mast" },
    { value: "100000038", label: "Forks" },
    { value: "100000039", label: "Gas Tools" },
    { value: "100000040", label: "General Construction Lasers" },
    { value: "100000041", label: "Ground Thaw" },
    { value: "100000042", label: "Ground Thaw Heaters" },
    { value: "100000043", label: "Hammers" },
    { value: "100000044", label: "Handheld Cut-off Saws" },
    { value: "100000045", label: "Hot-Water Pressure Washers" },
    { value: "100000046", label: "Interior Lasers" },
    { value: "100000047", label: "Light Towers" },
    { value: "100000048", label: "Machine Display Receivers" },
    { value: "100000049", label: "Material Handling Arms" },
    { value: "100000050", label: "Material Lifts" },
    { value: "100000051", label: "Mini Excavators" },
    { value: "100000052", label: "Miscellaneous Attachments" },
    { value: "100000053", label: "Miscellaneous Products" },
    { value: "100000054", label: "Mixers" },
    { value: "100000055", label: "Mobile Generator Sets" },
    { value: "100000056", label: "Mortar Mixers" },
    { value: "100000057", label: "Motor Graders" },
    { value: "100000058", label: "Pad Foot Compactors" },
    { value: "100000059", label: "Personnel Carts" },
    { value: "100000060", label: "Pipelaying/Underground Lasers" },
    { value: "100000061", label: "Plate Compactors" },
    { value: "100000062", label: "Pneumatic Rollers" },
    { value: "100000063", label: "Pneumatic Tolls" },
    { value: "100000064", label: "Portable Air Compressors" },
    { value: "100000065", label: "Portable Generators" },
    { value: "100000066", label: "Portable Welders" },
    { value: "100000067", label: "Pump Equipment" },
    { value: "100000068", label: "Rakes" },
    { value: "100000069", label: "Rammers" },
    { value: "100000070", label: "Ride-On Brooms" },
    { value: "100000071", label: "Ride-On Rollers" },
    { value: "100000072", label: "Ride-On Trenchers" },
    { value: "100000073", label: "Rippers" },
    { value: "100000074", label: "Road Reclaimers" },
    { value: "100000075", label: "Road Wideners" },
    { value: "100000076", label: "Sanitation/Portable Toilets" },
    { value: "100000077", label: "Scissor Lifts" },
    { value: "100000078", label: "Site Dumpers" },
    { value: "100000079", label: "Skid Steer Loaders" },
    { value: "100000080", label: "Smooth Compactors" },
    { value: "100000081", label: "Soil Compactors" },
    { value: "100000082", label: "Stationary Air Compressors" },
    { value: "100000083", label: "Stell Manhole Boxes" },
    { value: "100000084", label: "Stump Grinders" },
    { value: "100000085", label: "Tandem Vibratory Rollers" },
    { value: "100000086", label: "Telehandlers" },
    { value: "100000087", label: "Telehandlers (Large Capacity)" },
    { value: "100000088", label: "Thumbs" },
    { value: "100000089", label: "Tile Saws" },
    { value: "100000090", label: "Towable Welders" },
    { value: "100000091", label: "Track Loaders" },
    { value: "100000092", label: "Track Pads" },
    { value: "100000093", label: "Trailers" },
    { value: "100000094", label: "Trenchers" },
    { value: "100000095", label: "Trommels" },
    { value: "100000096", label: "Truss Booms" },
    { value: "100000097", label: "Utility Equipment Trailers" },
    { value: "100000098", label: "Utility Vehicles" },
    { value: "100000099", label: "Variable Message Boards" },
    { value: "100000100", label: "Vertical Personnel Lifts" },
    { value: "100000101", label: "Vibratory Soil Compactors" },
    { value: "100000102", label: "Walk-Behind Concrete Saws" },
    { value: "100000103", label: "Walk-Behind Power Trowels" },
    { value: "100000104", label: "Walk-Behind Rollers" },
    { value: "100000105", label: "Walk-Behind Sweepers/Scrubbers" },
    { value: "100000106", label: "Walk-Behind Trenchers" },
    { value: "100000107", label: "Water Trailers" },
    { value: "100000108", label: "Water Trucks" },
    { value: "100000109", label: "Wheel Excavators" },
    { value: "100000110", label: "Wheel Loaders" },
    { value: "100000111", label: "Wheel Tractor-Scrapers" },
    { value: "100000112", label: "Wheeled Tractors" },
    { value: "100000113", label: "Worksite Shelters on Wheels" },
    { value: "100000114", label: "Other" }
];

function populateEquipmentTypeSelect(
    selectId
) {
    const select =
        document.getElementById(selectId);

    if (!select) {
        return;
    }

    const currentValue =
        String(select.value || "");

    select.innerHTML =
        '<option value="">' +
        'Select Equipment Type' +
        '</option>';

    EQUIPMENT_TYPE_OPTIONS.forEach(
        function (equipmentType) {
            const option =
                document.createElement("option");

            option.value =
                equipmentType.value;

            option.textContent =
                equipmentType.label;

            select.appendChild(option);
        }
    );

    if (
        currentValue &&
        EQUIPMENT_TYPE_OPTIONS.some(
            function (equipmentType) {
                return (
                    equipmentType.value ===
                    currentValue
                );
            }
        )
    ) {
        select.value =
            currentValue;
    }
}

function initializeEquipmentTypeOptions() {
    populateEquipmentTypeSelect(
        "visionLinkEquipmentTypeSelect"
    );
}

function populateProvidedDeviceModelSelect(
    selectId
) {
    const select =
        document.getElementById(selectId);

    if (!select) {
        return;
    }

    const currentValue =
        String(select.value || "");

    select.innerHTML =
        '<option value="">' +
        'Select Device Model' +
        '</option>';

    PROVIDED_DEVICE_MODEL_OPTIONS.forEach(
        function (deviceModel) {
            const option =
                document.createElement("option");

            option.value =
                deviceModel.value;

            option.textContent =
                deviceModel.label;

            select.appendChild(option);
        }
    );

    if (
        currentValue &&
        PROVIDED_DEVICE_MODEL_OPTIONS.some(
            function (deviceModel) {
                return (
                    deviceModel.value ===
                    currentValue
                );
            }
        )
    ) {
        select.value =
            currentValue;
    }
}

function initializeProvidedDeviceModelOptions() {
    [
        "dspDeviceModelSelect",
        "productLinkDeviceModelSelect",
        "visionLinkDeviceModelSelect",
        "subscriptionAssetDeviceModelSelect"
    ].forEach(function (selectId) {
        populateProvidedDeviceModelSelect(
            selectId
        );
    });
}


const DEALER_SERVICES_PORTAL_FIELD_RULES = {
    "100000014": {},

    "100000015": {
        dspSerialNumberFieldWrapper: {
            inputId: "dspSerialNumberInput",
            required: true
        },
        dspDeviceModelFieldWrapper: {
            inputId: "dspDeviceModelInput",
            required: false
        },
        dspDeviceSerialNumberFieldWrapper: {
            inputId: "dspDeviceSerialNumberInput",
            required: false
        }
    },

    "100000016": {
        dspSerialNumberFieldWrapper: {
            inputId: "dspSerialNumberInput",
            required: true
        },
        dspDeviceModelFieldWrapper: {
            inputId: "dspDeviceModelInput",
            required: false
        },
        dspDeviceSerialNumberFieldWrapper: {
            inputId: "dspDeviceSerialNumberInput",
            required: false
        }
    },

    "100000017": {
        dspSerialNumberFieldWrapper: {
            inputId: "dspSerialNumberInput",
            required: true
        },
        dspDeviceModelFieldWrapper: {
            inputId: "dspDeviceModelInput",
            required: false
        },
        dspDeviceSerialNumberFieldWrapper: {
            inputId: "dspDeviceSerialNumberInput",
            required: false
        }
    },

    "100000018": {
        dspInvoiceCreditMemoFieldWrapper: {
            inputId: "dspInvoiceCreditMemoInput",
            required: true
        }
    },

    "100000019": {
        dspBestDescribesFieldWrapper: {
            inputId: "dspBestDescribesInput",
            required: true
        }
    },

    "100000010": {
        dspSerialNumberFieldWrapper: {
            inputId: "dspSerialNumberInput",
            required: false
        },
        dspDeviceModelFieldWrapper: {
            inputId: "dspDeviceModelInput",
            required: false
        },
        dspDeviceSerialNumberFieldWrapper: {
            inputId: "dspDeviceSerialNumberInput",
            required: false
        },
        dspDataIncorrectFieldWrapper: {
            inputId: "dspDataIncorrectInput",
            required: true
        }
    },

    "100000011": {
        dspSerialNumberFieldWrapper: {
            inputId: "dspSerialNumberInput",
            required: false
        },
        dspDeviceModelFieldWrapper: {
            inputId: "dspDeviceModelInput",
            required: true
        },
        dspDeviceSerialNumberFieldWrapper: {
            inputId: "dspDeviceSerialNumberInput",
            required: true
        },
        dspIndustryFieldWrapper: {
            inputId: "dspIndustryInput",
            required: true
        }
    },

    "100000006": {},

    "100000009": {
        dspSerialNumberFieldWrapper: {
            inputId: "dspSerialNumberInput",
            required: false
        }
    }
};

function isDealerServicesPortalSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return productName === "dealer services portal";
}

function applyDealerServicesPortalRules() {
    const impactWrapper =
        document.getElementById(
            "dspImpactFieldsWrapper"
        );

    const conditionalWrapperIds = [
        "dspBestDescribesFieldWrapper",
        "dspSerialNumberFieldWrapper",
        "dspInvoiceCreditMemoFieldWrapper",
        "dspDeviceModelFieldWrapper",
        "dspDeviceSerialNumberFieldWrapper",
        "dspDataIncorrectFieldWrapper",
        "dspIndustryFieldWrapper"
    ];

    conditionalWrapperIds.forEach(function (wrapperId) {
        const wrapper =
            document.getElementById(wrapperId);

        if (!wrapper) {
            return;
        }

        wrapper.classList.remove("show-field");
        wrapper.classList.remove("error");

        const requiredMarker =
    wrapper.querySelector(
        "label > .req"
    );

if (requiredMarker) {
    requiredMarker.remove();
}


        wrapper
            .querySelectorAll(
                ".field-error-message"
            )
            .forEach(function (message) {
                message.remove();
            });

        wrapper
            .querySelectorAll(
                "input, textarea, select"
            )
            .forEach(function (control) {
                control.removeAttribute("required");
                control.removeAttribute("aria-required");
                control.classList.remove("error-field");

                if (control.type !== "hidden") {
                    control.value = "";
                }
            });

        const hiddenSelect =
            wrapper.querySelector("select");

        if (hiddenSelect) {
            hiddenSelect.value = "";
        }

        const results =
            wrapper.querySelector(
                ".lookup-results"
            );

        if (results) {
            results.style.display = "none";
        }

        const arrow =
            wrapper.querySelector(
                ".lookup-arrow"
            );

        if (arrow) {
            arrow.classList.remove("open");
        }
    });

    if (!isDealerServicesPortalSelected()) {
        if (impactWrapper) {
            impactWrapper.classList.remove(
                "show-field"
            );

            impactWrapper
                .querySelectorAll(
                    'input[type="checkbox"]'
                )
                .forEach(function (checkbox) {
                    checkbox.checked = false;
                });
        }

        return;
    }

    if (impactWrapper) {
        impactWrapper.classList.add(
            "show-field"
        );
    }

    const issueTypeValue =
        ($("#issueType").val() || "").trim();

    const issueRule =
        DEALER_SERVICES_PORTAL_FIELD_RULES[
            issueTypeValue
        ];

    if (!issueRule) {
        return;
    }

    Object.keys(issueRule).forEach(function (wrapperId) {
        const fieldRule =
            issueRule[wrapperId];

        const wrapper =
            document.getElementById(wrapperId);

        const input =
            document.getElementById(
                fieldRule.inputId
            );

        if (!wrapper || !input) {
            return;
        }

        wrapper.classList.add("show-field");

       if (fieldRule.required) {
    input.setAttribute(
        "required",
        "required"
    );

    input.setAttribute(
        "aria-required",
        "true"
    );

    const label =
        wrapper.querySelector("label");

    if (
        label &&
        !label.querySelector(".req")
    ) {
        const marker =
            document.createElement("span");

        marker.className = "req";
        marker.textContent = "*";

        label.appendChild(
            document.createTextNode(" ")
        );

        label.appendChild(marker);
    }
}
    });
}

function getDealerServicesPortalImpacts() {
    const impacts = [];

    if ($("#dspTechOnSiteInput").is(":checked")) {
        impacts.push("I am a Tech on Site");
    }

    if ($("#dspMultipleUsersInput").is(":checked")) {
        impacts.push("This is impacting multiple users");
    }

    if ($("#dspMultipleAssetsInput").is(":checked")) {
        impacts.push("This is impacting multiple assets");
    }

    return impacts;
}

$(document).on(
    "change",
    "#productTech, #issueType",
    applyDealerServicesPortalRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applyDealerServicesPortalRules
);

function getFuelPromiseRoutingProductId(
    productName
) {
    const expectedName =
        String(productName || "")
            .trim()
            .toLowerCase();

    const productElement =
        Array.from(
            document.querySelectorAll(
                ".fuel-promise-routing-product"
            )
        ).find(function (element) {
            const currentName =
                (
                    element.getAttribute(
                        "data-product-name"
                    ) || ""
                )
                    .trim()
                    .toLowerCase();

            return currentName ===
                expectedName;
        });

    if (!productElement) {
        return "";
    }

    return cleanGuid(
        productElement.getAttribute(
            "data-product-id"
        )
    );
}

function getProductTechnologyIdByName(
    productName
) {
    const expectedName =
        String(productName || "")
            .trim()
            .toLowerCase();

    const option =
        Array.from(
            document.querySelectorAll(
                "#productTech option"
            )
        ).find(function (productOption) {
            const optionName =
                (
                    productOption.textContent ||
                    ""
                )
                    .trim()
                    .toLowerCase();

            return optionName ===
                expectedName;
        });

    if (!option) {
        return "";
    }

    return cleanGuid(option.value);
}

function getEnterpriseQrAdditionalApplicationId() {
    return cleanGuid(
        "996a6b38-3497-f111-8076-00224804a04f"
    );
}

function getConvergeSecondaryProductId(
    applicationName
) {
    const expectedProductName =
        String(applicationName || "")
            .trim()
            .toLowerCase();

    const productElement =
        Array.from(
            document.querySelectorAll(
                ".converge-secondary-product"
            )
        ).find(function (element) {
            const productName =
                (
                    element.getAttribute(
                        "data-product-name"
                    ) || ""
                )
                    .trim()
                    .toLowerCase();

            return productName ===
                expectedProductName;
        });

    if (!productElement) {
        return "";
    }

    return cleanGuid(
        productElement.getAttribute(
            "data-product-id"
        )
    );
}

function getCustomerAdminSecondaryProductId(
    moduleName
) {
    const normalizedModuleName =
        String(moduleName || "")
            .trim()
            .toLowerCase();

    const expectedProductName =
        normalizedModuleName +
        " - caterpillar customer admin tool";

    const productElement =
        Array.from(
            document.querySelectorAll(
                ".customer-admin-secondary-product"
            )
        ).find(function (element) {
            const currentProductName =
                (
                    element.getAttribute(
                        "data-product-name"
                    ) || ""
                )
                    .trim()
                    .toLowerCase();

            return currentProductName ===
                expectedProductName;
        });

    if (!productElement) {
        return "";
    }

    return cleanGuid(
        productElement.getAttribute(
            "data-product-id"
        )
    );
}

function getCurrentProductPersona() {
    const personaField =
        document.getElementById(
            "catPersonaFlag"
        );

    return String(
        personaField
            ? personaField.value
            : ""
    )
        .trim()
        .toLowerCase();
}

const INSIGHTS_HUB_INTERNAL_INSIGHTS = [
    "2025 CI Pulse Scorecard",
    "2025 E&T Pulse Scorecard",
    "2025 Rental ABP Planning",
    "2025 RI Pay for Excellence Dashboard",
    "2025 RI Pulse Scorecard",
    "2026 Rental ABP Planning",
    "Aftermarket Sales and Marketing Community Access",
    "BCP Managed Accounts STU Dashboard",
    "BCS Machine",
    "BCS Machine Toolbox",
    "Cat Certified Rebuild Dashboard",
    "Cat Commercial Account Approvals",
    "Cat Commercial Account PSE Dashboard",
    "Cat Commercial Account Spend Analyzer",
    "Cat Credits Dashboard",
    "Cat Digital eCommerce Cat Dealer Website Usage",
    "CAT Digital Learning & Development",
    "Cat Inspect Dashboard",
    "Cat Interact Reports",
    "Cat Reman CI Support Tool",
    "Cat Reman DPO",
    "Cat Reman E&T Support Tool",
    "Cat Reman RI Support Tool",
    "Caterpillar Customer Admin Tool - Data Export",
    "CatRentalStore.com Dashboard",
    "CI Aftermarket Snapshot (Dealers)",
    "CI Customer AM",
    "CI Hose and Couplings Dashboards",
    "CI Hydraulic Inspection Opportunity",
    "CI Managed Accounts Aftermarket Dashboards",
    "CI Managed Accounts MBR Dashboard",
    "CI PUMA-CYRA Growth Metrics Dashboards",
    "CI Retail and Small Core (R&S) Brief",
    "CI Services Training Dashboard",
    "CI Strategy Toolkit",
    "CI Technology Opportunity",
    "CI Used POS CVA",
    "CI Wear Planning Suite",
    "CISD CVA Fulfillment Validation Dashboard",
    "CISD CVA Opportunity Dashboard",
    "CISD Snapshot",
    "Condition Monitoring Compass Dashboard",
    "Condition Monitoring Dealer Dashboard",
    "Connectivity",
    "Core IQ",
    "Customer Insights Survey Dashboard",
    "Customer Rep Coverage Dashboard",
    "CVA Enterprise Dashboard",
    "CVA PM Accuracy(AAA)",
    "CVA Signal",
    "CVA$ Incremental Revenue Dashboard - CI Customer",
    "CVA Services Commitment 2026 Dashboard",
    "Daily eCommerce Activation",
    "Daily STU MBR View",
    "Dealer Facing - STU, OLGA, CVA, PSE & LENS",
    "Dealer Trifecta",
    "Dealers PCC - VisionLink Invites Dashboard",
    "Demand Planning :  UC Component Coverage",
    "Demand Planning : Components Coverage",
    "Demand Planning : Demand Signals",
    "Demand Planning : Population Coverage",
    "Demand Planning : PSLD Feedback",
    "Demand Planning : Sunrise",
    "Demand Planning: PRISM (PLESN) Conformance",
    "Detect Factory Take Rate",
    "Differentiated Dealer Capability Dashboard",
    "Digital Asset Governance Hub",
    "Digital Onboarding Dashboard - Caterpillar",
    "Digital Onboarding Dashboard-Dealer",
    "DNA Interface",
    "Dynamic Asset Utilization",
    "eComm Registration Enhancement Dashboard",
    "eCommerce Acceleration",
    "eCommerce Cat Central",
    "eCommerce Global Dealer Standard Heatmap Dealer",
    "eCommerce Orders",
    "eCommerce QR Code Dashboard",
    "eCommerce User Download",
    "Economic Return",
    "EM & Productivity Subscription Insights",
    "EM Onboarding Daily Internal",
    "EM Onboarding Daily View",
    "Enterprise Marketing Dashboard",
    "Foresight Beta - Component Management Dashboard",
    "GDS Adoption & Utilization Dashboard",
    "Global Dealer Standards Heatmap",
    "Internal DNA Interface",
    "IP Intelligence",
    "ISR Aftermarket Dashboard",
    "Jupiter Change Analysis",
    "Kit Finder Tool",
    "Labor Time Performance",
    "Lens Dashboard - Caterpillar",
    "MACHINE REBUILD IDENTIFIER TOOL",
    "Marketing ATC - Dealer",
    "Marketing ATC Dashboard",
    "Net Loyalty Score (NLS) Opportunity Dashboard",
    "NPI Coverage",
    "OLGA Insights",
    "OLGA Insights (with Jupiter)",
    "OLGA Utilization Rate",
    "One Labor Guideline",
    "On-Highway Truck Dashboard",
    "PCC Parts Content",
    "PCC Users Engagement Dashboard",
    "Percentage of Rebuild Opportunity (PORO) Dashboard",
    "Percentage of Rebuild Opportunity (PORO) Dashboard - Dealer",
    "PP+ Lead Dashboard – Caterpillar",
    "PP+ Lead Dashboard - Dealer",
    "Pre-Built Cart Generator Dashboard",
    "Prime Product + Sales Lead Community Access",
    "Profitability Module Dashboard",
    "PSE Official Tracking",
    "PSE Parameter Dashboard",
    "Rebuild Planning Suite",
    "Reman Aftermarket Sales & Marketing",
    "Reman Core Forecast",
    "Reman Long Term Forecast",
    "Reman Market Access Map",
    "Reman Supply Chain",
    "Reman Support Tools",
    "Rental S&OP Fleet Tracking",
    "Repairs Identification Tool",
    "REPS Commercial Dashboard",
    "RI Customer AM",
    "RI Parts Rebuilder",
    "ROCI (Repair Options)",
    "Service Response Data Dashboard",
    "Services Commitment 2.0 Preparation",
    "Services Commitment Validations Dashboard",
    "SMCS Code Inquiry",
    "SOS Data Quality Dashboard",
    "SOS Utilization",
    "SSO Sales Measurement",
    "SSO Sales Measurement Dashboard - Dealer",
    "STU Metric",
    "Target Setting Dealer Views",
    "Technology Utilization",
    "The Legendary Challenge",
    "US Lease Program",
    "VisionLink Active Customers Scorecard",
    "VisionLink Dashboard",
    "Wave 3 GDS Intake Form",
    "Westrac Flat Rate Exchange",
    "Unknown"
];

const INSIGHTS_HUB_DEALER_INSIGHTS = [
    "BCS Machine",
    "BCS Machine Toolbox",
    "Cat Commercial Account Approvals",
    "Cat Commercial Account PSE Dashboard",
    "Cat Credits Dashboard",
    "Cat Inspect Dashboard",
    "Cat Interact Reports",
    "Caterpillar Customer Admin Tool - Data Export",
    "CatRentalStore.com Dashboard",
    "CI Aftermarket Snapshot (Dealers)",
    "CI Hydraulic Inspection Opportunity",
    "CI Retail and Small Core (R&S) Brief",
    "CI Technology Opportunity",
    "CI Used POS CVA",
    "CI Wear Planning Suite",
    "CISD CVA Opportunity Dashboard",
    "Condition Monitoring Dealer Dashboard",
    "Connectivity",
    "Customer Insights Survey Dashboard",
    "Customer Rep Coverage Dashboard",
    "CVA PM Accuracy(AAA)",
    "CVA Signal",
    "Daily eCommerce Activation",
    "Dealer Trifecta",
    "Dealer Facing - STU, OLGA, CVA, PSE & LENS",
    "Dealers PCC - VisionLink Invites Dashboard",
    "Demand Planning :  UC Component Coverage",
    "Demand Planning : Components Coverage",
    "Demand Planning : Demand Signals",
    "Demand Planning : Population Coverage",
    "Demand Planning : PSLD Feedback",
    "Demand Planning : Sunrise",
    "Demand Planning: PRISM (PLESN) Conformance",
    "Differentiated Dealer Capability Dashboard",
    "Digital Onboarding Dashboard-Dealer",
    "DNA Interface",
    "Dynamic Asset Utilization",
    "eComm Registration Enhancement Dashboard",
    "eCommerce Acceleration",
    "eCommerce Cat Central",
    "eCommerce Global Dealer Standard Heatmap Dealer",
    "eCommerce Orders",
    "eCommerce QR Code Dashboard",
    "eCommerce User Download",
    "EM Onboarding Daily View",
    "Foresight Beta - Component Management Dashboard",
    "GDS Adoption & Utilization Dashboard",
    "IP Intelligence",
    "ISR Aftermarket Dashboard",
    "Kit Finder Tool",
    "Labor Time Performance",
    "Marketing ATC - Dealer",
    "Net Loyalty Score (NLS) Opportunity Dashboard",
    "OLGA Insights",
    "One Labor Guideline",
    "On-Highway Truck Dashboard",
    "PCC Users Engagement Dashboard",
    "Percentage of Rebuild Opportunity (PORO) Dashboard - Dealer",
    "PP+ Lead Dashboard - Dealer",
    "Pre-Built Cart Generator Dashboard",
    "REPS Commercial Dashboard",
    "Service Response Data Dashboard",
    "Services Commitment 2.0 Preparation",
    "Services Commitment Validations Dashboard",
    "SMCS Code Inquiry",
    "SOS Data Quality Dashboard",
    "SOS Utilization",
    "SSO Sales Measurement Dashboard - Dealer",
    "Technology Utilization",
    "The Legendary Challenge",
    "US Lease Program",
    "VisionLink Dashboard",
    "Westrac Flat Rate Exchange",
    "Unknown"
];


function getInsightsHubOptionsForPersona() {
    const persona =
        getCurrentProductPersona();

    if (persona === "internal") {
        return INSIGHTS_HUB_INTERNAL_INSIGHTS;
    }

    if (persona === "dealer") {
        return INSIGHTS_HUB_DEALER_INSIGHTS;
    }

    return ["Unknown"];
}

function populateInsightsHubInsightSelect() {
    const select =
        document.getElementById(
            "insightsHubInsightSelect"
        );

    const visibleInput =
        document.getElementById(
            "insightsHubInsightInput"
        );

    if (!select) {
        return;
    }

    const currentValue =
        String(select.value || "");

    const insightNames =
        getInsightsHubOptionsForPersona();

    select.innerHTML = "";

    const placeholder =
        document.createElement("option");

    placeholder.value = "";
    placeholder.textContent =
        "Select Insight";

    select.appendChild(placeholder);

    insightNames.forEach(
        function (insightName) {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                insightName;

            option.textContent =
                insightName;

            select.appendChild(option);
        }
    );

    if (
        currentValue &&
        insightNames.includes(
            currentValue
        )
    ) {
        select.value =
            currentValue;
       } else {
        select.value = "";

        if (visibleInput) {
            visibleInput.value = "";
        }
    }

    select.dispatchEvent(
        new Event(
            "change",
            {
                bubbles: true
            }
        )
    );
}

function isCaterpillarInsightsHubSelected() {
    const productName =
        ($("#productInput").val() || "")
            .replace(/[®™℠]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    return productName ===
        "caterpillar insights hub";
}



const INSIGHTS_HUB_FIELD_RULES = {
    "100000014": {
        showRequestId: true,
        requestIdRequired: true,
        showBiProduct: false,
        biProductRequired: false,
        showInsight: false,
        insightRequired: false
    },

    "100000010": {
        showRequestId: false,
        requestIdRequired: false,
        showBiProduct: false,
        biProductRequired: false,
        showInsight: true,
        insightRequired: true
    },

    "100000006": {
        showRequestId: false,
        requestIdRequired: false,
        showBiProduct: true,
        biProductRequired: true,
        showInsight: false,
        insightRequired: false
    },

    "100000009": {
        showRequestId: false,
        requestIdRequired: false,
        showBiProduct: true,
        biProductRequired: false,
        showInsight: true,
        insightRequired: false
    }
};

const INSIGHTS_HUB_FIELDS = {
    requestId: {
        wrapperId:
            "insightsHubRequestIdFieldWrapper",
        inputId:
            "insightsHubRequestIdInput"
    },

    biProduct: {
        wrapperId:
            "insightsHubBiProductFieldWrapper",
        inputId:
            "insightsHubBiProductInput",
        selectId:
            "insightsHubBiProductSelect"
    },

    insight: {
        wrapperId:
            "insightsHubInsightFieldWrapper",
        inputId:
            "insightsHubInsightInput",
        selectId:
            "insightsHubInsightSelect"
    },

    url: {
        wrapperId:
            "insightsHubUrlFieldWrapper",
        inputId:
            "insightsHubUrlInput"
    }
};

function resetInsightsHubFields(
    clearValues
) {
    Object.keys(
        INSIGHTS_HUB_FIELDS
    ).forEach(function (fieldKey) {
        const field =
            INSIGHTS_HUB_FIELDS[fieldKey];

        const wrapper =
            document.getElementById(
                field.wrapperId
            );

        const input =
            document.getElementById(
                field.inputId
            );

        const select =
            field.selectId
                ? document.getElementById(
                    field.selectId
                )
                : null;

        if (wrapper) {
            wrapper.classList.remove(
                "show-field"
            );

            wrapper.classList.remove(
                "error"
            );

            wrapper
                .querySelectorAll(
                    ".field-error-message"
                )
                .forEach(function (message) {
                    message.remove();
                });

            const marker =
                wrapper.querySelector(
                    "label > .req"
                );

            if (marker) {
                marker.remove();
            }

            const results =
                wrapper.querySelector(
                    ".lookup-results"
                );

            if (results) {
                results.style.display =
                    "none";
            }

            const arrow =
                wrapper.querySelector(
                    ".lookup-arrow"
                );

            if (arrow) {
                arrow.classList.remove(
                    "open"
                );
            }
        }

        if (input) {
            input.removeAttribute(
                "required"
            );

            input.removeAttribute(
                "aria-required"
            );

            input.classList.remove(
                "error-field"
            );

            if (clearValues) {
                input.value = "";
            }
        }

        if (
            select &&
            clearValues
        ) {
            select.value = "";
        }
    });
}

function showInsightsHubField(
    field,
    required
) {
    const wrapper =
        document.getElementById(
            field.wrapperId
        );

    const input =
        document.getElementById(
            field.inputId
        );

    if (!wrapper || !input) {
        return;
    }

    wrapper.classList.add(
        "show-field"
    );

    wrapper.classList.remove(
        "error"
    );

    input.removeAttribute(
        "required"
    );

    input.removeAttribute(
        "aria-required"
    );

    input.classList.remove(
        "error-field"
    );

    wrapper
        .querySelectorAll(
            "label > .req"
        )
        .forEach(function (marker) {
            marker.remove();
        });

    if (!required) {
        return;
    }

    input.setAttribute(
        "required",
        "required"
    );

    input.setAttribute(
        "aria-required",
        "true"
    );

    const label =
        wrapper.querySelector("label");

    if (label) {
        const marker =
            document.createElement("span");

        marker.className = "req";

        marker.textContent =
            String.fromCharCode(42);

        label.appendChild(
            document.createTextNode(" ")
        );

        label.appendChild(marker);
    }
}

function hideInsightsHubField(
    field,
    clearValue
) {
    const wrapper =
        document.getElementById(
            field.wrapperId
        );

    const input =
        document.getElementById(
            field.inputId
        );

    const select =
        field.selectId
            ? document.getElementById(
                field.selectId
            )
            : null;

    if (wrapper) {
        wrapper.classList.remove(
            "show-field"
        );

        wrapper.classList.remove(
            "error"
        );

        wrapper
            .querySelectorAll(
                ".field-error-message"
            )
            .forEach(function (message) {
                message.remove();
            });

        wrapper
            .querySelectorAll(
                "label > .req"
            )
            .forEach(function (marker) {
                marker.remove();
            });

        const results =
            wrapper.querySelector(
                ".lookup-results"
            );

        if (results) {
            results.style.display =
                "none";
        }

        const arrow =
            wrapper.querySelector(
                ".lookup-arrow"
            );

        if (arrow) {
            arrow.classList.remove(
                "open"
            );
        }
    }

    if (input) {
        input.removeAttribute(
            "required"
        );

        input.removeAttribute(
            "aria-required"
        );

        input.classList.remove(
            "error-field"
        );

        if (clearValue) {
            input.value = "";
        }
    }

    if (
        select &&
        clearValue
    ) {
        select.value = "";
    }
}

function applyInsightsHubDependencies() {
    if (
        !isCaterpillarInsightsHubSelected()
    ) {
        return;
    }

    const issueTypeValue =
        String(
            $("#issueType").val() || ""
        ).trim();

    const rule =
        INSIGHTS_HUB_FIELD_RULES[
            issueTypeValue
        ];

    if (!rule) {
        hideInsightsHubField(
            INSIGHTS_HUB_FIELDS.insight,
            true
        );

        hideInsightsHubField(
            INSIGHTS_HUB_FIELDS.url,
            true
        );

        return;
    }

    const biProductValue =
        String(
            $("#insightsHubBiProductSelect")
                .val() || ""
        ).trim();

    /*
     * Insight visibility:
     *
     * Data is Incorrect or Missing:
     * Always visible and required.
     *
     * Submit Feedback:
     * Visible and required only when
     * BI Product = Insight/Dashboard.
     *
     * Something Else:
     * Visible and optional.
     */
    let showInsight =
        Boolean(rule.showInsight);

    let requireInsight =
        Boolean(rule.insightRequired);

    if (
        rule.showBiProduct &&
        biProductValue ===
            "Insight/Dashboard"
    ) {
        showInsight = true;

        if (rule.biProductRequired) {
            requireInsight = true;
        }
    }

    if (showInsight) {
        showInsightsHubField(
            INSIGHTS_HUB_FIELDS.insight,
            requireInsight
        );
    } else {
        hideInsightsHubField(
            INSIGHTS_HUB_FIELDS.insight,
            true
        );
    }

    const insightValue =
        String(
            $("#insightsHubInsightSelect")
                .val() || ""
        ).trim();

    const showUrl =
        showInsight &&
        insightValue.toLowerCase() ===
            "unknown";

    if (showUrl) {
        showInsightsHubField(
            INSIGHTS_HUB_FIELDS.url,
            true
        );
    } else {
        hideInsightsHubField(
            INSIGHTS_HUB_FIELDS.url,
            true
        );
    }
}

populateInsightsHubInsightSelect();
function applyInsightsHubFieldRules() {
    resetInsightsHubFields(false);

    if (
        !isCaterpillarInsightsHubSelected()
    ) {
        resetInsightsHubFields(true);
        return;
    }

    const issueTypeValue =
        String(
            $("#issueType").val() || ""
        ).trim();

    const rule =
        INSIGHTS_HUB_FIELD_RULES[
            issueTypeValue
        ];

    if (!rule) {
        return;
    }

    if (rule.showRequestId) {
        showInsightsHubField(
            INSIGHTS_HUB_FIELDS.requestId,
            Boolean(
                rule.requestIdRequired
            )
        );
    }

    if (rule.showBiProduct) {
        showInsightsHubField(
            INSIGHTS_HUB_FIELDS.biProduct,
            Boolean(
                rule.biProductRequired
            )
        );
    }

    if (rule.showInsight) {
        showInsightsHubField(
            INSIGHTS_HUB_FIELDS.insight,
            Boolean(
                rule.insightRequired
            )
        );
    }

    applyInsightsHubDependencies();
}

$(document).on(
    "change.insightsHubRules",
    "#productTech, #issueType",
    function () {
        applyInsightsHubFieldRules();
        applyProductAttachmentHelpText();
    }
);

$(document).on(
    "input.insightsHubRules " +
    "change.insightsHubRules " +
    "blur.insightsHubRules",
    "#productInput",
    function () {
        applyInsightsHubFieldRules();
        applyProductAttachmentHelpText();
    }
);

$(document).on(
    "change.insightsHubDependencies",
    "#insightsHubBiProductSelect",
    function () {
        applyInsightsHubDependencies();
    }
);

$(document).on(
    "change.insightsHubDependencies",
    "#insightsHubInsightSelect",
    function () {
        applyInsightsHubDependencies();
    }
);

function isCaterpillarCustomerAdminToolSelected() {
    const productName =
        ($("#productInput").val() || "")
            .replace(/[®™℠]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    return productName ===
        "caterpillar customer admin tool";
}

function applyProductAttachmentHelpText() {
    const helpText =
        document.getElementById(
            "attachmentHelpText"
        );

    if (!helpText) {
        return;
    }

    const defaultHelpText =
        helpText.getAttribute(
            "data-default-help"
        ) ||
        "Please attach any relevant screenshots or supporting files.";

    if (isCaterpillarInsightsHubSelected()) {
        helpText.textContent =
            "Upload a full snapshot of the screen " +
            "with the insight you are concerned about, " +
            "including the URL.";

        return;
    }

    helpText.textContent =
        defaultHelpText;
}

function applyInsightsHubAttachmentRequirement() {
    const attachmentLabel =
        document.querySelector(
            ".attach-label"
        );

    const attachmentContainer =
        document.getElementById(
            "drop-zone"
        );

    if (
        !attachmentLabel ||
        !attachmentContainer
    ) {
        return;
    }

    attachmentLabel
        .querySelectorAll(
            ".insights-hub-attachment-required"
        )
        .forEach(function (marker) {
            marker.remove();
        });

    attachmentContainer.removeAttribute(
        "aria-required"
    );

    if (
        !isCaterpillarInsightsHubSelected()
    ) {
        return;
    }

    attachmentContainer.setAttribute(
        "aria-required",
        "true"
    );

    const marker =
        document.createElement("span");

    marker.className =
        "req insights-hub-attachment-required";

    marker.textContent =
        String.fromCharCode(42);

    attachmentLabel.insertBefore(
        document.createTextNode(" "),
        attachmentLabel.querySelector(
            ".cat-attachment-help-wrapper"
        )
    );

    attachmentLabel.insertBefore(
        marker,
        attachmentLabel.querySelector(
            ".cat-attachment-help-wrapper"
        )
    );
}

$(document).on(
    "change",
    "#productTech",
    function () {
        applyProductAttachmentHelpText();
        applyInsightsHubAttachmentRequirement();
    }
);

$(document).on(
    "input change blur",
    "#productInput",
    function () {
        applyProductAttachmentHelpText();
        applyInsightsHubAttachmentRequirement();
    }
);

const CUSTOMER_ADMIN_FIELD_RULES = {
    "100000014": {
        showModule: true,
        moduleRequired: true,
        showAssetFields: false,
        showReportType: false
    },

    "100000010": {
        showModule: true,
        moduleRequired: true,
        showAssetFields: true,
        serialRequired: false,
        ccidRequired: false,
        dcnRequired: false,
        showReportType: false
    },

    "100000052": {
        showModule: true,
        moduleRequired: true,
        showAssetFields: false,
        showReportType: true,
        reportTypeRequired: true
    },

    "100000006": {
        showModule: true,
        moduleRequired: true,
        showAssetFields: true,
        serialRequired: false,
        ccidRequired: false,
        dcnRequired: false,
        showReportType: false
    },

    "100000008": {
        showModule: true,
        moduleRequired: true,
        showAssetFields: true,
        serialRequired: false,
        ccidRequired: false,
        dcnRequired: false,
        showReportType: false
    },

    "100000009": {
        showModule: true,
        moduleRequired: true,
        showAssetFields: true,
        serialRequired: false,
        ccidRequired: false,
        dcnRequired: false,
        showReportType: false
    }
};

const CUSTOMER_ADMIN_FIELDS = {
    module: {
        wrapperId:
            "customerAdminModuleFieldWrapper",
        inputId:
            "customerAdminModuleInput",
        selectId:
            "customerAdminModuleSelect"
    },

    serialNumber: {
        wrapperId:
            "customerAdminSerialNumberFieldWrapper",
        inputId:
            "customerAdminSerialNumberInput"
    },

    ccid: {
        wrapperId:
            "customerAdminCcidFieldWrapper",
        inputId:
            "customerAdminCcidInput"
    },

    dcn: {
        wrapperId:
            "customerAdminDcnFieldWrapper",
        inputId:
            "customerAdminDcnInput"
    },

    reportType: {
        wrapperId:
            "customerAdminReportTypeFieldWrapper",
        inputId:
            "customerAdminReportTypeInput",
        selectId:
            "customerAdminReportTypeSelect"
    }
};

function resetCustomerAdminFields(
    clearValues
) {
    Object.keys(
        CUSTOMER_ADMIN_FIELDS
    ).forEach(function (fieldKey) {
        const field =
            CUSTOMER_ADMIN_FIELDS[
                fieldKey
            ];

        const wrapper =
            document.getElementById(
                field.wrapperId
            );

        const input =
            document.getElementById(
                field.inputId
            );

        const select =
            field.selectId
                ? document.getElementById(
                    field.selectId
                )
                : null;

        if (wrapper) {
            wrapper.classList.remove(
                "show-field"
            );

            wrapper.classList.remove(
                "error"
            );

            wrapper
                .querySelectorAll(
                    ".field-error-message"
                )
                .forEach(function (message) {
                    message.remove();
                });

            const requiredMarker =
                wrapper.querySelector(
                    "label > .req"
                );

            if (requiredMarker) {
                requiredMarker.remove();
            }

            const results =
                wrapper.querySelector(
                    ".lookup-results"
                );

            if (results) {
                results.style.display =
                    "none";
            }

            const arrow =
                wrapper.querySelector(
                    ".lookup-arrow"
                );

            if (arrow) {
                arrow.classList.remove(
                    "open"
                );
            }
        }

        if (input) {
            input.removeAttribute(
                "required"
            );

            input.removeAttribute(
                "aria-required"
            );

            input.classList.remove(
                "error-field"
            );

            if (clearValues) {
                input.value = "";
            }
        }

        if (select && clearValues) {
            select.value = "";
        }
    });
}

function showCustomerAdminField(
    field,
    required
) {
    const wrapper =
        document.getElementById(
            field.wrapperId
        );

    const input =
        document.getElementById(
            field.inputId
        );

    if (!wrapper || !input) {
        return;
    }

    wrapper.classList.add(
        "show-field"
    );

    input.removeAttribute(
        "required"
    );

    input.removeAttribute(
        "aria-required"
    );

    const existingMarker =
        wrapper.querySelector(
            "label > .req"
        );

    if (existingMarker) {
        existingMarker.remove();
    }

    if (!required) {
        return;
    }

    input.setAttribute(
        "required",
        "required"
    );

    input.setAttribute(
        "aria-required",
        "true"
    );

    const label =
        wrapper.querySelector("label");

    if (
        label &&
        !label.querySelector(".req")
    ) {
        const marker =
            document.createElement("span");

        marker.className = "req";

        marker.textContent =
            String.fromCharCode(42);

        label.appendChild(
            document.createTextNode(" ")
        );

        label.appendChild(marker);
    }
}

function applyCustomerAdminToolRules() {
    resetCustomerAdminFields(false);

    if (
        !isCaterpillarCustomerAdminToolSelected()
    ) {
        resetCustomerAdminFields(true);
        return;
    }

    const issueTypeValue =
        ($("#issueType").val() || "")
            .trim();

    const rule =
        CUSTOMER_ADMIN_FIELD_RULES[
            issueTypeValue
        ];

    if (!rule) {
        return;
    }

    if (rule.showModule) {
        showCustomerAdminField(
            CUSTOMER_ADMIN_FIELDS.module,
            Boolean(rule.moduleRequired)
        );
    }

    if (rule.showAssetFields) {
        showCustomerAdminField(
            CUSTOMER_ADMIN_FIELDS.serialNumber,
            Boolean(rule.serialRequired)
        );

        showCustomerAdminField(
            CUSTOMER_ADMIN_FIELDS.ccid,
            Boolean(rule.ccidRequired)
        );

        showCustomerAdminField(
            CUSTOMER_ADMIN_FIELDS.dcn,
            Boolean(rule.dcnRequired)
        );
    }

    if (rule.showReportType) {
        showCustomerAdminField(
            CUSTOMER_ADMIN_FIELDS.reportType,
            Boolean(
                rule.reportTypeRequired
            )
        );
    }
}

$(document).on(
    "change",
    "#productTech, #issueType",
    applyCustomerAdminToolRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applyCustomerAdminToolRules
);

function isCatConvergeSuiteSelected() {
    const productName =
        ($("#productInput").val() || "")
            .replace(/[®™℠]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    return productName ===
        "cat converge suite";
}

const CAT_CONVERGE_DIAGNOSTIC_ISSUE_TYPES = [
    "100000014",
    "100000010",
    "100000027",
    "100000028",
    "100000008"
];

const CAT_CONVERGE_FIELD_RULES = {
    "100000014": {
        showDiagnosticFields: true,
        diagnosticFieldsRequired: true,
        userActionsRequired: true,
        workingExamplesVisible: true
    },

    "100000010": {
        showDiagnosticFields: true,
        diagnosticFieldsRequired: true,
        userActionsRequired: true,
        workingExamplesVisible: true
    },

    "100000027": {
        showDiagnosticFields: true,
        diagnosticFieldsRequired: true,
        userActionsRequired: true,
        workingExamplesVisible: true
    },

    "100000028": {
        showDiagnosticFields: true,
        diagnosticFieldsRequired: true,
        userActionsRequired: true,
        workingExamplesVisible: true
    },

    "100000006": {
        showDiagnosticFields: false,
        diagnosticFieldsRequired: false,
        userActionsRequired: false,
        workingExamplesVisible: false
    },

    "100000007": {
        showDiagnosticFields: false,
        diagnosticFieldsRequired: false,
        userActionsRequired: false,
        workingExamplesVisible: false
    },

    "100000008": {
        showDiagnosticFields: true,
        diagnosticFieldsRequired: true,
        userActionsRequired: true,
        workingExamplesVisible: true
    },

    "100000009": {
        showDiagnosticFields: true,
        diagnosticFieldsRequired: false,
        userActionsRequired: false,
        workingExamplesVisible: true
    }
};

const CAT_CONVERGE_FIELDS = {
    application: {
        wrapperId:
            "convergeApplicationFieldWrapper",
        inputSelector:
            "#convergeApplicationInput",
        selectSelector:
            "#convergeApplicationSelect"
    },

    environment: {
        wrapperId:
            "convergeEnvironmentFieldWrapper",
        inputSelector:
            "#convergeEnvironmentInput",
        selectSelector:
            "#convergeEnvironmentSelect"
    },

    onBehalf: {
        wrapperId:
            "convergeOnBehalfFieldWrapper",
        inputSelector:
            'input[name="convergeOnBehalf"]'
    },

    requestedFor: {
        wrapperId:
            "convergeRequestedForFieldWrapper",
        inputSelector:
            "#convergeRequestedForInput"
    },

    multipleUsers: {
        wrapperId:
            "convergeMultipleUsersFieldWrapper",
        inputSelector:
            'input[name="convergeMultipleUsers"]'
    },

    recentChanges: {
        wrapperId:
            "convergeRecentChangesFieldWrapper",
        inputSelector:
            'input[name="convergeRecentChanges"]'
    },

    allItems: {
        wrapperId:
            "convergeAllItemsFieldWrapper",
        inputSelector:
            'input[name="convergeAllItems"]'
    },

    thirdParty: {
        wrapperId:
            "convergeThirdPartyFieldWrapper",
        inputSelector:
            'input[name="convergeThirdParty"]'
    },

    version: {
        wrapperId:
            "convergeVersionFieldWrapper",
        inputSelector:
            "#convergeVersionInput"
    },

    deviceType: {
        wrapperId:
            "convergeDeviceTypeFieldWrapper",
        inputSelector:
            'input[name="convergeDeviceType"]'
    },

    errorMessage: {
        wrapperId:
            "convergeErrorMessageFieldWrapper",
        inputSelector:
            'input[name="convergeErrorMessage"]'
    },

    errorDetails: {
        wrapperId:
            "convergeErrorDetailsFieldWrapper",
        inputSelector:
            "#convergeErrorDetailsInput"
    },

    userActions: {
        wrapperId:
            "convergeUserActionsFieldWrapper",
        inputSelector:
            "#convergeUserActionsInput"
    },

    workingExamples: {
        wrapperId:
            "convergeWorkingExamplesFieldWrapper",
        inputSelector:
            "#convergeWorkingExamplesInput"
    }
};

function resetCatConvergeFields(
    clearValues
) {
    Object.keys(
        CAT_CONVERGE_FIELDS
    ).forEach(function (fieldKey) {
        const field =
            CAT_CONVERGE_FIELDS[fieldKey];

        const wrapper =
            document.getElementById(
                field.wrapperId
            );

        const controls =
            document.querySelectorAll(
                field.inputSelector
            );

        if (wrapper) {
            wrapper.classList.remove(
                "show-field"
            );

            wrapper.classList.remove(
                "error"
            );

            wrapper
                .querySelectorAll(
                    ".field-error-message"
                )
                .forEach(function (message) {
                    message.remove();
                });

            const requiredMarker =
                wrapper.querySelector(
                    "label > .req"
                );

            if (requiredMarker) {
                requiredMarker.remove();
            }

            const results =
                wrapper.querySelector(
                    ".lookup-results"
                );

            if (results) {
                results.style.display =
                    "none";
            }

            const arrow =
                wrapper.querySelector(
                    ".lookup-arrow"
                );

            if (arrow) {
                arrow.classList.remove(
                    "open"
                );
            }
        }

        controls.forEach(function (control) {
            control.removeAttribute(
                "required"
            );

            control.removeAttribute(
                "aria-required"
            );

            control.classList.remove(
                "error-field"
            );

            if (!clearValues) {
                return;
            }

            if (
                control.type === "radio" ||
                control.type === "checkbox"
            ) {
                control.checked = false;
            } else {
                control.value = "";
            }
        });

        if (
            clearValues &&
            field.selectSelector
        ) {
            const select =
                document.querySelector(
                    field.selectSelector
                );

            if (select) {
                select.value = "";
            }
        }
    });
}

function showCatConvergeField(
    field,
    required
) {
    const wrapper =
        document.getElementById(
            field.wrapperId
        );

    const controls =
        document.querySelectorAll(
            field.inputSelector
        );

    if (
        !wrapper ||
        controls.length === 0
    ) {
        return;
    }

    wrapper.classList.add(
        "show-field"
    );

    controls.forEach(function (control) {
        control.removeAttribute(
            "required"
        );

        control.removeAttribute(
            "aria-required"
        );
    });

    const existingMarker =
        wrapper.querySelector(
            "label > .req"
        );

    if (existingMarker) {
        existingMarker.remove();
    }

    if (!required) {
        return;
    }

    controls.forEach(function (control) {
        control.setAttribute(
            "aria-required",
            "true"
        );
    });

    controls[0].setAttribute(
        "required",
        "required"
    );

    const label =
        wrapper.querySelector("label");

    if (
        label &&
        !label.querySelector(".req")
    ) {
        const marker =
            document.createElement("span");

        marker.className = "req";

        marker.textContent =
            String.fromCharCode(42);

        label.appendChild(
            document.createTextNode(" ")
        );

        label.appendChild(marker);
    }
}

function applyCatConvergeRequestedForRule() {
    if (!isCatConvergeSuiteSelected()) {
        return;
    }

    const selectedValue =
        $(
            'input[name="convergeOnBehalf"]:checked'
        ).val() || "";

    const requestedForField =
        CAT_CONVERGE_FIELDS.requestedFor;

    if (selectedValue === "Yes") {
        showCatConvergeField(
            requestedForField,
            true
        );

        return;
    }

    const wrapper =
        document.getElementById(
            requestedForField.wrapperId
        );

    const input =
        document.querySelector(
            requestedForField.inputSelector
        );

    if (wrapper) {
        wrapper.classList.remove(
            "show-field"
        );

        wrapper
            .querySelectorAll(
                "label > .req"
            )
            .forEach(function (marker) {
                marker.remove();
            });
    }

    if (input) {
        input.value = "";

        input.removeAttribute(
            "required"
        );

        input.removeAttribute(
            "aria-required"
        );
    }
}

function applyCatConvergeErrorDetailsRule() {
    if (!isCatConvergeSuiteSelected()) {
        return;
    }

    const issueTypeValue =
        ($("#issueType").val() || "")
            .trim();

    const rule =
        CAT_CONVERGE_FIELD_RULES[
            issueTypeValue
        ];

    const errorMessageValue =
        $(
            'input[name="convergeErrorMessage"]:checked'
        ).val() || "";

    const errorDetailsField =
        CAT_CONVERGE_FIELDS.errorDetails;

    const errorMessageIsApplicable =
        rule &&
        rule.showDiagnosticFields;

    if (
        errorMessageIsApplicable &&
        errorMessageValue === "Yes"
    ) {
        showCatConvergeField(
            errorDetailsField,
            true
        );

        return;
    }

    const wrapper =
        document.getElementById(
            errorDetailsField.wrapperId
        );

    const input =
        document.querySelector(
            errorDetailsField.inputSelector
        );

    if (wrapper) {
        wrapper.classList.remove(
            "show-field"
        );

        wrapper
            .querySelectorAll(
                "label > .req"
            )
            .forEach(function (marker) {
                marker.remove();
            });
    }

    if (input) {
        input.value = "";

        input.removeAttribute(
            "required"
        );

        input.removeAttribute(
            "aria-required"
        );
    }
}

function applyCatConvergeSuiteRules() {
    resetCatConvergeFields(false);

    if (!isCatConvergeSuiteSelected()) {
        resetCatConvergeFields(true);
        return;
    }

    const issueTypeValue =
        ($("#issueType").val() || "")
            .trim();

    const rule =
        CAT_CONVERGE_FIELD_RULES[
            issueTypeValue
        ];

    showCatConvergeField(
        CAT_CONVERGE_FIELDS.application,
        true
    );

    showCatConvergeField(
        CAT_CONVERGE_FIELDS.environment,
        true
    );

    showCatConvergeField(
        CAT_CONVERGE_FIELDS.onBehalf,
        true
    );

    showCatConvergeField(
        CAT_CONVERGE_FIELDS.multipleUsers,
        true
    );

    applyCatConvergeRequestedForRule();

    if (!rule) {
        return;
    }

    if (rule.showDiagnosticFields) {
        showCatConvergeField(
            CAT_CONVERGE_FIELDS.recentChanges,
            Boolean(
                rule.diagnosticFieldsRequired
            )
        );

        showCatConvergeField(
            CAT_CONVERGE_FIELDS.allItems,
            Boolean(
                rule.diagnosticFieldsRequired
            )
        );

        showCatConvergeField(
            CAT_CONVERGE_FIELDS.thirdParty,
            Boolean(
                rule.diagnosticFieldsRequired
            )
        );

        showCatConvergeField(
            CAT_CONVERGE_FIELDS.version,
            Boolean(
                rule.diagnosticFieldsRequired
            )
        );

        showCatConvergeField(
            CAT_CONVERGE_FIELDS.deviceType,
            Boolean(
                rule.diagnosticFieldsRequired
            )
        );

        showCatConvergeField(
            CAT_CONVERGE_FIELDS.errorMessage,
            Boolean(
                rule.diagnosticFieldsRequired
            )
        );
    }

    if (
        rule.showDiagnosticFields ||
        issueTypeValue === "100000006" ||
        issueTypeValue === "100000007"
    ) {
        showCatConvergeField(
            CAT_CONVERGE_FIELDS.userActions,
            Boolean(
                rule.userActionsRequired
            )
        );
    }

    if (rule.workingExamplesVisible) {
        showCatConvergeField(
            CAT_CONVERGE_FIELDS.workingExamples,
            false
        );
    }

    applyCatConvergeErrorDetailsRule();
}

$(document).on(
    "change",
    "#productTech, #issueType",
    applyCatConvergeSuiteRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applyCatConvergeSuiteRules
);

$(document).on(
    "change",
    'input[name="convergeOnBehalf"]',
    applyCatConvergeRequestedForRule
);

$(document).on(
    "change",
    'input[name="convergeErrorMessage"]',
    applyCatConvergeErrorDetailsRule
);

function isSubscriptionAssetAdministrationSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return productName ===
        "subscription and asset administration";
}

const SUBSCRIPTION_ASSET_FIELD_RULES = {
    "100000017": {
        showAssetFields: true,
        serialRequired: true,
        applicationRequired: false
    },

    "100000006": {
        showAssetFields: true,
        serialRequired: false,
        applicationRequired: false
    },

    "100000008": {
        showAssetFields: true,
        serialRequired: false,
        applicationRequired: true
    },

    "100000009": {
        showAssetFields: true,
        serialRequired: false,
        applicationRequired: false
    }
};

const SUBSCRIPTION_ASSET_FIELDS = {
    serialNumber: {
        wrapperId:
            "subscriptionAssetSerialNumberFieldWrapper",
        inputId:
            "subscriptionAssetSerialNumberInput"
    },

    dcn: {
        wrapperId:
            "subscriptionAssetDcnFieldWrapper",
        inputId:
            "subscriptionAssetDcnInput"
    },

    ccid: {
        wrapperId:
            "subscriptionAssetCcidFieldWrapper",
        inputId:
            "subscriptionAssetCcidInput"
    },

    deviceModel: {
        wrapperId:
            "subscriptionAssetDeviceModelFieldWrapper",
        inputId:
            "subscriptionAssetDeviceModelInput",
        selectId:
            "subscriptionAssetDeviceModelSelect"
    },

    deviceSerialNumber: {
        wrapperId:
            "subscriptionAssetDeviceSerialFieldWrapper",
        inputId:
            "subscriptionAssetDeviceSerialInput"
    },

    application: {
        wrapperId:
            "subscriptionAssetApplicationFieldWrapper",
        inputId:
            "subscriptionAssetApplicationInput",
        selectId:
            "subscriptionAssetApplicationSelect"
    }
};

function resetSubscriptionAssetFields(
    clearValues
) {
    Object.keys(
        SUBSCRIPTION_ASSET_FIELDS
    ).forEach(function (fieldKey) {
        const field =
            SUBSCRIPTION_ASSET_FIELDS[
                fieldKey
            ];

        const wrapper =
            document.getElementById(
                field.wrapperId
            );

        const input =
            document.getElementById(
                field.inputId
            );

        const select =
            field.selectId
                ? document.getElementById(
                    field.selectId
                )
                : null;

        if (wrapper) {
            wrapper.classList.remove(
                "show-field"
            );

            wrapper.classList.remove(
                "error"
            );

            wrapper
                .querySelectorAll(
                    ".field-error-message"
                )
                .forEach(function (message) {
                    message.remove();
                });

            const requiredMarker =
                wrapper.querySelector(
                    "label > .req"
                );

            if (requiredMarker) {
                requiredMarker.remove();
            }

            const results =
                wrapper.querySelector(
                    ".lookup-results"
                );

            if (results) {
                results.style.display =
                    "none";
            }

            const arrow =
                wrapper.querySelector(
                    ".lookup-arrow"
                );

            if (arrow) {
                arrow.classList.remove(
                    "open"
                );
            }
        }

        if (input) {
            input.removeAttribute(
                "required"
            );

            input.removeAttribute(
                "aria-required"
            );

            input.classList.remove(
                "error-field"
            );

            if (clearValues) {
                input.value = "";
            }
        }

        if (
            select &&
            clearValues
        ) {
            select.value = "";
        }
    });
}

function showSubscriptionAssetField(
    field,
    required
) {
    const wrapper =
        document.getElementById(
            field.wrapperId
        );

    const input =
        document.getElementById(
            field.inputId
        );

    if (!wrapper || !input) {
        return;
    }

    wrapper.classList.add(
        "show-field"
    );

    input.removeAttribute(
        "required"
    );

    input.removeAttribute(
        "aria-required"
    );

    const existingMarker =
        wrapper.querySelector(
            "label > .req"
        );

    if (existingMarker) {
        existingMarker.remove();
    }

    if (!required) {
        return;
    }

    input.setAttribute(
        "required",
        "required"
    );

    input.setAttribute(
        "aria-required",
        "true"
    );

    const label =
        wrapper.querySelector("label");

    if (
        label &&
        !label.querySelector(".req")
    ) {
        const marker =
            document.createElement("span");

        marker.className = "req";

        marker.textContent =
            String.fromCharCode(42);

        label.appendChild(
            document.createTextNode(" ")
        );

        label.appendChild(marker);
    }
}

function applySubscriptionAssetRules() {
    resetSubscriptionAssetFields(false);

    if (
        !isSubscriptionAssetAdministrationSelected()
    ) {
        resetSubscriptionAssetFields(true);
        return;
    }

    const issueTypeValue =
        ($("#issueType").val() || "")
            .trim();

    const rule =
        SUBSCRIPTION_ASSET_FIELD_RULES[
            issueTypeValue
        ];

    if (
        !rule ||
        !rule.showAssetFields
    ) {
        return;
    }

    showSubscriptionAssetField(
        SUBSCRIPTION_ASSET_FIELDS
            .serialNumber,
        Boolean(rule.serialRequired)
    );

    showSubscriptionAssetField(
        SUBSCRIPTION_ASSET_FIELDS.dcn,
        false
    );

    showSubscriptionAssetField(
        SUBSCRIPTION_ASSET_FIELDS.ccid,
        false
    );

    showSubscriptionAssetField(
        SUBSCRIPTION_ASSET_FIELDS
            .deviceModel,
        false
    );

    showSubscriptionAssetField(
        SUBSCRIPTION_ASSET_FIELDS
            .deviceSerialNumber,
        false
    );

    if (rule.applicationRequired) {
        showSubscriptionAssetField(
            SUBSCRIPTION_ASSET_FIELDS
                .application,
            true
        );
    }
}

$(document).on(
    "change",
    "#productTech, #issueType",
    applySubscriptionAssetRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applySubscriptionAssetRules
);

function isEnterpriseQrSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return (
        productName === "enterprise qr," ||
        productName === "enterprise qr"
    );
}

function resetEnterpriseQrField(
    clearValue
) {
    const linkWrapper =
    document.getElementById(
        "enterpriseQrAccessFormLinkWrapper"
    );

if (linkWrapper) {
    linkWrapper.classList.remove(
        "show-field"
    );
}
    const wrapper =
        document.getElementById(
            "enterpriseQrApplicationFieldWrapper"
        );

    const input =
        document.getElementById(
            "enterpriseQrApplicationInput"
        );

    const select =
        document.getElementById(
            "enterpriseQrApplicationSelect"
        );

    if (wrapper) {
        wrapper.classList.remove(
            "show-field"
        );

        wrapper.classList.remove(
            "error"
        );

        wrapper
            .querySelectorAll(
                ".field-error-message"
            )
            .forEach(function (message) {
                message.remove();
            });

        const requiredMarker =
            wrapper.querySelector(
                "label > .req"
            );

        if (requiredMarker) {
            requiredMarker.remove();
        }
    }

    if (input) {
        input.removeAttribute(
            "required"
        );

        input.removeAttribute(
            "aria-required"
        );

        input.classList.remove(
            "error-field"
        );

        if (clearValue) {
            input.value = "";
        }
    }

    if (
        select &&
        clearValue
    ) {
        select.value = "";
    }
}

function applyEnterpriseQrRules() {
    resetEnterpriseQrField(false);

    if (!isEnterpriseQrSelected()) {
        resetEnterpriseQrField(true);
        return;
    }

    const wrapper =
        document.getElementById(
            "enterpriseQrApplicationFieldWrapper"
        );

    const input =
        document.getElementById(
            "enterpriseQrApplicationInput"
        );

    if (!wrapper || !input) {
        return;
    }

    wrapper.classList.add(
        "show-field"
    );
    const linkWrapper =
    document.getElementById(
        "enterpriseQrAccessFormLinkWrapper"
    );

if (linkWrapper) {
    linkWrapper.classList.add(
        "show-field"
    );
}

    input.setAttribute(
        "required",
        "required"
    );

    input.setAttribute(
        "aria-required",
        "true"
    );

    const label =
        wrapper.querySelector("label");

    if (
        label &&
        !label.querySelector(".req")
    ) {
        const marker =
            document.createElement("span");

        marker.className = "req";

        marker.textContent =
            String.fromCharCode(42);

        label.appendChild(
            document.createTextNode(" ")
        );

        label.appendChild(marker);
    }
}

$(document).on(
    "change",
    "#productTech",
    applyEnterpriseQrRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applyEnterpriseQrRules
);

function isFuelPromiseProgramSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return productName ===
        "fuel promise program";
}

const FUEL_PROMISE_FIELD_IDS = [
    {
        wrapperId:
            "fuelPromiseSerialNumberFieldWrapper",
        inputId:
            "fuelPromiseSerialNumberInput"
    },
    {
        wrapperId:
            "fuelPromisePlDeviceFieldWrapper",
        inputId:
            "fuelPromisePlDeviceInput"
    },
    {
        wrapperId:
            "fuelPromiseDcnFieldWrapper",
        inputId:
            "fuelPromiseDcnInput"
    },
    {
        wrapperId:
            "fuelPromiseCcidFieldWrapper",
        inputId:
            "fuelPromiseCcidInput"
    }
];

function resetFuelPromiseProgramFields(
    clearValues
) {
    FUEL_PROMISE_FIELD_IDS.forEach(
        function (field) {
            const wrapper =
                document.getElementById(
                    field.wrapperId
                );

            const input =
                document.getElementById(
                    field.inputId
                );

            if (wrapper) {
                wrapper.classList.remove(
                    "show-field"
                );

                wrapper.classList.remove(
                    "error"
                );

                wrapper
                    .querySelectorAll(
                        ".field-error-message"
                    )
                    .forEach(function (message) {
                        message.remove();
                    });
            }

            if (!input) {
                return;
            }

            input.removeAttribute("required");
            input.removeAttribute(
                "aria-required"
            );

            input.classList.remove(
                "error-field"
            );

            if (clearValues) {
                input.value = "";
            }
        }
    );
}

function applyFuelPromiseProgramRules() {
    resetFuelPromiseProgramFields(
        false
    );

    if (!isFuelPromiseProgramSelected()) {
        resetFuelPromiseProgramFields(
            true
        );

        return;
    }

    FUEL_PROMISE_FIELD_IDS.forEach(
        function (field) {
            const wrapper =
                document.getElementById(
                    field.wrapperId
                );

            if (wrapper) {
                wrapper.classList.add(
                    "show-field"
                );
            }
        }
    );
}

$(document).on(
    "change",
    "#productTech",
    applyFuelPromiseProgramRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applyFuelPromiseProgramRules
);

function isVisionLinkSelected() {
    const productName =
        ($("#productInput").val() || "")
            .replace(/[®™℠]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    return (
        productName === "vision link" ||
        productName === "visionlink"
    );
}

const VISION_LINK_ASSET_REQUIRED_TYPES = [
    "100000010",
    "100000015",
    "100000011",
    "100000012",
    "100000013"
];

const VISION_LINK_FIELD_RULES = {
    "100000014": {},

    "100000015": {
        showAssetFields: true,
        assetRequired: true,
        equipmentRequired: true,
        dataPointRequired: false
    },

    "100000010": {
        showAssetFields: true,
        assetRequired: true,
        equipmentRequired: true,
        dataPointRequired: true
    },

    "100000011": {
        showAssetFields: true,
        assetRequired: true,
        equipmentRequired: true,
        dataPointRequired: false
    },

    "100000012": {
        showAssetFields: true,
        assetRequired: true,
        equipmentRequired: true,
        dataPointRequired: false
    },

    "100000013": {
        showAssetFields: true,
        assetRequired: true,
        equipmentRequired: true,
        dataPointRequired: false
    },

    "100000006": {},

    "100000008": {},

    "100000009": {
        showAssetFields: true,
        assetRequired: false,
        equipmentRequired: false,
        dataPointRequired: false
    }
};

const VISION_LINK_WRAPPER_IDS = [
    "visionLinkTechOnSiteFieldWrapper",
    "visionLinkSerialNumberFieldWrapper",
    "visionLinkEquipmentTypeFieldWrapper",
    "visionLinkIndustryFieldWrapper",
    "visionLinkDeviceModelFieldWrapper",
    "visionLinkDeviceSerialFieldWrapper",
    "visionLinkDataPointFieldWrapper"
];

function resetVisionLinkFields(clearValues) {
    VISION_LINK_WRAPPER_IDS.forEach(
        function (wrapperId) {
            const wrapper =
                document.getElementById(wrapperId);

            if (!wrapper) {
                return;
            }

            wrapper.classList.remove("show-field");
            wrapper.classList.remove("error");

            const requiredMarker =
                wrapper.querySelector(
                    "label > .req"
                );

            if (requiredMarker) {
                requiredMarker.remove();
            }

            wrapper
                .querySelectorAll(
                    ".field-error-message"
                )
                .forEach(function (message) {
                    message.remove();
                });

            wrapper
                .querySelectorAll(
                    "input, textarea, select"
                )
                .forEach(function (control) {
                    control.removeAttribute(
                        "required"
                    );

                    control.removeAttribute(
                        "aria-required"
                    );

                    control.classList.remove(
                        "error-field"
                    );

                    if (!clearValues) {
                        return;
                    }

                    if (
                        control.type === "checkbox" ||
                        control.type === "radio"
                    ) {
                        control.checked = false;
                    } else {
                        control.value = "";
                    }
                });

            const results =
                wrapper.querySelector(
                    ".lookup-results"
                );

            if (results) {
                results.style.display = "none";
            }

            const arrow =
                wrapper.querySelector(
                    ".lookup-arrow"
                );

            if (arrow) {
                arrow.classList.remove("open");
            }
        }
    );
}

function showVisionLinkField(
    wrapperId,
    inputId,
    required
) {
    const wrapper =
        document.getElementById(wrapperId);

    const input =
        document.getElementById(inputId);

    if (!wrapper || !input) {
        return;
    }

    wrapper.classList.add("show-field");

    input.removeAttribute("required");
    input.removeAttribute("aria-required");

    const existingMarker =
        wrapper.querySelector(
            "label > .req"
        );

    if (existingMarker) {
        existingMarker.remove();
    }

    if (!required) {
        return;
    }

    input.setAttribute(
        "required",
        "required"
    );

    input.setAttribute(
        "aria-required",
        "true"
    );

    const label =
        wrapper.querySelector("label");

    if (
        label &&
        !label.querySelector(".req")
    ) {
        const marker =
            document.createElement("span");

        marker.className = "req";

        marker.textContent =
            String.fromCharCode(42);

        label.appendChild(
            document.createTextNode(" ")
        );

        label.appendChild(marker);
    }
}

function applyVisionLinkFieldRules() {
    resetVisionLinkFields(false);

    if (!isVisionLinkSelected()) {
        resetVisionLinkFields(true);
        return;
    }

    const techWrapper =
        document.getElementById(
            "visionLinkTechOnSiteFieldWrapper"
        );

    if (techWrapper) {
        techWrapper.classList.add(
            "show-field"
        );
    }

    const issueTypeValue =
        ($("#issueType").val() || "").trim();

    const rule =
        VISION_LINK_FIELD_RULES[
            issueTypeValue
        ];

    if (!rule || !rule.showAssetFields) {
        return;
    }

    showVisionLinkField(
        "visionLinkSerialNumberFieldWrapper",
        "visionLinkSerialNumberInput",
        Boolean(rule.assetRequired)
    );

    showVisionLinkField(
        "visionLinkEquipmentTypeFieldWrapper",
        "visionLinkEquipmentTypeInput",
        Boolean(rule.equipmentRequired)
    );

    showVisionLinkField(
    "visionLinkIndustryFieldWrapper",
    "visionLinkIndustryInput",
    false
);

showVisionLinkField(
    "visionLinkDeviceModelFieldWrapper",
    "visionLinkDeviceModelInput",
    false
);

    showVisionLinkField(
        "visionLinkDeviceSerialFieldWrapper",
        "visionLinkDeviceSerialInput",
        false
    );

    if (rule.dataPointRequired) {
        showVisionLinkField(
            "visionLinkDataPointFieldWrapper",
            "visionLinkDataPointInput",
            true
        );
    }
}
$(document).on(
    "change",
    "#productTech, #issueType",
    applyVisionLinkFieldRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applyVisionLinkFieldRules
);

function isCatProductLinkSelected() {
    const productName =
        ($("#productInput").val() || "")
            .replace(/[®™℠]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    return productName === "cat product link";
}

const CAT_PRODUCT_LINK_FIELD_RULES = {
    "100000010": {
        productLinkDeviceModelFieldWrapper: {
            inputId: "productLinkDeviceModelInput",
            required: false
        },
        productLinkDataPointFieldWrapper: {
            inputId: "productLinkDataPointInput",
            required: true
        },
        productLinkIncorrectDataLocationFieldWrapper: {
            inputId: "productLinkIncorrectDataLocationInput",
            required: true
        }
    },

    "100000011": {
    productLinkDeviceModelFieldWrapper: {
        inputId:
            "productLinkDeviceModelInput",
        required: true
    },

},

    "100000012": {
        productLinkDeviceModelFieldWrapper: {
            inputId: "productLinkDeviceModelInput",
            required: false
        }
    },

    "100000013": {
        productLinkDeviceModelFieldWrapper: {
            inputId: "productLinkDeviceModelInput",
            required: false
        }
    },

    "100000009": {}
};

function resetCatProductLinkFields(
    clearValues
) {
    const wrapperIds = [
        "productLinkSerialNumberFieldWrapper",
        "productLinkDeviceSerialFieldWrapper",
        "productLinkImpactFieldsWrapper",
        "productLinkIndustryFieldWrapper",
        "productLinkDeviceModelFieldWrapper",
        "productLinkDataPointFieldWrapper",
        "productLinkIncorrectDataLocationFieldWrapper"
    ];

    wrapperIds.forEach(function (wrapperId) {
        const wrapper =
            document.getElementById(wrapperId);

        if (!wrapper) {
            return;
        }

        wrapper.classList.remove("show-field");
        wrapper.classList.remove("error");

        wrapper
            .querySelectorAll(".field-error-message")
            .forEach(function (message) {
                message.remove();
            });

        wrapper
            .querySelectorAll(
                "input, textarea, select"
            )
            .forEach(function (control) {
                control.removeAttribute("required");
                control.removeAttribute("aria-required");
                control.classList.remove("error-field");

                if (!clearValues) {
                    return;
                }

                if (
                    control.type === "checkbox" ||
                    control.type === "radio"
                ) {
                    control.checked = false;
                } else {
                    control.value = "";
                }
            });

        const results =
            wrapper.querySelector(".lookup-results");

        if (results) {
            results.style.display = "none";
        }

        const arrow =
            wrapper.querySelector(".lookup-arrow");

        if (arrow) {
            arrow.classList.remove("open");
        }
    });
}

function showCatProductLinkField(
    wrapperId,
    inputId,
    required
) {
    const wrapper =
        document.getElementById(wrapperId);

    const input =
        document.getElementById(inputId);

    if (!wrapper || !input) {
        return;
    }

    wrapper.classList.add("show-field");

    input.removeAttribute("required");
    input.removeAttribute("aria-required");

    const existingMarker =
        wrapper.querySelector(
            "label > .req"
        );

    if (existingMarker) {
        existingMarker.remove();
    }

    if (!required) {
        return;
    }

    input.setAttribute(
        "required",
        "required"
    );

    input.setAttribute(
        "aria-required",
        "true"
    );

    const label =
        wrapper.querySelector("label");

    if (
        label &&
        !label.querySelector(".req")
    ) {
        const marker =
            document.createElement("span");

        marker.className = "req";
        marker.textContent = "*";

        label.appendChild(
            document.createTextNode(" ")
        );

        label.appendChild(marker);
    }
}

function applyCatProductLinkFieldRules() {
    resetCatProductLinkFields(false);

    if (!isCatProductLinkSelected()) {
        resetCatProductLinkFields(true);
        return;
    }

    showCatProductLinkField(
        "productLinkSerialNumberFieldWrapper",
        "productLinkSerialNumberInput",
        true
    );

    showCatProductLinkField(
        "productLinkDeviceSerialFieldWrapper",
        "productLinkDeviceSerialInput",
        false
    );

    const impactWrapper =
        document.getElementById(
            "productLinkImpactFieldsWrapper"
        );
if (impactWrapper) {
        impactWrapper.classList.add("show-field");
    }

    // Industry: Always Shown / Not Required, regardless of issue type
    showCatProductLinkField(
        "productLinkIndustryFieldWrapper",
        "productLinkIndustryInput",
        false
    );

    const issueTypeValue =
        ($("#issueType").val() || "").trim();

    const issueRule =
        CAT_PRODUCT_LINK_FIELD_RULES[
            issueTypeValue
        ];

    if (!issueRule) {
        return;
    }

    Object.keys(issueRule).forEach(function (wrapperId) {
        const fieldRule =
            issueRule[wrapperId];

        showCatProductLinkField(
            wrapperId,
            fieldRule.inputId,
            fieldRule.required
        );
    });
}
$(document).on(
    "change",
    "#productTech, #issueType",
    applyCatProductLinkFieldRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applyCatProductLinkFieldRules
);


function isDealerCollaborationSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return productName ===
        "dealer collaboration community";
}

const DEALER_COLLABORATION_FIELDS = [
    {
        wrapperId: "dealerCommunityFieldWrapper"
    },
    {
        wrapperId: "dealerOnBehalfFieldWrapper"
    },
    {
        wrapperId: "dealerRequestedForFieldWrapper"
    },
    {
        wrapperId: "dealerJobRoleFieldWrapper"
    },
    {
        wrapperId: "dealerAdditionalCodeFieldWrapper"
    },
    {
        wrapperId: "dealerAccessRequiredFieldWrapper"
    },
    {
        wrapperId: "dealerUserFirstNameFieldWrapper"
    },
    {
        wrapperId: "dealerUserLastNameFieldWrapper"
    },
    {
        wrapperId: "dealerUserEmailFieldWrapper"
    },
    {
        wrapperId: "dealerUserCwsIdFieldWrapper"
    },
    {
        wrapperId: "dealerUserCountryFieldWrapper"
    }
];

function setDealerCollaborationRequired(
    wrapper,
    required
) {
    if (!wrapper) {
        return;
    }

    const controls = Array.from(
        wrapper.querySelectorAll(
            "input, textarea, select"
        )
    ).filter(function (control) {
        return control.type !== "hidden";
    });

    controls.forEach(function (control) {
        control.removeAttribute("required");
        control.removeAttribute("aria-required");
    });

    const existingMarker =
        wrapper.querySelector("label > .req");

    if (existingMarker) {
        existingMarker.remove();
    }

    if (!required) {
        return;
    }

    controls.forEach(function (control) {
        control.setAttribute("required", "required");
        control.setAttribute("aria-required", "true");
    });

    const label = wrapper.querySelector("label");

    if (label && !label.querySelector(".req")) {
        label.insertAdjacentHTML(
            "beforeend",
            ' <span class="req">*</span>'
        );
    }
}

function showDealerCollaborationField(
    wrapperId,
    required
) {
    const wrapper =
        document.getElementById(wrapperId);

    if (!wrapper) {
        return;
    }

    wrapper.classList.add("show-field");

    setDealerCollaborationRequired(
        wrapper,
        required
    );
}

function resetDealerCollaborationFields(
    clearValues
) {
    DEALER_COLLABORATION_FIELDS.forEach(
        function (field) {
            const wrapper =
                document.getElementById(
                    field.wrapperId
                );

            if (!wrapper) {
                return;
            }

            wrapper.classList.remove("show-field");
            wrapper.classList.remove("error");

            wrapper
                .querySelectorAll(
                    ".field-error-message"
                )
                .forEach(function (message) {
                    message.remove();
                });

            wrapper
                .querySelectorAll(
                    "input, textarea, select"
                )
                .forEach(function (control) {
                    control.removeAttribute(
                        "required"
                    );

                    control.removeAttribute(
                        "aria-required"
                    );

                    control.classList.remove(
                        "error-field"
                    );

                   if (clearValues) {
    if (
        control.type === "radio" ||
        control.type === "checkbox"
    ) {
        control.checked = false;
    } else {
        control.value = "";
    }
}
                });

            const results =
                wrapper.querySelector(
                    ".lookup-results"
                );

            if (results) {
                results.style.display = "none";
                results.innerHTML = "";
            }

            const arrow =
                wrapper.querySelector(
                    ".lookup-arrow"
                );

            if (arrow) {
                arrow.classList.remove("open");
            }
        }
    );
}

function applyDealerCollaborationFieldRules() {
    resetDealerCollaborationFields(false);

    if (!isDealerCollaborationSelected()) {
        return;
    }

    showDealerCollaborationField(
        "dealerCommunityFieldWrapper",
        true
    );

    showDealerCollaborationField(
        "dealerOnBehalfFieldWrapper",
        true
    );

    const issueTypeValue =
        ($("#issueType").val() || "").trim();

    const selectedCommunity =
    ($("#dealerCommunitySelect option:selected").text() || "")
        .trim();

    const onBehalfValue =
        $(
            'input[name="dealerOnBehalf"]:checked'
        ).val() || "";

   const standardCommunities = [
    "Aftermarket Sales Community",
    "Aftermarket Marketing Community",
    "Prime Product Plus Community"
];

const isStandardCommunity =
    standardCommunities.includes(
        selectedCommunity
    );

const isCampaignCommunity =
    selectedCommunity ===
    "Campaign & Event Management Community";

if (isStandardCommunity) {
    showDealerCollaborationField(
        "dealerJobRoleFieldWrapper",
        true
    );

    showDealerCollaborationField(
        "dealerAdditionalCodeFieldWrapper",
        false
    );
}

if (isCampaignCommunity) {
    showDealerCollaborationField(
        "dealerAdditionalCodeFieldWrapper",
        false
    );

    showDealerCollaborationField(
        "dealerAccessRequiredFieldWrapper",
        true
    );
}

    if (onBehalfValue === "Yes") {
        showDealerCollaborationField(
            "dealerRequestedForFieldWrapper",
            true
        );

        showDealerCollaborationField(
            "dealerUserFirstNameFieldWrapper",
            true
        );

        showDealerCollaborationField(
            "dealerUserLastNameFieldWrapper",
            true
        );

        showDealerCollaborationField(
            "dealerUserEmailFieldWrapper",
            true
        );

        showDealerCollaborationField(
            "dealerUserCwsIdFieldWrapper",
            true
        );

        showDealerCollaborationField(
            "dealerUserCountryFieldWrapper",
            true
        );
    }
}

$(document).on(
    "change",
    "#productTech, #issueType",
    function () {
        resetDealerCollaborationFields(true);
        applyDealerCollaborationFieldRules();
    }
);

$(document).on(
    "input change blur",
    "#productInput",
    function () {
        if (!isDealerCollaborationSelected()) {
            resetDealerCollaborationFields(true);
            return;
        }

        applyDealerCollaborationFieldRules();
    }
);

$(document).on(
    "change",
    "#dealerCommunitySelect",
    applyDealerCollaborationFieldRules
);

$(document).on(
    "change",
    'input[name="dealerOnBehalf"]',
    applyDealerCollaborationFieldRules
);

function isDigitalAuthorizationSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return productName === "digital authorization";
}

function resetDigitalAuthFields() {
    const fields = [
        {
            wrapperId: "digitalAuthCcidFieldWrapper",
            inputId: "digitalAuthCcidInput"
        },
        {
            wrapperId: "digitalAuthDataPointFieldWrapper",
            inputId: "digitalAuthDataPointInput",
            selectId: "digitalAuthDataPointSelect",
            resultsId: "digitalAuthDataPointResults"
        }
    ];

    fields.forEach(function (field) {
        const wrapper =
            document.getElementById(field.wrapperId);

        const input =
            document.getElementById(field.inputId);

        const select = field.selectId
            ? document.getElementById(field.selectId)
            : null;

        const results = field.resultsId
            ? document.getElementById(field.resultsId)
            : null;

        if (wrapper) {
            wrapper.classList.remove("show-field");
            wrapper.classList.remove("error");

            wrapper
                .querySelectorAll(".field-error-message")
                .forEach(function (message) {
                    message.remove();
                });

            const requiredMarker =
                wrapper.querySelector("label > .req");

            if (requiredMarker) {
                requiredMarker.remove();
            }
        }

        if (input) {
            input.value = "";
            input.removeAttribute("required");
            input.removeAttribute("aria-required");
            input.classList.remove("error-field");
        }

        if (select) {
            select.value = "";
            select.removeAttribute("required");
            select.removeAttribute("aria-required");
        }

        if (results) {
            results.style.display = "none";
            results.innerHTML = "";
        }
    });

    const arrow = document.querySelector(
        ".digital-auth-datapoint-arrow"
    );

    if (arrow) {
        arrow.classList.remove("open");
    }
}

function setDigitalAuthRequired(
    wrapper,
    input,
    required
) {
    if (!wrapper || !input) {
        return;
    }

    input.removeAttribute("required");
    input.removeAttribute("aria-required");

    const existingMarker =
        wrapper.querySelector("label > .req");

    if (existingMarker) {
        existingMarker.remove();
    }

    if (!required) {
        return;
    }

    input.setAttribute("required", "required");
    input.setAttribute("aria-required", "true");

    const label = wrapper.querySelector("label");

    if (label) {
        label.insertAdjacentHTML(
            "beforeend",
            ' <span class="req">*</span>'
        );
    }
}

function applyDigitalAuthFieldRules() {
    resetDigitalAuthFields();

    if (!isDigitalAuthorizationSelected()) {
        return;
    }

    const ccidWrapper =
        document.getElementById(
            "digitalAuthCcidFieldWrapper"
        );

    const ccidInput =
        document.getElementById(
            "digitalAuthCcidInput"
        );

    if (ccidWrapper) {
        ccidWrapper.classList.add("show-field");
    }

    const issueTypeValue =
        ($("#issueType").val() || "").trim();

    const rule =
        DIGITAL_AUTH_FIELD_RULES[issueTypeValue];

    setDigitalAuthRequired(
        ccidWrapper,
        ccidInput,
        Boolean(rule && rule.ccidRequired)
    );

    if (!rule || !rule.showDataPoint) {
        return;
    }

    const dataPointWrapper =
        document.getElementById(
            "digitalAuthDataPointFieldWrapper"
        );

    const dataPointInput =
        document.getElementById(
            "digitalAuthDataPointInput"
        );

    if (dataPointWrapper) {
        dataPointWrapper.classList.add("show-field");
    }

    setDigitalAuthRequired(
        dataPointWrapper,
        dataPointInput,
        true
    );
}

$(document).on(
    "change",
    "#productTech, #issueType",
    applyDigitalAuthFieldRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applyDigitalAuthFieldRules
);

function isSosServicesSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z]/g, "");

    return productName === "sosservices";
}

function resetSosConditionalFields() {
    const fieldIds = [
        "sosCcidFieldWrapper",
        "sosUserProfileFieldWrapper",
        "sosSerialNumberFieldWrapper",
        "sosNumberOfSamplesFieldWrapper",
        "sosInstrumentVendorFieldWrapper",
        "sosInstrumentModelFieldWrapper",
        "sosTestAnalysisFieldWrapper",
        "sosFluidBrandFieldWrapper",
        "sosFluidTypeFieldWrapper",
        "sosFluidWeightFieldWrapper",
        "sosCatModelFieldWrapper",
        "sosSerialPrefixFieldWrapper",
        "sosComponentFieldWrapper"
    ];

    fieldIds.forEach(function (wrapperId) {
        const wrapper =
            document.getElementById(wrapperId);

        if (!wrapper) {
            return;
        }

        wrapper.classList.remove("show-field");

        const input = wrapper.querySelector(
            "input, textarea, select"
        );

        if (input) {
            input.removeAttribute("required");
            input.removeAttribute("aria-required");
            input.value = "";
            input.classList.remove("error-field");
        }

        wrapper.classList.remove("error");

        wrapper
            .querySelectorAll(".field-error-message")
            .forEach(function (message) {
                message.remove();
            });

        const requiredMarker =
            wrapper.querySelector("label > .req");

        if (requiredMarker) {
            requiredMarker.remove();
        }
    });
}

function showSosField(wrapperId, fieldRule) {
    const wrapper =
        document.getElementById(wrapperId);

    const input =
        document.getElementById(fieldRule.inputId);

    if (!wrapper || !input) {
        return;
    }

    wrapper.classList.add("show-field");

    if (!fieldRule.required) {
        return;
    }

    input.setAttribute("required", "required");
    input.setAttribute("aria-required", "true");

    const label =
        wrapper.querySelector("label");

    if (label && !label.querySelector(".req")) {
        label.insertAdjacentHTML(
            "beforeend",
            ' <span class="req">*</span>'
        );
    }
}

const SOS_FILE_REQUIRED_ISSUE_TYPES = [
    "100000035",
    "100000032"
];

function applySosAttachmentRequirement() {
    const label =
        document.querySelector(".attach-label");

    if (!label) {
        return;
    }

    const issueTypeValue =
        ($("#issueType").val() || "").trim();

    const existingMarker =
        label.querySelector(".req");

    const shouldBeRequired =
        isSosServicesSelected() &&
        SOS_FILE_REQUIRED_ISSUE_TYPES.includes(
            issueTypeValue
        );

    if (shouldBeRequired) {
        if (!existingMarker) {
            label.insertAdjacentHTML(
                "beforeend",
                ' <span class="req">*</span>'
            );
        }
    } else if (existingMarker) {
        existingMarker.remove();
    }
}

function applySosFieldRules() {
    resetSosConditionalFields();
    applySosAttachmentRequirement();

    if (!isSosServicesSelected()) {
        return;
    }

    /* CCID is always shown for SOS Services */
    showSosField(
        "sosCcidFieldWrapper",
        {
            inputId: "sosCcidInput",
            required: false
        }
    );

    const issueTypeValue =
        ($("#issueType").val() || "").trim();

    const issueRule =
        SOS_FIELD_RULES[issueTypeValue];

    if (!issueRule) {
        return;
    }

    Object.keys(issueRule).forEach(function (wrapperId) {
        showSosField(
            wrapperId,
            issueRule[wrapperId]
        );
    });
}

$(document).on(
    "change",
    "#productTech, #issueType",
    applySosFieldRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applySosFieldRules
);

function isForesightProductSelected() {
    const productName =
        ($("#productInput").val() || "")
            .trim()
            .toLowerCase();

    return (
        productName === "cat foresight" ||
        productName === "cat® foresight"
    );
}

function resetForesightConditionalFields() {
    const fieldIds = [
        "foresightSerialNumberFieldWrapper",
        "foresightCcidFieldWrapper",
        "foresightUserEmailFieldWrapper",
        "urlFieldWrapper",
        "foresightIssueDateTimeFieldWrapper"
    ];

    fieldIds.forEach(function (wrapperId) {
        const wrapper =
            document.getElementById(wrapperId);

        if (!wrapper) {
            return;
        }

        wrapper.classList.remove("show-field");

        const input = wrapper.querySelector(
            "input, textarea, select"
        );

        if (input) {
            input.removeAttribute("required");
            input.removeAttribute("aria-required");
            input.value = "";
            input.classList.remove("error-field");
        }

        wrapper.classList.remove("error");

        wrapper.querySelectorAll(".field-error-message")
            .forEach(function (message) {
                message.remove();
            });

        const requiredMarker =
            wrapper.querySelector("label > .req");

        if (requiredMarker) {
            requiredMarker.remove();
        }
    });
}

function applyForesightFieldRules() {
    resetForesightConditionalFields();

    if (!isForesightProductSelected()) {
        return;
    }

    const issueTypeValue =
        ($("#issueType").val() || "").trim();

    const issueRule =
        FORESIGHT_FIELD_RULES[issueTypeValue];

    if (!issueRule) {
        return;
    }

    Object.keys(issueRule).forEach(function (wrapperId) {
        const fieldRule =
            issueRule[wrapperId];

        const wrapper =
            document.getElementById(wrapperId);

        const input =
            document.getElementById(fieldRule.inputId);

        if (!wrapper || !input) {
            return;
        }

        wrapper.classList.add("show-field");

        if (fieldRule.required) {
            input.setAttribute("required", "required");
            input.setAttribute("aria-required", "true");

            const label =
                wrapper.querySelector("label");

            if (label && !label.querySelector(".req")) {
                label.insertAdjacentHTML(
                    "beforeend",
                    ' <span class="req">*</span>'
                );
            }
        }
    });
}
$(document).on(
    "change",
    "#productTech, #issueType",
    applyForesightFieldRules
);

$(document).on(
    "input change blur",
    "#productInput",
    applyForesightFieldRules
);

function populateIssueTypesForSelectedProduct() {
    const productInput =
        document.getElementById("productInput");

    const issueTypeInput =
        document.getElementById("issueTypeInput");

    const issueTypeSelect =
        document.getElementById("issueType");

    const issueTypeResults =
        document.getElementById("issueTypeResults");

    if (
        !productInput ||
        !issueTypeInput ||
        !issueTypeSelect
    ) {
        return;
    }

    const selectedProduct =
        productInput.value.trim().toLowerCase();

    const productConfig =
        PRODUCT_FORM_CONFIG[selectedProduct];

    issueTypeInput.value = "";
    issueTypeSelect.innerHTML =
        '<option value="">Select Issue Type</option>';

    if (issueTypeResults) {
        issueTypeResults.innerHTML = "";
        issueTypeResults.style.display = "none";
    }

    if (!productConfig || !productConfig.issueTypes) {
        return;
    }

    productConfig.issueTypes.forEach(function (issueType) {
        const option =
            document.createElement("option");

        option.value =
            String(issueType.value);

        option.textContent =
            issueType.label;

        issueTypeSelect.appendChild(option);
    });
}

function getSelectedIssueTypeConfig() {
    const productInput =
        document.getElementById("productInput");

    const issueTypeSelect =
        document.getElementById("issueType");

    if (!productInput || !issueTypeSelect) {
        return null;
    }

    const productName =
        productInput.value.trim().toLowerCase();

    const selectedIssueTypeValue =
        issueTypeSelect.value;

    const productConfig =
        PRODUCT_FORM_CONFIG[productName];

    if (
        !productConfig ||
        !Array.isArray(productConfig.issueTypes)
    ) {
        return null;
    }

    return productConfig.issueTypes.find(
        function (issueType) {
            return String(issueType.value) ===
                String(selectedIssueTypeValue);
        }
    ) || null;
}

(function () {
    const productInput =
        document.getElementById("productInput");

    const productSelect =
        document.getElementById("productTech");

    if (productInput) {
        productInput.addEventListener(
            "input",
            populateIssueTypesForSelectedProduct
        );

        productInput.addEventListener(
            "change",
            populateIssueTypesForSelectedProduct
        );

        productInput.addEventListener(
            "blur",
            populateIssueTypesForSelectedProduct
        );
    }

    if (productSelect) {
        productSelect.addEventListener(
            "change",
            populateIssueTypesForSelectedProduct
        );
    }

    populateIssueTypesForSelectedProduct();

    setTimeout(
        populateIssueTypesForSelectedProduct,
        300
    );
})();

const CONDITIONAL_FIELDS_CONFIG = [

    {
    type: "picklist",
    triggerInputId: "productInput",
    triggerSelectId: "productTech",
    triggerValues: ["digital authorization"],
    wrapperId: "digitalAuthDataPointFieldWrapper",
    inputId: "digitalAuthDataPointInput",
    selectId: "digitalAuthDataPointSelect",
    resultsId: "digitalAuthDataPointResults",
    arrowSelector: ".digital-auth-datapoint-arrow",
    required: false
    },

    {
        type: "picklist",
        triggerInputId: "productInput",
        triggerSelectId: "productTech",
        triggerValues: ["parts expert"],
        wrapperId: "aftermarketFieldWrapper",
        inputId: "aftermarketInput",
        selectId: "aftermarketPartExpert",
        resultsId: "aftermarketResults",
        arrowSelector: ".aftermarket-arrow",
        required: true
    },

    {
    type: "text",
    triggerInputId: "productInput",
    triggerSelectId: "productTech",
    triggerValues: ["catdealer.com"],
    wrapperId: "dealerUrlFieldWrapper",
    inputId: "dealerUrlInput",
    required: true
    },

    {
    type: "picklist",
    triggerInputId: "productInput",
    triggerSelectId: "productTech",
    triggerValues: ["cat inspect", "cat® inspect"],
    wrapperId: "inspectAppFieldWrapper",
    inputId: "inspectAppInput",
    selectId: "inspectAppSelect",
    resultsId: "inspectAppResults",
    arrowSelector: ".inspect-app-arrow",
    required: true
    },

    {
    type: "text",
    triggerInputId: "productInput",
    triggerSelectId: "productTech",
    triggerValues: ["onesite"],
    wrapperId: "oneSiteUrlFieldWrapper",
    inputId: "oneSiteUrlInput",
    required: true
    },


    {
        type: "picklist",
        triggerInputId: "productInput",
        triggerSelectId: "productTech",
        triggerValues: ["cat foresight", "cat® foresight"],
        wrapperId: "onBehalfFieldWrapper",
        inputId: "onBehalfInput",
        selectId: "onBehalfSelect",
        resultsId: "onBehalfResults",
        arrowSelector: ".onbehalf-arrow",
        required: false
    },
   
    {
    type: "text",
    triggerInputId: "productInput",
    triggerSelectId: "productTech",
    triggerValues: [
        "dna - data notification alerts",
        "olga - opportunity lead generation analyzer",
        "stu - sales to users"
    ],
    wrapperId: "biProductUrlFieldWrapper",
    inputId: "biProductUrlInput",
    required: false
},

{
    type: "picklist",
    triggerInputId: "productInput",
    triggerSelectId: "productTech",
    triggerValues: ["stu - sales to users","olga - opportunity lead generation analyzer","dna - data notification alerts"],
    wrapperId: "stuDsdFieldWrapper",
    inputId: "stuDsdInput",
    selectId: "stuDsdSelect",
    resultsId: "stuDsdResults",
    arrowSelector: ".stu-dsd-arrow",
    required: true
},
{
    type: "checkboxGroup",
    triggerInputId: "productInput",
    triggerSelectId: "productTech",
    triggerValues: ["stu - sales to users","olga - opportunity lead generation analyzer","dna - data notification alerts"],
    wrapperId: "stuVerticalFieldWrapper",
    inputId: "stuVerticalInput",
    groupName: "stuVertical",
    required: true
} ,
{
    type: "picklist",
    triggerInputId: "productInput",
    triggerSelectId: "productTech",
    triggerValues: ["cat rentals", "cat rentals℠"],
    wrapperId: "rentalsEquipmentTypeFieldWrapper",
    inputId: "rentalsEquipmentTypeInput",
    selectId: "rentalsEquipmentTypeSelect",
    resultsId: "rentalsEquipmentTypeResults",
    arrowSelector: ".rentals-equipment-type-arrow",
    required: false,
    skipToggle: true
},
{
    type: "picklist",
    triggerInputId: "productInput",
    triggerSelectId: "productTech",
    triggerValues: ["cat rentals", "cat rentals℠"],
    wrapperId: "rentalsProductFamilyFieldWrapper",
    inputId: "rentalsProductFamilyInput",
    selectId: "rentalsProductFamilySelect",
    resultsId: "rentalsProductFamilyResults",
    arrowSelector: ".rentals-product-family-arrow",
    required: false,
    skipToggle: true
},
{
    type: "picklist",
    triggerInputId: "productInput",
    triggerSelectId: "productTech",
    triggerValues: ["cat rentals", "cat rentals℠"],
    wrapperId: "rentalsGeneratorSizeFieldWrapper",
    inputId: "rentalsGeneratorSizeInput",
    selectId: "rentalsGeneratorSizeSelect",
    resultsId: "rentalsGeneratorSizeResults",
    arrowSelector: ".rentals-generator-size-arrow",
    required: false,
    skipToggle: true
},
{
    type: "picklist",
    triggerInputId: "productInput",
    triggerSelectId: "productTech",
    triggerValues: ["cat rentals", "cat rentals℠"],
    wrapperId: "rentalsDealerAppFieldWrapper",
    inputId: "rentalsDealerAppInput",
    selectId: "rentalsDealerAppSelect",
    resultsId: "rentalsDealerAppResults",
    arrowSelector: ".rentals-dealer-app-arrow",
    required: true
}
  

  
];

function syncStuVerticalValue() {
    const selectedValues = Array.from(
        document.querySelectorAll(
            'input[name="stuVertical"]:checked'
        )
    ).map(function (checkbox) {
        return checkbox.value;
    });

    const hiddenInput =
        document.getElementById("stuVerticalInput");

    if (!hiddenInput) {
        return;
    }

    hiddenInput.value = selectedValues.join(", ");

    hiddenInput.dispatchEvent(
        new Event("input", { bubbles: true })
    );
}

document.addEventListener("change", function (event) {
    if (
        event.target &&
        event.target.matches('input[name="stuVertical"]')
    ) {
        syncStuVerticalValue();
    }
});

(function () {

    function setupSearchPicklist(cfg) {
        if (cfg.type && cfg.type !== "picklist") return;

        const input = document.getElementById(cfg.inputId);
        const select = document.getElementById(cfg.selectId);
        const results = document.getElementById(cfg.resultsId);
        const arrow = document.querySelector(cfg.arrowSelector);

        if (!input || !select || !results || !arrow) return;

        function showList(filterText = "") {
            results.innerHTML = "";
            results.style.display = "block";
            arrow.classList.add("open");

            const options = [...select.options].filter(opt => opt.value);
            const filtered = options.filter(opt =>
                opt.text.toLowerCase().includes(filterText.toLowerCase())
            );

            if (filtered.length === 0) {
                results.innerHTML = `<div class="lookup-item">No matching record found</div>`;
                return;
            }

            filtered.forEach(opt => {
                const div = document.createElement("div");
                div.className = "lookup-item";
                div.textContent = opt.text;

                div.addEventListener("click", function () {
                    input.value = opt.text;
                    select.value = opt.value;
                    select.dispatchEvent(
    new Event("change", { bubbles: true })
);
                    results.style.display = "none";
                    arrow.classList.remove("open");
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                });

                results.appendChild(div);
            });
        }

        input.addEventListener("input", function () {
            showList(input.value.trim());
        });

        input.addEventListener("focus", function () {
            showList("");
        });

        arrow.addEventListener("click", function () {
            if (results.style.display === "block") {
                results.style.display = "none";
                arrow.classList.remove("open");
            } else {
                input.focus();
                showList("");
            }
        });

        document.addEventListener("click", function (e) {
            if (!input.contains(e.target) &&
                !results.contains(e.target) &&
                !arrow.contains(e.target)) {
                results.style.display = "none";
                arrow.classList.remove("open");
            }
        });
    }

    function setupToggle(cfg) {
        const triggerInput = document.getElementById(cfg.triggerInputId);
        const triggerSelect = cfg.triggerSelectId
            ? document.getElementById(cfg.triggerSelectId)
            : null;

        const wrapper = document.getElementById(cfg.wrapperId);
        const fieldInput = cfg.inputId ? document.getElementById(cfg.inputId) : null;
        const fieldSelect = cfg.selectId ? document.getElementById(cfg.selectId) : null;
        const fieldResults = cfg.resultsId ? document.getElementById(cfg.resultsId) : null;
        const fieldArrow = cfg.arrowSelector ? document.querySelector(cfg.arrowSelector) : null;
        const radioInputs = cfg.type === "radio"
            ? document.querySelectorAll('input[name="' + cfg.groupName + '"]')
            : null;
        const checkboxInputs = cfg.type === "checkboxGroup" ? document.querySelectorAll('input[name="' + cfg.groupName + '"]' ) : null;

        if (!triggerInput || !wrapper) return;

        function toggle() {
            const selectedText = triggerInput.value.trim().toLowerCase();
            const label = wrapper.querySelector("label");
            const shouldShow = cfg.triggerValues.indexOf(selectedText) !== -1;

            if (shouldShow) {
                wrapper.classList.add("show-field");

                if (cfg.required) {
                    if (fieldInput) fieldInput.setAttribute("required", "required");
                    if (fieldSelect) fieldSelect.setAttribute("required", "required");
                    if (radioInputs) radioInputs.forEach(r => r.setAttribute("required", "required"));
                    if (checkboxInputs) { checkboxInputs.forEach(function (checkbox) { checkbox.checked = false; });
}
                    if (label && !label.querySelector(".req")) {
                        label.insertAdjacentHTML("beforeend", ' <span class="req">*</span>');
                    }
                }
            } else {
                wrapper.classList.remove("show-field");

                if (fieldInput) fieldInput.removeAttribute("required");
                if (fieldSelect) fieldSelect.removeAttribute("required");
                if (radioInputs) radioInputs.forEach(r => r.removeAttribute("required"));
                if (label) {
                    const reqSpan = label.querySelector(".req");
                    if (reqSpan) reqSpan.remove();
                }

                if (fieldInput) fieldInput.value = "";
                if (fieldSelect) fieldSelect.value = "";
                if (radioInputs) radioInputs.forEach(r => r.checked = false);
                if (fieldResults) fieldResults.style.display = "none";
                if (fieldArrow) fieldArrow.classList.remove("open");
            }
        }

        triggerInput.addEventListener("input", toggle);
        triggerInput.addEventListener("change", toggle);
        triggerInput.addEventListener("blur", toggle);

        if (triggerSelect) {
            triggerSelect.addEventListener("change", toggle);
        }

        toggle();
        setTimeout(toggle, 300);
    }
  
initializeProvidedDeviceModelOptions();
initializeEquipmentTypeOptions();

setupSearchPicklist({
    type: "picklist",
    inputId: "environmentInput",
    selectId: "environmentSelect",
    resultsId: "environmentResults",
    arrowSelector: ".environment-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "ipTransactionTypeInput",
    selectId: "ipTransactionTypeSelect",
    resultsId: "ipTransactionTypeResults",
    arrowSelector: ".ip-transaction-arrow"
});
setupSearchPicklist({
    type: "picklist",
    inputId: "dealerCommunityInput",
    selectId: "dealerCommunitySelect",
    resultsId: "dealerCommunityResults",
    arrowSelector: ".dealer-community-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "dealerJobRoleInput",
    selectId: "dealerJobRoleSelect",
    resultsId: "dealerJobRoleResults",
    arrowSelector: ".dealer-job-role-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "dealerAccessRequiredInput",
    selectId: "dealerAccessRequiredSelect",
    resultsId: "dealerAccessRequiredResults",
    arrowSelector: ".dealer-access-required-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "dealerSiteUpdateInput",
    selectId: "dealerSiteUpdateSelect",
    resultsId: "dealerSiteUpdateResults",
    arrowSelector: ".dealer-site-update-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "inspectTypeInput",
    selectId: "inspectTypeSelect",
    resultsId: "inspectTypeResults",
    arrowSelector: ".inspect-type-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "dspBestDescribesInput",
    selectId: "dspBestDescribesSelect",
    resultsId: "dspBestDescribesResults",
    arrowSelector: ".dsp-best-describes-arrow"
});
setupSearchPicklist({
    type: "picklist",
    inputId: "dspDeviceModelInput",
    selectId: "dspDeviceModelSelect",
    resultsId: "dspDeviceModelResults",
    arrowSelector: ".dsp-device-model-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "dspDataIncorrectInput",
    selectId: "dspDataIncorrectSelect",
    resultsId: "dspDataIncorrectResults",
    arrowSelector: ".dsp-data-incorrect-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "dspIndustryInput",
    selectId: "dspIndustrySelect",
    resultsId: "dspIndustryResults",
    arrowSelector: ".dsp-industry-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "productLinkIndustryInput",
    selectId: "productLinkIndustrySelect",
    resultsId: "productLinkIndustryResults",
    arrowSelector: ".product-link-industry-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "productLinkDeviceModelInput",
    selectId: "productLinkDeviceModelSelect",
    resultsId: "productLinkDeviceModelResults",
    arrowSelector: ".product-link-device-model-arrow"
});
setupSearchPicklist({
    type: "picklist",
    inputId:
        "convergeApplicationInput",
    selectId:
        "convergeApplicationSelect",
    resultsId:
        "convergeApplicationResults",
    arrowSelector:
        ".converge-application-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId:
        "convergeEnvironmentInput",
    selectId:
        "convergeEnvironmentSelect",
    resultsId:
        "convergeEnvironmentResults",
    arrowSelector:
        ".converge-environment-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId:
        "subscriptionAssetDeviceModelInput",
    selectId:
        "subscriptionAssetDeviceModelSelect",
    resultsId:
        "subscriptionAssetDeviceModelResults",
    arrowSelector:
        ".subscription-asset-device-model-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "productLinkDataPointInput",
    selectId: "productLinkDataPointSelect",
    resultsId: "productLinkDataPointResults",
    arrowSelector: ".product-link-data-point-arrow"
});
setupSearchPicklist({
    type: "picklist",
    inputId:
        "enterpriseQrApplicationInput",
    selectId:
        "enterpriseQrApplicationSelect",
    resultsId:
        "enterpriseQrApplicationResults",
    arrowSelector:
        ".enterprise-qr-application-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId:
        "customerAdminModuleInput",
    selectId:
        "customerAdminModuleSelect",
    resultsId:
        "customerAdminModuleResults",
    arrowSelector:
        ".customer-admin-module-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId:
        "customerAdminReportTypeInput",
    selectId:
        "customerAdminReportTypeSelect",
    resultsId:
        "customerAdminReportTypeResults",
    arrowSelector:
        ".customer-admin-report-type-arrow"
});

populateInsightsHubInsightSelect();
setupSearchPicklist({
    type: "picklist",
    inputId:
        "insightsHubBiProductInput",
    selectId:
        "insightsHubBiProductSelect",
    resultsId:
        "insightsHubBiProductResults",
    arrowSelector:
        ".insights-hub-bi-product-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId:
        "insightsHubInsightInput",
    selectId:
        "insightsHubInsightSelect",
    resultsId:
        "insightsHubInsightResults",
    arrowSelector:
        ".insights-hub-insight-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "visionLinkEquipmentTypeInput",
    selectId: "visionLinkEquipmentTypeSelect",
    resultsId: "visionLinkEquipmentTypeResults",
    arrowSelector:
        ".visionlink-equipment-type-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId:
        "visionLinkIndustryInput",
    selectId:
        "visionLinkIndustrySelect",
    resultsId:
        "visionLinkIndustryResults",
    arrowSelector:
        ".vision-link-industry-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId:
        "visionLinkDeviceModelInput",
    selectId:
        "visionLinkDeviceModelSelect",
    resultsId:
        "visionLinkDeviceModelResults",
    arrowSelector:
        ".vision-link-device-model-arrow"
});

setupSearchPicklist({
    type: "picklist",
    inputId: "visionLinkDataPointInput",
    selectId: "visionLinkDataPointSelect",
    resultsId: "visionLinkDataPointResults",
    arrowSelector: ".visionlink-data-point-arrow"
});

    CONDITIONAL_FIELDS_CONFIG.forEach(function (cfg) {
        setupSearchPicklist(cfg);
        if (!cfg.skipToggle){
        setupToggle(cfg);
        }
    });

})();
/* -------------------------------------------
   SIMPLE FRONT-END FILTERING (ALL ARTICLES)
   Exact/partial phrase first, keyword count second, view count third
-------------------------------------------- */

const descInput = document.getElementById("description");
const resultsContainer = document.getElementById("needsAnswersFastResults");

const items = Array.from(
    document.querySelectorAll("#needsAnswersFastResults .needs-article-item")
);

const stopWords = [
    "a", "an", "and", "the", "from", "for",
    "to", "with", "is", "are", "was", "were",
    "of", "on", "in", "it", "this", "that",
    "i", "we", "my", "our", "can", "how",
    "help", "please","am", "be", "do", "go", "if", "me", "no", "or", "so", "up", "us"
];

items.forEach(function (item, index) {
    item.dataset.originalIndex = item.dataset.originalIndex || index;
});

function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getKeywords(text) {
    return normalizeText(text)
        .split(/\s+/)
        .filter(function (word) {
            return word.length >= 2 && !stopWords.includes(word);
        })
        .slice(0, 10);
}

function showDefaultTopFive() {
    items
        .sort(function (a, b) {
            return Number(a.dataset.originalIndex || 0) - Number(b.dataset.originalIndex || 0);
        })
        .forEach(function (item, index) {
            resultsContainer.appendChild(item);
            item.style.display = index < 5 ? "block" : "none";
        });
}

descInput.addEventListener("input", function () {
    const rawQuery = descInput.value || "";
    const keywords = getKeywords(rawQuery);

    if (keywords.length === 0) {
        showDefaultTopFive();
        return;
    }

    const cleanedWholePhrase = normalizeText(rawQuery);
const cleanedKeywordPhrase = keywords.join(" ");
    const matchedItems = [];

    items.forEach(function (item) {
        const searchableText = normalizeText(
            item.dataset.search || item.innerText || ""
        );

        const views = Number(item.dataset.views || 0);
        const originalIndex = Number(item.dataset.originalIndex || 0);

        let keywordScore = 0;

        keywords.forEach(function (keyword) {
            if (searchableText.includes(keyword)) {
                keywordScore++;
            }
        });

        const phraseMatch =
    (
        cleanedWholePhrase.length > 2 &&
        searchableText.includes(cleanedWholePhrase)
    ) ||
    (
        cleanedKeywordPhrase.length > 2 &&
        searchableText.includes(cleanedKeywordPhrase)
    );

        if (phraseMatch || keywordScore > 0) {
            matchedItems.push({
                element: item,
                phraseMatch: phraseMatch ? 1 : 0,
                keywordScore: keywordScore,
                views: views,
                originalIndex: originalIndex
            });
        }
    });

    items.forEach(function (item) {
        item.style.display = "none";
    });

    if (matchedItems.length === 0) {
        showDefaultTopFive();
        return;
    }

    matchedItems
        .sort(function (a, b) {
            if (b.phraseMatch !== a.phraseMatch) {
                return b.phraseMatch - a.phraseMatch;
            }

            if (b.keywordScore !== a.keywordScore) {
                return b.keywordScore - a.keywordScore;
            }

            if (b.views !== a.views) {
                return b.views - a.views;
            }

            return a.originalIndex - b.originalIndex;
        })
        .slice(0, 5)
        .forEach(function (result) {
            resultsContainer.appendChild(result.element);
            result.element.style.display = "block";
        });
});

/* -------------------------------------------
   KNOWLEDGE ARTICLE POPUP
-------------------------------------------- */

$(document).on("click", ".naf-article-link", function (e) {
    e.preventDefault();
    if (isDigitalMarketplaceSelected()) {
    showDigitalMarketplaceRedirect();
    return;
}

    const articleId = $(this).data("articleid");

    if (!articleId) {
        return;
    }

    $("#articlePopupFrame").attr(
        "src",
        "/knowledge-article-detail-popup?articleId=" + encodeURIComponent(articleId)
    );

    $("#articlePopupOverlay").css("display", "flex");
});

$("#articlePopupClose").on("click", function () {
    $("#articlePopupOverlay").hide();
    $("#articlePopupFrame").attr("src", "");
});

$("#articlePopupOverlay").on("click", function (e) {
    if (e.target.id === "articlePopupOverlay") {
        $("#articlePopupOverlay").hide();
        $("#articlePopupFrame").attr("src", "");
    }
});

(function () {
  const MAX = 250;
  const textarea = document.getElementById('description');
  if (!textarea) return;

  // elements already in HTML
  const counterEl = document.getElementById('descCounter');
  const warningEl = document.getElementById('descWarning');
  let hideTimer = null;

  function setCounter(n) {
    counterEl.textContent = n + ' / ' + MAX;
  }

  function showWarningOnce() {
    textarea.classList.add('maxed');
    warningEl.classList.add('active');
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      warningEl.classList.remove('active');
      textarea.classList.remove('maxed');
      hideTimer = null;
    }, 4000); // 4 seconds
  }

  function enforceAndUpdate() {
    let val = textarea.value || '';
    if (val.length > MAX) {
      textarea.value = val.substring(0, MAX);
      setCounter(MAX);
      showWarningOnce();
      try { textarea.setSelectionRange(MAX, MAX); } catch (e) {}
      return;
    }
    setCounter(val.length);
    if (val.length < MAX && hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
      warningEl.classList.remove('active');
      textarea.classList.remove('maxed');
    }
  }

  // events
  textarea.addEventListener('input', enforceAndUpdate);
  textarea.addEventListener('paste', function () { setTimeout(enforceAndUpdate, 0); });
  textarea.addEventListener('keydown', function (e) {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab'];
    if (allowed.indexOf(e.key) !== -1 || e.ctrlKey || e.metaKey) return;
    if ((textarea.value || '').length >= MAX) {
      e.preventDefault();
      showWarningOnce();
    }
  });

  // init (handles prefilled content)
  setCounter((textarea.value || '').length);
})();

/* -------------------------------------------
   PRODUCT-SPECIFIC FIELD HELP TEXT
-------------------------------------------- */
(function () {
    const helpWrappers = Array.from(
        document.querySelectorAll("[data-cat-field-help]")
    );

    if (helpWrappers.length === 0) {
        return;
    }

    function closeHelp(wrapper) {
        if (!wrapper) {
            return;
        }

        const button = wrapper.querySelector(
            ".cat-description-help-button"
        );

        const helpText = wrapper.querySelector(
            ".cat-description-help-text"
        );

        if (helpText) {
            helpText.classList.remove("is-open");
        }

        if (button) {
            button.setAttribute("aria-expanded", "false");
        }
    }

    function closeAllHelp(exceptWrapper) {
        helpWrappers.forEach(function (wrapper) {
            if (wrapper !== exceptWrapper) {
                closeHelp(wrapper);
            }
        });
    }

    function openHelp(wrapper) {
        if (!wrapper) {
            return;
        }

        const button = wrapper.querySelector(
            ".cat-description-help-button"
        );

        const helpText = wrapper.querySelector(
            ".cat-description-help-text"
        );

        if (!button || !helpText) {
            return;
        }

        closeAllHelp(wrapper);
        helpText.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
    }

    helpWrappers.forEach(function (wrapper) {
        const button = wrapper.querySelector(
            ".cat-description-help-button"
        );

        const helpText = wrapper.querySelector(
            ".cat-description-help-text"
        );

        const fieldWrapper = wrapper.closest(".cat-field");

        const field = fieldWrapper
            ? fieldWrapper.querySelector(
                "input:not([type='hidden']), textarea"
              )
            : null;

        if (button) {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();

                if (
                    helpText &&
                    helpText.classList.contains("is-open")
                ) {
                    closeHelp(wrapper);
                } else {
                    openHelp(wrapper);
                }
            });

            button.addEventListener("focus", function () {
                openHelp(wrapper);
            });
        }

        if (field) {
            field.addEventListener("focus", function () {
                openHelp(wrapper);
            });

            field.addEventListener("input", function () {
                openHelp(wrapper);
            });
        }
    });

    document.addEventListener("click", function (event) {
        const associatedField = event.target.closest(
            ".cat-field"
        );

        const associatedHelp = associatedField
            ? associatedField.querySelector(
                "[data-cat-field-help]"
              )
            : null;

        if (!associatedHelp) {
            closeAllHelp(null);
        }
    });

    document.addEventListener("focusin", function (event) {
        const associatedField = event.target.closest(
            ".cat-field"
        );

        const associatedHelp = associatedField
            ? associatedField.querySelector(
                "[data-cat-field-help]"
              )
            : null;

        if (!associatedHelp) {
            closeAllHelp(null);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") {
            return;
        }

        closeAllHelp(null);
    });
})();

/* -------------------------------------------
   AC2 - KEEP HELP VISIBLE DURING DATA ENTRY
-------------------------------------------- */
(function () {
    const descriptionField =
        document.getElementById("description");

    const descriptionHelpButton =
        document.getElementById("descriptionHelpButton");

    const descriptionHelpText =
        document.getElementById("descriptionHelpText");

    const descriptionHelpWrapper =
        document.querySelector(".cat-description-help-wrapper");

    const attachmentHelpButton =
        document.getElementById("attachmentHelpButton");

    const attachmentHelpText =
        document.getElementById("attachmentHelpText");

    const attachmentHelpWrapper =
        document.querySelector(".cat-attachment-help-wrapper");

    const attachmentContainer =
        document.getElementById("drag-drop-container");

    const dropZone =
        document.getElementById("drop-zone");

    const browseLink =
        document.getElementById("browse-link");

    const fileInput =
        document.getElementById("file-input");

    const filePreviews =
        document.getElementById("file-previews");

    function closeDescriptionHelp() {
        if (!descriptionHelpText || !descriptionHelpButton) {
            return;
        }

        descriptionHelpText.classList.remove("is-open");
        descriptionHelpButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    function closeAttachmentHelp() {
        if (!attachmentHelpText || !attachmentHelpButton) {
            return;
        }

        attachmentHelpText.classList.remove("is-open");
        attachmentHelpButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    function openDescriptionHelp() {
        if (!descriptionHelpText || !descriptionHelpButton) {
            return;
        }

        closeAttachmentHelp();

        descriptionHelpText.classList.add("is-open");
        descriptionHelpButton.setAttribute(
            "aria-expanded",
            "true"
        );
    }

    function openAttachmentHelp() {
        if (!attachmentHelpText || !attachmentHelpButton) {
            return;
        }

        closeDescriptionHelp();

        attachmentHelpText.classList.add("is-open");
        attachmentHelpButton.setAttribute(
            "aria-expanded",
            "true"
        );
    }

    function toggleDescriptionHelp(event) {
        event.preventDefault();
        event.stopPropagation();

        if (
            descriptionHelpText &&
            descriptionHelpText.classList.contains("is-open")
        ) {
            closeDescriptionHelp();
        } else {
            openDescriptionHelp();
        }
    }

    function toggleAttachmentHelp(event) {
        event.preventDefault();
        event.stopPropagation();

        if (
            attachmentHelpText &&
            attachmentHelpText.classList.contains("is-open")
        ) {
            closeAttachmentHelp();
        } else {
            openAttachmentHelp();
        }
    }

    function isDescriptionTarget(target) {
        if (!target) {
            return false;
        }

        return Boolean(
            target === descriptionField ||
            (
                descriptionHelpWrapper &&
                descriptionHelpWrapper.contains(target)
            )
        );
    }

    function isAttachmentTarget(target) {
        if (!target) {
            return false;
        }

        return Boolean(
            (
                attachmentHelpWrapper &&
                attachmentHelpWrapper.contains(target)
            ) ||
            (
                attachmentContainer &&
                attachmentContainer.contains(target)
            ) ||
            (
                dropZone &&
                dropZone.contains(target)
            ) ||
            (
                browseLink &&
                browseLink.contains(target)
            ) ||
            target === fileInput ||
            (
                filePreviews &&
                filePreviews.contains(target)
            )
        );
    }

    /* Description help opens and stays open while typing */
    if (descriptionField) {
        descriptionField.addEventListener(
            "focus",
            openDescriptionHelp
        );

        descriptionField.addEventListener(
            "input",
            openDescriptionHelp
        );

        descriptionField.addEventListener(
            "keydown",
            function (event) {
                if (event.key !== "Escape") {
                    openDescriptionHelp();
                }
            }
        );
    }

    if (descriptionHelpButton) {
        descriptionHelpButton.addEventListener(
            "click",
            toggleDescriptionHelp
        );

        descriptionHelpButton.addEventListener(
            "focus",
            openDescriptionHelp
        );
    }

    /* Attachment help stays open during file interaction */
    if (attachmentHelpButton) {
        attachmentHelpButton.addEventListener(
            "click",
            toggleAttachmentHelp
        );

        attachmentHelpButton.addEventListener(
            "focus",
            openAttachmentHelp
        );
    }

    if (attachmentContainer) {
        attachmentContainer.addEventListener(
            "click",
            openAttachmentHelp
        );

        attachmentContainer.addEventListener(
            "focusin",
            openAttachmentHelp
        );

        attachmentContainer.addEventListener(
            "dragenter",
            openAttachmentHelp
        );

        attachmentContainer.addEventListener(
            "dragover",
            openAttachmentHelp
        );
    }

    if (dropZone) {
        dropZone.addEventListener(
            "click",
            openAttachmentHelp
        );

        dropZone.addEventListener(
            "dragenter",
            openAttachmentHelp
        );

        dropZone.addEventListener(
            "dragover",
            openAttachmentHelp
        );
    }

    if (browseLink) {
        browseLink.addEventListener(
            "click",
            openAttachmentHelp
        );

        browseLink.addEventListener(
            "focus",
            openAttachmentHelp
        );
    }

    if (fileInput) {
        fileInput.addEventListener(
            "change",
            openAttachmentHelp
        );

        fileInput.addEventListener(
            "focus",
            openAttachmentHelp
        );
    }

    if (filePreviews) {
        filePreviews.addEventListener(
            "click",
            openAttachmentHelp
        );

        filePreviews.addEventListener(
            "focusin",
            openAttachmentHelp
        );
    }

    /* Close help when user clicks outside both fields */
    document.addEventListener(
        "click",
        function (event) {
            const target = event.target;

            if (!isDescriptionTarget(target)) {
                closeDescriptionHelp();
            }

            if (!isAttachmentTarget(target)) {
                closeAttachmentHelp();
            }
        }
    );

    /* Close help when keyboard focus moves elsewhere */
    document.addEventListener(
        "focusin",
        function (event) {
            const target = event.target;

            if (
                !isDescriptionTarget(target) &&
                !isAttachmentTarget(target)
            ) {
                closeDescriptionHelp();
                closeAttachmentHelp();
            }
        }
    );

    /* Escape closes the currently open help */
    document.addEventListener(
        "keydown",
        function (event) {
            if (event.key !== "Escape") {
                return;
            }

            const descriptionWasOpen =
                descriptionHelpText &&
                descriptionHelpText.classList.contains("is-open");

            const attachmentWasOpen =
                attachmentHelpText &&
                attachmentHelpText.classList.contains("is-open");

            closeDescriptionHelp();
            closeAttachmentHelp();

            if (
                descriptionWasOpen &&
                descriptionHelpButton
            ) {
                descriptionHelpButton.focus();
            } else if (
                attachmentWasOpen &&
                attachmentHelpButton
            ) {
                attachmentHelpButton.focus();
            }
        }
    );
})();

window.setTimeout(function () {
    applyDigitalMarketplaceRedirectRule();
    applyProductAttachmentHelpText();
    applyInsightsHubFieldRules();
    applyInsightsHubAttachmentRequirement();
}, 400);

});
/* ===== Needs Answers Fast - mobile pe scroll ke saath follow ===== */
(function () {
    var ticking = false;

    function catFollowPanel() {
        var panel  = document.querySelector('.cat-right-panel');
        var layout = document.querySelector('.cat-layout');

        if (!panel || !layout) { return; }

        if (window.innerWidth > 900) {
            panel.style.transform = '';
            return;
        }

        var topGap      = 70;
        var layoutTop   = layout.getBoundingClientRect().top;
        var panelHeight = panel.offsetHeight;

        var offset = topGap - layoutTop;
        if (offset < 0) { offset = 0; }

        var maxOffset = layout.offsetHeight - panelHeight - 20;
        if (maxOffset < 0) { maxOffset = 0; }
        if (offset > maxOffset) { offset = maxOffset; }

        panel.style.transform = 'translateY(' + offset + 'px)';
    }

    function onScroll() {
        if (ticking) { return; }
        ticking = true;
        window.requestAnimationFrame(function () {
            catFollowPanel();
            ticking = false;
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    setTimeout(catFollowPanel, 300);
    setTimeout(catFollowPanel, 1200);
})();

