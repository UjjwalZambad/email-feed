document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("viewToggleBtn");
    if (!btn) return;
    const path = window.location.pathname.toLowerCase();
    // HOME PAGE
    if (path.includes("/") || path.includes("home")) {
        btn.onclick = function () {
            window.location.href = "/mycases";
        };
    }
    // MY CASES PAGE
    if (path.includes("mycases")) {
        btn.onclick = function () {
            window.location.href = "/";
        };
    }
});

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


document.addEventListener("click",function(event){
    
   
   const caseCloseBtnTab=event.target.closest("#caseclose");
   if(caseCloseBtnTab)
   {
    console.log("CaseClose tab clicked");
     const updateStatusModal=document.getElementById("updateStatusModal");
       if(updateStatusModal)
   {
    updateStatusModal.classList.add("open");
    console.log("open class added");
    console.log("Popup classes:",updateStatusModal.className);
   }
   else{
    console.log("not found");
   }
   
   }
   
   //Close poup-x button
   const closeBtn=event.target.closest("#modalCloseBtn");
   if(closeBtn)
   {
    const updateStatusModal=document.getElementById("updateStatusModal");
    if(updateStatusModal)
    {
        updateStatusModal.classList.remove("open");
    }
   }
   //close cancel button
   const cancelBtn=event.target.closest("#modalCancelBtn");
   if(cancelBtn)
   {
    //clear the status
    const selectedStatus = document.getElementById("statusSelectModal");
    if(selectedStatus)
    {
        selectedStatus.value="";
    }

    //ResolutionNote Clear
	const resolutionNot = document.getElementById("resolutionDetailModal");
    if(resolutionNot)
    {
        resolutionNot.value="";
    }

    //Count Clear
    const countResolution=document.getElementById("charCountModal");
    if(countResolution)
    {
        countResolution.textContent="0/131072";
    }

    const updateStatusModal=document.getElementById("updateStatusModal");
    if(updateStatusModal)
    {
        updateStatusModal.classList.remove("open");
    }
   }
   //close-click outside popup
    
});


//--------UpdatBtn------
console.log("Update script Loaded");
document.addEventListener("click",function(event){

    if(event.target.closest("#updateBtn"))
    {
    //e.preventDefault();
    //e.stopPropagation();
    
	console.log("Update button clicked");
	const selectedStatusElement = document.getElementById("statusSelectModal");
	const resolutionNoteElement = document.getElementById("resolutionDetailModal");
    const selectedStatus=selectedStatusElement?selectedStatusElement.value:"";
    let resolutionNote=resolutionNoteElement?resolutionNoteElement.value.trim():"";
     // CHECK REQUIRED FIELDS
       
        if (!selectedStatus || !resolutionNote) {
            showNotification(
                "Please fill in the required details first.",
                "error"
            );

            return;
        }
    if(resolutionNote && !resolutionNote.toLowerCase().startsWith("dealer resolution:"))
    {
        resolutionNote="Dealer resolution: " + resolutionNote;
    }
    const charCountModal=document.getElementById("charCountModal");
    if(charCountModal)
    {
        charCountModal.textContent=resolutionNote.length + "/131072";
    }
	console.log("case ID",caseId);
    const currentCaseId=caseId;

   console.log("Current case id", currentCaseId);
	console.log("Status is",selectedStatus);
	console.log("Resolution Note is",resolutionNote);

    //Flow URL
	 const flowurl="/_api/cloudflow/v1.0/trigger/59eda82d-3aa2-f111-b8dc-6045bd034200";
    console.log("flowUrl:",flowurl);
    
		 //Data Send to power automate
    const data={ 
        caseId: currentCaseId,
        selectedStatus: selectedStatus,
        resolutionNote: resolutionNote
};
    //Call Power automate flow

const payload = {
    eventData:JSON.stringify(data)
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
			//Close Popup
	    	$("#updateStatusModal").hide();
            //Optional refresh the page
            location.reload();			
        },
        error: function (xhr, textStatus, errorThrown) {
            console.error("Flow call failed");
            console.error("FlowURL",flowurl);
            console.error("ErrorThrown",errorThrown);
            console.error("Status",textStatus);
            
           if(xhr)
           {
            console.error("HTTP Status",xhr.textStatus);
            console.error("Response",xhr.responseText);
           }
            showNotification(
        "Error in Resolving successfully."
        
    );
        }
    });

    }
    
});

document.addEventListener("input",function(event)
{
    //const resolutionInput=event.target.closest("#resoltionDetailModal");
        if(event.target.closest("#resolutionDetailModal"))
        {
        console.log("Resolution Input started");
        const charCountModal=document.getElementById("charCountModal");
        console.log("TextArea Input", event.target.value);
        console.log("Character Count", event.target.value.legth);
        console.log("count element",charCountModal);
        if(charCountModal)
        {
         charCountModal.textContent=event.target.value.length + "/131072";   
         console.log("count Updated", charCountModal.textContent);
        }
        console.log("Resolution Input Completed");
    }
});



