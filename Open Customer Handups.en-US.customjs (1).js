document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("viewToggleBtn");
    if (!btn) return;
    const path = window.location.pathname.toLowerCase();
    // HOME PAGE
    if (path.includes("/") || path.includes("home")) {
        btn.onclick = function () {
            window.location.href = "/opencustomerhandups";
        };
    }
    // MY CASES PAGE
    if (path.includes("opencustomerhandups")) {
        btn.onclick = function () {
            window.location.href = "/";
        };
    }
});

$(document).on("mouseenter", "#dealerCasesTable td.truncate-cell", function () {

    const fullText = $(this).attr("data-full") || $(this).text().trim();

    if (!fullText || fullText.trim() === "") return;

    $("#customTooltip").remove();

    $("body").append('<div id="customTooltip">' + fullText + '</div>');

    const tooltip = $("#customTooltip");
    const rect = this.getBoundingClientRect();

    let top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX;

    const tooltipWidth = 350;
    const screenWidth = window.innerWidth;

    if (left + tooltipWidth > screenWidth) {
        left = screenWidth - tooltipWidth - 20;
    }

    tooltip.css({
        top: top + "px",
        left: left + "px"
    });
});

// ✅ Remove tooltip
$(document).on("mouseleave", "#dealerCasesTable td.truncate-cell", function () {
    $("#customTooltip").remove();
});


window.portalContact = {
    id: "{{ user.id | default: '' }}",
    name: "{{ user.fullname | default: user.name | default: '' | escape }}"
};


function showNotification(message, type) {

    const isError = type === "error";

    const iconSvg = isError
        ? `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M1.72255 13.7441C0.75915 12.7807 0.75915 11.2188 1.72255 10.2554L10.2556 1.72231C11.219 0.758905 12.781 0.758907 13.7444 1.72231L22.2775 10.2554C23.2408 11.2188 23.2408 12.7807 22.2775 13.7441L13.7444 22.2771C12.781 23.2407 11.219 23.2407 10.2556 22.2771L1.72255 13.7441ZM12.0007 5.9116C12.6516 5.9116 13.1792 6.43922 13.1792 7.09007V12.1968C13.1792 12.8476 12.6516 13.3753 12.0007 13.3753C11.3499 13.3753 10.8222 12.8476 10.8222 12.1968V7.09007C10.8222 6.43922 11.3499 5.9116 12.0007 5.9116ZM13.572 16.5179C13.572 17.3857 12.8685 18.0892 12.0007 18.0892C11.1329 18.0892 10.4294 17.3857 10.4294 16.5179C10.4294 15.6501 11.1329 14.9466 12.0007 14.9466C12.8685 14.9466 13.572 15.6501 13.572 16.5179Z"
                    fill="#D13438"/>
            </svg>
        `
        : `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M12 23C14.9174 23 17.7153 21.8411 19.7782 19.7782C21.8411 17.7153 23 14.9174 23 12C23 9.08262 21.8411 6.28473 19.7782 4.22183C17.7153 2.15893 14.9174 1 12 1C9.08262 1 6.28473 2.15893 4.22183 4.22183C2.15893 6.28473 1 9.08262 1 12C1 14.9174 2.15893 17.7153 4.22183 19.7782C6.28473 21.8411 9.08262 23 12 23ZM17.5047 9.20129C17.7004 8.95685 17.7909 8.6447 17.7565 8.33349C17.722 8.02229 17.5653 7.73753 17.3209 7.54186C17.0764 7.34618 16.7643 7.25563 16.4531 7.29011C16.1419 7.32459 15.8571 7.48128 15.6614 7.72571L10.0923 14.6934L7.86243 13.0214C7.73861 12.9286 7.59771 12.861 7.44778 12.8226C7.29785 12.7842 7.14183 12.7757 6.98861 12.7976C6.83539 12.8194 6.68799 12.8713 6.55481 12.9502C6.42163 13.029 6.30529 13.1333 6.21243 13.2571C6.11957 13.381 6.052 13.5219 6.01359 13.6718C5.97518 13.8217 5.96667 13.9777 5.98856 14.131C6.01045 14.2842 6.0623 14.4316 6.14115 14.5648C6.22001 14.6979 6.32433 14.8143 6.44814 14.9071L9.591 17.2643C9.83591 17.4483 10.1428 17.5297 10.4467 17.4912C10.7506 17.4528 11.0276 17.2976 11.219 17.0584L17.5047 9.20129Z"
                    fill="#107C10"/>
            </svg>
        `;

    $(".notification-icon").html(iconSvg);

    $("#emailNotification").toggleClass("error-notification", isError);

    $("#notificationText").text(message);

    $("#emailNotification")
        .css("display", "flex")
        .hide()
        .fadeIn(300);

    setTimeout(function () {
        $("#emailNotification").fadeOut(300);
    }, 5000);
}


function validateEmailandSave() {
    var email = $("#TransparentAssigneeEmail").val().trim();
    console.log(email);
    //var assigneeName=document.getElementById("AssigneeName").textContent.trim();
    //console.log(AssigneeName);
    emailRegex = /^[A-Za-z0-9._%+-]+@cat\.com$/i;
    if (email === "") {
        showNotification(
            "Assignee Email Is Required"
        );
        return;
    }
    if (!emailRegex.test(email)) {
        //alert("Please enter valid email address");
        //return(false);
        $("#emailError")
            .text("Please enter a valid email address")
            .css("color", "red")
            .show();
        return
    }
    $("#emailError").hide().text("");


    const portalName =
        window.portalContact && window.portalContact.name
            ? window.portalContact.name
            : "";
    console.log("PortalName", portalName);
    const portalContactId =
        window.portalContact && window.portalContact.id
            ? window.portalContact.id
            : "";
    console.log("PortalId", portalContactId);

    console.log("caseId", caseId);

    const flowurl = "/_api/cloudflow/v1.0/trigger/3edf03df-ed90-f111-8076-70a8a5b08a41";
    console.log("flowUrl:", flowurl);

    const data = {
        caseId: caseId,
        assigneeEmail: email,
        assigneeByName: portalName,
        LoggedInUserID: portalContactId
    };


    const payload = {
        eventData: JSON.stringify(data)
    };

    console.log("Paylod is:", payload);

    safeAjax({
        type: "POST",
        url: flowurl,
        contentType: "application/json",
        headers: {
            "Accept": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        },
        data: JSON.stringify(payload),

        success: function (result) {
            console.log("Success");
            console.log(result);
            showNotification(
                "Case Reassined Successfully.",
                "success"
            );
        },
        error: function (xhr, textStatus, errorThrown) {
            console.error("Flow call failed");
            console.error("FlowURL", flowurl);
            console.error("ErrorThrown", errorThrown);
            console.error("Status", textStatus);

            if (xhr) {
                console.error("HTTP Status", xhr.textStatus);
                console.error("Response", xhr.responseText);
            }

            showNotification(
                "Error while reassigning the case. Check consol log",
            );
        }
    });



}



/*function UpdateAssigneeEmail(caseId,email)
{  
    const portalName =
                  window.portalContact && window.portalContact.name
                      ? window.portalContact.name
                      : "";
console.log("PortalName", portalName);
              const portalContactId =
                  window.portalContact && window.portalContact.id
                      ? window.portalContact.id
                      : "";
                      console.log("PortalId",portalContactId);

    var payload = {
                  caseId: caseId,
                  assigneeEmail: email,
                  assigneeByName: portalName,                  
                  LoggedInUserID: portalContactId
                  
              };
              console.log("Paylod is:", payload);
             fetch("https://dc47f20cc3c5e00fbda35bcf2a125c.1c.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/17/workflows/a4d60a8112ad4d09b81cd6bf3d243f4d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=qnSE3qxjwdnOCXid2Q-uiIQlNSD50Wva4nfYoEM0WuA",
                {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            })
            .then(function(response)
            {
                if(!response.ok)
                {
                    throw new Error("flow failed");
                }
                if(response.status === 204)
                {
                    return null;
                }
                return response.text;
            })
            .then(function ()
        {
          alert("Case reassignes successfully");
        })
        .catch(function(error)
    {
        console.error(error);
        alert("Unable to process request");
    });
             
          
     
}


*/
document.addEventListener("click", function (event) {


    const caseCloseBtnTab = event.target.closest("#updatestatus");
    if (caseCloseBtnTab) {
        console.log("CaseClose tab clicked");
        const updateStatusModal = document.getElementById("updateStatusModal");
        if (updateStatusModal) {
            updateStatusModal.classList.add("open");
            console.log("open class added");
            console.log("Popup classes:", updateStatusModal.className);
            const elavationType = window.elavationType;
            console.log("ElevationType:", elavationType);
            const statusMap = {
                100000003: [  // Dealer Consultation
                    "100000000", // New
                    "100000001", // In Process
                    "100000009", // Approved
                    "100000010", // Rejected
                    "100000011", // Other Dealer Territory
                    "100000012", // Pending Customer
                    "100000013"  // Action Completed
                ],
                100000004: [  // Dealer Customer Resolution
                    "100000000", // New
                    "100000001", // In Process
                    "100000013", // Action Completed
                    "100000012", // Pending Customer
                    "100000014", // Exporter/Reseller
                    "100000011"  // Other Dealer Territory
                ]
            };

            const allowedStatuses = statusMap[Number(elavationType)] || [];

            // Clear current selection
            $("#statusSelectModal").val("");

            // Loop through all options
            $("#statusSelectModal option").each(function () {
                const optionValue = $(this).val();

                // Always show --Select--
                if (optionValue === "") {
                    $(this).show();
                } else {
                    $(this).toggle(allowedStatuses.includes(optionValue));
                }
            });
        }
        else {
            console.log("not found");
        }

    }

    //Close poup-x button
    const closeBtn = event.target.closest("#modalCloseBtn");
    if (closeBtn) {
        const updateStatusModal = document.getElementById("updateStatusModal");
        if (updateStatusModal) {
            updateStatusModal.classList.remove("open");
        }
    }
    //close cancel button
    const cancelBtn = event.target.closest("#modalCancelBtn");
    if (cancelBtn) {
        //clear the status
        const selectedStatus = document.getElementById("statusSelectModal");
        if (selectedStatus) {
            selectedStatus.value = "";
        }

        //ResolutionNote Clear
        const resolutionNot = document.getElementById("resolutionDetailModal");
        if (resolutionNot) {
            resolutionNot.value = "";
        }

        //Count Clear
        const countResolution = document.getElementById("charCountModal");
        if (countResolution) {
            countResolution.textContent = "0/131072";
        }

        const updateStatusModal = document.getElementById("updateStatusModal");
        if (updateStatusModal) {
            updateStatusModal.classList.remove("open");
        }
    }
    //close-click outside popup

});


//--------UpdatBtn------
console.log("Update script Loaded");
document.addEventListener("click", function (event) {

    if (event.target.closest("#updateBtn")) {
        //e.preventDefault();
        //e.stopPropagation();

        console.log("Update button clicked");
        const selectedStatusElement = document.getElementById("statusSelectModal");
        const resolutionNoteElement = document.getElementById("resolutionDetailModal");
        const selectedStatus = selectedStatusElement ? selectedStatusElement.value : "";
        let resolutionNote = resolutionNoteElement ? resolutionNoteElement.value.trim() : "";

        // Status is always required
        if (!selectedStatus) {
            showNotification(
                "Please select Portal Status.",
                "error"
            );
            return;
        }
        // Resolution Detail is required only for these statuses
        const resolutionRequiredStatuses = [
            "100000010", // Rejected
            "100000011", // Other Dealer Territory
            "100000012", // Pending Customer
            "100000014", // Exporter/Reseller
            "100000013" // Action Completed
        ];

        if (
            resolutionRequiredStatuses.includes(selectedStatus) &&
            !resolutionNote
        ) {
            showNotification(
                "Please enter Resolution Detail.",
                "error"
            );
            return;
        }
        if (resolutionNote) {
            if (
                selectedStatus === "100000010" &&
                !resolutionNote.toLowerCase().startsWith("rejected:")
            ) {
                resolutionNote = "Rejected: " + resolutionNote;
            }
            else if (
                selectedStatus === "100000011" &&
                !resolutionNote.toLowerCase().startsWith("other dealer territory:")
            ) {
                resolutionNote = "Other Dealer Territory: " + resolutionNote;
            }
            else if (
                selectedStatus === "100000014" &&
                !resolutionNote.toLowerCase().startsWith("exporter/reseller:")
            ) {
                resolutionNote = "Exporter/Reseller: " + resolutionNote;
            }
        }
        const charCountModal = document.getElementById("charCountModal");
        if (charCountModal) {
            charCountModal.textContent = resolutionNote.length + "/131072";
        }
        console.log("case ID", caseId);
        const currentCaseId = caseId;

        console.log("Current case id", currentCaseId);
        console.log("Status is", selectedStatus);
        console.log("Resolution Note is", resolutionNote);
        const parentCaseId = window.parentCaseId;
        console.log("Parents case id", parentCaseId);
        const elavationType = window.elavationType;




        const config = window.matchedConfig;
        if (!config) {
            console.error("No configuration found");
            return;
        }


        const currentStateCode = config.set.handup.statecode;
        const currentStatusCode = config.set.handup.statuscode;
        //=========Get Parent Case Values==============
        const parrentStateCode = config.set.parentCase.statecode;
        const parentStatusCode = config.set.parentCase.statuscode;
        //======CaseResolution=====
        const resolutionType = config.set.caseresolution.ResolutionTypeCode;
        const caseResolutionNote = config.set.caseresolution.ConcateStatusAndResolutionNote;
        //-------Parent case Resolution======/
        const parentresolutionType = config.set.parentcaseresolution.ResolutionTypeCode;
        const parentcaseResolutionNote = config.set.parentcaseresolution.ConcateStatusAndResolutionNote;
        //=========resolution required
        const resolutionRequired = config.set.resolutionRequired;

        console.log("ElevationType:", elavationType);
        console.log("HelpcenterStatus:", helpCenterStatus);
        console.log("Currentstate:", currentStateCode);
        console.log("Currentstatuscode:", currentStatusCode);
        console.log("ParentState:", parrentStateCode);
        console.log("ParentStatusCode:", parentStatusCode);
        console.log("Resolution type", resolutionType);
        console.log("resolution Note", caseResolutionNote);
        console.log("ParentResolutiontype", parentresolutionType);
        console.log("ParentResolution Note", parentcaseResolutionNote);
        console.log("Resolution:", resolutionRequired);


        //Flow URL
        const flowurl = "/_api/cloudflow/v1.0/trigger/9a05af23-5bab-f111-aaac-7ced8d70f2ba";
        console.log("flowUrl:", flowurl);

        //Data Send to power automate
        const data = {
            caseId: currentCaseId,
            selectedStatus: String(helpCenterStatus),
            resolutionNote: resolutionNote,
            parentCaseId: parentCaseId,
            elevationType: String(elavationType),
            currentStateCode: String(currentStateCode),
            currentStatusCode: String(currentStatusCode),
            parentStateCode: String(parrentStateCode),
            parentStatusCode: String(parentStatusCode),
            resolutionRequired: String(resolutionRequired),
            resolutionType: String(resolutionType),
            caseResolutionNote: String(caseResolutionNote),
            parentresolutionType: String(parentresolutionType),
            parentcaseResolutionNote: String(parentcaseResolutionNote)
        };
        //Call Power automate flow

        const payload = {
            eventData: JSON.stringify(data)
        };

        console.log("Paylod is:", payload);

        safeAjax({
            type: "POST",
            url: flowurl,
            contentType: "application/json",
            headers: {
                "Accept": "application/json",
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0"
            },
            data: JSON.stringify(payload),

            success: function (result) {
                console.log("Success");
                console.log(result);
                showNotification(
                    "Case Resolved successfully.",
                    "success"
                );
                $("#updateStatusModal").hide();
                //Optional refresh the page
                location.reload();
            },
            error: function (xhr, textStatus, errorThrown) {
                console.error("Flow call failed");
                console.error("FlowURL", flowurl);
                console.error("ErrorThrown", errorThrown);
                console.error("Status", textStatus);

                if (xhr) {
                    console.error("HTTP Status", xhr.textStatus);
                    console.error("Response", xhr.responseText);
                }
                alert("Case Resolved successfully");
                showNotification(
                    "Error in resolving case.",
                );
            }
        });

    }

});


document.addEventListener("input", function (event) {
    //const resolutionInput=event.target.closest("#resoltionDetailModal");
    if (event.target.closest("#resolutionDetailModal")) {
        console.log("Resolution Input started");
        const charCountModal = document.getElementById("charCountModal");
        console.log("TextArea Input", event.target.value);
        console.log("Character Count", event.target.value.legth);
        console.log("count element", charCountModal);
        if (charCountModal) {
            charCountModal.textContent = event.target.value.length + "/131072";
            console.log("count Updated", charCountModal.textContent);
        }
        console.log("Resolution Input Completed");
    }
});

$(document).on("change", "#statusSelectModal", async function (event) {

    console.log("Help center status changed");
    const selectedStatusElement = document.getElementById("statusSelectModal");
    const selectedStatus = selectedStatusElement ? selectedStatusElement.value : "";
    console.log("Help Center status is:", selectedStatus);

    const resolutionTextarea = document.getElementById("resolutionDetailModal");
    const resolutionLabel = document.querySelector('label[for="resolutionDetailModal"]');
    if (
        selectedStatus === "100000010" || // Rejected
        selectedStatus === "100000011" || // Other Dealer Territory
        selectedStatus === "100000012" || // Pending Customer
        selectedStatus === "100000014" || //Exporter/resellar
        selectedStatus === "100000013" // Action Completed

    ) {
        resolutionTextarea.required = true;
        resolutionLabel.innerHTML =
            'Resolution Detail <span class="required-tag">(required)</span>';
    } else {
        resolutionTextarea.required = false;
        resolutionLabel.innerHTML = 'Resolution Detail';

    }

    const currentCaseId = caseId;
    console.log("Current case id", currentCaseId);

    const parentCaseId = window.parentCaseId;
    console.log("Parents case id", parentCaseId);

    const elavationType = window.elavationType;
    console.log("ElevationType:", elavationType);


    //-----Get CSS Configuration------//
    try {
        const configkey = "OnChangeHelpCenterHandupStatus";
        const ccsurl = "/_api/cat_ccs_configurations" +
            "?$select=cat_key,cat_type,cat_value" +
            "&$filter=cat_key eq '" + configkey + "' ";
        console.log("CCS URL:", ccsurl);

        const response = await safeAjax({
            type: "GET",
            url: ccsurl,
            contentType: "application/json",
            headers: {
                "Accept": "application/json",
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0"
            },
        });
        console.log("CSS Configuration response:", response);
        console.log("Response:", response);
        console.log("Records Count:", response.value?.length);
        //-----check configuration------
        if (!response.value || response.value.length === 0) {
            console.error("CSS configuration not found");
            return;
        }
        console.log("cat_value:", response.value[0].cat_value);

        console.log("Before Parse");
        console.log(response.value[0].cat_value);

        const statusConfig = JSON.parse(response.value[0].cat_value);

        console.log("After Parse");
        console.log(statusConfig);
        console.log("Parsed Status Config:", statusConfig);
        //==========find matching elevation + help center status===========
        const matchedConfig = statusConfig.find(item =>
            Number(item.cat_elevationtype) === Number(elavationType)
            &&
            Number(item.cat_helpcenterstatus) === (Number(selectedStatus))
        );
        console.log("Matched Config:", matchedConfig);

        if (!matchedConfig) {
            console.error("No configuration found for:", "ElevationType=", elavationType, "HelpCenterStatus=", selectedStatus);
            return;
        }

        window.matchedConfig = matchedConfig;

        window.helpCenterStatus = selectedStatus;

        window.elevationType = elavationType;
        //=========Get Current Case Values==============
        const currentStateCode = matchedConfig.set.handup.statecode;
        const currentStatusCode = matchedConfig.set.handup.statuscode;
        //=========Get Parent Case Values==============
        const parrentStateCode = matchedConfig.set.parentCase.statecode;
        const parentStatusCode = matchedConfig.set.parentCase.statuscode;
        //=======Case Resolution===================
        const resolutionType = matchedConfig.set.caseresolution.ResolutionTypeCode;
        const caseResolutionNote = matchedConfig.set.caseresolution.ConcateStatusAndResolutionNote;
        //-------Parent case Resolution======/
        const parentresolutionType = matchedConfig.set.parentcaseresolution.ResolutionTypeCode;
        const parentcaseResolutionNote = matchedConfig.set.parentcaseresolution.ConcateStatusAndResolutionNote;
        //=========resolution required
        const resolutionRequired = matchedConfig.set.resolutionRequired;

        console.log("Currentstate:", currentStateCode);
        console.log("Currentstatuscode:", currentStatusCode);
        console.log("ParentState:", parrentStateCode);
        console.log("ParentStatusCode:", parentStatusCode);
        console.log("Resolution type", resolutionType);
        console.log("resolution Note", caseResolutionNote);
        console.log("ParentResolutiontype", parentresolutionType);
        console.log("ParentResolution Note", parentcaseResolutionNote);
        console.log("Resolution:", resolutionRequired);
    }
    catch (error) {
        console.error("Error:", error);
    }



});