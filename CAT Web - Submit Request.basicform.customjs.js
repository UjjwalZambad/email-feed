$(document).ready(function () {

    /*
        =====================================================
        CONFIG
        =====================================================
        These labels must match the labels visible on your Basic Form.
    */

    const REQUIRED_OOB_FIELDS = [
        "What product are you submitting a support case for?",
        "Subject",
        "What type of issue are you reporting?",
        "How can we help?"
    ];

    const CAT_CAPTCHA_CONFIG = {
        inputSelector: "input[id$='CaptchaTextBox'], input[name$='CaptchaTextBox']", 
        requiredMessage: "{{ snippets['CAT_Error_Verification'] }}",
        incorrectMessage: "{{ snippets['CAT_Error_IncorrectCaptcha'] }}",
        submitAttemptKey: "CAT_CAPTCHA_SUBMIT_ATTEMPTED",
        customFieldStorageKey: "CAT_CUSTOM_FIELD_VALUES"
    };

    const ALLOWED_EXTENSIONS = ["pdf", "txt", "png", "jpg", "jpeg", "doc", "docx", "xlsx"];
    const MAX_FILES = 5;
    const MAX_FILE_SIZE_MB = 25;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    let selectedFiles = [];
    let oobFileInput = null;
    let isSyncingToOobInput = false;

    let catContactOperationInProgress = false;
    let catResolvedContact = null;
    let catBypassSubmitInterception = false;
    let oobFuelPromiseRoutingActive = false;
    const OOB_ASSET_STORAGE_KEY =
    "CAT_OOB_PENDING_ASSET_DATA";
const CAT_DYNAMICS_REQUIRED_FIELDS = {
    productTechnologyId: "productid",
    dealerNameId: "cat_dealername",
    customerId: "customerid",
    caseChannelId: "caseorigincode",
    requestedFromId: "cat_requestedfrom",
    priorityId: "prioritycode",
    caseTypeId: "casetypecode",
    secondaryProductTechnologyId:"cat_secondaryproducttechnology_id",
    additionalApplicationsId:"cat_additionalapplications",
    subjectId: "title",
    subjectEnglishId: "cat_subjectenglish",
    supportTypeId: "cat_supporttype_id",
    descriptionId: "description",
    descriptionEnglishId: "cat_descriptionenglish",
    languageId: "cat_language",
    anonymousContactId: "eca4cfc2-888d-f111-8076-70a8a5b0800d",
    anonymousContactName: "Portal Guest User"
};

var catLanguageLcid = {% case website.selected_language.code | downcase %}
    {% when 'ar-sa' %}1025
    {% when 'eu-es' %}1069
    {% when 'bg-bg' %}1026
    {% when 'ca-es' %}1027
    {% when 'zh-cn' %}2052
    {% when 'zh-hk' %}3076
    {% when 'zh-tw' %}1028
    {% when 'hr-hr' %}1050
    {% when 'cs-cz' %}1029
    {% when 'da-dk' %}1030
    {% when 'nl-nl' %}1043
    {% when 'en-us' %}1033
    {% when 'et-ee' %}1061
    {% when 'fi-fi' %}1035
    {% when 'fr-fr' %}1036
    {% when 'gl-es' %}1110
    {% when 'de-de' %}1031
    {% when 'el-gr' %}1032
    {% when 'he-il' %}1037
    {% when 'hi-in' %}1081
    {% when 'hu-hu' %}1038
    {% when 'id-id' %}1057
    {% when 'it-it' %}1040
    {% when 'ja-jp' %}1041
    {% when 'kn-in' %}1099
    {% when 'kk-kz' %}1087
    {% when 'ko-kr' %}1042
    {% when 'lv-lv' %}1062
    {% when 'lt-lt' %}1063
    {% when 'ms-my' %}1086
    {% when 'nb-no' %}1044
    {% when 'pl-pl' %}1045
    {% when 'pt-br' %}1046
    {% when 'pt-pt' %}2070
    {% when 'ro-ro' %}1048
    {% when 'ru-ru' %}1049
    {% when 'sr-cyrl-rs' %}3098
    {% when 'sr-latn-rs' %}2074
    {% when 'sk-sk' %}1051
    {% when 'sl-si' %}1060
    {% when 'es-es' %}3082
    {% when 'sv-se' %}1053
    {% when 'ta-in' %}1097
    {% when 'te-in' %}1098
    {% when 'th-th' %}1054
    {% when 'tr-tr' %}1055
    {% when 'uk-ua' %}1058
    {% when 'vi-vn' %}1066
    {% else %}1033
{% endcase %};

const CAT_SEARCHABLE_PICKLIST_FIELDS = [
    {
        fieldId: CAT_DYNAMICS_REQUIRED_FIELDS.productTechnologyId,
        label: "What product are you submitting a support case for?",
        placeholder: "Select Product"
    },
    {
        fieldId: CAT_DYNAMICS_REQUIRED_FIELDS.dealerNameId,
        label: "Dealer Name",
        placeholder: "Select Dealer"
    },
    {
        fieldId: CAT_DYNAMICS_REQUIRED_FIELDS.supportTypeId,
        label: "What type of issue are you reporting?",
        placeholder: "Select Support Type"
    }
];

(function (webapi, $) {
    function safeAjax(ajaxOptions) {
        var deferredAjax = $.Deferred();

        if (!window.shell || typeof shell.getTokenDeferred !== "function") {
            console.error("CAT: Power Pages shell.getTokenDeferred was not found.");
            deferredAjax.reject("Power Pages shell token function was not found.");
            return deferredAjax.promise();
        }

        shell.getTokenDeferred().done(function (token) {
            ajaxOptions.headers = ajaxOptions.headers || {};
            ajaxOptions.headers["__RequestVerificationToken"] = token;
            ajaxOptions.headers["OData-Version"] = "4.0";
            ajaxOptions.headers["OData-MaxVersion"] = "4.0";
            ajaxOptions.headers["Accept"] = "application/json";

            $.ajax(ajaxOptions)
                .done(function (data, textStatus, jqXHR) {
                    if (typeof validateLoginSession === "function") {
                        validateLoginSession(data, textStatus, jqXHR, deferredAjax.resolve);
                    } else {
                        deferredAjax.resolve(data, textStatus, jqXHR);
                    }
                })
                .fail(function (xhr, textStatus, errorThrown) {
                    console.error("CAT: Portal Web API failed:", {
                        status: xhr.status,
                        textStatus: textStatus,
                        errorThrown: errorThrown,
                        responseText: xhr.responseText
                    });

                    deferredAjax.reject(xhr, textStatus, errorThrown);
                });
        }).fail(function () {
            deferredAjax.rejectWith(this, arguments);
        });

        return deferredAjax.promise();
    }

    webapi.safeAjax = webapi.safeAjax || safeAjax;
})(window.webapi = window.webapi || {}, jQuery);


function getLoggedInOrAnonymousContact() {
    const isAuthenticated = $("#seedIsAuthenticated").val() === "true";
    const loggedInContactId = $("#seedContactId").val();
    const loggedInContactName = $("#seedContactName").val();

    if (isAuthenticated && loggedInContactId) {
        return {
            id: loggedInContactId,
            name: loggedInContactName || "Logged in Contact",
            entityName: "contact"
        };
    }

    return {
        id: CAT_DYNAMICS_REQUIRED_FIELDS.anonymousContactId,
        name: CAT_DYNAMICS_REQUIRED_FIELDS.anonymousContactName,
        entityName: "contact"
    };
}

function setCustomerLookupValue() {
    if (catResolvedContact && catResolvedContact.id) {
        setLookupValue(
            CAT_DYNAMICS_REQUIRED_FIELDS.customerId,
            catResolvedContact.id,
            catResolvedContact.name,
            "contact"
        );

        return;
    }

    const customer = getLoggedInOrAnonymousContact();

    setLookupValue(
        CAT_DYNAMICS_REQUIRED_FIELDS.customerId,
        customer.id,
        customer.name,
        customer.entityName
    );
}

function setOobLanguageValue() {
    $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.languageId)
        .val(catLanguageLcid)
        .trigger("change");
}

function syncEnglishHiddenFields() {
    const subjectValue = $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.subjectId).val() || "";
    const descriptionValue = $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.descriptionId).val() || "";

    $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.subjectEnglishId)
        .val(subjectValue)
        .trigger("change");

    $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.descriptionEnglishId)
        .val(descriptionValue)
        .trigger("change");
}

function hideBasicFormFieldById(fieldId) {
    const selectors = [
        "#" + fieldId,
        "#" + fieldId + "_name",
        "#" + fieldId + "_entityname"
    ];

    selectors.forEach(function (selector) {
        const $field = $(selector);

        if (!$field.length) {
            return;
        }

        const $cell = $field.closest("td.cell, td.clearfix.cell, .cell, .form-group");
        const $row = $field.closest("tr");

        if ($cell.length) {
            $cell.addClass("cat-hidden-field");
            $cell.attr("style", "display:none !important;");
        }

        if ($row.length) {
            $row.addClass("cat-hidden-field");
            $row.attr("style", "display:none !important;");
        }
    });
}

function hideBasicFormFieldByLabel(labelText) {
    const normalizedTarget = normalizeText(labelText);

    $("label").each(function () {
        const currentLabelText = normalizeText($(this).text());

        if (currentLabelText === normalizedTarget) {
            const $cell = $(this).closest("td.cell, td.clearfix.cell, .cell, .form-group");
            const $row = $(this).closest("tr");

            if ($cell.length) {
                $cell.addClass("cat-hidden-field");
                $cell.attr("style", "display:none !important;");
            }

            if ($row.length) {
                $row.addClass("cat-hidden-field");
                $row.attr("style", "display:none !important;");
            }
        }
    });
}

function getSelectOptionItems($select) {
    const items = [];

    $select.find("option").each(function () {
        const value = ($(this).attr("value") || "").trim();
        const text = ($(this).text() || "").trim();

        if (!value || !text) {
            return;
        }

        items.push({
            value: value,
            text: text
        });
    });

    return items;
}

function buildOptionalCustomFieldHtml(id, label, type) {
    return (
        '<tr class="cat-injected-row cat-hidden-field" id="' + id + 'Row" style="display:none !important;">' +
        '<td class="cell" colspan="2" style="display:none !important;">' +
        '<div class="cat-field" id="' + id + 'Wrapper">' +
            '<label for="' + id + '">' + htmlEncode(label) + '</label>' +
            '<input type="' + type + '" id="' + id + '" class="cat-custom-input" placeholder="Optional" />' +
        '</div>' +
        '</td></tr>'
    );
}

function getSelectedOptionText($select) {
    const selectedText = $select.find("option:selected").text();

    return (selectedText || "").trim();
}
function buildSearchablePicklist(fieldConfig) {
    const fieldId = fieldConfig.fieldId;
    let $select = $("#" + fieldId);

    if (!$select.length && fieldConfig.label) {
        $select = findOobFieldByLabel(fieldConfig.label);
    }

    if (!$select.length) {
        console.warn("CAT searchable picklist skipped. Field not found:", fieldId);
        return;
    }

    if (!$select.is("select")) {
        console.warn("CAT searchable picklist skipped. Field is not a select:", fieldId);
        return;
    }

    /* Build every internal id off the field's REAL resolved id, not
       the string that was passed in — those can differ (e.g. "What
       type of issue" is configured with the wrong static id and only
       gets found via the label fallback above). Using the real id
       here is what makes the guard below actually work on rebuilds. */
    const resolvedId = $select.attr("id");

    if ($select.next(".cat-searchable-picklist").length || $("#" + resolvedId + "_catSearchInput").length) {
        return;
    }

    const optionItems = getSelectOptionItems($select);

    const selectedValue = ($select.val() || "").trim();
    const selectedText = selectedValue ? getSelectedOptionText($select) : "";

    const $wrapper = $("<div></div>")
        .addClass("cat-searchable-picklist")
        .attr("id", resolvedId + "_catSearchWrapper");

    const $input = $("<input>")
        .attr("type", "text")
        .attr("id", resolvedId + "_catSearchInput")
        .attr("autocomplete", "off")
        .attr("placeholder", fieldConfig.placeholder || "Select")
        .addClass("cat-searchable-input")
        .val(selectedText);

    const $button = $("<span></span>")
        .attr("id", resolvedId + "_catSearchButton")
        .addClass("cat-searchable-button")
        .attr("role", "button")
        .attr("aria-label", "Open list")
        .attr("tabindex", "-1")
        .append(
            $("<i></i>")
                .addClass("fa fa-chevron-down cat-searchable-arrow")
                .attr("aria-hidden", "true")
        );

    const $list = $("<div></div>")
        .attr("id", resolvedId + "_catSearchList")
        .addClass("cat-searchable-list")
        .hide();

    $wrapper.append($input);
    $wrapper.append($button);
    $wrapper.append($list);

    $select.after($wrapper);
    $select.addClass("cat-original-select-hidden");
    $select.hide();

    let catArrowInteractionInProgress = false;

    function openList() {
        $wrapper.addClass("open");
        $button.attr("aria-label", "Close list");
        renderList($input.val());
    }

    function closeList() {
        $wrapper.removeClass("open");
        $button.attr("aria-label", "Open list");
        $list.hide();
    }

    function renderList(filterText) {
        const query = (filterText || "").toLowerCase();
        $list.empty();

        const matches = optionItems.filter(function (item) {
            return item.text.toLowerCase().indexOf(query) >= 0;
        });

        if (matches.length === 0) {
            $("<div></div>")
                .addClass("cat-searchable-empty")
                .text("No results found")
                .appendTo($list);

            $wrapper.addClass("open");
            $list.show();
            return;
        }

        matches.forEach(function (item) {
            $("<div></div>")
                .addClass("cat-searchable-option")
                .attr("data-value", item.value)
                .attr("data-text", item.text)
                .text(item.text)
                .appendTo($list);
        });

            $wrapper.addClass("open");
            $list.show();
    }

    function selectItem(value, text) {
        $select.val(value);
        $select.trigger("change");
        $select.trigger("blur");

        $input.val(text);
        closeList();
        clearOobError($select);
    }

    function clearSelection() {
        $select.val("");
        $select.trigger("change");
        $input.val("");
    }

    $input.on("focus", function () {
        if (!$wrapper.hasClass("open")) {
            openList();
        }
    });

    $input.on("input", function () {
        $wrapper.addClass("open");
        $button.attr("aria-label", "Close list");
        renderList($input.val());
    });

    $button.off("mousedown.catSearchArrow").on("mousedown.catSearchArrow", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        catArrowInteractionInProgress = true;

        if ($wrapper.hasClass("open")) {
            closeList();

            setTimeout(function () {
                catArrowInteractionInProgress = false;
            }, 300);

            return false;
        }

        openList();

        setTimeout(function () {
            try {
                $input.focus();
            } catch (ignore) {}
        }, 0);

        setTimeout(function () {
            catArrowInteractionInProgress = false;
        }, 300);

        return false;
    });

    $list.on("mousedown", ".cat-searchable-option", function (e) {
        e.preventDefault();

        const value = $(this).attr("data-value");
        const text = $(this).attr("data-text");

        selectItem(value, text);
    });

    $input.off("blur.catSearchInput").on("blur.catSearchInput", function () {
        setTimeout(function () {
            if (catArrowInteractionInProgress) {
                return;
            }

            const typedText = ($input.val() || "").trim();

            if (!typedText) {
                clearSelection();
                closeList();
                return;
            }

            const exactMatch = optionItems.find(function (item) {
                return item.text.toLowerCase() === typedText.toLowerCase();
            });

            if (exactMatch) {
                selectItem(exactMatch.value, exactMatch.text);
                return;
            }

            const currentValue = ($select.val() || "").trim();

            if (currentValue) {
                $input.val(getSelectedOptionText($select));
            } else {
                $input.val("");
            }

            closeList();
        }, 200);
    });


$(document)
    .off("mousedown." + resolvedId + "SearchablePicklist")
    .on("mousedown." + resolvedId + "SearchablePicklist", function (e) {
        if ($(e.target).closest($wrapper).length === 0) {
            closeList();
        }
    });

}
function initializeSearchablePicklists() {
    CAT_SEARCHABLE_PICKLIST_FIELDS.forEach(function (fieldConfig) {
        buildSearchablePicklist(fieldConfig);
    });
    markOobFieldRequiredVisually("What type of issue are you reporting?");
}

// <!-- ===================== Global variable - URL parameter based filtering starts ===================== -->

// ============================================================
// BASIC FORM PRODUCT INITIALIZATION
// ============================================================

let catInitialSourceProductId = "";
let catInitialSourceProductName = "";
let catBasicFormProductTimer = null;


// ============================================================
// NORMALIZE PRODUCT GUID
// ============================================================

function normalizeCatProductGuid(value) {
    return String(value || "")
        .replace(/[{}]/g, "")
        .trim()
        .toLowerCase();
}


// ============================================================
// AUTO-SELECT PRODUCT FROM GLOBAL PRODUCT CONTEXT
// ============================================================

function autoSelectOobProductFromResolvedId(productIdFromEvent) {
    const resolvedProductId =
        normalizeCatProductGuid(
            productIdFromEvent ||
            window.CAT_GA_ProductID ||
            sessionStorage.getItem("CAT_GA_ProductID")
        );

    console.log(
        "BASIC FORM: Resolved Product ID:",
        resolvedProductId
    );

    if (!resolvedProductId) {
        return false;
    }

    if (
        typeof CAT_DYNAMICS_REQUIRED_FIELDS === "undefined" ||
        !CAT_DYNAMICS_REQUIRED_FIELDS.productTechnologyId
    ) {
        console.log(
            "BASIC FORM: Required field configuration is not ready."
        );

        return false;
    }

    const productFieldId =
        CAT_DYNAMICS_REQUIRED_FIELDS.productTechnologyId;

    const $select =
        $("#" + productFieldId);

    if (!$select.length) {
        console.log(
            "BASIC FORM: Product dropdown is not rendered yet:",
            productFieldId
        );

        return false;
    }

    const $options =
        $select.find("option");

    if (!$options.length) {
        console.log(
            "BASIC FORM: Product dropdown options are not loaded yet."
        );

        return false;
    }

    let matchedOption = null;

    $options.each(function () {
        const optionProductId =
            normalizeCatProductGuid(
                this.value
            );

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
            "BASIC FORM: Matching Product option not found.",
            {
                resolvedProductId:
                    resolvedProductId,
                fieldId:
                    productFieldId,
                availableValues:
                    $options.map(function () {
                        return this.value;
                    }).get()
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

    catInitialSourceProductId =
        matchedProductId;

    catInitialSourceProductName =
        matchedProductName;

    $select.val(
        matchedProductId
    );

    const searchInputId =
        $select.attr("id") +
        "_catSearchInput";

    const $searchInput =
        $("#" + searchInputId);

    if ($searchInput.length) {
        $searchInput.val(
            matchedProductName
        );
    }

    $select.trigger("change");

    console.log(
        "BASIC FORM: Product preselected successfully.",
        {
            productId:
                catInitialSourceProductId,
            productName:
                catInitialSourceProductName,
            selectedDropdownValue:
                $select.val()
        }
    );

    return true;
}


// ============================================================
// INITIALIZE BASIC FORM PRODUCT
// ============================================================

function initializeBasicFormProduct(productIdFromEvent) {
    if (catBasicFormProductTimer) {
        clearInterval(
            catBasicFormProductTimer
        );

        catBasicFormProductTimer = null;
    }

    const completedImmediately =
        autoSelectOobProductFromResolvedId(
            productIdFromEvent
        );

    if (completedImmediately) {
        return;
    }

    let attempts = 0;
    const maximumAttempts = 50;

    catBasicFormProductTimer =
        setInterval(function () {
            attempts++;

            const completed =
                autoSelectOobProductFromResolvedId(
                    productIdFromEvent
                );

            if (
                completed ||
                attempts >= maximumAttempts
            ) {
                clearInterval(
                    catBasicFormProductTimer
                );

                catBasicFormProductTimer = null;

                if (!completed) {
                    console.warn(
                        "BASIC FORM: Product initialization stopped after 10 seconds."
                    );
                }
            }
        }, 200);
}


// ============================================================
// LISTEN FOR PRODUCT RESOLUTION FROM HEADER
// ============================================================

window.addEventListener(
    "CAT_GA_ProductContextReady",
    function (event) {
        const detail =
            event.detail || {};

        const resolvedProductId =
            detail.productId ||
            window.CAT_GA_ProductID ||
            sessionStorage.getItem(
                "CAT_GA_ProductID"
            ) ||
            "";

        if (!resolvedProductId) {
            return;
        }

        console.log(
            "BASIC FORM: Product context ready event received:",
            resolvedProductId
        );

        initializeBasicFormProduct(
            resolvedProductId
        );
    }
);


// ============================================================
// INITIALIZE ON PAGE LOAD
// ============================================================

$(document).ready(function () {
    console.log(
        "BASIC FORM: Starting product initialization."
    );

    initializeBasicFormProduct();
});

// <!-- ===================== Global variable - URL parameter based filtering ends ===================== -->


document.addEventListener("catGaProductResolved", autoSelectOobProductFromResolvedId);

function setOobSourceLookupValue() {
    const sourceProductId =
        catInitialSourceProductId ||
        "8874ff1c-10ac-f111-aaac-7ced8d6fd504";

    const sourceProductName =
        catInitialSourceProductName ||
        "CCS General code/Queue Type";

    setLookupValue(
        "cat_source",
        sourceProductId,
        sourceProductName,
        "product"
    );
}

function hideAutoFilledDynamicsFields() {
    hideBasicFormFieldById(CAT_DYNAMICS_REQUIRED_FIELDS.customerId);
    hideBasicFormFieldById(CAT_DYNAMICS_REQUIRED_FIELDS.requestedFromId);
    hideBasicFormFieldById(CAT_DYNAMICS_REQUIRED_FIELDS.caseChannelId);
    hideBasicFormFieldById(
    CAT_DYNAMICS_REQUIRED_FIELDS
        .priorityId
);

hideBasicFormFieldById(
    CAT_DYNAMICS_REQUIRED_FIELDS
        .caseTypeId
);
    hideBasicFormFieldById(CAT_DYNAMICS_REQUIRED_FIELDS.subjectEnglishId);
    hideBasicFormFieldById(CAT_DYNAMICS_REQUIRED_FIELDS.descriptionEnglishId);
    hideBasicFormFieldById(CAT_DYNAMICS_REQUIRED_FIELDS.languageId);
    hideBasicFormFieldByLabel("Language");
       hideBasicFormFieldById(
    CAT_DYNAMICS_REQUIRED_FIELDS
        .secondaryProductTechnologyId
);

hideBasicFormFieldById(
    CAT_DYNAMICS_REQUIRED_FIELDS
        .additionalApplicationsId
);

    hideBasicFormFieldByLabel("Customer");
    hideBasicFormFieldByLabel("Requested From");
    hideBasicFormFieldByLabel("Requested from");
    hideBasicFormFieldByLabel("Case Channel");
    hideBasicFormFieldByLabel("Priority");

hideBasicFormFieldByLabel(
    "Case Type"
);

hideBasicFormFieldByLabel(
    "Case Category"
);
    hideBasicFormFieldByLabel("Subject English");
    hideBasicFormFieldByLabel("Description English");
    hideBasicFormFieldByLabel(
    "Secondary Product Technology"
);

hideBasicFormFieldByLabel(
    "Additional Applications"
);

hideBasicFormFieldByLabel(
    "Additional Application"
);

hideBasicFormFieldByLabel("Source");
 

    $(".cat-hidden-field").attr("style", "display:none !important;");

    $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.descriptionEnglishId)
        .attr("style", "display:none !important;")
        .closest(".control")
        .addClass("cat-hidden-field")
        .attr("style", "display:none !important;");

$("#" + CAT_DYNAMICS_REQUIRED_FIELDS.subjectEnglishId)
.attr("style", "display:none !important;")
.closest(".control")
.addClass("cat-hidden-field")
  .attr("style", "display:none !important;");
}


function getOobFuelPromiseRoutingProductId(
    productName
) {
    const expectedName =
        normalizeOobProductName(
            productName
        );

    const productElement =
        Array.from(
            document.querySelectorAll(
                ".oob-fuel-promise-routing-product"
            )
        ).find(function (element) {
            const currentName =
                normalizeOobProductName(
                    element.getAttribute(
                        "data-product-name"
                    )
                );

            return currentName ===
                expectedName;
        });

    if (!productElement) {
        return "";
    }

    return normalizeGuid(
        productElement.getAttribute(
            "data-product-id"
        )
    );
}
function setOobProductSelectValue(
    fieldId,
    productId,
    productName
) {
    const cleanProductId =
        normalizeGuid(productId);

    const $field =
        $("#" + fieldId);

    if (!$field.length || !cleanProductId) {
        return false;
    }

    if ($field.is("select")) {
        let $option =
            $field.find(
                'option[value="' +
                cleanProductId +
                '"]'
            );

        if (!$option.length) {
            $option =
                $("<option></option>")
                    .attr(
                        "value",
                        cleanProductId
                    )
                    .text(productName);

            $field.append($option);
        }

        $field.val(cleanProductId);

        const searchInputId =
            fieldId +
            "_catSearchInput";

        $("#" + searchInputId)
            .val(productName);

        $field.trigger("change");

        return Boolean($field.val());
    }

    setLookupValue(
        fieldId,
        cleanProductId,
        productName,
        "product"
    );

    return Boolean(
        $("#" + fieldId).val()
    );
}

function applyOobFuelPromiseRouting() {
    if (
        !isOobFuelPromiseProgramSelected()
    ) {
        return;
    }
    oobFuelPromiseRoutingActive = true;

    const primaryOtherId =
        getOobFuelPromiseRoutingProductId(
            "Other"
        );

    const secondaryOtherId =
        getOobFuelPromiseRoutingProductId(
            "Other"
        );

    const additionalApplicationElement =
        document.getElementById(
            "oobFuelPromiseAdditionalApplication"
        );

    const additionalApplicationId =
        additionalApplicationElement
            ? normalizeGuid(
                additionalApplicationElement
                    .getAttribute(
                        "data-record-id"
                    )
            )
            : "";

    if (!primaryOtherId) {
        throw new Error(
            "Fuel Promise Program routing failed: " +
            "the Other Product record was not found."
        );
    }

    if (!secondaryOtherId) {
        throw new Error(
            "Fuel Promise Program routing failed: " +
            "the Other - Other Product record " +
            "was not found."
        );
    }

    if (!additionalApplicationId) {
        throw new Error(
            "Fuel Promise Program routing failed: " +
            "the Additional Application record " +
            "was not found."
        );
    }

    const primaryProductSet =
    setOobProductSelectValue(
        CAT_DYNAMICS_REQUIRED_FIELDS
            .productTechnologyId,
        primaryOtherId,
        "Other"
    );

if (!primaryProductSet) {
    throw new Error(
        "Fuel Promise Program routing failed: " +
        "Product Technology could not be set to Other."
    );
}

setLookupValue(
    CAT_DYNAMICS_REQUIRED_FIELDS
        .secondaryProductTechnologyId,
    secondaryOtherId,
    "Other",
    "product"
);

    setLookupValue(
        CAT_DYNAMICS_REQUIRED_FIELDS
            .additionalApplicationsId,
        additionalApplicationId,
        "Fuel Promise Program",
        "cat_additionalapplication"
    );
}

function applyOobCaseConfiguration() {
    const issueConfiguration =
        getOobSelectedIssueConfiguration();

    if (!issueConfiguration) {
        return;
    }

    const $priority =
        $("#" +
            CAT_DYNAMICS_REQUIRED_FIELDS
                .priorityId
        );

    const $caseType =
        $("#" +
            CAT_DYNAMICS_REQUIRED_FIELDS
                .caseTypeId
        );

    if (
        $priority.length &&
        issueConfiguration.priorityValue !==
            undefined &&
        issueConfiguration.priorityValue !==
            null
    ) {
        $priority
            .val(
                String(
                    issueConfiguration
                        .priorityValue
                )
            )
            .trigger("change");
    }

    if (
        $caseType.length &&
        issueConfiguration.caseTypeValue !==
            undefined &&
        issueConfiguration.caseTypeValue !==
            null
    ) {
        $caseType
            .val(
                String(
                    issueConfiguration
                        .caseTypeValue
                )
            )
            .trigger("change");
    }

    const productLinkTechOnSite =
        isOobProductLinkSelected() &&
        $("#" +
            OOB_PRODUCT_LINK_FIELDS
                .techOnSite.id
        ).is(":checked");

    const visionLinkTechOnSite =
        isOobVisionLinkSelected() &&
        $("#" +
            OOB_VISION_LINK_FIELDS
                .techOnSite.id
        ).is(":checked");

    if (
        $priority.length &&
        (
            productLinkTechOnSite ||
            visionLinkTechOnSite
        )
    ) {
        $priority
            .val("2")
            .trigger("change");
    }
}

function setRequiredDynamicsValuesBeforeSubmit() {
    if (catResolvedContact && catResolvedContact.id) {
        setCaseContactLookups(catResolvedContact);
    } else {
        setCustomerLookupValue();
        setRequestedFromLookupValue();
    }

   applyOobCaseConfiguration();
   applyOobFuelPromiseRouting();
   applyOobCatInspectRouting();
   savePendingOobAssetData();
   syncEnglishHiddenFields();
   setOobLanguageValue();

    const caseChannelValue = $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.caseChannelId).val();

    if (!caseChannelValue) {
        console.warn("Case Channel is blank. Confirm Basic Form Metadata default value is setting caseorigincode to Webform.");
    }
}

function wireRequiredDynamicsSync() {
    $(document).on("input change blur", "#" + CAT_DYNAMICS_REQUIRED_FIELDS.subjectId, function () {
        syncEnglishHiddenFields();
    });

    $(document).on("input change blur", "#" + CAT_DYNAMICS_REQUIRED_FIELDS.descriptionId, function () {
        syncEnglishHiddenFields();
    });
}


    /*
        =====================================================
        BASIC HELPERS
        =====================================================
    */

    function normalizeText(text) {
        return (text || "")
            .replace("*", "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function htmlEncode(value) {
        return $("<div>").text(value || "").html();
    }

    function getSeedValue(id) {
        return $("#" + id).val() || "";
    }

    function getTrimmedValue(selector) {
        return ($(selector).val() || "").trim();
    }

    function getCaptchaInput() {
    // 1) Your originally configured selector - kept as first try.
    var $configuredInput = $(CAT_CAPTCHA_CONFIG.inputSelector);
    if ($configuredInput.length) {
        return $configuredInput.first();
    }

    // 2) Anchor on the CAPTCHA image - its id/src is already
    //    guaranteed to contain "captcha" (your own CSS around
    //    line 13789 already depends on this being true).
    var $captchaImg = $("img").filter(function () {
        var id = (this.id || "").toLowerCase();
        var src = (this.src || "").toLowerCase();
        return id.indexOf("captcha") >= 0 || src.indexOf("captcha") >= 0;
    }).first();

    if ($captchaImg.length) {
        var $scope = $captchaImg.closest("td, .control, .captcha, .captcha-cell, div");
        var $nearInput = $scope.find("input[type='text'], input:not([type])").first();
        if ($nearInput.length) {
            return $nearInput;
        }
    }

    // 3) Anchor on the refresh/audio icon links - also confirmed
    //    to exist by your own rcRefreshImage/rcCaptchaAudioLink CSS.
    var $rcLink = $("a.rcRefreshImage, a.rcCaptchaAudioLink").first();
    if ($rcLink.length) {
        var $rcScope = $rcLink.closest("td, .control, .captcha, .captcha-cell, div");
        var $rcInput = $rcScope.find("input[type='text'], input:not([type])").first();
        if ($rcInput.length) {
            return $rcInput;
        }
    }

    // 4) Broad last-resort scan (unchanged from before)
    var $captchaInput = $();
    $("input").each(function () {
        var $input = $(this);
        var id = (this.id || "").toLowerCase();
        var name = (this.name || "").toLowerCase();
        var type = (this.type || "").toLowerCase();

        if (type !== "hidden" && (id.indexOf("captcha") >= 0 || name.indexOf("captcha") >= 0)) {
            $captchaInput = $input;
            return false;
        }
    });

    return $captchaInput;
}

   function stashOobAdditionalEmails() {
        var email1 = ($("#catAdditionalEmail1").val() || "").trim();
        var email2 = ($("#catAdditionalEmail2").val() || "").trim();

        if (!email1 && !email2) {
            sessionStorage.removeItem("CAT_OOB_PENDING_ADDITIONAL_EMAILS");
            return;
        }

        sessionStorage.setItem(
            "CAT_OOB_PENDING_ADDITIONAL_EMAILS",
            JSON.stringify({ email1: email1, email2: email2 })
        );
    }

    function saveCatCustomFieldValues() {
        stashOobAdditionalEmails();
        var values = {
            catFirstName: $("#catFirstName").val() || "",
            catLastName: $("#catLastName").val() || "",
            catEmail: $("#catEmail").val() || "",
            catCountry: $("#catCountry").val() || "",
            catState: $("#catState").val() || "",
            catCity: $("#catCity").val() || ""
        };

        try {
            sessionStorage.setItem(
                CAT_CAPTCHA_CONFIG.customFieldStorageKey,
                JSON.stringify(values)
            );
        } catch (e) {
            console.warn("CAT: Could not save custom field values.", e);
        }
    }

    // function restoreCatCustomFieldValues() {
    //     var rawValues = null;

    //     try {
    //         rawValues = sessionStorage.getItem(CAT_CAPTCHA_CONFIG.customFieldStorageKey);
    //     } catch (e) {
    //         rawValues = null;
    //     }

    //     if (!rawValues) {
    //         return;
    //     }

    //     try {
    //         var values = JSON.parse(rawValues);

    //         Object.keys(values).forEach(function (fieldId) {
    //             var $field = $("#" + fieldId);

    //             if ($field.length && !($field.val() || "").trim()) {
    //                 $field.val(values[fieldId]);
    //                 $field.trigger("change");
    //             }
    //         });
    //     } catch (e) {
    //         console.warn("CAT: Could not restore custom field values.", e);
    //     }
    // }

    function restoreCatCustomFieldValues(){
        try{
            sessionStorage.removeItem(CAT_CAPTCHA_CONFIG.customFieldStorageKey);
        } catch (e) {}
    }
    function saveCleanOobDescriptionSnapshot() {
    try {
        sessionStorage.setItem(
            "CAT_OOB_DESCRIPTION_RAW",
            $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.descriptionId).val() || ""
        );
    } catch (e) {
        console.warn("CAT: Could not save clean description snapshot.", e);
    }
}

// AFTER
function restoreCleanOobDescriptionIfNeeded() {
    var raw;

    try {
        raw = sessionStorage.getItem("CAT_OOB_DESCRIPTION_RAW");
    } catch (e) {
        raw = null;
    }

    if (raw === null) {
        return;
    }

    // Only restore if this reload is actually the result of a recent
    // failed submit attempt on THIS form. Otherwise it's stale data left
    // over from a previous, already-completed submission — discard it.
    var submitAttempted = sessionStorage.getItem(CAT_CAPTCHA_CONFIG.submitAttemptKey);
    var attemptTime = parseInt(sessionStorage.getItem(CAT_CAPTCHA_CONFIG.submitAttemptKey + "_TIME") || "0", 10);
    var elapsed = Date.now() - attemptTime;
    var isRecentSubmitReload = submitAttempted === "1" && attemptTime && elapsed <= 15000;

    if (!isRecentSubmitReload) {
        try {
            sessionStorage.removeItem("CAT_OOB_DESCRIPTION_RAW");
        } catch (e) {}
        return;
    }

    var $description = $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.descriptionId);

    if ($description.length) {
        $description.val(raw).trigger("change");
    }

    try {
        sessionStorage.removeItem("CAT_OOB_DESCRIPTION_RAW");
    } catch (e) {}
}

    function normalizeGuid(guid) {
        return (guid || "").replace(/[{}]/g, "").trim();
    }

    function escapeODataString(value) {
        return (value || "").replace(/'/g, "''");
    }

    function extractGuidFromHeader(value) {
        if (!value) {
            return "";
        }

        const match = value.match(/\(([^)]+)\)/);

        if (match && match[1]) {
            return normalizeGuid(match[1]);
        }

        return normalizeGuid(value);
    }

    function getCreatedRecordIdFromXhr(xhr) {
        if (!xhr || typeof xhr.getResponseHeader !== "function") {
            return "";
        }

        return (
            extractGuidFromHeader(xhr.getResponseHeader("entityid")) ||
            extractGuidFromHeader(xhr.getResponseHeader("EntityId")) ||
            extractGuidFromHeader(xhr.getResponseHeader("OData-EntityId")) ||
            extractGuidFromHeader(xhr.getResponseHeader("odata-entityid"))
        );
    }

    function setLookupValue(fieldId, id, name, entityName) {
        id = normalizeGuid(id);

        $("#" + fieldId).val(id);
        $("#" + fieldId + "_name").val(name || "");
        $("#" + fieldId + "_entityname").val(entityName || "contact");

        $("#" + fieldId).trigger("change");
        $("#" + fieldId + "_name").trigger("change");
        $("#" + fieldId + "_entityname").trigger("change");
    }

    function setCaseContactLookups(contact) {
        if (!contact || !contact.id) {
            return;
        }

        setLookupValue(
            CAT_DYNAMICS_REQUIRED_FIELDS.customerId,
            contact.id,
            contact.name,
            "contact"
        );

        setLookupValue(
            CAT_DYNAMICS_REQUIRED_FIELDS.requestedFromId,
            contact.id,
            contact.name,
            "contact"
        );
    }

    function buildContactPayloadFromCaseForm() {
        return {
            firstname: getTrimmedValue("#catFirstName"),
            lastname: getTrimmedValue("#catLastName"),
            emailaddress1: getTrimmedValue("#catEmail"),
            address1_country: getTrimmedValue("#catCountry"),
            address1_stateprovince: getTrimmedValue("#catState"),
            address1_city: getTrimmedValue("#catCity"),
            cat_persona: 100000005
        };
    }

    function getContactDisplayName(payload) {
        const fullName = ((payload.firstname || "") + " " + (payload.lastname || "")).trim();

        return fullName || payload.emailaddress1 || "Portal Contact";
    }

    function getExtension(fileName) {
        const index = fileName.lastIndexOf(".");
        return index >= 0 ? fileName.substring(index + 1).toLowerCase() : "";
    }

    function formatBytes(bytes) {
        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size = size / 1024;
            unitIndex++;
        }

        return size.toFixed(unitIndex === 0 ? 0 : 2) + " " + units[unitIndex];
    }

    function getOobFormContainer() {
        let $container = $(".crmEntityFormView").first();

        if (!$container.length) {
            $container = $("#EntityFormPanel").first();
        }

        if (!$container.length) {
            $container = $("form").first();
        }

        return $container;
    }

    function findOobFieldByLabel(labelText) {
        const normalizedTarget = normalizeText(labelText);
        let matchedControl = $();

        $("label").each(function () {
            const currentLabelText = normalizeText($(this).text());

            if (currentLabelText === normalizedTarget) {
                const forId = $(this).attr("for");

                if (forId && $("#" + forId).length) {
                    matchedControl = $("#" + forId);
                    return false;
                }

                const $wrapper = $(this).closest("tr, td, .cell, .form-group, .control");
                const $control = $wrapper.find("input, select, textarea").filter(":visible").first();

                if ($control.length) {
                    matchedControl = $control;
                    return false;
                }
            }
        });

        return matchedControl;
    }

function filterOobProductsByPersona() {
    const $productField = findOobFieldByLabel(
        "What product are you submitting a support case for?"
    );

    if (!$productField.length || !$productField.is("select")) {
        console.warn(
            "CAT: OOB Product field was not found or is not a select."
        );
        return;
    }

    const allowedProductIds = [];
    const allowedProductNames = [];

    $("#oobAllowedProducts [data-product-id]").each(function () {
        const productId = normalizeGuid(
            $(this).attr("data-product-id") || ""
        ).toLowerCase();

        const productName = (
            $(this).attr("data-product-name") || ""
        ).trim().toLowerCase();

        if (productId) {
            allowedProductIds.push(productId);
        }

        if (productName) {
            allowedProductNames.push(productName);
        }
    });

    if (
        allowedProductIds.length === 0 &&
        allowedProductNames.length === 0
    ) {
        console.warn(
            "CAT: No persona-filtered products were supplied to the OOB form."
        );
        return;
    }

    $productField.find("option").each(function () {
        const $option = $(this);
        const optionValue = normalizeGuid(
            $option.val() || ""
        ).toLowerCase();

        const optionText = (
            $option.text() || ""
        ).trim().toLowerCase();

        // Keep the default Select Product option.
        if (!optionValue) {
            return;
        }

        const isAllowedById =
            allowedProductIds.indexOf(optionValue) !== -1;

        const isAllowedByName =
            allowedProductNames.indexOf(optionText) !== -1;

        if (!isAllowedById && !isAllowedByName) {
            $option.remove();
        }
    });

    if (
        $productField.val() &&
        !$productField.find("option:selected").length
    ) {
        $productField.val("").trigger("change");
    }
}

function findActiveContactByEmailAndPersona(emailAddress) {
    const email = (emailAddress || "").trim();

    if (!email) {
        return $.Deferred().resolve(null).promise();
    }

    const escapedEmail = escapeODataString(email.toLowerCase());

    const query =
        "/_api/contacts" +
        "?$select=contactid,firstname,lastname,fullname,emailaddress1,statecode,cat_persona" +
        "&$top=1" +
        "&$filter=emailaddress1 eq '" + escapedEmail + "' and statecode eq 0 and cat_persona eq 100000005";

    console.log("CAT: Searching Contact by email and persona:", query);

    return webapi.safeAjax({
        type: "GET",
        url: query,
        contentType: "application/json; charset=utf-8"
    }).then(function (data) {
        console.log("CAT: Contact search response:", data);

        if (data && data.value && data.value.length > 0) {
            const row = data.value[0];

            return {
                id: row.contactid,
                name: row.fullname || ((row.firstname || "") + " " + (row.lastname || "")).trim() || row.emailaddress1 || "Portal Contact",
                entityName: "contact"
            };
        }

        return null;
    });
}


function getOrCreateContactFromCaseForm() {
    const payload = buildContactPayloadFromCaseForm();

    console.log("CAT: Contact payload from form:", payload);

    const missing = [];

    if (!payload.firstname) {
        missing.push("First Name");
    }

    if (!payload.lastname) {
        missing.push("Last Name");
    }

    if (!payload.emailaddress1) {
        missing.push("Email");
    }

    if (!payload.address1_country) {
        missing.push("Country");
    }


    if (missing.length > 0) {
        return $.Deferred()
            .reject("Missing required Contact fields: " + missing.join(", "))
            .promise();
    }

    return findActiveContactByEmailAndPersona(payload.emailaddress1)
        .then(function (existingContact) {
            if (existingContact && existingContact.id) {
                console.log("CAT: Existing active Contact found. Reusing Contact:", existingContact);
                return existingContact;
            }

            console.log("CAT: No matching Contact found. Creating new Contact.");

            return webapi.safeAjax({
                type: "POST",
                url: "/_api/contacts",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(payload)
            }).then(function (data, textStatus, xhr) {
                const contactId = getCreatedRecordIdFromXhr(xhr);

                console.log("CAT: Contact create response headers:", {
                    entityid: xhr.getResponseHeader("entityid"),
                    EntityId: xhr.getResponseHeader("EntityId"),
                    ODataEntityId: xhr.getResponseHeader("OData-EntityId"),
                    resolvedContactId: contactId
                });

                if (!contactId) {
                    return $.Deferred()
                        .reject("Contact was created, but the created Contact ID could not be read from the response header.")
                        .promise();
                }

                return {
                    id: contactId,
                    name: getContactDisplayName(payload),
                    entityName: "contact"
                };
            });
        });
}


function getOobFieldWrapper($field) {
    let $wrapper = $field.closest("td.cell, td.clearfix.cell");

    if (!$wrapper.length) {
        $wrapper = $field.closest(".cell");
    }

    if (!$wrapper.length) {
        $wrapper = $field.closest(".form-group");
    }

    if (!$wrapper.length) {
        $wrapper = $field.closest(".control");
    }

    if (!$wrapper.length) {
        $wrapper = $field.parent();
    }

    return $wrapper;
}

    function findOobWrapperByLabel(labelText) {
        const $field = findOobFieldByLabel(labelText);

        if (!$field.length) {
            return $();
        }

        return getOobFieldWrapper($field);
    }

     function markOobFieldRequiredVisually(labelText) {
        const $field = findOobFieldByLabel(labelText);

        if (!$field.length) {
            return;
        }

        const $wrapper = getOobFieldWrapper($field);

        const $label = $wrapper.find("label").filter(function () {
            return normalizeText($(this).text()) === normalizeText(labelText);
        }).first();

        if ($label.length && !$label.find(".cat-oob-required-marker").length) {
            $label.append(
                ' <span class="cat-oob-required-marker" style="color:#c00;">*</span>'
            );
        }
    }

    
/* ============================================================
   OOB CONDITIONAL FIELDS (optional fields only)
   Same idea as CONDITIONAL_FIELDS_CONFIG on the custom form:
   one entry per product-driven field. These are injected by
   JS into the OOB Basic Form, so they do NOT need to exist
   in CRM. Their values will be concatenated into Description
   on submit later.
============================================================ */
const OOB_CONDITIONAL_FIELDS_CONFIG = [
    { id: "oobAppVersion", label: "What is the app version?", type: "text",
      placeholder: "e.g. 4.4",
      helpText: "Example 4.4 Can we enforce standard app version formatting?",
      triggerValues: ["cat central", "cat® central"] },

    { id: "oobCustomerEmail", label: "Customer Email Address", type: "text",
      helpText: "Please encourage your customer to submit a shakelog",
      triggerValues: ["cat central", "cat® central"] },

    { id: "oobOnBehalf", label: "Are you submitting on behalf of another user?",
      type: "select", options: ["Yes", "No"],
      triggerValues: ["cat foresight", "cat® foresight"] },

    { id: "oobUrl", label: "URL", type: "text",
        helpText: "Please provide the URL of the window where you are experiencing the issue.",
      triggerValues: ["cat foresight", "cat® foresight"] },
    
      { id: "oobBiProductUrl", label: "URL of BI Product", type: "text",
    helpText: "If your request is related to a BI Product, please provide the URL or product name",
  triggerValues: [
      "dna - data notification alerts",
      "olga - opportunity lead generation analyzer",
      "stu - sales to users"
  ] },

    { id: "oobIpCustomer", label: "IP Customer Name", type: "text",
        helpText: "If multiple, include example of a customer impacted",
      triggerValues: ["cat integrated procurement", "cat® integrated procurement"] },

    { id: "oobIpProfile", label: "IP Profile (FMI)", type: "text",
        helpText: "If multiple, include example of a customer impacted",
      triggerValues: ["cat integrated procurement", "cat® integrated procurement"] },

    { id: "oobImpactedCws", label: "Impacted CWS ID", type: "text",
        helpText: "If multiple, include example of a customer impacted",
      triggerValues: ["cat integrated procurement", "cat® integrated procurement"] },

    { id: "oobImpactedDcn", label: "Impacted DCN(s)", type: "text",
        helpText: "If impacting everyone, type in \"everyone\" and provide one or two examples. If not applicable, put N/A",
      triggerValues: ["cat integrated procurement", "cat® integrated procurement"] },

    { id: "oobImpactedUsername", label: "Impacted Username", type: "text",
        helpText: "If multiple, include example of a customer impacted",
      triggerValues: ["cat integrated procurement", "cat® integrated procurement"] }
];


function loadOobProductConfigurations() {
    const configurations = {};

    document
        .querySelectorAll(
            ".oob-product-configuration-record"
        )
        .forEach(function (element) {
            const rawValue =
                (element.value || "").trim();

            if (!rawValue) {
                return;
            }

            try {
                const parsedValue =
                    JSON.parse(rawValue);

                Object.keys(parsedValue)
                    .forEach(function (productName) {
                        const normalizedName =
                            normalizeOobProductName(
                                productName
                            );

                        configurations[
                            normalizedName
                        ] = parsedValue[productName];
                    });
            } catch (error) {
                console.error(
                    "CAT: Invalid OOB product configuration:",
                    element.getAttribute(
                        "data-configuration-key"
                    ),
                    error
                );
            }
        });

    return configurations;
}

const OOB_PRODUCT_CONFIGURATIONS =
    loadOobProductConfigurations();

function getOobSelectedProductConfiguration() {
    const productName =
        getOobProductText();

    return (
        OOB_PRODUCT_CONFIGURATIONS[
            productName
        ] || null
    );
}

function getOobAllowedIssueValues() {
    const productConfiguration =
        getOobSelectedProductConfiguration();

    if (
        !productConfiguration ||
        !Array.isArray(
            productConfiguration.issueTypes
        )
    ) {
        return null;
    }

    return productConfiguration.issueTypes
        .map(function (issueType) {
            return String(
                issueType.value
            );
        });
}

function getOobSelectedIssueConfiguration() {
    const productConfiguration =
        getOobSelectedProductConfiguration();

    const issueValue =
        getOobIssueTypeValue();

    if (
        !productConfiguration ||
        !Array.isArray(
            productConfiguration.issueTypes
        )
    ) {
        return null;
    }

    return productConfiguration.issueTypes
        .find(function (issueType) {
            return (
                String(issueType.value) ===
                String(issueValue)
            );
        }) || null;
}

const OOB_PRODUCT_LINK_TRIGGERS = [
    "cat product link",
    "cat® product link",
    "cat product link™",
    "cat® product link™"
];

const OOB_VISION_LINK_TRIGGERS = [
    "vision link",
    "visionlink",
    "visionlink™"
];

const OOB_PRODUCT_LINK_ISSUE_VALUES = [
    "100000010",
    "100000011",
    "100000012",
    "100000013",
    "100000009"
];

const OOB_VISION_LINK_ISSUE_VALUES = [
    "100000014",
    "100000015",
    "100000010",
    "100000011",
    "100000012",
    "100000013",
    "100000006",
    "100000008",
    "100000009"
];

const OOB_PRODUCT_LINK_FIELD_RULES = {
    "100000010": {
        deviceModelVisible: true,
        deviceModelRequired: false,
        dataPointVisible: true,
        dataPointRequired: true,
        incorrectLocationVisible: true,
        incorrectLocationRequired: true
    },

    "100000011": {
        deviceModelVisible: true,
        deviceModelRequired: true,
        dataPointVisible: false,
        dataPointRequired: false,
        incorrectLocationVisible: false,
        incorrectLocationRequired: false
    },

    "100000012": {
        deviceModelVisible: true,
        deviceModelRequired: false,
        dataPointVisible: false,
        dataPointRequired: false,
        incorrectLocationVisible: false,
        incorrectLocationRequired: false
    },

    "100000013": {
        deviceModelVisible: true,
        deviceModelRequired: false,
        dataPointVisible: false,
        dataPointRequired: false,
        incorrectLocationVisible: false,
        incorrectLocationRequired: false
    },

    "100000009": {
        deviceModelVisible: false,
        deviceModelRequired: false,
        dataPointVisible: false,
        dataPointRequired: false,
        incorrectLocationVisible: false,
        incorrectLocationRequired: false
    }
};

const OOB_VISION_LINK_FIELD_RULES = {
    "100000014": {
        assetFieldsVisible: false
    },

    "100000015": {
        assetFieldsVisible: true,
        serialRequired: true,
        equipmentRequired: true,
        deviceModelVisible: true,
        deviceModelRequired: false,
        dataPointVisible: false,
        dataPointRequired: false,
        industryVisible: true,
industryRequired: false
    },

    "100000010": {
        assetFieldsVisible: true,
        serialRequired: true,
        equipmentRequired: true,
        deviceModelVisible: true,
        deviceModelRequired: false,
        dataPointVisible: true,
        dataPointRequired: true,
        industryVisible: true,
industryRequired: false
    },

    "100000011": {
        assetFieldsVisible: true,
        serialRequired: true,
        equipmentRequired: true,
        deviceModelVisible: true,
        deviceModelRequired: false,
        dataPointVisible: false,
        dataPointRequired: false,
        industryVisible: true,
industryRequired: false
    },

    "100000012": {
        assetFieldsVisible: true,
        serialRequired: true,
        equipmentRequired: true,
        deviceModelVisible: true,
        deviceModelRequired: false,
        dataPointVisible: false,
        dataPointRequired: false,
        industryVisible: true,
industryRequired: false
    },

    "100000013": {
        assetFieldsVisible: true,
        serialRequired: true,
        equipmentRequired: true,
        deviceModelVisible: true,
        deviceModelRequired: false,
        dataPointVisible: false,
        dataPointRequired: false,
        industryVisible: true,
industryRequired: false
    },

    "100000006": {
        assetFieldsVisible: false
    },

    "100000008": {
        assetFieldsVisible: false
    },

    "100000009": {
        assetFieldsVisible: true,
        serialRequired: false,
        equipmentRequired: false,
        deviceModelVisible: true,
        deviceModelRequired: false,
        dataPointVisible: false,
        dataPointRequired: false,
        industryVisible: true,
industryRequired: false
    }
};

const OOB_PRODUCT_LINK_INDUSTRY_OPTIONS = [
    "Construction",
    "Electrification",
    "Marine",
    "Mining"
];

const OOB_VISION_LINK_INDUSTRY_OPTIONS = [
    "Construction Industries",
    "Electric Power",
    "Electrification",
    "Marine",
    "Mining",
    "Agriculture",
    "Heavy Construction",
    "General Construction",
    "Waste",
    "Quarry & Aggregates",
    "Forestry",
    "Oil & Gas",
    "Industrial",
    "Rental",
    "Retail",
    "Power Generation",
    "Energy & Transportation"
];

const OOB_DATA_POINT_OPTIONS = [
    {
        value: "100000000",
        label: "Asset Operation"
    },
    {
        value: "100000001",
        label: "Fault Codes"
    },
    {
        value: "100000002",
        label: "Fluid Analysis"
    },
    {
        value: "100000003",
        label: "Geofences"
    },
    {
        value: "100000004",
        label: "Hours"
    },
    {
        value: "100000005",
        label: "Location"
    },
    {
        value: "100000006",
        label: "Utilization"
    },
    {
        value: "100000007",
        label: "Other"
    }
];

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

const OOB_PRODUCT_LINK_FIELDS = {
    deviceModel: {
    id: "oobProductLinkDeviceModel",
    label: "Product Link Device Model"
},
industry: {
    id: "oobProductLinkIndustry",
    label: "Industry"
},
    serialNumber: {
        id: "oobProductLinkSerialNumber",
        label: "Asset ID/Serial Number(s)"
    },

    deviceSerialNumber: {
        id: "oobProductLinkDeviceSerialNumber",
        label: "Product Link Device Serial Number"
    },

    techOnSite: {
        id: "oobProductLinkTechOnSite",
        label: "I am a Tech on Site"
    },

    multipleAssets: {
        id: "oobProductLinkMultipleAssets",
        label: "Impacting Multiple Assets"
    },

    dataPoint: {
        id: "oobProductLinkDataPoint",
        label: "What data is incorrect?"
    },

    incorrectDataLocation: {
        id: "oobProductLinkIncorrectDataLocation",
        label: "Where are you seeing incorrect data?"
    }
};

const OOB_VISION_LINK_FIELDS = {
    deviceModel: {
    id: "oobVisionLinkDeviceModel",
    label: "Product Link Device Model"
},
industry: {
    id: "oobVisionLinkIndustry",
    label: "Industry"
},
    techOnSite: {
        id: "oobVisionLinkTechOnSite",
        label: "I am a Tech on Site"
    },

    serialNumber: {
        id: "oobVisionLinkSerialNumber",
        label: "Asset ID/Serial Number(s)"
    },

    equipmentType: {
        id: "oobVisionLinkEquipmentType",
        label: "Equipment Type"
    },

    deviceSerialNumber: {
        id: "oobVisionLinkDeviceSerialNumber",
        label: "Product Link Device Serial Number"
    },

    dataPoint: {
        id: "oobVisionLinkDataPoint",
        label: "What data is incorrect?"
    }
};


const OOB_FUEL_PROMISE_FIELDS = {
    serialNumber: {
        id: "oobFuelPromiseSerialNumber",
        label: "Serial Number"
    },

    plDevice: {
        id: "oobFuelPromisePlDevice",
        label: "PL Device"
    },

    dcn: {
        id: "oobFuelPromiseDcn",
        label: "DCN"
    },

    ccid: {
        id: "oobFuelPromiseCcid",
        label: "CCID"
    }
};

/* =====================================================
   OOB CAT INSPECT FIELDS (Guest / anonymous — same rules
   as Customer, since the Excel matrix is identical for both)
===================================================== */

const OOB_INSPECT_PRODUCT_TRIGGER = ["cat inspect", "cat® inspect"];

const OOB_INSPECT_APP_FIELD = {
    id: "oobInspectApp",
    label: "Which Cat® Inspect application?"
};

function buildOobInspectAppOptionsHtml() {
    return Array.from(
        document.querySelectorAll(".oob-cat-inspect-secondary-product")
    ).map(function (el) {
        const id = normalizeGuid(el.getAttribute("data-product-id"));
        const name = String(el.getAttribute("data-product-name") || "").trim();

        if (!id || !name) {
            return "";
        }

        return '<option value="' + htmlEncode(id) + '">' +
            htmlEncode(name) + '</option>';
    }).join("");
}

const OOB_INSPECT_NUMBER_FIELD = {
    id: "oobInspectNumber",
    label: "Inspection Number"
};

const OOB_INSPECT_ASSETS_FIELD = {
    id: "oobInspectAssets",
    label: "Is this Impacting Multiple Assets?"
};

const OOB_INSPECT_FIELD_RULES = {
    "100000014": { assets: false },   /* Access Issue */
    "100000044": { assets: true },    /* Inspection Form */
    "100000045": { assets: true },    /* Inspection Report */
    "100000008": { assets: true },    /* Website/Application Issue */
    "100000009": { assets: true }     /* Something Else */
    /* Submit Feedback (100000006) and User Account Setup (100000007)
       show neither extra field */
};

/* Full set of issue types valid for Cat Inspect (7 total) —
   used to filter the native issue-type dropdown */
const OOB_INSPECT_ALLOWED_ISSUE_VALUES = [
    "100000014", "100000044", "100000045",
    "100000006", "100000007", "100000008", "100000009"
];

const OOB_POWER_ONSITE_PRODUCT_TRIGGER = ["cat power onsite", "cat® power onsite"];

function isOobCatPowerOnSiteSelected() {
    return $.inArray(getOobProductText(), OOB_POWER_ONSITE_PRODUCT_TRIGGER) !== -1;
}

const OOB_POWER_ONSITE_ALLOWED_ISSUE_VALUES = [
    "100000014", // Access Issue
    "100000010", // Data is Incorrect or Missing
    "100000011", // PL Device Connection Issue
    "100000006", // Submit Feedback
    "100000008", // Website/Application Issue
    "100000009"  // Something Else
];

const OOB_PARTS_CAT_COM_PRODUCT_TRIGGER = ["parts.cat.com"];

function isOobPartsCatComSelected() {
    return $.inArray(getOobProductText(), OOB_PARTS_CAT_COM_PRODUCT_TRIGGER) !== -1;
}

const OOB_PARTS_CAT_COM_ALLOWED_ISSUE_VALUES = [
    "100000000", // Dealer/Rental Locator
    "100000009"  // Something Else
];

const OOB_RENTALS_URL_FIELD = { id: "oobRentalsUrl", label: "URL" };
const OOB_RENTALS_RENTEDOWNED_FIELD = { id: "oobRentalsRentedOwned", label: "Rented or Owned Machine" };
const OOB_RENTALS_JOBSITE_FIELD = { id: "oobRentalsJobsite", label: "Jobsite Address" };
const OOB_RENTALS_CONTRACT_FIELD = { id: "oobRentalsContractInvoice", label: "Contract/Invoice Number" };

const OOB_RENTALS_FIELD_RULES = {
    "100000000": { jobsiteAddress: { required: true } },
    "100000001": { jobsiteAddress: { required: true } },
    "100000002": { url: { required: true } },
    "100000003": {
        jobsiteAddress: { required: true },
        equipmentType: { required: true },
        productFamily: { required: true },
        generatorSize: { required: true },
        startDate: { required: true },
        endDate: { required: true }
    },
    "100000004": { rentedOwned: { required: true } },
    "100000005": { url: { required: true } },
    "100000007": { url: { required: true } },
    "100000008": { url: { required: true } },
    "100000009": { url: { required: false } },
    "100000010": { url: { required: true }, contractInvoice: { required: false } }
};

function isOobCatRentalsSelected() {
    return getOobProductText() === "cat rentals";
}

function markOobSyntheticFieldRequired(wrapperId) {
    const $wrapper = $("#" + wrapperId);
    const $label = $wrapper.find("label").first();

    if ($label.length && !$label.find(".req").length) {
        $label.append(' <span class="req">*</span>');
    }
}

let oobIssueTypeOriginalOptionsHtml = null;

function normalizeOobProductName(value) {
    return String(value || "")
        .replace(/[®™℠]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function isOobProductLinkSelected() {
    const productName =
        normalizeOobProductName(
            getOobProductText()
        );

    return (
        productName === "cat product link" ||
        productName === "product link"
    );
}

function isOobVisionLinkSelected() {
    const productName =
        normalizeOobProductName(
            getOobProductText()
        );

    return (
        productName === "vision link" ||
        productName === "visionlink"
    );
}

function isOobSis2Selected() {
    const productName =
        normalizeOobProductName(
            getOobProductText()
        );

    return (
        productName === "sis 2.0" ||
        productName === "sis2.0"
    );
}

function isOobFuelPromiseProgramSelected() {
    return (
        oobFuelPromiseRoutingActive ||
        getOobProductText() ===
            "fuel promise program"
    );
}

function applyOobCatInspectRouting() {
    if (!isOobCatInspectSelected()) {
        return;
    }

    const $applicationField = $("#" + OOB_INSPECT_APP_FIELD.id);

    const productId = normalizeGuid($applicationField.val());
    const productName = String(
        $applicationField.find("option:selected").text() || ""
    ).trim();

    if (!productId) {
        clearLookupValue(
            CAT_DYNAMICS_REQUIRED_FIELDS.secondaryProductTechnologyId
        );
        return;
    }

    setLookupValue(
        CAT_DYNAMICS_REQUIRED_FIELDS.secondaryProductTechnologyId,
        productId,
        productName,
        "product"
    );

    console.log(
        "CAT: Cat Inspect Secondary Product Technology set:",
        productId,
        productName
    );
}

function clearLookupValue(fieldId) {
    $("#" + fieldId)
        .val("");

    $("#" + fieldId + "_name")
        .val("");

    $("#" + fieldId + "_entityname")
        .val("");

    $("#" + fieldId)
        .trigger("change");
}

function isOobCatInspectSelected() {
    return $.inArray(getOobProductText(), OOB_INSPECT_PRODUCT_TRIGGER) !== -1;
}

function getOobIssueTypeValue() {
    const $field = findOobFieldByLabel("What type of issue are you reporting?");
    return $field.length ? ($field.val() || "").trim() : "";
}

/* Small, self-contained error styling for our synthetic fields —
   deliberately NOT reusing the shared showOobError/clearOobError,
   since those assume a native .control wrapper shape that doesn't
   match our markup (that mismatch is what broke the radio layout). */
function showOobInspectFieldError($wrapper, message) {
    clearOobInspectFieldError($wrapper);

    if ($wrapper.find(".cat-radio-group").length) {
        $wrapper.addClass("error");
        $wrapper.append('<span class="field-error-message">' + message + '</span>')
        return;
    }

    $wrapper.addClass("oob-field-error");
    $wrapper.append('<div class="oob-error-message">' + message + '</div>');

    const $select = $wrapper.find("select").first();

    if ($select.length) {
        $("#" + $select.attr("id") + "_catSearchInput").addClass("cat-searchable-error");
        $("#" + $select.attr("id") + "_catSearchWrapper").addClass("cat-searchable-error");
    }
}

function clearOobInspectFieldError($wrapper) {
    $wrapper.removeClass("oob-field-error error");
    $wrapper.find(".oob-error-message, .field-error-message").remove();

    $wrapper.find("input, select, textarea").removeClass("oob-invalid-control").css({
        "border": "",
        "box-shadow": "",
        "outline": ""
    });

    const $select = $wrapper.find("select").first();

    if ($select.length) {
        $("#" + $select.attr("id") + "_catSearchInput").removeClass("cat-searchable-error");
        $("#" + $select.attr("id") + "_catSearchWrapper").removeClass("cat-searchable-error");
    }
}

$(document).on("input change blur", ".cat-oob-conditional input, .cat-oob-conditional select, .cat-oob-conditional textarea", function () {
    const $field = $(this);
    const $wrapper = $field.closest(".cat-oob-conditional");

    if (!$wrapper.length) {
        return;
    }

    if ($field.is(":radio")) {
        if ($wrapper.find("input[type='radio']:checked").length > 0) {
            clearOobInspectFieldError($wrapper);
        }
        return;
    }

    const $realField = $field.hasClass("cat-searchable-input")
        ? $wrapper.find("select").first()
        : $field;

    if (($realField.val() || "").trim().length > 0) {
        clearOobInspectFieldError($wrapper);
    }
});

function buildOobFuelPromiseFieldHtml() {
    return (
        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_FUEL_PROMISE_FIELDS.serialNumber.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_FUEL_PROMISE_FIELDS.serialNumber.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_FUEL_PROMISE_FIELDS.serialNumber.id +
            '">' +
            htmlEncode(
                OOB_FUEL_PROMISE_FIELDS.serialNumber.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
                '<input type="text" id="' +
                OOB_FUEL_PROMISE_FIELDS.serialNumber.id +
                '" class="cat-custom-input" ' +
                'maxlength="100" ' +
                'placeholder="Optional" />' +
            '</div>' +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_FUEL_PROMISE_FIELDS.plDevice.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_FUEL_PROMISE_FIELDS.plDevice.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_FUEL_PROMISE_FIELDS.plDevice.id +
            '">' +
            htmlEncode(
                OOB_FUEL_PROMISE_FIELDS.plDevice.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
                '<input type="text" id="' +
                OOB_FUEL_PROMISE_FIELDS.plDevice.id +
                '" class="cat-custom-input" ' +
                'maxlength="250" ' +
                'placeholder="Optional" />' +
            '</div>' +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_FUEL_PROMISE_FIELDS.dcn.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_FUEL_PROMISE_FIELDS.dcn.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_FUEL_PROMISE_FIELDS.dcn.id +
            '">' +
            htmlEncode(
                OOB_FUEL_PROMISE_FIELDS.dcn.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
                '<input type="text" id="' +
                OOB_FUEL_PROMISE_FIELDS.dcn.id +
                '" class="cat-custom-input" ' +
                'maxlength="100" ' +
                'placeholder="Optional" />' +
            '</div>' +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_FUEL_PROMISE_FIELDS.ccid.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_FUEL_PROMISE_FIELDS.ccid.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_FUEL_PROMISE_FIELDS.ccid.id +
            '">' +
            htmlEncode(
                OOB_FUEL_PROMISE_FIELDS.ccid.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
                '<input type="text" id="' +
                OOB_FUEL_PROMISE_FIELDS.ccid.id +
                '" class="cat-custom-input" ' +
                'maxlength="100" ' +
                'placeholder="Optional" />' +
            '</div>' +
        '</div>'
    );
}


function buildOobProductLinkFieldHtml() {
    let dataPointOptions = "";
    let deviceModelOptions = "";
    let industryOptions = "";

    OOB_DATA_POINT_OPTIONS.forEach(
        function (option) {
            dataPointOptions +=
                '<option value="' +
                htmlEncode(option.value) +
                '">' +
                htmlEncode(option.label) +
                '</option>';
        }
    );

    PROVIDED_DEVICE_MODEL_OPTIONS.forEach(
        function (option) {
            deviceModelOptions +=
                '<option value="' +
                htmlEncode(option.value) +
                '">' +
                htmlEncode(option.label) +
                '</option>';
        }
    );

    OOB_PRODUCT_LINK_INDUSTRY_OPTIONS.forEach(
    function (option) {
        industryOptions +=
            '<option value="' +
            htmlEncode(option) +
            '">' +
            htmlEncode(option) +
            '</option>';
    }
);

    return (
        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_PRODUCT_LINK_FIELDS.serialNumber.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_PRODUCT_LINK_FIELDS.serialNumber.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_PRODUCT_LINK_FIELDS.serialNumber.id +
            '">' +
            htmlEncode(
                OOB_PRODUCT_LINK_FIELDS.serialNumber.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
                '<textarea id="' +
                OOB_PRODUCT_LINK_FIELDS.serialNumber.id +
                '" class="cat-custom-input" rows="3" ' +
                'maxlength="1000" ' +
                'placeholder="Enter one or more serial numbers">' +
                '</textarea>' +
            '</div>' +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
    'id="' +
    OOB_PRODUCT_LINK_FIELDS.deviceModel.id +
    'Wrapper" ' +
    'data-field-label="' +
    htmlEncode(
        OOB_PRODUCT_LINK_FIELDS.deviceModel.label
    ) +
    '" style="display:none;">' +

    '<label for="' +
    OOB_PRODUCT_LINK_FIELDS.deviceModel.id +
    '">' +
    htmlEncode(
        OOB_PRODUCT_LINK_FIELDS.deviceModel.label
    ) +
    '</label>' +

    '<div class="cat-oob-control">' +
        '<select id="' +
        OOB_PRODUCT_LINK_FIELDS.deviceModel.id +
        '" class="cat-custom-input">' +
            '<option value="">' +
                'Select Device Model' +
            '</option>' +
            deviceModelOptions +
        '</select>' +
    '</div>' +
'</div>' +

'<div class="cat-field cat-oob-conditional" ' +
    'id="' +
    OOB_PRODUCT_LINK_FIELDS.industry.id +
    'Wrapper" ' +
    'data-field-label="' +
    htmlEncode(
        OOB_PRODUCT_LINK_FIELDS.industry.label
    ) +
    '" style="display:none;">' +

    '<label for="' +
    OOB_PRODUCT_LINK_FIELDS.industry.id +
    '">' +
    htmlEncode(
        OOB_PRODUCT_LINK_FIELDS.industry.label
    ) +
    '</label>' +

    '<div class="cat-oob-control">' +
        '<select id="' +
        OOB_PRODUCT_LINK_FIELDS.industry.id +
        '" class="cat-custom-input">' +

            '<option value="">' +
                'Select Industry' +
            '</option>' +

            industryOptions +
        '</select>' +
    '</div>' +
'</div>' +



        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_PRODUCT_LINK_FIELDS.deviceSerialNumber.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_PRODUCT_LINK_FIELDS.deviceSerialNumber.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_PRODUCT_LINK_FIELDS.deviceSerialNumber.id +
            '">' +
            htmlEncode(
                OOB_PRODUCT_LINK_FIELDS.deviceSerialNumber.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
                '<input type="text" id="' +
                OOB_PRODUCT_LINK_FIELDS.deviceSerialNumber.id +
                '" class="cat-custom-input" maxlength="100" ' +
                'placeholder="Optional" />' +
            '</div>' +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_PRODUCT_LINK_FIELDS.techOnSite.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_PRODUCT_LINK_FIELDS.techOnSite.label
            ) +
            '" style="display:none;">' +
            '<div class="cat-checkbox-group">' +
                '<label class="cat-checkbox-option">' +
                    '<input type="checkbox" id="' +
                    OOB_PRODUCT_LINK_FIELDS.techOnSite.id +
                    '" value="Yes" />' +
                    '<span>' +
                    htmlEncode(
                        OOB_PRODUCT_LINK_FIELDS.techOnSite.label
                    ) +
                    '</span>' +
                '</label>' +
            '</div>' +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_PRODUCT_LINK_FIELDS.multipleAssets.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_PRODUCT_LINK_FIELDS.multipleAssets.label
            ) +
            '" style="display:none;">' +
            '<div class="cat-checkbox-group">' +
                '<label class="cat-checkbox-option">' +
                    '<input type="checkbox" id="' +
                    OOB_PRODUCT_LINK_FIELDS.multipleAssets.id +
                    '" value="Yes" />' +
                    '<span>' +
                    htmlEncode(
                        OOB_PRODUCT_LINK_FIELDS.multipleAssets.label
                    ) +
                    '</span>' +
                '</label>' +
            '</div>' +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_PRODUCT_LINK_FIELDS.dataPoint.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_PRODUCT_LINK_FIELDS.dataPoint.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_PRODUCT_LINK_FIELDS.dataPoint.id +
            '">' +
            htmlEncode(
                OOB_PRODUCT_LINK_FIELDS.dataPoint.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
                '<select id="' +
                OOB_PRODUCT_LINK_FIELDS.dataPoint.id +
                '" class="cat-custom-input">' +
                    '<option value="">Select Data</option>' +
                    dataPointOptions +
                '</select>' +
            '</div>' +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_PRODUCT_LINK_FIELDS.incorrectDataLocation.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_PRODUCT_LINK_FIELDS.incorrectDataLocation.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_PRODUCT_LINK_FIELDS.incorrectDataLocation.id +
            '">' +
            htmlEncode(
                OOB_PRODUCT_LINK_FIELDS.incorrectDataLocation.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
                '<input type="text" id="' +
                OOB_PRODUCT_LINK_FIELDS.incorrectDataLocation.id +
                '" class="cat-custom-input" maxlength="500" />' +
            '</div>' +
        '</div>'
    );
}

function injectOobFuelPromiseFields() {
    const firstWrapperId =
        OOB_FUEL_PROMISE_FIELDS
            .serialNumber.id +
        "Wrapper";

    if ($("#" + firstWrapperId).length) {
        return;
    }

    const $issueWrapper =
        findOobWrapperByLabel(
            "What type of issue are you reporting?"
        );

    if (!$issueWrapper.length) {
        return;
    }

    $issueWrapper.after(
        buildOobFuelPromiseFieldHtml()
    );
}

function resetOobFuelPromiseFields(
    clearValues
) {
    Object.keys(
        OOB_FUEL_PROMISE_FIELDS
    ).forEach(function (fieldKey) {
        const field =
            OOB_FUEL_PROMISE_FIELDS[
                fieldKey
            ];

        const $wrapper =
            $("#" + field.id + "Wrapper");

        const $control =
            $("#" + field.id);

        $wrapper.hide();

        $wrapper.removeClass(
            "oob-field-error error"
        );

        $wrapper
            .find(
                ".oob-error-message, " +
                ".field-error-message"
            )
            .remove();

        $control.removeAttr("required");
        $control.removeAttr(
            "aria-required"
        );

        $control.removeClass(
            "cat-oob-control-error"
        );

        if (clearValues) {
            $control.val("");
        }
    });
}

function applyOobFuelPromiseFields() {
    resetOobFuelPromiseFields(false);

    if (
        !isOobFuelPromiseProgramSelected()
    ) {
        resetOobFuelPromiseFields(true);
        return;
    }

    Object.keys(
        OOB_FUEL_PROMISE_FIELDS
    ).forEach(function (fieldKey) {
        const field =
            OOB_FUEL_PROMISE_FIELDS[
                fieldKey
            ];

        $("#" + field.id + "Wrapper")
            .show();
    });
}


function buildOobVisionLinkFieldHtml() {
    let dataPointOptions = "";
    let equipmentTypeOptions = "";
    let deviceModelOptions = "";
    let industryOptions = "";

    OOB_DATA_POINT_OPTIONS.forEach(
        function (option) {
            dataPointOptions +=
                '<option value="' +
                htmlEncode(option.value) +
                '">' +
                htmlEncode(option.label) +
                '</option>';
        }
    );

    EQUIPMENT_TYPE_OPTIONS.forEach(
        function (option) {
            equipmentTypeOptions +=
                '<option value="' +
                htmlEncode(option.value) +
                '">' +
                htmlEncode(option.label) +
                '</option>';
        }
    );

    PROVIDED_DEVICE_MODEL_OPTIONS.forEach(
        function (option) {
            deviceModelOptions +=
                '<option value="' +
                htmlEncode(option.value) +
                '">' +
                htmlEncode(option.label) +
                '</option>';
        }
    );

    OOB_VISION_LINK_INDUSTRY_OPTIONS.forEach(
    function (option) {
        industryOptions +=
            '<option value="' +
            htmlEncode(option) +
            '">' +
            htmlEncode(option) +
            '</option>';
    }
);

    return (
        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_VISION_LINK_FIELDS.techOnSite.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_VISION_LINK_FIELDS.techOnSite.label
            ) +
            '" style="display:none;">' +
            '<div class="cat-checkbox-group">' +
                '<label class="cat-checkbox-option">' +
                    '<input type="checkbox" id="' +
                    OOB_VISION_LINK_FIELDS.techOnSite.id +
                    '" value="Yes" />' +
                    '<span>' +
                    htmlEncode(
                        OOB_VISION_LINK_FIELDS.techOnSite.label
                    ) +
                    '</span>' +
                '</label>' +
            '</div>' +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_VISION_LINK_FIELDS.serialNumber.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_VISION_LINK_FIELDS.serialNumber.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_VISION_LINK_FIELDS.serialNumber.id +
            '">' +
            htmlEncode(
                OOB_VISION_LINK_FIELDS.serialNumber.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
                '<textarea id="' +
                OOB_VISION_LINK_FIELDS.serialNumber.id +
                '" class="cat-custom-input" rows="3" ' +
                'maxlength="1000" ' +
                'placeholder="Enter one or more serial numbers">' +
                '</textarea>' +
            '</div>' +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_VISION_LINK_FIELDS.equipmentType.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_VISION_LINK_FIELDS.equipmentType.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_VISION_LINK_FIELDS.equipmentType.id +
            '">' +
            htmlEncode(
                OOB_VISION_LINK_FIELDS.equipmentType.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
    '<select id="' +
    OOB_VISION_LINK_FIELDS.equipmentType.id +
    '" class="cat-custom-input">' +
        '<option value="">' +
            'Select Equipment Type' +
        '</option>' +
        equipmentTypeOptions +
    '</select>' +
'</div>'  +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
    'id="' +
    OOB_VISION_LINK_FIELDS.industry.id +
    'Wrapper" ' +
    'data-field-label="' +
    htmlEncode(
        OOB_VISION_LINK_FIELDS.industry.label
    ) +
    '" style="display:none;">' +

    '<label for="' +
    OOB_VISION_LINK_FIELDS.industry.id +
    '">' +
    htmlEncode(
        OOB_VISION_LINK_FIELDS.industry.label
    ) +
    '</label>' +

    '<div class="cat-oob-control">' +
        '<select id="' +
        OOB_VISION_LINK_FIELDS.industry.id +
        '" class="cat-custom-input">' +

            '<option value="">' +
                'Select Industry' +
            '</option>' +

            industryOptions +

        '</select>' +
    '</div>' +
'</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
    'id="' +
    OOB_VISION_LINK_FIELDS.deviceModel.id +
    'Wrapper" ' +
    'data-field-label="' +
    htmlEncode(
        OOB_VISION_LINK_FIELDS.deviceModel.label
    ) +
    '" style="display:none;">' +

    '<label for="' +
    OOB_VISION_LINK_FIELDS.deviceModel.id +
    '">' +
    htmlEncode(
        OOB_VISION_LINK_FIELDS.deviceModel.label
    ) +
    '</label>' +

    '<div class="cat-oob-control">' +
        '<select id="' +
        OOB_VISION_LINK_FIELDS.deviceModel.id +
        '" class="cat-custom-input">' +
            '<option value="">' +
                'Select Device Model' +
            '</option>' +
            deviceModelOptions +
        '</select>' +
    '</div>' +
'</div>' +



        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_VISION_LINK_FIELDS.deviceSerialNumber.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_VISION_LINK_FIELDS.deviceSerialNumber.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_VISION_LINK_FIELDS.deviceSerialNumber.id +
            '">' +
            htmlEncode(
                OOB_VISION_LINK_FIELDS.deviceSerialNumber.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
                '<input type="text" id="' +
                OOB_VISION_LINK_FIELDS.deviceSerialNumber.id +
                '" class="cat-custom-input" maxlength="100" ' +
                'placeholder="Optional" />' +
            '</div>' +
        '</div>' +

        '<div class="cat-field cat-oob-conditional" ' +
            'id="' +
            OOB_VISION_LINK_FIELDS.dataPoint.id +
            'Wrapper" ' +
            'data-field-label="' +
            htmlEncode(
                OOB_VISION_LINK_FIELDS.dataPoint.label
            ) +
            '" style="display:none;">' +
            '<label for="' +
            OOB_VISION_LINK_FIELDS.dataPoint.id +
            '">' +
            htmlEncode(
                OOB_VISION_LINK_FIELDS.dataPoint.label
            ) +
            '</label>' +
            '<div class="cat-oob-control">' +
                '<select id="' +
                OOB_VISION_LINK_FIELDS.dataPoint.id +
                '" class="cat-custom-input">' +
                    '<option value="">Select Data</option>' +
                    dataPointOptions +
                '</select>' +
            '</div>' +
        '</div>'
    );
}

function injectOobProductAndVisionLinkFields() {
    const productLinkExists =
        $("#" +
            OOB_PRODUCT_LINK_FIELDS.serialNumber.id +
            "Wrapper"
        ).length > 0;

    const visionLinkExists =
        $("#" +
            OOB_VISION_LINK_FIELDS.serialNumber.id +
            "Wrapper"
        ).length > 0;

    if (productLinkExists && visionLinkExists) {
        return;
    }

    const $issueWrapper =
        findOobWrapperByLabel(
            "What type of issue are you reporting?"
        );

    if (!$issueWrapper.length) {
        return;
    }

    let html = "";

    if (!productLinkExists) {
        html +=
            buildOobProductLinkFieldHtml();
    }

    if (!visionLinkExists) {
        html +=
            buildOobVisionLinkFieldHtml();
    }

    $issueWrapper.after(html);

    if (
    $("#" +
        OOB_PRODUCT_LINK_FIELDS.deviceModel.id
    ).length
) {
    buildSearchablePicklist({
        fieldId:
            OOB_PRODUCT_LINK_FIELDS.deviceModel.id,
        label:
            OOB_PRODUCT_LINK_FIELDS.deviceModel.label,
        placeholder:
            "Select Device Model"
    });
}

    if (
        $("#" +
            OOB_PRODUCT_LINK_FIELDS.dataPoint.id
        ).length
    ) {
        buildSearchablePicklist({
            fieldId:
                OOB_PRODUCT_LINK_FIELDS.dataPoint.id,
            label:
                OOB_PRODUCT_LINK_FIELDS.dataPoint.label,
            placeholder:
                "Select Data"
        });
    }

if (
    $("#" +
        OOB_VISION_LINK_FIELDS.deviceModel.id
    ).length
) {
    buildSearchablePicklist({
        fieldId:
            OOB_VISION_LINK_FIELDS.deviceModel.id,
        label:
            OOB_VISION_LINK_FIELDS.deviceModel.label,
        placeholder:
            "Select Device Model"
    });
}

if (
    $("#" +
        OOB_VISION_LINK_FIELDS.equipmentType.id
    ).length
) {
    buildSearchablePicklist({
        fieldId:
            OOB_VISION_LINK_FIELDS.equipmentType.id,
        label:
            OOB_VISION_LINK_FIELDS.equipmentType.label,
        placeholder:
            "Select Equipment Type"
    });
}

if (
    $("#" +
        OOB_VISION_LINK_FIELDS.industry.id
    ).length
) {
    buildSearchablePicklist({
        fieldId:
            OOB_VISION_LINK_FIELDS.industry.id,

        label:
            OOB_VISION_LINK_FIELDS.industry.label,

        placeholder:
            "Select Industry"
    });
}

    if (
        $("#" +
            OOB_VISION_LINK_FIELDS.dataPoint.id
        ).length
    ) {
        buildSearchablePicklist({
            fieldId:
                OOB_VISION_LINK_FIELDS.dataPoint.id,
            label:
                OOB_VISION_LINK_FIELDS.dataPoint.label,
            placeholder:
                "Select Data"
        });
    }
}

function resetOobFieldGroup(fields) {
    Object.keys(fields).forEach(function (fieldKey) {
        const field =
            fields[fieldKey];

        const $wrapper =
            $("#" + field.id + "Wrapper");

        const $control =
            $("#" + field.id);

        if (!$wrapper.length) {
            return;
        }

        $wrapper.hide();

        $wrapper.removeClass(
            "oob-field-error error"
        );

        $wrapper
            .find(
                ".oob-error-message, " +
                ".field-error-message"
            )
            .remove();

        $wrapper
            .find("label > .req")
            .remove();

        if (!$control.length) {
            return;
        }

        $control.removeAttr("required");
        $control.removeAttr("aria-required");

        $control.removeClass(
            "cat-oob-control-error"
        );

        if ($control.is(":checkbox")) {
            $control.prop(
                "checked",
                false
            );
        } else {
            $control.val("");
        }

        const controlId =
            $control.attr("id");

        if (controlId) {
            $("#" + controlId + "_catSearchInput")
                .val("")
                .removeClass(
                    "cat-searchable-error"
                );

            $("#" + controlId + "_catSearchWrapper")
                .removeClass(
                    "cat-searchable-error open"
                );

            $("#" + controlId + "_catSearchList")
                .hide();
        }
    });
}

function showOobConfiguredField(
    field,
    required
) {
    const $wrapper =
        $("#" + field.id + "Wrapper");

    const $control =
        $("#" + field.id);

    if (!$wrapper.length || !$control.length) {
        return;
    }

    $wrapper.show();

    $control.removeAttr("required");
    $control.removeAttr("aria-required");

    $wrapper
        .find("label > .req")
        .remove();

    if (!required) {
        return;
    }

    $control.attr(
        "required",
        "required"
    );

    $control.attr(
        "aria-required",
        "true"
    );

    const $label =
        $wrapper.children("label").first();

    if (
        $label.length &&
        !$label.find(".req").length
    ) {
        const marker =
            document.createElement("span");

        marker.className = "req";

        marker.textContent =
            String.fromCharCode(42);

        $label.append(
            document.createTextNode(" ")
        );

        $label.append(marker);
    }
}

function applyOobProductLinkFields() {
    resetOobFieldGroup(
        OOB_PRODUCT_LINK_FIELDS
    );

    if (!isOobProductLinkSelected()) {
        return;
    }

    // Always Shown / Required Yes, regardless of issue type
    showOobConfiguredField(
        OOB_PRODUCT_LINK_FIELDS.serialNumber,
        true
    );

    showOobConfiguredField(
        OOB_PRODUCT_LINK_FIELDS.deviceSerialNumber,
        false
    );

    showOobConfiguredField(
        OOB_PRODUCT_LINK_FIELDS.techOnSite,
        false
    );

    showOobConfiguredField(
        OOB_PRODUCT_LINK_FIELDS.multipleAssets,
        false
    );

    // Industry: Always Shown / Not Required, regardless of issue type
    showOobConfiguredField(
        OOB_PRODUCT_LINK_FIELDS.industry,
        false
    );

    const issueValue =
        getOobIssueTypeValue();

    const rule =
        OOB_PRODUCT_LINK_FIELD_RULES[
            issueValue
        ];

    if (!rule) {
        return;
    }

    if (rule.deviceModelVisible) {
        showOobConfiguredField(
            OOB_PRODUCT_LINK_FIELDS.deviceModel,
            Boolean(rule.deviceModelRequired)
        );
    }

    if (rule.dataPointVisible) {
        showOobConfiguredField(
            OOB_PRODUCT_LINK_FIELDS.dataPoint,
            Boolean(rule.dataPointRequired)
        );
    }

    if (rule.incorrectLocationVisible) {
        showOobConfiguredField(
            OOB_PRODUCT_LINK_FIELDS
                .incorrectDataLocation,
            Boolean(rule.incorrectLocationRequired)
        );
    }
}

function applyOobVisionLinkFields() {
    resetOobFieldGroup(
        OOB_VISION_LINK_FIELDS
    );

    if (!isOobVisionLinkSelected()) {
        return;
    }

    showOobConfiguredField(
        OOB_VISION_LINK_FIELDS.techOnSite,
        false
    );

    const issueValue =
        getOobIssueTypeValue();

    const rule =
        OOB_VISION_LINK_FIELD_RULES[
            issueValue
        ];

    if (
        !rule ||
        !rule.assetFieldsVisible
    ) {
        return;
    }

    showOobConfiguredField(
        OOB_VISION_LINK_FIELDS.serialNumber,
        Boolean(rule.serialRequired)
    );

    showOobConfiguredField(
        OOB_VISION_LINK_FIELDS.equipmentType,
        Boolean(rule.equipmentRequired)
    );

    if (rule.industryVisible) {
    showOobConfiguredField(
        OOB_VISION_LINK_FIELDS.industry,
        Boolean(
            rule.industryRequired
        )
    );
}

    if (rule.deviceModelVisible) {
    showOobConfiguredField(
        OOB_VISION_LINK_FIELDS.deviceModel,
        Boolean(
            rule.deviceModelRequired
        )
    );
}

    showOobConfiguredField(
        OOB_VISION_LINK_FIELDS.deviceSerialNumber,
        false
    );

    if (rule.dataPointVisible) {
        showOobConfiguredField(
            OOB_VISION_LINK_FIELDS.dataPoint,
            Boolean(
                rule.dataPointRequired
            )
        );
    }
}

function buildOobInspectFieldHtml() {
    let html = "";

    html +=
        '<div class="cat-field cat-oob-conditional" data-field-label="' + htmlEncode(OOB_INSPECT_APP_FIELD.label) + '" id="' + OOB_INSPECT_APP_FIELD.id + 'Wrapper" style="display:none;">' +
            '<label for="' + OOB_INSPECT_APP_FIELD.id + '">' + htmlEncode(OOB_INSPECT_APP_FIELD.label) + ' <span class="req">*</span></label>' +
            '<div class="cat-oob-control">' +
                '<select id="' + OOB_INSPECT_APP_FIELD.id + '" class="cat-custom-input">' +
                    '<option value="">Select Option</option>' +
                   buildOobInspectAppOptionsHtml() +
                '</select>' +
            '</div>' +
        '</div>';

    html +=
        '<div class="cat-field cat-oob-conditional" data-field-label="' + htmlEncode(OOB_INSPECT_NUMBER_FIELD.label) + '" id="' + OOB_INSPECT_NUMBER_FIELD.id + 'Wrapper" style="display:none;">' +
            '<label for="' + OOB_INSPECT_NUMBER_FIELD.id + '">' + htmlEncode(OOB_INSPECT_NUMBER_FIELD.label) + '</label>' +
            '<input type="text" id="' + OOB_INSPECT_NUMBER_FIELD.id + '" class="cat-custom-input" placeholder="Enter Inspection Number" />' +
        '</div>';

    html +=
        '<div class="cat-field cat-oob-conditional" data-field-label="' + htmlEncode(OOB_INSPECT_ASSETS_FIELD.label) + '" id="' + OOB_INSPECT_ASSETS_FIELD.id + 'Wrapper" style="display:none;">' +
            '<label>' + htmlEncode(OOB_INSPECT_ASSETS_FIELD.label) + ' <span class="req">*</span></label>' +
            '<div class="cat-oob-control cat-radio-group">' +
                '<label class="cat-radio-option">' +
                    '<input type="radio" name="' + OOB_INSPECT_ASSETS_FIELD.id + '" id="' + OOB_INSPECT_ASSETS_FIELD.id + 'Yes" value="Yes" />' +
                    '<span>Yes</span>' +
                '</label>' +
                '<label class="cat-radio-option">' +
                    '<input type="radio" name="' + OOB_INSPECT_ASSETS_FIELD.id + '" id="' + OOB_INSPECT_ASSETS_FIELD.id + 'No" value="No" />' +
                    '<span>No</span>' +
                '</label>' +
            '</div>' +
        '</div>';

    return html;
}

function injectOobInspectFields() {
    if ($("#" + OOB_INSPECT_APP_FIELD.id + "Wrapper").length > 0) {
        return;
    }

    const $issueWrapper = findOobWrapperByLabel("What type of issue are you reporting?");
    const html = buildOobInspectFieldHtml();

    if ($issueWrapper.length) {
        $issueWrapper.after(html);
    } else {
        const $productWrapper = findOobWrapperByLabel(OOB_PRODUCT_LABEL);

        if ($productWrapper.length) {
            $productWrapper.after(html);
        } else {
            getOobFormContainer().prepend(html);
        }
    }

    /* Give the App dropdown the same styled arrow as Product/Dealer/Issue Type */
    buildSearchablePicklist({
        fieldId: OOB_INSPECT_APP_FIELD.id,
        label: OOB_INSPECT_APP_FIELD.label,
        placeholder: "Select Option"
    });
}

function buildOobRentalsFieldHtml() {
    let html = "";

    html +=
        '<div class="cat-field cat-oob-conditional"data-field-label="' +OOB_RENTALS_URL_FIELD.LABEL+'" id="' + OOB_RENTALS_URL_FIELD.id + 'Wrapper" style="display:none;">' +
            '<label for="' + OOB_RENTALS_URL_FIELD.id + '">' + OOB_RENTALS_URL_FIELD.label + '</label>' +
            '<input type="text" id="' + OOB_RENTALS_URL_FIELD.id + '" class="cat-custom-input" placeholder="Enter URL" maxlength="250" />' +
        '</div>';

    html +=
        '<div class="cat-field cat-oob-conditional" data-field-label="' + OOB_RENTALS_RENTEDOWNED_FIELD.label + '" id="' + OOB_RENTALS_RENTEDOWNED_FIELD.id + 'Wrapper" style="display:none;">' +
            '<label>' + OOB_RENTALS_RENTEDOWNED_FIELD.label + '</label>' +
            '<div class="cat-oob-control cat-radio-group">' +
                '<label class="cat-radio-option">' +
                    '<input type="radio" name="' + OOB_RENTALS_RENTEDOWNED_FIELD.id + '" id="' + OOB_RENTALS_RENTEDOWNED_FIELD.id + 'Rented" value="Rented" />' +
                    '<span>Rented</span>' +
                '</label>' +
                '<label class="cat-radio-option">' +
                    '<input type="radio" name="' + OOB_RENTALS_RENTEDOWNED_FIELD.id + '" id="' + OOB_RENTALS_RENTEDOWNED_FIELD.id + 'Owned" value="Owned" />' +
                    '<span>Owned</span>' +
                '</label>' +
            '</div>' +
        '</div>';

    html +=
      '<div class="cat-field cat-oob-conditional" data-field-label="' + OOB_RENTALS_JOBSITE_FIELD.label + '" id="' + OOB_RENTALS_JOBSITE_FIELD.id + 'Wrapper" style="display:none;">' +
            '<label for="' + OOB_RENTALS_JOBSITE_FIELD.id + '">' + OOB_RENTALS_JOBSITE_FIELD.label + '</label>' +
            '<input type="text" id="' + OOB_RENTALS_JOBSITE_FIELD.id + '" class="cat-custom-input" placeholder="Enter Jobsite Address" maxlength="250" />' +
        '</div>';

    html +=
        '<div class="cat-field cat-oob-conditional" data-field-label="' + OOB_RENTALS_CONTRACT_FIELD.label + '" id="' + OOB_RENTALS_CONTRACT_FIELD.id + 'Wrapper" style="display:none;">' +
            '<label for="' + OOB_RENTALS_CONTRACT_FIELD.id + '">' + OOB_RENTALS_CONTRACT_FIELD.label + '</label>' +
            '<input type="text" id="' + OOB_RENTALS_CONTRACT_FIELD.id + '" class="cat-custom-input" placeholder="Enter Contract/Invoice Number" maxlength="100" />' +
        '</div>';

  html +=
        '<div class="cat-field cat-oob-conditional" id="oobRentalsEquipmentTypeWrapper" style="display:none;">' +
            '<label for="oobRentalsEquipmentType">Equipment Type</label>' +
            '<select id="oobRentalsEquipmentType" class="cat-custom-input">' +
                '<option value="">Select Option</option>' +
                EQUIPMENT_TYPE_OPTIONS.map(function (opt) {
                    return '<option value="' + opt.value + '">' + htmlEncode(opt.label) + '</option>';
                }).join('') +
            '</select>' +
        '</div>';

    html +=
        '<div class="cat-field cat-oob-conditional" id="oobRentalsProductFamilyWrapper" style="display:none;">' +
            '<label for="oobRentalsProductFamily">Product Family</label>' +
            '<select id="oobRentalsProductFamily" class="cat-custom-input">' +
                '<option value="">Select Option</option>' +
                '<option value="100000000">Aerial Equipment</option>' +
                '<option value="100000001">Air Equipment</option>' +
                '<option value="100000002">Attachments</option>' +
                '<option value="100000003">Compaction Equipment</option>' +
                '<option value="100000004">Concrete Equipment</option>' +
                '<option value="100000005">Earthmoving Equipment</option>' +
                '<option value="100000006">HVAC</option>' +
                '<option value="100000007">Landscaping Equipment</option>' +
                '<option value="100000008">Light Towers</option>' +
                '<option value="100000009">Material Handling Equipment</option>' +
                '<option value="100000010">Miscellaneous Equipment</option>' +
                '<option value="100000011">Power Generation</option>' +
                '<option value="100000012">Pump Equipment</option>' +
                '<option value="100000013">Roadwork Equipment</option>' +
                '<option value="100000014">Trench Shoring</option>' +
                '<option value="100000015">Trucks and Trailers</option>' +
                '<option value="100000016">Water Equipment</option>' +
                '<option value="100000017">Other</option>' +
            '</select>' +
        '</div>';
html +=
        '<div class="cat-field cat-oob-conditional" id="oobRentalsGeneratorSizeWrapper" style="display:none;">' +
            '<label for="oobRentalsGeneratorSize">Generator Size</label>' +
            '<select id="oobRentalsGeneratorSize" class="cat-custom-input">' +
                '<option value="">Select Option</option>' +
                '<option value="100000000">0-250 kW</option>' +
                '<option value="100000001">+1000 kW</option>' +
                '<option value="100000002">250-500 kW</option>' +
                '<option value="100000003">500-1000 kW</option>' +
                '<option value="100000004">Unknown</option>' +
            '</select>' +
        '</div>';
    html +=
        '<div class="cat-field cat-oob-conditional" id="oobRentalsStartDateWrapper" style="display:none;">' +
            '<label for="oobRentalsStartDate">Start Date</label>' +
            '<input type="date" id="oobRentalsStartDate" class="cat-custom-input" />' +
        '</div>';

    html +=
        '<div class="cat-field cat-oob-conditional" id="oobRentalsEndDateWrapper" style="display:none;">' +
            '<label for="oobRentalsEndDate">End Date</label>' +
            '<input type="date" id="oobRentalsEndDate" class="cat-custom-input" />' +
        '</div>';

    html +=
        '<div class="cat-redirect-overlay" id="oobRentalsOwnedRedirectOverlay">' +
            '<div class="cat-redirect-modal">' +
                '<p class="cat-redirect-text">You are being redirected to the Cat Dealer Locator.</p>' +
                '<button type="button" class="cat-redirect-ok" id="oobRentalsOwnedRedirectOk">Ok</button>' +
            '</div>' +
        '</div>';

    return html;
}

function injectOobRentalsFields() {
    if ($("#" + OOB_RENTALS_URL_FIELD.id + "Wrapper").length > 0) {
        return;
    }

    const $issueWrapper = findOobWrapperByLabel("What type of issue are you reporting?");
    const html = buildOobRentalsFieldHtml();

    if ($issueWrapper.length) {
        $issueWrapper.after(html);
    } else {
        const $productWrapper = findOobWrapperByLabel(OOB_PRODUCT_LABEL);
        if ($productWrapper.length) {
            $productWrapper.after(html);
        } else {
            getOobFormContainer().prepend(html);
        }
    }

    buildSearchablePicklist({
        fieldId: "oobRentalsEquipmentType",
        label: "Equipment Type",
        placeholder: "Select Equipment Type"
    });

    buildSearchablePicklist({
        fieldId: "oobRentalsProductFamily",
        label: "Product Family",
        placeholder: "Select Product Family"
    });

    buildSearchablePicklist({
        fieldId: "oobRentalsGeneratorSize",
        label: "Generator Size",
        placeholder: "Select Generator Size"
    });
}

function resetOobRentalsFields() {
    [
        OOB_RENTALS_URL_FIELD.id,
        OOB_RENTALS_JOBSITE_FIELD.id,
        OOB_RENTALS_CONTRACT_FIELD.id,
        "oobRentalsEquipmentType",
        "oobRentalsProductFamily",
        "oobRentalsStartDate",
        "oobRentalsEndDate",
        "oobRentalsGeneratorSize"
    ].forEach(function (id) {
        $("#" + id + "Wrapper").hide();
        $("#" + id).val("");
    });

    $("#" + OOB_RENTALS_RENTEDOWNED_FIELD.id + "Wrapper").hide();
    $("input[name='" + OOB_RENTALS_RENTEDOWNED_FIELD.id + "']").prop("checked", false);
}

function resetOobInspectFields() {
    $("#" + OOB_INSPECT_APP_FIELD.id + "Wrapper").hide();
    $("#" + OOB_INSPECT_APP_FIELD.id).val("");

    $("#" + OOB_INSPECT_NUMBER_FIELD.id + "Wrapper").hide();
    $("#" + OOB_INSPECT_NUMBER_FIELD.id).val("");

    $("#" + OOB_INSPECT_ASSETS_FIELD.id + "Wrapper").hide();
    $("input[name='" + OOB_INSPECT_ASSETS_FIELD.id + "']").prop("checked", false);
}

function applyOobInspectFields() {
    resetOobInspectFields();

    if (!isOobCatInspectSelected()) {
        return;
    }

    $("#" + OOB_INSPECT_APP_FIELD.id + "Wrapper").show();

    const issueValue = getOobIssueTypeValue();
    const rule = OOB_INSPECT_FIELD_RULES[issueValue];

    if (!rule) {
        return;
    }

    $("#" + OOB_INSPECT_NUMBER_FIELD.id + "Wrapper").show();

    if (rule.assets) {
        $("#" + OOB_INSPECT_ASSETS_FIELD.id + "Wrapper").show();
    }
}

function applyOobRentalsFields() {
    resetOobRentalsFields();

    if (!isOobCatRentalsSelected()) {
        return;
    }

    const issueValue = getOobIssueTypeValue();
    const rule = OOB_RENTALS_FIELD_RULES[issueValue];

    if (!rule) {
        return;
    }

    if (rule.url) {
        $("#" + OOB_RENTALS_URL_FIELD.id + "Wrapper").show();
        if (rule.url.required) markOobSyntheticFieldRequired(OOB_RENTALS_URL_FIELD.id + "Wrapper");
    }

    if (rule.jobsiteAddress) {
        $("#" + OOB_RENTALS_JOBSITE_FIELD.id + "Wrapper").show();
        if (rule.jobsiteAddress.required) markOobSyntheticFieldRequired(OOB_RENTALS_JOBSITE_FIELD.id + "Wrapper");
    }

    if (rule.contractInvoice) {
        $("#" + OOB_RENTALS_CONTRACT_FIELD.id + "Wrapper").show();
        if (rule.contractInvoice.required) markOobSyntheticFieldRequired(OOB_RENTALS_CONTRACT_FIELD.id + "Wrapper");
    }

    if (rule.rentedOwned) {
        $("#" + OOB_RENTALS_RENTEDOWNED_FIELD.id + "Wrapper").show();
        markOobSyntheticFieldRequired(OOB_RENTALS_RENTEDOWNED_FIELD.id + "Wrapper");
        applyOobRentalsRentedOwnedRules();
    }

    if (rule.equipmentType) { $("#oobRentalsEquipmentTypeWrapper").show(); markOobSyntheticFieldRequired("oobRentalsEquipmentTypeWrapper"); }
    if (rule.productFamily) { $("#oobRentalsProductFamilyWrapper").show(); markOobSyntheticFieldRequired("oobRentalsProductFamilyWrapper"); }
    if (rule.generatorSize) { $("#oobRentalsGeneratorSizeWrapper").show(); markOobSyntheticFieldRequired("oobRentalsGeneratorSizeWrapper"); }
    if (rule.startDate) { $("#oobRentalsStartDateWrapper").show(); markOobSyntheticFieldRequired("oobRentalsStartDateWrapper"); }
    if (rule.endDate) { $("#oobRentalsEndDateWrapper").show(); markOobSyntheticFieldRequired("oobRentalsEndDateWrapper"); }
}

function applyOobRentalsRentedOwnedRules() {
    const selected = $("input[name='" + OOB_RENTALS_RENTEDOWNED_FIELD.id + "']:checked").val() || "";

    if (selected === "Owned") {
        $("#oobRentalsOwnedRedirectOverlay").addClass("show-modal");
        return;
    }

    if (selected === "Rented") {
        $("#" + OOB_RENTALS_JOBSITE_FIELD.id + "Wrapper").show();
        markOobSyntheticFieldRequired(OOB_RENTALS_JOBSITE_FIELD.id + "Wrapper");
    } else {
        $("#" + OOB_RENTALS_JOBSITE_FIELD.id + "Wrapper").hide();
    }
}

$(document).on("change", "input[name='" + OOB_RENTALS_RENTEDOWNED_FIELD.id + "']", applyOobRentalsRentedOwnedRules);

// existing, unchanged:
$(document).on("click", "#oobRentalsOwnedRedirectOk", function () {
    window.location.href = "https://www.cat.com/en_US.html";
});

// NEW — click on the backdrop (not the modal box) closes it and
// clears the "Owned" selection so the user can pick again
$(document).on("click", "#oobRentalsOwnedRedirectOverlay", function (e) {
    if (e.target !== this) return; // click landed inside .cat-redirect-modal, ignore

    $(this).removeClass("show-modal");
    $("input[name='" + OOB_RENTALS_RENTEDOWNED_FIELD.id + "']").prop("checked", false);
});

/* Filters the NATIVE "what type of issue" select down to Cat Inspect's
   7 valid values, then rebuilds the styled picklist widget on top of it
   (the widget caches its option list at build time, so a rebuild is
   required — simply changing the underlying <option> tags alone
   would not update what the user actually sees). */
function filterOobIssueTypesForProduct() {
    const $field =
        findOobFieldByLabel(
            "What type of issue are you reporting?"
        );

    if (
        !$field.length ||
        !$field.is("select")
    ) {
        return;
    }

    if (
        oobIssueTypeOriginalOptionsHtml === null
    ) {
        oobIssueTypeOriginalOptionsHtml =
            $field.html();
    }

   let allowedIssueValues = null;
if (isOobCatInspectSelected()) {
    allowedIssueValues =
        OOB_INSPECT_ALLOWED_ISSUE_VALUES;
} else if (isOobCatPowerOnSiteSelected()) {
    allowedIssueValues =
        OOB_POWER_ONSITE_ALLOWED_ISSUE_VALUES;
} else if (isOobPartsCatComSelected()) {
    allowedIssueValues =
        OOB_PARTS_CAT_COM_ALLOWED_ISSUE_VALUES;
} else if (
    isOobProductLinkSelected() ||
    isOobVisionLinkSelected() ||
    isOobCatRentalsSelected()||
    isOobFuelPromiseProgramSelected()||
    isOobSis2Selected()
) {
    allowedIssueValues =
        getOobAllowedIssueValues();
}
    const currentValue =
        String($field.val() || "");

    $field.html(
        oobIssueTypeOriginalOptionsHtml
    );

    if (allowedIssueValues) {
        $field
            .find("option")
            .each(function () {
                const optionValue =
                    String(
                        $(this).attr("value") ||
                        ""
                    );

                if (
                    optionValue &&
                    $.inArray(
                        optionValue,
                        allowedIssueValues
                    ) === -1
                ) {
                    $(this).remove();
                }
            });

        if (
            $.inArray(
                currentValue,
                allowedIssueValues
            ) !== -1
        ) {
            $field.val(currentValue);
        } else {
            $field.val("");
        }
    } else {
        $field.val(currentValue);
    }

    const resolvedFieldId =
        $field.attr("id");

    if (resolvedFieldId) {
        $("#" + resolvedFieldId + "_catSearchWrapper")
            .remove();

        $("#" + resolvedFieldId + "_catSearchInput")
            .remove();

        $("#" + resolvedFieldId + "_catSearchList")
            .remove();
    }

    $field
        .next(".cat-searchable-picklist")
        .remove();

    $field.removeClass(
        "cat-original-select-hidden"
    );

    $field.show();

    buildSearchablePicklist({
        fieldId: resolvedFieldId,
        label:
            "What type of issue are you reporting?",
        placeholder:
            "Select Support Type"
    });

    applyOobInspectFields();
    applyOobProductLinkFields();
    applyOobVisionLinkFields();
    applyOobRentalsFields();
    applyOobFuelPromiseFields();
    
}

function getOobConditionalRequiredFields() {
    const fields = [];

    if (isOobCatInspectSelected()) {
        fields.push({
            wrapperId: OOB_INSPECT_APP_FIELD.id + "Wrapper",
            fieldId: OOB_INSPECT_APP_FIELD.id,
            label: OOB_INSPECT_APP_FIELD.label
        });

        const issueValue = getOobIssueTypeValue();
        const rule = OOB_INSPECT_FIELD_RULES[issueValue];

        if (rule && rule.assets) {
            fields.push({
                wrapperId: OOB_INSPECT_ASSETS_FIELD.id + "Wrapper",
                fieldId: OOB_INSPECT_ASSETS_FIELD.id,
                label: OOB_INSPECT_ASSETS_FIELD.label,
                isRadio: true
            });
        }
    }

   if (isOobProductLinkSelected()) {
    // Asset ID/Serial Number(s) is Always Shown / Required Yes,
    // regardless of issue type
    fields.push({
        wrapperId:
            OOB_PRODUCT_LINK_FIELDS
                .serialNumber.id +
            "Wrapper",

        fieldId:
            OOB_PRODUCT_LINK_FIELDS
                .serialNumber.id,

        label:
            OOB_PRODUCT_LINK_FIELDS
                .serialNumber.label
    });

    const issueValue =
        getOobIssueTypeValue();

    const rule =
        OOB_PRODUCT_LINK_FIELD_RULES[
            issueValue
        ];

    if (
        rule &&
        rule.deviceModelVisible &&
        rule.deviceModelRequired
    ) {
        fields.push({
            wrapperId:
                OOB_PRODUCT_LINK_FIELDS
                    .deviceModel.id +
                "Wrapper",
            fieldId:
                OOB_PRODUCT_LINK_FIELDS
                    .deviceModel.id,
            label:
                OOB_PRODUCT_LINK_FIELDS
                    .deviceModel.label
        });
    }

    if (
        rule &&
        rule.dataPointVisible &&
        rule.dataPointRequired
    ) {
        fields.push({
            wrapperId:
                OOB_PRODUCT_LINK_FIELDS
                    .dataPoint.id +
                "Wrapper",
            fieldId:
                OOB_PRODUCT_LINK_FIELDS
                    .dataPoint.id,
            label:
                OOB_PRODUCT_LINK_FIELDS
                    .dataPoint.label
        });
    }

    if (
        rule &&
        rule.incorrectLocationVisible &&
        rule.incorrectLocationRequired
    ) {
        fields.push({
            wrapperId:
                OOB_PRODUCT_LINK_FIELDS
                    .incorrectDataLocation.id +
                "Wrapper",
            fieldId:
                OOB_PRODUCT_LINK_FIELDS
                    .incorrectDataLocation.id,
            label:
                OOB_PRODUCT_LINK_FIELDS
                    .incorrectDataLocation.label
        });
    }
}

if (isOobVisionLinkSelected()) {
    const issueValue =
        getOobIssueTypeValue();

    const rule =
        OOB_VISION_LINK_FIELD_RULES[
            issueValue
        ];

    if (
        rule &&
        rule.assetFieldsVisible
    ) {
        if (rule.serialRequired) {
            fields.push({
                wrapperId:
                    OOB_VISION_LINK_FIELDS
                        .serialNumber.id +
                    "Wrapper",
                fieldId:
                    OOB_VISION_LINK_FIELDS
                        .serialNumber.id,
                label:
                    OOB_VISION_LINK_FIELDS
                        .serialNumber.label
            });
        }

        if (rule.equipmentRequired) {
            fields.push({
                wrapperId:
                    OOB_VISION_LINK_FIELDS
                        .equipmentType.id +
                    "Wrapper",
                fieldId:
                    OOB_VISION_LINK_FIELDS
                        .equipmentType.id,
                label:
                    OOB_VISION_LINK_FIELDS
                        .equipmentType.label
            });
        }

        if (
            rule.dataPointVisible &&
            rule.dataPointRequired
        ) {
            fields.push({
                wrapperId:
                    OOB_VISION_LINK_FIELDS
                        .dataPoint.id +
                    "Wrapper",
                fieldId:
                    OOB_VISION_LINK_FIELDS
                        .dataPoint.id,
                label:
                    OOB_VISION_LINK_FIELDS
                        .dataPoint.label
            });
        }
    }
}

if (isOobCatRentalsSelected()) {
    const issueValue = getOobIssueTypeValue();
    const rule = OOB_RENTALS_FIELD_RULES[issueValue];

    if (rule) {
        if (rule.url && rule.url.required) {
            fields.push({ wrapperId: OOB_RENTALS_URL_FIELD.id + "Wrapper", fieldId: OOB_RENTALS_URL_FIELD.id, label: OOB_RENTALS_URL_FIELD.label });
        }
        if ($("#" + OOB_RENTALS_JOBSITE_FIELD.id + "Wrapper").is(":visible")) {
            fields.push({ wrapperId: OOB_RENTALS_JOBSITE_FIELD.id + "Wrapper", fieldId: OOB_RENTALS_JOBSITE_FIELD.id, label: OOB_RENTALS_JOBSITE_FIELD.label });
        }
        if (rule.rentedOwned) {
            fields.push({ wrapperId: OOB_RENTALS_RENTEDOWNED_FIELD.id + "Wrapper", fieldId: OOB_RENTALS_RENTEDOWNED_FIELD.id, label: OOB_RENTALS_RENTEDOWNED_FIELD.label, isRadio: true });
        }
        if (rule.equipmentType) fields.push({ wrapperId: "oobRentalsEquipmentTypeWrapper", fieldId: "oobRentalsEquipmentType", label: "Equipment Type" });
        if (rule.productFamily) fields.push({ wrapperId: "oobRentalsProductFamilyWrapper", fieldId: "oobRentalsProductFamily", label: "Product Family" });
        if (rule.generatorSize) fields.push({ wrapperId: "oobRentalsGeneratorSizeWrapper", fieldId: "oobRentalsGeneratorSize", label: "Generator Size" });
        if (rule.startDate) fields.push({ wrapperId: "oobRentalsStartDateWrapper", fieldId: "oobRentalsStartDate", label: "Start Date" });
        if (rule.endDate) fields.push({ wrapperId: "oobRentalsEndDateWrapper", fieldId: "oobRentalsEndDate", label: "End Date" });
    }
}

    return fields;
}

function wireOobInspectFields() {
    injectOobInspectFields();
    injectOobRentalsFields();
    injectOobProductAndVisionLinkFields();
    injectOobFuelPromiseFields();

    filterOobIssueTypesForProduct();

    applyOobInspectFields();
    applyOobProductLinkFields();
    applyOobVisionLinkFields();
    applyOobRentalsFields();
    applyOobCaseConfiguration();
    applyOobFuelPromiseFields();

    const $productField = findOobFieldByLabel(OOB_PRODUCT_LABEL);
    const productFieldId = $productField.length ? $productField.attr("id") : null;

    if (productFieldId) {
    $(document).on(
        "change input",
        "#" +
            productFieldId +
            ", #" +
            productFieldId +
            "_name",
        function () {
            injectOobProductAndVisionLinkFields();
            injectOobFuelPromiseFields();

            filterOobIssueTypesForProduct();

            applyOobInspectFields();
            applyOobProductLinkFields();
            applyOobVisionLinkFields();
            applyOobRentalsFields();
            applyOobFuelPromiseFields();
            applyOobCaseConfiguration();
        }
    );
}

    const $issueField = findOobFieldByLabel("What type of issue are you reporting?");
    const issueFieldId = $issueField.length ? $issueField.attr("id") : null;

  if (issueFieldId) {
    $(document)
        .off(
            "change.oobProductIssueRules",
            "#" + issueFieldId
        )
        .on(
            "change.oobProductIssueRules",
            "#" + issueFieldId,
            function () {
                applyOobInspectFields();
                applyOobProductLinkFields();
                applyOobVisionLinkFields();
                applyOobRentalsFields();
                applyOobFuelPromiseFields();
                applyOobCaseConfiguration();
            }
        );
}
$(document)
    .off(
        "change.oobTechOnSitePriority"
    )
    .on(
        "change.oobTechOnSitePriority",
        "#" +
            OOB_PRODUCT_LINK_FIELDS
                .techOnSite.id +
            ", #" +
            OOB_VISION_LINK_FIELDS
                .techOnSite.id,
        function () {
            applyOobCaseConfiguration();
        }
    );

    $(document).on("change", "#" + OOB_INSPECT_APP_FIELD.id, function () {
        clearOobInspectFieldError($("#" + OOB_INSPECT_APP_FIELD.id + "Wrapper"));
    });

    $(document).on("change", "input[name='" + OOB_INSPECT_ASSETS_FIELD.id + "']", function () {
        clearOobInspectFieldError($("#" + OOB_INSPECT_ASSETS_FIELD.id + "Wrapper"));
    });

   let lastProduct =
    getOobProductText();

let lastIssue =
    getOobIssueTypeValue();

setInterval(function () {
    injectOobInspectFields();
    injectOobRentalsFields();
    injectOobProductAndVisionLinkFields();
    injectOobFuelPromiseFields();

    const currentProduct =
        getOobProductText();

    const currentIssue =
        getOobIssueTypeValue();

    const productChanged =
        currentProduct !== lastProduct;

    const issueChanged =
        currentIssue !== lastIssue;

    lastProduct =
        currentProduct;

    lastIssue =
        currentIssue;

    if (productChanged) {
        filterOobIssueTypesForProduct();
    }

    if (
        productChanged ||
        issueChanged
    ) {
        applyOobInspectFields();
        applyOobProductLinkFields();
        applyOobVisionLinkFields();
        applyOobRentalsFields();
        applyOobFuelPromiseFields();
        applyOobCaseConfiguration();

    }
}, 400);
}

function parseOobAssetSerialNumbers(
    rawValue
) {
    const value =
        String(rawValue || "").trim();

    if (!value) {
        return [];
    }

    const serialNumbers = value
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

function savePendingOobAssetData() {
    if (
        !isOobProductLinkSelected() &&
        !isOobVisionLinkSelected()
    ) {
        sessionStorage.removeItem(
            OOB_ASSET_STORAGE_KEY
        );

        return;
    }

    let assetData = null;

    if (isOobProductLinkSelected()) {
        const serialNumbers =
            parseOobAssetSerialNumbers(
                $(
                    "#" +
                    OOB_PRODUCT_LINK_FIELDS
                        .serialNumber.id
                ).val()
            );

        const deviceSerialNumber =
            (
                $(
                    "#" +
                    OOB_PRODUCT_LINK_FIELDS
                        .deviceSerialNumber.id
                ).val() || ""
            ).trim();

        const deviceModelValue =
    (
        $("#" +
            OOB_PRODUCT_LINK_FIELDS
                .deviceModel.id
        ).val() || ""
    ).trim();

const deviceModelLabel =
    (
        $("#" +
            OOB_PRODUCT_LINK_FIELDS
                .deviceModel.id +
            " option:selected"
        ).text() || ""
    ).trim();

        const dataPointValue =
            (
                $(
                    "#" +
                    OOB_PRODUCT_LINK_FIELDS
                        .dataPoint.id
                ).val() || ""
            ).trim();

        const dataPointLabel =
            (
                $(
                    "#" +
                    OOB_PRODUCT_LINK_FIELDS
                        .dataPoint.id +
                    " option:selected"
                ).text() || ""
            ).trim();

        assetData = {
            product:
                "cat product link",

            serialNumbers:
                serialNumbers,

            deviceSerialNumber:
                deviceSerialNumber,
            deviceModelValue:
    deviceModelValue,

deviceModelLabel:
    deviceModelLabel,

            dataPointValue:
                dataPointValue,

            dataPointLabel:
                dataPointLabel,

            equipmentType:
                ""
        };
    }

    if (isOobVisionLinkSelected()) {
        const serialNumbers =
            parseOobAssetSerialNumbers(
                $(
                    "#" +
                    OOB_VISION_LINK_FIELDS
                        .serialNumber.id
                ).val()
            );

       const equipmentTypeValue =
    (
        $("#" +
            OOB_VISION_LINK_FIELDS
                .equipmentType.id
        ).val() || ""
    ).trim();

const equipmentTypeLabel =
    (
        $("#" +
            OOB_VISION_LINK_FIELDS
                .equipmentType.id +
            " option:selected"
        ).text() || ""
    ).trim();
const deviceModelValue =
    (
        $("#" +
            OOB_VISION_LINK_FIELDS
                .deviceModel.id
        ).val() || ""
    ).trim();

const deviceModelLabel =
    (
        $("#" +
            OOB_VISION_LINK_FIELDS
                .deviceModel.id +
            " option:selected"
        ).text() || ""
    ).trim();

        const deviceSerialNumber =
            (
                $(
                    "#" +
                    OOB_VISION_LINK_FIELDS
                        .deviceSerialNumber.id
                ).val() || ""
            ).trim();

        const dataPointValue =
            (
                $(
                    "#" +
                    OOB_VISION_LINK_FIELDS
                        .dataPoint.id
                ).val() || ""
            ).trim();

        const dataPointLabel =
            (
                $(
                    "#" +
                    OOB_VISION_LINK_FIELDS
                        .dataPoint.id +
                    " option:selected"
                ).text() || ""
            ).trim();

        assetData = {
            product:
                "vision link",

            serialNumbers:
                serialNumbers,
            equipmentTypeValue:
    equipmentTypeValue,

equipmentTypeLabel:
    equipmentTypeLabel,

deviceModelValue:
    deviceModelValue,

deviceModelLabel:
    deviceModelLabel,

            deviceSerialNumber:
                deviceSerialNumber,

            dataPointValue:
                dataPointValue,

            dataPointLabel:
                dataPointLabel,
        };
    }

    if (
        !assetData ||
        assetData.serialNumbers.length === 0
    ) {
        sessionStorage.removeItem(
            OOB_ASSET_STORAGE_KEY
        );

        return;
    }

    sessionStorage.setItem(
        OOB_ASSET_STORAGE_KEY,
        JSON.stringify(assetData)
    );

    console.log(
        "CAT: Pending OOB Asset data saved:",
        assetData
    );
}

window.savePendingOobAssetData =
    savePendingOobAssetData;

function appendOobConditionalFieldsToDescription() {
    const MAX = 250;
    const $description = $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.descriptionId);

    if (!$description.length) {
        return;
    }

    const baseMessage = ($description.val() || "").trim();
    const extraLines = [];

    $(".cat-oob-conditional:visible").each(function () {
        const $wrapper = $(this);
        const label = $wrapper.attr("data-field-label") || "";
        const wrapperId =
    $wrapper.attr("id") || "";

    if (wrapperId === "oobInspectAppWrapper"){
        return;
    }

const assetWrapperIds = [
    OOB_PRODUCT_LINK_FIELDS
        .serialNumber.id +
        "Wrapper",
    OOB_PRODUCT_LINK_FIELDS
    .deviceModel.id +
    "Wrapper",

OOB_VISION_LINK_FIELDS
    .deviceModel.id +
    "Wrapper",

    OOB_PRODUCT_LINK_FIELDS
        .deviceSerialNumber.id +
        "Wrapper",

    OOB_PRODUCT_LINK_FIELDS
        .dataPoint.id +
        "Wrapper",

    OOB_VISION_LINK_FIELDS
        .serialNumber.id +
        "Wrapper",

    OOB_VISION_LINK_FIELDS
        .equipmentType.id +
        "Wrapper",

    OOB_VISION_LINK_FIELDS
        .deviceSerialNumber.id +
        "Wrapper",

    OOB_VISION_LINK_FIELDS
        .dataPoint.id +
        "Wrapper",
    "oobRentalsEquipmentTypeWrapper",
    "oobRentalsProductFamilyWrapper",
    "oobRentalsGeneratorSizeWrapper",
    "oobRentalsStartDateWrapper",
    "oobRentalsEndDateWrapper"
];

if (
    $.inArray(
        wrapperId,
        assetWrapperIds
    ) !== -1
) {
    return;
}
        const $radios = $wrapper.find("input[type='radio']");
        let value = "";

      if ($radios.length) {
    value =
        $wrapper
            .find(
                "input[type='radio']:checked"
            )
            .val() || "";
} else {
    const $checkbox =
        $wrapper
            .find(
                "input[type='checkbox']"
            )
            .first();

    if ($checkbox.length) {
        value =
            $checkbox.is(":checked")
                ? "Yes"
                : "";
    } else {
        const $control =
            $wrapper
                .find(
                    "input, select, textarea"
                )
                .first();

        if ($control.is("select")) {
            value =
                (
                    $control
                        .find(
                            "option:selected"
                        )
                        .text() || ""
                ).trim();

            if (!$control.val()) {
                value = "";
            }
        } else {
            value =
                ($control.val() || "")
                    .trim();
        }
    }
}

        if (value) {
            const line = label + ": " + value;

            /* Guard against this function running more than once
               before submit actually fires */
            if (baseMessage.indexOf(line) === -1) {
                extraLines.push(line);
            }
        }
    });

    if (!extraLines.length) {
        return;
    }

    let combined = baseMessage;

    extraLines.forEach(function (line) {
        const candidate = combined ? combined + " | " + line : line;

        if (candidate.length <= MAX) {
            combined = candidate;
        }
    });

    $description.val(combined).trigger("change");
}

const OOB_PRODUCT_LABEL = "What product are you submitting a support case for?";

function getOobProductText() {
    const $field =
        findOobFieldByLabel(
            OOB_PRODUCT_LABEL
        );

    if (!$field.length) {
        return "";
    }

    let productText = "";

    const fieldId =
        $field.attr("id");

    if (fieldId) {
        const $nameField =
            $("#" + fieldId + "_name");

        if (
            $nameField.length &&
            ($nameField.val() || "").trim()
        ) {
            productText =
                $nameField.val();
        }
    }

    if (!productText && $field.is("select")) {
        productText =
            $field
                .find("option:selected")
                .text();
    }

    if (!productText) {
        productText =
            $field.val() || "";
    }

    return normalizeOobProductName(
        productText
    );
}

function buildOobConditionalFieldHtml(cfg) {
    let controlHtml = "";
    let helpHtml = "";
    let describedBy = "";

    if (cfg.helpText) {
        describedBy = ' aria-describedby="' + cfg.id + 'HelpText"';

        helpHtml =
            '<span class="cat-description-help-wrapper" data-cat-field-help>' +
                '<button type="button" ' +
                    'id="' + cfg.id + 'HelpButton" ' +
                    'class="cat-description-help-button" ' +
                    'aria-label="Help for ' + htmlEncode(cfg.label) + '" ' +
                    'aria-controls="' + cfg.id + 'HelpText" ' +
                    'aria-expanded="false">' +
                    '<img src="info-filled.png" ' +
                        'class="cat-description-help-icon" ' +
                        'alt="" ' +
                        'aria-hidden="true" ' +
                        'style="width:14px; height:14px; display:block;" />' +
                '</button>' +
                '<span id="' + cfg.id + 'HelpText" ' +
                    'class="cat-description-help-text" ' +
                    'role="tooltip">' +
                    htmlEncode(cfg.helpText) +
                '</span>' +
            '</span>';
    }

    if (cfg.type === "select") {
        let optionsHtml =
            '<option value="">Select Option</option>';

        (cfg.options || []).forEach(function (opt) {
            optionsHtml +=
                '<option value="' + htmlEncode(opt) + '">' +
                    htmlEncode(opt) +
                '</option>';
        });

        controlHtml =
            '<select id="' + cfg.id + '" ' +
                'class="cat-custom-input"' +
                describedBy +
            '>' +
                optionsHtml +
            '</select>';
    } else {
        controlHtml =
            '<input type="text" ' +
                'id="' + cfg.id + '" ' +
                'class="cat-custom-input" ' +
                'placeholder="' +
                    htmlEncode(cfg.placeholder || "") +
                '"' +
                describedBy +
            ' />';
    }

    return (
        '<div class="cat-field cat-oob-conditional" ' +
            'data-field-label="' + htmlEncode(cfg.label) + '" ' +
            'id="' + cfg.id + 'Wrapper" ' +
            'style="display:none;">' +

            '<label for="' + cfg.id + '">' +
                htmlEncode(cfg.label) +
                helpHtml +
            '</label>' +

            controlHtml +
        '</div>'
    );
}

function injectOobConditionalFields() {
    if ($(".cat-oob-conditional").length > 0) {
        return;
    }

    let html = "";

    OOB_CONDITIONAL_FIELDS_CONFIG.forEach(function (cfg) {
        html += buildOobConditionalFieldHtml(cfg);
    });

    const $productWrapper = findOobWrapperByLabel(OOB_PRODUCT_LABEL);

    if ($productWrapper.length) {
        $productWrapper.after(html);
    } else {
        getOobFormContainer().prepend(html);
    }
}

function applyOobConditionalFields() {
    const productText = getOobProductText();

    OOB_CONDITIONAL_FIELDS_CONFIG.forEach(function (cfg) {
        const $wrapper = $("#" + cfg.id + "Wrapper");

        if (!$wrapper.length) {
            return;
        }

        if ($.inArray(productText, cfg.triggerValues) !== -1) {
            $wrapper.show();
        } else {
            $wrapper.hide();
            $("#" + cfg.id).val("");
        }
    });
}

function wireOobConditionalFields() {
    injectOobConditionalFields();
    applyOobConditionalFields();

    const $productField = findOobFieldByLabel(OOB_PRODUCT_LABEL);
    const fieldId = $productField.length ? $productField.attr("id") : null;

    if (fieldId) {
        $(document).on("change input", "#" + fieldId + ", #" + fieldId + "_name", function () {
            applyOobConditionalFields();
        });
    }

    // Power Pages lookups often set values without firing events,
    // so poll as a safety net (same approach as attachSelectPoll).
    let lastSeen = getOobProductText();

    setInterval(function () {
        const current = getOobProductText();

        if (current !== lastSeen) {
            lastSeen = current;
            applyOobConditionalFields();
        }
    }, 400);
}

/* =====================================================
   OOB PRODUCT-SPECIFIC FIELD HELP
   ===================================================== */
function wireOobConditionalFieldHelp() {
    const helpSelector =
        ".cat-oob-conditional [data-cat-field-help]";

    function closeHelp($wrapper) {
        if (!$wrapper || !$wrapper.length) {
            return;
        }

        $wrapper
            .find(".cat-description-help-text")
            .removeClass("is-open");

        $wrapper
            .find(".cat-description-help-button")
            .attr("aria-expanded", "false");
    }

    function closeAllHelp(exceptElement) {
        $(helpSelector).each(function () {
            if (this !== exceptElement) {
                closeHelp($(this));
            }
        });
    }

    function openHelp($wrapper) {
        if (!$wrapper || !$wrapper.length) {
            return;
        }

        closeAllHelp($wrapper[0]);

        $wrapper
            .find(".cat-description-help-text")
            .addClass("is-open");

        $wrapper
            .find(".cat-description-help-button")
            .attr("aria-expanded", "true");
    }

    $(document)
        .off("click.catOobFieldHelp")
        .on(
            "click.catOobFieldHelp",
            helpSelector + " .cat-description-help-button",
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                const $wrapper =
                    $(this).closest("[data-cat-field-help]");

                const isOpen = $wrapper
                    .find(".cat-description-help-text")
                    .hasClass("is-open");

                if (isOpen) {
                    closeHelp($wrapper);
                } else {
                    openHelp($wrapper);
                }
            }
        );

    $(document)
        .off("focusin.catOobFieldHelp input.catOobFieldHelp")
        .on(
            "focusin.catOobFieldHelp input.catOobFieldHelp",
            ".cat-oob-conditional input, .cat-oob-conditional select",
            function () {
                const $wrapper = $(this)
                    .closest(".cat-oob-conditional")
                    .find("[data-cat-field-help]")
                    .first();

                if ($wrapper.length) {
                    openHelp($wrapper);
                }
            }
        );

    $(document)
        .off("click.catOobFieldHelpOutside")
        .on(
            "click.catOobFieldHelpOutside",
            function (event) {
                if (
                    $(event.target)
                        .closest(".cat-oob-conditional")
                        .length === 0
                ) {
                    closeAllHelp(null);
                }
            }
        );

    $(document)
        .off("keydown.catOobFieldHelp")
        .on(
            "keydown.catOobFieldHelp",
            function (event) {
                if (event.key === "Escape") {
                    closeAllHelp(null);
                }
            }
        );
}
  

    /*
        =====================================================
        PAGE SHAPE / TITLE / SUMMARY
        =====================================================
    */

    function setupPageTitleAndSummary() {
        const $container = getOobFormContainer();

        if (!$container.length) {
            return;
        }

        if ($("#catMainTitle").length === 0) {

// AFTER
$container.before('<h2 id="catMainTitle" class="cat-form-title">Cat® Customer Support Request</h2>');
        }

        if ($("#catValidationSummary").length === 0) {
            $("#catMainTitle").after('<div id="catValidationSummary" class="cat-validation-summary" style="display:none;"></div>');
        }

        $(".validation-summary-errors, .alert.alert-danger.validation-summary, #ValidationSummaryEntityFormView, #ValidationSummaryContainer").hide();
    }

    /*
        =====================================================
        CUSTOM FIELD HTML
        =====================================================
    */

function buildCustomFieldHtml(id, label, type, value) {
        return (
            '<tr class="cat-injected-row"><td class="cell" colspan="2">' +
            '<div class="cat-field cat-custom-required" data-field-label="' + htmlEncode(label) + '" id="' + id + 'Wrapper">' +
                '<label for="' + id + '">' + htmlEncode(label) + ' <span class="req">*</span></label>' +
                '<input type="' + type + '" id="' + id + '" class="cat-custom-input" value="' + htmlEncode(value) + '" />' +
                '<div class="cat-error-message">Complete this field.</div>' +
            '</div>' +
            '</td></tr>'
        );
    }

    function injectCustomFieldsInline() {
        if ($("#catFirstNameWrapper").length > 0) {
            return;
        }

        const firstNameHtml = buildCustomFieldHtml("catFirstName", "First Name", "text", getSeedValue("seedFirstName"));
        const lastNameHtml = buildCustomFieldHtml("catLastName", "Last Name", "text", getSeedValue("seedLastName"));
        const emailHtml = buildCustomFieldHtml("catEmail", "Email", "email", getSeedValue("seedEmail"));

        const countryHtml = buildCustomFieldHtml("catCountry", "Country", "text", getSeedValue("seedCountry"));
       const stateHtml = buildCustomFieldHtml("catState", "State/Province", "text", getSeedValue("SeedState"));
       const cityHtml = buildCustomFieldHtml("catCity","City", "text", getSeedValue("seedCity"));

       const additionalEmailsLinkHtml =
            '<tr class="cat-injected-row"><td class="cell" colspan="2">' +
            '<a href="#" id="oobAddAdditionalEmailsLink" class="cat-additional-emails-link">Add additional emails</a>' +
            '</td></tr>';

        const additionalEmail1Html = buildOptionalCustomFieldHtml("catAdditionalEmail1", "Additional Email 1", "email");
        const additionalEmail2Html = buildOptionalCustomFieldHtml("catAdditionalEmail2", "Additional Email 2", "email");

        const $productTechWrapper = findOobWrapperByLabel("What product are you submitting a support case for?");
        const $dealerWrapper = findOobWrapperByLabel("Dealer Name");
        
if ($productTechWrapper.length) {
            $productTechWrapper.after(firstNameHtml + lastNameHtml + emailHtml);
        }

        if ($dealerWrapper.length) {
            $dealerWrapper.after(countryHtml + stateHtml + cityHtml + additionalEmailsLinkHtml + additionalEmail1Html + additionalEmail2Html);
        }

        /*
            If the label matching fails, fallback to placing custom fields at top.
        */
        if (!$productTechWrapper.length) {
            const $container = getOobFormContainer();
            $container.prepend(firstNameHtml + lastNameHtml + emailHtml);
        }

        if (!$dealerWrapper.length) {
            $("#catEmailWrapper").after(countryHtml + stateHtml + cityHtml + additionalEmailsLinkHtml + additionalEmail1Html + additionalEmail2Html);
        }
        
    }

   $(document)
    .off("click.catOobAdditionalEmailsToggle")
    .on("click.catOobAdditionalEmailsToggle", "#oobAddAdditionalEmailsLink", function (e) {
        e.preventDefault();

        var $rows = $("#catAdditionalEmail1Row, #catAdditionalEmail2Row");
        var $cells = $rows.find("td.cell");

        if ($rows.first().hasClass("cat-hidden-field")) {
            $rows.removeClass("cat-hidden-field").removeAttr("style");
            $cells.removeAttr("style");
        } else {
            $rows.addClass("cat-hidden-field").attr("style", "display:none !important;");
            $cells.attr("style", "display:none !important;");
        }
    });

    /*
        =====================================================
        ATTACHMENT HTML
        =====================================================
    */

function buildAttachmentHtml() {
    return (
        '<div id="catAttachmentBlock">' +
            '<p class="attach-label">' +
    'Please attach additional files' +
    '<span class="cat-attachment-help-wrapper">' +
        '<button type="button" ' +
            'id="attachmentHelpButton" ' +
            'class="cat-attachment-help-button" ' +
            'aria-label="Help for file attachments" ' +
            'aria-controls="attachmentHelpText" ' +
            'aria-expanded="false">' +
            '<img src="info-filled.png" ' +
                'class="cat-attachment-help-icon" ' +
                'alt="" aria-hidden="true" />' +
        '</button>' +
        '<span id="attachmentHelpText" ' +
            'class="cat-attachment-help-text" ' +
            'role="tooltip">' +
            'Upload a full snapshot of the screen with the insight you are concerned about, including the URL' +
        '</span>' +
    '</span>' +
'</p>' +

            '<div id="catAttachmentZone" class="attachment-zone">' +
                '<div id="catDropZone">' +
                    '<i class="fa fa-cloud-upload" aria-hidden="true"></i>' +
                    '<p>Drag &amp; Drop files here or <span id="catBrowseLink">Browse</span></p>' +
                '</div>' +

                '<div id="catFilePreviews"></div>' +
                '<div id="catFileErrors"></div>' +
            '</div>' +
        '</div>'
    );
}

function injectAttachmentBlock() {
    if ($("#catAttachmentBlock").length > 0) {
        return;
    }

    const attachmentHtml = buildAttachmentHtml();

    /*
        Use field ID first so attachment placement does not break
        when the Description label is changed.
    */
    let $descriptionField = $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.descriptionId);

    /*
        Fallback labels.
    */
    if (!$descriptionField.length) {
        $descriptionField = findOobFieldByLabel("How can we help?");
    }

    if (!$descriptionField.length) {
        $descriptionField = findOobFieldByLabel("Description");
    }

    if ($descriptionField.length) {
        const $descriptionWrapper = $descriptionField
            .closest("tr")
            .first();

        if ($descriptionWrapper.length) {
            $descriptionWrapper.after(attachmentHtml);
            return;
        }
    }

    const $submitButton = $("#InsertButton, input[type='submit'], button[type='submit']").first();

    if ($submitButton.length) {
        const $submitWrapper = $submitButton
            .closest("tr, td, .cell, .form-group, div")
            .first();

        if ($submitWrapper.length) {
            $submitWrapper.before(attachmentHtml);
            return;
        }

        $submitButton.before(attachmentHtml);
        return;
    }

    getOobFormContainer().append(attachmentHtml);
}

    /*
        =====================================================
        CUSTOM VALIDATION
        =====================================================
    */

function clearCustomError($field) {
    const $wrapper = $field.closest(".cat-field");

    $wrapper.removeClass("has-error");
    $wrapper.find(".cat-error-message").hide();
    $field.removeAttr("aria-invalid");
}

function showCustomError($field, message) {
    const $wrapper = $field.closest(".cat-field");

    $wrapper.addClass("has-error");
    $field.attr("aria-invalid", "true");

    $wrapper.find(".cat-error-message")
        .text(message)
        .show();
}

function validateCaptchaRequiredOnSubmit() {
    var $captchaInput = getCaptchaInput();

    if (!$captchaInput.length) {
        console.warn("CAT: CAPTCHA input was not found on the page.");
        return true;
    }

    var captchaValue = ($captchaInput.val() || "").trim();

    if (!captchaValue) {
        showOobError($captchaInput, CAT_CAPTCHA_CONFIG.requiredMessage);

        showValidationSummary([
            {
                field: $captchaInput[0],
                label: "Captcha",
                message: CAT_CAPTCHA_CONFIG.requiredMessage,
                top: getFieldTopPosition($captchaInput)
            }
        ]);

        forceValidationStyles();

        setTimeout(function () {
            scrollToFirstInvalid($captchaInput[0]);
        }, 200);

        return false;
    }

    clearOobError($captchaInput);
    return true;
}

function showIncorrectCaptchaPopupAfterSubmitAttempt() {
    var submitAttempted = sessionStorage.getItem(CAT_CAPTCHA_CONFIG.submitAttemptKey);

    if (submitAttempted !== "1") {
        return;
    }
    var attemptTime= parseInt(sessionStorage.getItem(CAT_CAPTCHA_CONFIG.submitAttemptKey + "_TIME") || "0", 10);
    var elapsed =Date.now() - attemptTime;

    if (!attemptTime || elapsed > 15000) {
        sessionStorage.removeItem(CAT_CAPTCHA_CONFIG.submitAttemptKey);
        sessionStorage.removeItem(CAT_CAPTCHA_CONFIG.submitAttemptKey + "_TIME");
        sessionStorage.removeItem(CAT_CAPTCHA_CONFIG.customFieldStorageKey);
        return;
    }

    // var pageText = ($("body").text() || "").toLowerCase();
    var $oobSummary = $(".validation-summary-errors, .alert.alert-danger.validation-summary, #ValidationSummaryEntityFormView, #ValidationSummaryContainer");
    var oobSummaryText= ($oobSummary.text() || "").toLowerCase();

    var $captchaControl= $("input[id$='CaptchaTextBox'], input[name$='CaptchaTextBox']");
    var formStillPresent = getCaptchaInput().length > 0;

    var summaryMentionsCaptcha =
    oobSummaryText.indexOf("captcha") >= 0 ||
    oobSummaryText.indexOf("code you entered") >= 0 ||
    oobSummaryText.indexOf("verification") >= 0;

    var hasServerError = $oobSummary.length > 0 && $.trim(oobSummaryText).length> 0;
    
    console.log("CAT captcha check -> hasServerError:", hasServerError,
    "| formStillPresent:",formStillPresent,
    "| summary:", oobSummaryText);

    var captchaFailed = summaryMentionsCaptcha || (hasServerError && formStillPresent);

    if (!captchaFailed) {
        sessionStorage.removeItem(CAT_CAPTCHA_CONFIG.submitAttemptKey);
        sessionStorage.removeItem(CAT_CAPTCHA_CONFIG.submitAttemptKey +"_TIME");
        sessionStorage.removeItem(CAT_CAPTCHA_CONFIG.customFieldStorageKey);
        return;
    }

    sessionStorage.removeItem(CAT_CAPTCHA_CONFIG.submitAttemptKey);
    sessionStorage.removeItem(CAT_CAPTCHA_CONFIG.submitAttemptKey +"_TIME");
    // alert(CAT_CAPTCHA_CONFIG.incorrectMessage);

    var $captchaInput = getCaptchaInput();

    showValidationSummary([
        {
            field: $captchaInput.length ? $captchaInput[0] : null,
            label: "Captcha",
            message: CAT_CAPTCHA_CONFIG.incorrectMessage,
            top: $captchaInput.length ? getFieldTopPosition($captchaInput) : 0
        }
    ]);

    if ($captchaInput.length) {
        showOobError($captchaInput, CAT_CAPTCHA_CONFIG.incorrectMessage);
        scrollToFirstInvalid($captchaInput[0]);
    }
}

function clearOobError($field) {
    const $wrapper = getOobFieldWrapper($field);

    $wrapper.removeClass("oob-field-error");
    $wrapper.find(".oob-error-message").remove();

    $field.removeClass("oob-invalid-control");
    $field.removeAttr("aria-invalid");

    $field.closest(".control").removeClass("oob-field-error");
    $field.closest(".input-group").removeClass("oob-field-error");

    $field.css({
        "border": "",
        "box-shadow": "",
        "outline": ""
    });

    const searchInputId = $field.attr("id") + "_catSearchInput";
    const searchWrapperId = $field.attr("id") + "_catSearchWrapper";

    const $searchInput = $("#" + searchInputId);
    const $searchWrapper = $("#" + searchWrapperId);

    if ($searchInput.length) {
        $searchInput.removeClass("cat-searchable-error");
    }

    if ($searchWrapper.length) {
        $searchWrapper.removeClass("cat-searchable-error");
    }
}

function showOobError($field, message) {
    clearOobError($field);

    const $wrapper = getOobFieldWrapper($field);
    const $control = $field.closest(".control");

    $wrapper.addClass("oob-field-error");
    $control.addClass("oob-field-error");
    $field.addClass("oob-invalid-control");
    $field.attr("aria-invalid", "true");

    $field.css({
        "border": "2px solid #e81123",
        "box-shadow": "0 0 0 1px rgba(232, 17, 35, 0.15)",
        "outline": "none"
    });

    if ($control.length) {
        if ($control.next(".oob-error-message").length === 0) {
            $control.after('<div class="oob-error-message">' + message + '</div>');
        } else {
            $control.next(".oob-error-message").text(message);
        }
    } else {
        if ($field.next(".oob-error-message").length === 0) {
            $field.after('<div class="oob-error-message">' + message + '</div>');
        } else {
            $field.next(".oob-error-message").text(message);
        }
    }

    const searchInputId = $field.attr("id") + "_catSearchInput";
    const searchWrapperId = $field.attr("id") + "_catSearchWrapper";

    const $searchInput = $("#" + searchInputId);
    const $searchWrapper = $("#" + searchWrapperId);

    if ($searchInput.length) {
        $searchInput.addClass("cat-searchable-error");
    }

    if ($searchWrapper.length) {
        $searchWrapper.addClass("cat-searchable-error");
    }
}

    function getCustomFieldLabel($field) {
        return (
            $field.closest(".cat-field").attr("data-field-label") ||
            $field.closest(".cat-field").find("label").first().text() ||
            $field.attr("id") ||
            "This field"
        ).replace("*", "").trim();
    }

    function getCustomFieldMessage($field) {
        const type = ($field.attr("type") || "").toLowerCase();
        const value = ($field.val() || "").trim();

        if (!value) {
            return "Complete this field.";
        }

        if (type === "email" && $field[0].validity && !$field[0].validity.valid) {
            return "Enter a valid email address.";
        }

        if ($field[0].validity && !$field[0].validity.valid) {
            return "Enter a valid value.";
        }

        return "";
    }

function showValidationSummary(invalidFields) {
    const $summary = $("#catValidationSummary");

    $summary.empty();

    $summary.append(
        "<strong>Submission failed.</strong> " +
        "One or more required fields are missing or contain invalid values. " +
        "Please review and correct the highlighted fields."
    );

    // if (invalidFields.length > 0) {
    //     const $list = $('<ul class="cat-validation-list"></ul>');

    //     invalidFields.forEach(function (item) {
    //         $("<li></li>")
    //             .text(item.label + " - " + item.message)
    //             .appendTo($list);
    //     });

    //     $summary.append($list);
    // }

    /*
        Place validation summary directly below title.
        This prevents it from appearing too far left or inside the form table.
    */
    const $title = $("#catMainTitle, .cat-form-title").first();

    if ($title.length && !$summary.prev().is($title)) {
        $summary.insertAfter($title);
    }

    $summary.stop(true, true).slideDown(150);
}

function scrollToFirstInvalid(firstInvalidElement) {
    if (!firstInvalidElement || !$(firstInvalidElement).length) {
        return;
    }

    var $field = $(firstInvalidElement);

    /*
        For lookup/input-group fields, focus the visible textbox.
        For normal fields, focus the field itself.
    */
    var $focusTarget = $field;

    if ($field.closest(".input-group").length) {
        var $lookupInput = $field.closest(".input-group").find("input:visible").first();

        if ($lookupInput.length) {
            $focusTarget = $lookupInput;
        }
    }

    /*
        Find the full wrapper so the scroll goes to the label + field,
        not just the input itself.
    */
    var $targetWrapper = $field.closest(
        ".cat-field, td.cell, td.clearfix.cell, .cell, .form-group, .control, tr"
    ).first();

    if (!$targetWrapper.length) {
        $targetWrapper = $field;
    }

    var headerOffset = 120;
    var targetTop = $targetWrapper.offset().top - headerOffset;

    if (targetTop < 0) {
        targetTop = 0;
    }

    $("html, body").stop(true).animate(
        {
            scrollTop: targetTop
        },
        350,
        function () {
            setTimeout(function () {
                try {
                    $focusTarget.trigger("focus");

                    if ($focusTarget.is("input, textarea")) {
                        var valueLength = ($focusTarget.val() || "").length;
                        $focusTarget[0].setSelectionRange(valueLength, valueLength);
                    }
                } catch (e) {
                    try {
                        $focusTarget.focus();
                    } catch (ignore) {}
                }
            }, 100);
        }
    );
}

function getFieldTopPosition($field) {
    const $wrapper = $field.closest(
        ".cat-field, td.cell, td.clearfix.cell, .cell, .form-group, .control, tr"
    ).first();

    if ($wrapper.length) {
        return $wrapper.offset().top;
    }

    return $field.offset().top;
}

function validateCatBasicForm() {
    let isValid = true;
    let invalidFields = [];

    $("#catValidationSummary").hide();

    $(".validation-summary-errors, .alert.alert-danger.validation-summary, #ValidationSummaryEntityFormView, #ValidationSummaryContainer").hide();

    $(".cat-custom-required input, .cat-custom-required select, .cat-custom-required textarea").each(function () {
        const $field = $(this);
        const message = getCustomFieldMessage($field);

        if (message) {
            isValid = false;

            showCustomError($field, message);

            invalidFields.push({
                field: this,
                label: getCustomFieldLabel($field),
                message: message,
                top: getFieldTopPosition($field)
            });
        } else {
            clearCustomError($field);
        }
    });

    REQUIRED_OOB_FIELDS.forEach(function (labelText) {
        const $field = findOobFieldByLabel(labelText);

        if (!$field.length) {
            isValid = false;

            invalidFields.push({
                field: null,
                label: labelText,
                message: "Field was not found on the Basic Form.",
                top: 999999
            });

            return;
        }

        const value = ($field.val() || "").trim();

        if (!value) {
            isValid = false;

            showOobError($field, "Complete this field.");

            invalidFields.push({
                field: $field[0],
                label: labelText,
                message: "Complete this field.",
                top: getFieldTopPosition($field)
            });

        } else if ($field[0].validity && !$field[0].validity.valid) {
            isValid = false;

            showOobError($field, "Enter a valid value.");

            invalidFields.push({
                field: $field[0],
                label: labelText,
                message: "Enter a valid value.",
                top: getFieldTopPosition($field)
            });

} else {
            clearOobError($field);
        }
    });

    getOobConditionalRequiredFields().forEach(function (cfg) {
        const $wrapper = $("#" + cfg.wrapperId);

        if (!$wrapper.length || !$wrapper.is(":visible")) {
            return;
        }

        const hasValue = cfg.isRadio
            ? $wrapper.find("input[type='radio']:checked").length > 0
            : (($("#" + cfg.fieldId).val() || "").trim().length > 0);

        if (!hasValue) {
            isValid = false;

            showOobInspectFieldError($wrapper, "Complete this field.");

            invalidFields.push({
                field: $wrapper[0],
                label: cfg.label,
                message: "Complete this field.",
                top: getFieldTopPosition($wrapper)
            });
        } else {
            clearOobInspectFieldError($wrapper);
        }
    });
    
    if (!isValid) {
        invalidFields.sort(function (a, b) {
            return a.top - b.top;
        });

        showValidationSummary(invalidFields);
        forceValidationStyles();

        const firstInvalidItem = invalidFields.find(function (item) {
            return item.field !== null;
        });

        if (firstInvalidItem) {
            setTimeout(function () {
                scrollToFirstInvalid(firstInvalidItem.field);
            }, 200);
        }
    }

    return isValid;
}

    /*
        Remove red border as users fix fields.
    */
    $(document).on("input change blur", ".cat-custom-required input, .cat-custom-required select, .cat-custom-required textarea", function () {
        const $field = $(this);
        const message = getCustomFieldMessage($field);

        if (!message) {
            clearCustomError($field);
        }
    });

    $(document).on("input change blur", "input", function () {
        var $field = $(this);
        var id = ($field.attr("id") || "").toLowerCase();
        var name = ($field.attr("name") || "").toLowerCase();

        if (
            id.indexOf("captcha") >= 0 ||
            name.indexOf("captcha") >= 0
        ) {
            var value = ($field.val() || "").trim();

            if (value) {
                clearOobError($field);
            }
        }
    });

    REQUIRED_OOB_FIELDS.forEach(function (labelText) {
        const $field = findOobFieldByLabel(labelText);

        if ($field.length) {
            $field.on("input change blur", function () {
                const value = ($(this).val() || "").trim();

                if (value) {
                    clearOobError($(this));
                }
            });
        }
    });

    /*
        =====================================================
        BASIC FORM SUBMIT INTEGRATION
        =====================================================
    */

if (typeof entityFormClientValidate !== "undefined") {
    var originalEntityFormClientValidate = entityFormClientValidate;

entityFormClientValidate = function () {
        if (
            isOobCatRentalsSelected() &&
            $("input[name='" + OOB_RENTALS_RENTEDOWNED_FIELD.id + "']:checked").val() === "Owned"
        ) {
            $("#oobRentalsOwnedRedirectOverlay").addClass("show-modal");
            return false;
        }

       var customValid =
    validateCatBasicForm();

if (!customValid) {
    return false;
}

setRequiredDynamicsValuesBeforeSubmit();

       

        if(!validateCaptchaRequiredOnSubmit()) {
            return false;
        }

        if (!catBypassSubmitInterception) {
            console.log("CAT: Blocking OOB submit until Contact lookup or create completes.");
            return false;
        }

        if (typeof originalEntityFormClientValidate === "function") {
            return originalEntityFormClientValidate();
            console.log("CAT: Native Dynamics validation result =", nativeResult);

            if(!nativeResult){
                console.log("CAT: Suppressed native validation message ->",
                    $("#ValidationSummaryEntityFormView, .validation-summary-errors, .alert.alert-danger.validation-summary, #ValidationSummaryContainer").html()
                );
            }
            return nativeResult;
        }

        return true;
    };
}

$(document)
    .off("click.catCaseSubmit")
    .on("click.catCaseSubmit", "#InsertButton, input[type='submit'], button[type='submit']", function (e) {
        const submitButton = this;

        console.log("CAT: Submit clicked. Bypass =", catBypassSubmitInterception);
        
      if (catBypassSubmitInterception) {
            console.log("CAT: Bypass active. Allowing OOB Case submit.");

            saveCatCustomFieldValues();
            sessionStorage.setItem(CAT_CAPTCHA_CONFIG.submitAttemptKey, "1");
            sessionStorage.setItem(CAT_CAPTCHA_CONFIG.submitAttemptKey + "_TIME", Date.now().toString());

if (isOobCatRentalsSelected()) {
                sessionStorage.setItem("catRentalsAssetData", JSON.stringify({
                    equipmentType: $("#oobRentalsEquipmentType").val() || "",
                    productFamily: $("#oobRentalsProductFamily").val() || "",
                    generatorSize: $("#oobRentalsGeneratorSize").val() || "",
                    startDate: $("#oobRentalsStartDate").val() || "",
                    endDate: $("#oobRentalsEndDate").val() || ""
                }));
            }

            const catPendingCaseConfigA =
                getOobSelectedIssueConfiguration();

            if (catPendingCaseConfigA) {
                sessionStorage.setItem(
                    "catPendingCaseConfig",
                    JSON.stringify({
                        priorityValue: catPendingCaseConfigA.priorityValue,
                        caseTypeValue: catPendingCaseConfigA.caseTypeValue
                    })
                );
            }

            setRequiredDynamicsValuesBeforeSubmit();
            return true;
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (catContactOperationInProgress) {
            console.log("CAT: Contact operation already in progress.");
            return false;
        }


        const isValid = validateCatBasicForm();

        if (!isValid) {
            console.log("CAT: Form validation failed.");
            return false;
        }

        const captchaValid = validateCaptchaRequiredOnSubmit();
        if (!captchaValid) {
            console.log("CAT: CAPTCHA required validation failed.");
            return false;
        }


        catContactOperationInProgress = true;

        const originalButtonText = $(submitButton).is("input")
            ? $(submitButton).val()
            : $(submitButton).text();

        $(submitButton)
            .prop("disabled", true)
            .val("Submitting...")
            .text("Submitting...");

        getOrCreateContactFromCaseForm()
            .done(function (contact) {
                console.log("CAT: Contact resolved for Case:", contact);

                catResolvedContact = contact;

                setCaseContactLookups(contact);
                setRequiredDynamicsValuesBeforeSubmit();
                saveCleanOobDescriptionSnapshot();
                appendOobConditionalFieldsToDescription();

                console.log("CAT: Final customerid =", $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.customerId).val());
                console.log("CAT: Final customerid name =", $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.customerId + "_name").val());
                console.log("CAT: Final requestedfrom =", $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.requestedFromId).val());
                console.log("CAT: Final requestedfrom name =", $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.requestedFromId + "_name").val());

catBypassSubmitInterception = true;

            saveCatCustomFieldValues();
            sessionStorage.setItem(CAT_CAPTCHA_CONFIG.submitAttemptKey, "1");
            sessionStorage.setItem(CAT_CAPTCHA_CONFIG.submitAttemptKey + "_TIME", Date.now().toString())

         if (isOobCatRentalsSelected()) {
                sessionStorage.setItem("catRentalsAssetData", JSON.stringify({
                    equipmentType: $("#oobRentalsEquipmentType").val() || "",
                    productFamily: $("#oobRentalsProductFamily").val() || "",
                    generatorSize: $("#oobRentalsGeneratorSize").val() || "",
                    startDate: $("#oobRentalsStartDate").val() || "",
                    endDate: $("#oobRentalsEndDate").val() || ""
                }));
            }

            const catPendingCaseConfigB =
                getOobSelectedIssueConfiguration();

            if (catPendingCaseConfigB) {
                sessionStorage.setItem(
                    "catPendingCaseConfig",
                    JSON.stringify({
                        priorityValue: catPendingCaseConfigB.priorityValue,
                        caseTypeValue: catPendingCaseConfigB.caseTypeValue
                    })
                );
            }

         $(submitButton).prop("disabled", false);

setTimeout(function () {
    var postBackTarget = submitButton.name || submitButton.id || "InsertButton";

    if (typeof __doPostBack === "function") {
        __doPostBack(postBackTarget, "");
    } else {
        submitButton.click();
    }
}, 150);
            })
            .fail(function (xhrOrMessage) {
                console.error("CAT: Contact lookup or creation failed:", xhrOrMessage);

                let message = "Contact could not be found or created. Please try again.";

                if (typeof xhrOrMessage === "string") {
                    message = xhrOrMessage;
                } else if (xhrOrMessage && xhrOrMessage.responseJSON && xhrOrMessage.responseJSON.error) {
                    message = xhrOrMessage.responseJSON.error.message || message;
                } else if (xhrOrMessage && xhrOrMessage.responseText) {
                    message = xhrOrMessage.responseText;
                }

                showValidationSummary([
                    {
                        field: $("#catEmail")[0] || $("#catFirstName")[0] || null,
                        label: "Contact",
                        message: message,
                        top: $("#catEmail").length ? getFieldTopPosition($("#catEmail")) : 0
                    }
                ]);

                if ($("#catEmail").length) {
                    showCustomError($("#catEmail"), message);
                    scrollToFirstInvalid($("#catEmail")[0]);
                }
            })
            .always(function () {
                catContactOperationInProgress = false;

                if (!catBypassSubmitInterception) {
                    $(submitButton)
                        .prop("disabled", false)
                        .val(originalButtonText || "Submit")
                        .text(originalButtonText || "Submit");
                }
            });

        return false;
    });

    /*
        =====================================================
        ATTACHMENT LOGIC
        =====================================================
        For this to submit with OOB Basic Form,
        enable Attach File on the Basic Form.
    */



function getRealOobFileInput() {
    var $fileInputs = $("input[type='file']");

    console.log("CAT attachment debug - input[type=file] count:", $fileInputs.length);

    $fileInputs.each(function (index) {
        console.log("CAT file input " + index + ":", {
            id: this.id,
            name: this.name,
            type: this.type,
            className: this.className
        });
    });

    if ($fileInputs.length > 0) {
        return $fileInputs.first();
    }

    return $();
}

function prepareOobFileInput() {
    var $fileInput = $("input[type='file']").first();

    if (!$fileInput.length) {
        console.warn("OOB attachment input is not rendered on this page.");
        return false;
    }

    oobFileInput = $fileInput;

    oobFileInput
        .attr("multiple", "multiple")
        .addClass("cat-oob-file-input");

    hideOobUploadSection();

    return true;
}

function hideOobUploadSection() {
    $(".cat-hide-oob-upload-ui").removeClass("cat-hide-oob-upload-ui");

    var $fileInput = $("input[type='file']").first();

    if (!$fileInput.length) {
        return;
    }

    $fileInput.addClass("cat-oob-file-input");

    var $root = $fileInput.closest("td.cell, td.clearfix.cell, .cell, .form-group, fieldset").first();

    if (!$root.length) {
        $root = $fileInput.parent();
    }

    $root.find("label, p, span, small").each(function () {
        var $item = $(this);

        if ($item.closest("#catAttachmentBlock").length > 0) {
            return;
        }

        var text = ($item.text() || "").trim().toLowerCase();

        if (
            text.indexOf("attach a file") >= 0 ||
            text.indexOf("you can upload") >= 0 ||
            text.indexOf("maximum of") >= 0 ||
            text.indexOf("each up to") >= 0
        ) {
            $item.addClass("cat-hide-oob-upload-ui");
        }
    });

    $root.find("button, a, input[type='button'], input[type='submit']").each(function () {
        var $item = $(this);

        if ($item.closest("#catAttachmentBlock").length > 0) {
            return;
        }

        var text = ($item.text() || $item.val() || "").trim().toLowerCase();

        if (text === "upload" || text.indexOf("upload") >= 0) {
            $item.addClass("cat-hide-oob-upload-ui");
        }
    });

}

function syncFilesToOobInput() {
    if (!prepareOobFileInput()) {
        showFileError("Attachment control was not found on the form.");
        return false;
    }

    try {
        var dataTransfer = new DataTransfer();

        selectedFiles.forEach(function (file) {
            if (file) {
                dataTransfer.items.add(file);
            }
        });

        isSyncingToOobInput = true;

        oobFileInput[0].files = dataTransfer.files;
        oobFileInput.trigger("change");

        setTimeout(function () {
            isSyncingToOobInput = false;
            hideOobUploadSection();
        }, 250);

        return true;

    } catch (error) {
        isSyncingToOobInput = false;
        console.error("Could not sync files to OOB input:", error);
        // showFileError("Could not attach files to the form. Please try again.");
        showFileError("{{ snippets['CAT_Error_AttachmentValidation'] }}");
        return false;
    }
}

function addFiles(files) {
    if (!files || files.length === 0) {
        return;
    }

    if (!prepareOobFileInput()) {
        showFileError("Attachment control was not found on the form.");
        return;
    }

    var activeFileCount = selectedFiles.filter(function (file) {
        return !!file;
    }).length;

    if (activeFileCount + files.length > MAX_FILES) {
        showFileError("You can upload a maximum of " + MAX_FILES + " files.");
        return;
    }

    var rejectedTypes = [];
    var rejectedSizes = [];

    Array.from(files).forEach(function (file) {
        var extension = getExtension(file.name);

        if (ALLOWED_EXTENSIONS.indexOf(extension) === -1) {
            rejectedTypes.push(file.name);
            return;
        }

        if ((file.size || 0) > MAX_FILE_SIZE_BYTES) {
            rejectedSizes.push(file.name + " (" + formatBytes(file.size || 0) + ")");
            return;
        }

        selectedFiles.push(file);
    });

    if (rejectedTypes.length > 0) {
        showFileError(
            "Allowed file types: " + ALLOWED_EXTENSIONS.join(", ") +
            ". Blocked: " + rejectedTypes.join(", ")
        );
    }

    if (rejectedSizes.length > 0) {
        showFileError(
            "These files exceed " + MAX_FILE_SIZE_MB + " MB: " +
            rejectedSizes.join(", ")
        );
    }

    syncFilesToOobInput();
    renderFilePreviews();

    setTimeout(function () {
        hideOobUploadSection();
        renderFilePreviews();
    }, 150);
}

function wireAttachmentEvents() {
    /*
        Prepare the real OOB file input.
    */
    prepareOobFileInput();

    /*
        Browse link opens the real OOB file input.
    */
    $(document).off("click.catBrowse").on("click.catBrowse", "#catBrowseLink", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        var $fileInput = getRealOobFileInput();

        if (!$fileInput.length) {
            showFileError("Attachment control was not found on the form.");
            return false;
        }

        $fileInput.trigger("click");

        return false;
    });

    /*
        Drop zone click also opens real OOB file input.
    */
    $(document).off("click.catDropZone").on("click.catDropZone", "#catDropZone", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $fileInput = getRealOobFileInput();

        if (!$fileInput.length) {
            showFileError("Attachment control was not found on the form.");
            return false;
        }

        $fileInput.trigger("click");

        return false;
    });

    /*
        When user selects files through Browse.
        Avoid recursive change event when we programmatically sync files.
    */

$(document).off("change.catFileInput").on("change.catFileInput", "input[type='file']", function (e) {
    if (isSyncingToOobInput) {
        return;
    }

    selectedFiles = Array.from(e.target.files || []);

    renderFilePreviews();
});

    /*
        Drag over.
    */
    $(document).off("dragover.catDropZone").on("dragover.catDropZone", "#catDropZone", function (e) {
        e.preventDefault();
        $("#catDropZone").addClass("hover");
    });

    /*
        Drag leave.
    */
    $(document).off("dragleave.catDropZone").on("dragleave.catDropZone", "#catDropZone", function () {
        $("#catDropZone").removeClass("hover");
    });

    /*
        Drop files.
    */
    $(document).off("drop.catDropZone").on("drop.catDropZone", "#catDropZone", function (e) {
        e.preventDefault();
        e.stopPropagation();

        $("#catDropZone").removeClass("hover");

        var droppedFiles = e.originalEvent.dataTransfer.files;

        addFiles(droppedFiles);
    });

    /*
        Remove file.
    */

$(document).off("click.catRemoveFile").on("click.catRemoveFile", ".cat-remove-file", function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var index = parseInt($(this).attr("data-index"), 10);

    if (isNaN(index)) {
        return false;
    }

    selectedFiles.splice(index, 1);

    try {
        var dataTransfer = new DataTransfer();

        selectedFiles.forEach(function (file) {
            if (file) {
                dataTransfer.items.add(file);
            }
        });

        var $fileInput = $("input[type='file']").first();

        if ($fileInput.length) {
            isSyncingToOobInput = true;
            $fileInput[0].files = dataTransfer.files;

            setTimeout(function () {
                isSyncingToOobInput = false;
            }, 150);
        }
    } catch (error) {
        console.error("Could not remove file from input:", error);
    }

    renderFilePreviews();

    return false;
});

}

function setRequestedFromLookupValue() {
    if (catResolvedContact && catResolvedContact.id) {
        setLookupValue(
            CAT_DYNAMICS_REQUIRED_FIELDS.requestedFromId,
            catResolvedContact.id,
            catResolvedContact.name,
            "contact"
        );

        return;
    }

    const customerId = $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.customerId).val();
    const customerName = $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.customerId + "_name").val();
    const customerEntityName = $("#" + CAT_DYNAMICS_REQUIRED_FIELDS.customerId + "_entityname").val();

    if (!customerId) {
        return;
    }

    setLookupValue(
        CAT_DYNAMICS_REQUIRED_FIELDS.requestedFromId,
        customerId,
        customerName,
        customerEntityName || "contact"
    );
}

    function showFileError(message) {
        $("#catFileErrors").text(message);

        setTimeout(function () {
            $("#catFileErrors").text("");
        }, 7000);
    }


function renderFilePreviews() {
    return;
    var $preview = $("#catFilePreviews");

    if (!$preview.length) {
        $("#catAttachmentZone").append('<div id="catFilePreviews"></div>');
        $preview = $("#catFilePreviews");
    }

    $preview.empty();

    var filesToShow = selectedFiles;

    if ((!filesToShow || filesToShow.length === 0) && $("input[type='file']").length) {
        filesToShow = Array.from($("input[type='file']").first()[0].files || []);
    }

    if (!filesToShow || filesToShow.length === 0) {
        return;
    }

    filesToShow.forEach(function (file, index) {
        if (!file) {
            return;
        }
 $preview.append(
            '<div class="cat-file-item" id="catFileItem-' + index + '">' +
                '<span class="cat-file-name">' + htmlEncode(file.name) + ' (' + formatBytes(file.size || 0) + ')</span>' +
                '<span class="cat-progress" id="catProg-' + index + '">' +
                    '<span class="cat-progress-bar">' +
                        '<span class="cat-progress-fill"></span>' +
                        '<span class="cat-progress-text">0%</span>' +
                    '</span>' +
                    '<span class="cat-progress-tick">&#10003;</span>' +
                '</span>' +
                '<span class="cat-remove-file" data-index="' + index + '">X</span>' +
            '</div>'
        );

        startOobProgress(index);
    });
}

function startOobProgress(index) {
    var $wrap = $("#catProg-" + index);
    var $fill = $wrap.find(".cat-progress-fill");
    var $text = $wrap.find(".cat-progress-text");
    var pct = 0;

    var timer = setInterval(function () {
        pct += 10;
        if (pct >= 100) {
            pct = 100;
            clearInterval(timer);
            $wrap.addClass("done");
        }
        $fill.css("width", pct + "%");
        $text.text(pct + "%");
    }, 120);
  }

function refreshSelectedFilesFromOobInput() {
    var $fileInput = $("input[type='file']").first();

    if (!$fileInput.length) {
        return;
    }

    selectedFiles = Array.from($fileInput[0].files || []);

    renderFilePreviews();
}

function repairCatLayoutAfterRender() {
    $(".cat-hidden-field").attr("style", "display:none !important;");

    $(".crmEntityFormView table.section tr").each(function () {
        const $item = $(this);

        if ($item.hasClass("cat-hidden-field") || $item.closest(".cat-hidden-field").length) {
            $item.attr("style", "display:none !important;");
            return;
        }

        if ($item.hasClass("zero-cell") || $.trim($item.text()) === "") {
            $item.attr("style", "display: none !important;");
            return;
        }
        $item.css({
            "display": "block",
            "width": "100%",
            "max-width": "900px"
        });
    });

    $(".crmEntityFormView table.section td.cell, .crmEntityFormView td.clearfix.cell").each(function () {
        const $item = $(this);

        if ($item.hasClass("cat-hidden-field") || $item.closest(".cat-hidden-field").length) {
            $item.attr("style", "display:none !important;");
            return;
        }

        $item.css({
            "display": "block",
            "width": "100%",
            "max-width": "900px",
            "box-sizing": "border-box",
            "overflow": "hidden",
            "margin-bottom": "20px"
        });
    });

    $(".crmEntityFormView .info, .crmEntityFormView .control").each(function () {
        const $item = $(this);

        if ($item.closest(".cat-hidden-field").length) {
            $item.attr("style", "display:none !important;");
            return;
        }

        $item.css({
            "display": "block",
            "width": "100%",
            "max-width": "900px",
            "box-sizing": "border-box"
        });
    });

    $(".crmEntityFormView input[type='text'], .crmEntityFormView input[type='email'], .crmEntityFormView input[type='tel'], .crmEntityFormView select, .crmEntityFormView textarea, .crmEntityFormView .form-control").css({
        "width": "100%",
        "max-width": "900px",
        "box-sizing": "border-box"
    });

    $(".crmEntityFormView textarea").css({
        "min-height": "140px"
    });

    $("#catAttachmentBlock, #catAttachmentZone, #catDropZone").css({
        "width": "100%",
        "max-width": "900px",
        "box-sizing": "border-box",
        "clear": "both",
        "float": "none"
    });

    $(".cat-hidden-field").attr("style", "display:none !important;");
    $(".cat-hide-oob-upload-ui").attr("style", "display:none !important;");
}

function forceValidationStyles() {
    $(".oob-field-error").each(function () {
        const $wrapper = $(this);

        $wrapper.find("input, select, textarea, .form-control").each(function () {
            $(this).addClass("oob-invalid-control");

            $(this).css({
                "border": "2px solid #e81123",
                "box-shadow": "0 0 0 1px rgba(232, 17, 35, 0.15)",
                "outline": "none"
            });
        });

        $wrapper.find(".input-group-btn .btn, .input-group-btn button").css({
            "border-top": "2px solid #e81123",
            "border-right": "2px solid #e81123",
            "border-bottom": "2px solid #e81123"
        });
    });

    $(".cat-field.has-error").each(function () {
        $(this).find("input, select, textarea").css({
            "border": "2px solid #e81123",
            "box-shadow": "0 0 0 1px rgba(232, 17, 35, 0.15)",
            "outline": "none"
        });
    });

    $(".oob-field-error").each(function () {
        const $wrapper = $(this);

        $wrapper.find("select").each(function () {
            const fieldId = $(this).attr("id");

            if (!fieldId) {
                return;
            }

            $("#" + fieldId + "_catSearchInput").addClass("cat-searchable-error");
            $("#" + fieldId + "_catSearchWrapper").addClass("cat-searchable-error");
        });
    });
}

function addOobDescriptionCounter() {
    const MAX = 250;
    const fieldId = CAT_DYNAMICS_REQUIRED_FIELDS.descriptionId;
    const textarea = document.getElementById(fieldId);

    if (!textarea) {
        return;
    }

    const controlEl = textarea.closest(".control");
    const infoEl = controlEl ? controlEl.previousElementSibling : null;

    let counterEl = document.getElementById("descCounter");
    let warningEl = document.getElementById("descWarning");

/* Add Description help icon and tooltip once */
if (
    infoEl &&
    !document.getElementById("descriptionHelpButton")
) {
    infoEl.classList.add("cat-description-info-row");
    infoEl.insertAdjacentHTML(
        "beforeend",
        '<span class="cat-description-help-wrapper">' +
            '<button type="button" ' +
                'id="descriptionHelpButton" ' +
                'class="cat-description-help-button" ' +
                'aria-label="Help for How can we help?" ' +
                'aria-controls="descriptionHelpText" ' +
                'aria-expanded="false">' +
                '<img src="info-filled.png" ' +
                    'class="cat-description-help-icon" ' +
                    'alt="" ' +
                    'aria-hidden="true" />' +
            '</button>' +
            '<span id="descriptionHelpText" ' +
                'class="cat-description-help-text" ' +
                'role="tooltip">' +
                'The maximum character limit is 250 characters.' +
            '</span>' +
        '</span>'
    );

    textarea.setAttribute(
        "aria-describedby",
        (
            (
                textarea.getAttribute("aria-describedby") ||
                ""
            ) + " descriptionHelpText"
        ).trim()
    );
}
    
    if (infoEl && !counterEl) {
        infoEl.style.position = "relative";
        counterEl = document.createElement("span");
        counterEl.id = "descCounter";
        counterEl.className = "oob-char-counter";
        infoEl.appendChild(counterEl);
    }

    if (!warningEl) {
        warningEl = document.createElement("div");
        warningEl.id = "descWarning";
        warningEl.className = "oob-warning-message";
        warningEl.textContent = "You have reached the " + MAX + " character limit.";
        textarea.insertAdjacentElement("afterend", warningEl);
    }

    let hideTimer = null;

    function setCounter(n) {
        if (counterEl) {
            counterEl.textContent = n + " / " + MAX;
        }
    }

    function showWarningOnce() {
        textarea.classList.add("maxed");
        warningEl.classList.add("active");

        if (hideTimer) {
            clearTimeout(hideTimer);
        }

        hideTimer = setTimeout(function () {
            warningEl.classList.remove("active");
            textarea.classList.remove("maxed");
            hideTimer = null;
        }, 4000);
    }

    function enforceAndUpdate() {
        let val = textarea.value || "";

        if (val.length > MAX) {
            textarea.value = val.substring(0, MAX);
            setCounter(MAX);
            showWarningOnce();

            try {
                textarea.setSelectionRange(MAX, MAX);
            } catch (e) {}

            return;
        }

        setCounter(val.length);

        if (val.length < MAX && hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
            warningEl.classList.remove("active");
            textarea.classList.remove("maxed");
        }
    }

    textarea.removeEventListener("input", enforceAndUpdate);
    textarea.addEventListener("input", enforceAndUpdate);

    textarea.addEventListener("paste", function () {
        setTimeout(enforceAndUpdate, 0);
    });

    textarea.addEventListener("keydown", function (e) {
        const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Tab"];

        if (allowed.indexOf(e.key) !== -1 || e.ctrlKey || e.metaKey) {
            return;
        }

        if ((textarea.value || "").length >= MAX) {
            e.preventDefault();
            showWarningOnce();
        }
    });

    setCounter((textarea.value || "").length);
}





    /*
        =====================================================
        INITIALIZE
        =====================================================
    */
setupPageTitleAndSummary();

setRequiredDynamicsValuesBeforeSubmit();
wireRequiredDynamicsSync();

addOobDescriptionCounter();

hideAutoFilledDynamicsFields();

injectCustomFieldsInline();
filterOobProductsByPersona();
wireOobConditionalFields();
wireOobInspectFields();
wireOobConditionalFieldHelp();
restoreCatCustomFieldValues();
restoreCleanOobDescriptionIfNeeded();

injectAttachmentBlock();
wireAttachmentEvents();
initializeSearchablePicklists();
setOobSourceLookupValue();

prepareOobFileInput();
hideOobUploadSection();
renderFilePreviews();
refreshSelectedFilesFromOobInput();

hideAutoFilledDynamicsFields();
repairCatLayoutAfterRender();

setTimeout(function () {
    setRequiredDynamicsValuesBeforeSubmit();
    hideAutoFilledDynamicsFields();
    prepareOobFileInput();
    hideOobUploadSection();
    renderFilePreviews();
    repairCatLayoutAfterRender();
    refreshSelectedFilesFromOobInput();
    initializeSearchablePicklists();
    applyOobConditionalFields();
}, 500);

setTimeout(function () {
    setRequiredDynamicsValuesBeforeSubmit();
    hideAutoFilledDynamicsFields();
    prepareOobFileInput();
    hideOobUploadSection();
    renderFilePreviews();
    repairCatLayoutAfterRender();
    initializeSearchablePicklists();
}, 1500);

setTimeout(function () {
    hideAutoFilledDynamicsFields();
    hideOobUploadSection();
    repairCatLayoutAfterRender();
}, 2500);

setTimeout(function () {
    showIncorrectCaptchaPopupAfterSubmitAttempt();
}, 1000);

function catDecorateOobRows() {
    $(".file-cell .fileNameAndSizeSpan").find("img").each(function () {
        var $img = $(this);
        var src = ($img.attr("src") || "").toLowerCase();
        var cls = ($img.attr("class") || "").toLowerCase();

        if (src.indexOf("retry") >= 0 || cls.indexOf("reloadicon") >= 0) {
            return;
        }
        if (src.indexOf("error") >= 0 || cls.indexOf("erroricon") >= 0) {
            return;
        }
        if (cls.indexOf("fileicon") >= 0) {
            return;
        }

        $img.addClass("cat-hide-img").parent().addClass("cat-keep");
    });


    $(".file-cell .fileNameAndSizeSpan").each(function (i) {
        var $span = $(this);

        var hasDelete =
            $span.hasClass("cat-keep") || $span.find(".cat-keep").length > 0;

        if (!hasDelete) {
            $span.append('<span class="cat-keep cat-oob-remove"></span>');
        }
    });
}

$(document).off("click.catOobRemove").on("click.catOobRemove", ".cat-oob-remove", function (e) {
   
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var $row = $(this).closest(".fileNameAndSizeSpan");

    var index = $(".file-cell .fileNameAndSizeSpan").filter(function () {
        return $(this).find(".cat-oob-remove").length > 0;
    }).index($row);

    if (index < 0) {
        return false;
    }

    var $fileInput = $("input[type='file']").first();

    if (!$fileInput.length) {
        return false;
    }

    var currentFiles = Array.from($fileInput[0].files || []);

    currentFiles.splice(index, 1);

    try {
        var dataTransfer = new DataTransfer();

        currentFiles.forEach(function (file) {
            if (file) {
                dataTransfer.items.add(file);
            }
        });

        $fileInput[0].files = dataTransfer.files;
    } catch (error) {
        console.error("Could not remove OOB file:", error);
        return false;
    }

   var $wrapper = $row.closest(".custom-button");

   if (!$wrapper.length) {
    $wrapper = $row;
   }
   $wrapper.remove();

    setTimeout(catDecorateOobRows, 200);

    return false;
});

function catRunProgress(id) {
    var $wrap = $("#" + id);
    var $fill = $wrap.find(".cat-progress-fill");
    var $text = $wrap.find(".cat-progress-text");
    var pct = 0;

    var timer = setInterval(function () {
        pct += 10;
        if (pct >= 100) {
            pct = 100;
            clearInterval(timer);
            $wrap.addClass("done");
        }
        $fill.css("width", pct + "%");
        $text.text(pct + "%");
    }, 120);
}

$(document).on("change", "#AttachFile", function () {
    setTimeout(catDecorateOobRows, 300);
    setTimeout(catDecorateOobRows, 900);
});

setInterval(catDecorateOobRows, 1500);
});

/* =====================================================
   OOB UPLOAD PROGRESS - visual match to custom form
===================================================== */
(function () {
    function decorateProgressContainer(container) {
        if (container.dataset.catDecorated) return;
        container.dataset.catDecorated = "true";

        const row = container.closest(".custom-button");

        const text = document.createElement("span");
        text.className = "cat-oob-progress-text";
        container.appendChild(text);

        const bar = container.querySelector(".progress-bar");

        let pct = 0;
        const timer = setInterval(function () {
            pct += 10;

            if (pct >= 100) {
                pct = 100;
                clearInterval(timer);
                showCompletionTick(row, container);
            }

            text.textContent = pct + "%";
            if (bar) bar.style.width = pct + "%";
        }, 120);
    }

    function showCompletionTick(row, container) {
        if (!row || !document.body.contains(row)) return;
        if (row.querySelector(".cat-oob-progress-tick")) return;

        const tick = document.createElement("span");
        tick.className = "cat-oob-progress-tick";
        tick.innerHTML = "&#10003;";

        if (document.body.contains(container)) {
            container.insertAdjacentElement("afterend", tick);
            container.style.display = "none";
        } else {
            row.appendChild(tick);
        }

        const cancelBtn = row.querySelector(".cancelIconDiv");
        if (cancelBtn) cancelBtn.style.display = "none";
    }

    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType !== 1) return;

                if (node.classList && node.classList.contains("progress-container")) {
                    decorateProgressContainer(node);
                }

                if (node.querySelectorAll) {
                    node.querySelectorAll(".progress-container").forEach(decorateProgressContainer);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.querySelectorAll(".progress-container").forEach(decorateProgressContainer);
})();