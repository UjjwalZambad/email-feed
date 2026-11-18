(function(webapi, $){

    webapi.safeAjax = function(ajaxOptions) {
        var deferredAjax = $.Deferred();
        shell.getTokenDeferred().done(function(token) {
            if (!ajaxOptions.headers) {

                $.extend(ajaxOptions, {

                    headers: {

                        "__RequestVerificationToken": token

                    }

                });

            } else {

                ajaxOptions.headers["__RequestVerificationToken"] = token;

            }
 
            $.ajax(ajaxOptions)

                .done(function(data, textStatus, jqXHR) {

                    deferredAjax.resolve(data, textStatus, jqXHR);

                }).fail(function(jqXHR, textStatus, errorThrown) {

                    deferredAjax.reject(jqXHR, textStatus, errorThrown);

                });
 
        }).fail(function() {

            deferredAjax.rejectWith(this, arguments);

        });
 
        return deferredAjax.promise();

    };

})(window.webapi = window.webapi || {}, jQuery);


document.addEventListener("DOMContentLoaded", function () {
  const params =new URLSearchParams(window.location.search);
  const articleId=params.get("articleId");

  console.log("ARTICLE GUID =", articleId);

  const likeBtn = document.getElementById("likeBtn");
  const dislikeBtn = document.getElementById("dislikeBtn");
  const likeCount = document.getElementById("likeCount");
  const dislikeCount = document.getElementById("dislikeCount");

  let liked = false;
  let disliked = false;
  let likePopShown = false;
  let dislikePopShown = false; //  Shared tracker for both Thumbs Up and Down buttons


  // FUNCTION TO HANDLE THE POPUP ONCE
/*function checkAndTriggerPopup(type) {
    if (type === "like" && !likePopupShown) {
        openkbFeedbackPopup();
        likePopupShown = true;
    }
    if (type === "dislike" && !dislikePopupShown) {
        openkbFeedbackPopup();
        dislikePopupShown = true;
    }
}*/

// Content Click to call/copy functionality

function formatPhoneNumbers(text){

        if(!text) return "";

        const phoneRegex = /(\+?\d[\d\s\-\(\)]{7,}\d)/g;

        const isDesktop = !("ontouchstart" in window);

        return text.replace(phoneRegex, function(number){

            const cleanNumber = number.replace(/\s/g, "");

            if(isDesktop){
                // ✅ Desktop → Click to Copy
                console.log("desktop is called");
                return `<span class="copy-number" data-number="${cleanNumber}" data-original-text="${number}" style="color:#0a66c2; text-decoration:underline; font-weight:600; cursor:pointer;">${number}</span>`;
            }
            else {
                // ✅ Mobile → Click to Call
                console.log("mobile is called");
                return `<a href="tel:${cleanNumber}" style="color:#0a66c2; font-weight:600;">${number}</a>`;
            }
        });
    }

    // ✅ APPLY SAME LOGIC TO KNOWLEDGE ARTICLE CONTENT
    const articleContainer = document.querySelector(".article-content");

    if(articleContainer){
        articleContainer.innerHTML = formatPhoneNumbers(articleContainer.innerHTML);
    }


    // ✅ COPY TO CLIPBOARD (reused from your existing logic)

// ✅ COPY TO CLIPBOARD FOR DESKTOP PHONE NUMBERS
document.addEventListener("click", function (e) {

    const el = e.target.closest(".copy-number");

    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    // Prevent repeat click while "Copied!" is visible
    if (el.dataset.copying === "true") {
        return;
    }

    // Store original text only once
    if (!el.dataset.originalText) {
        el.dataset.originalText = el.textContent.trim();
    }

    const originalText = el.dataset.originalText;
    const number = el.dataset.number;

    el.dataset.copying = "true";

    navigator.clipboard.writeText(number).then(function () {

        // Show copied state
        el.textContent = "Copied!";
        el.style.color = "#28a745";
        el.style.textDecoration = "none";
        el.style.pointerEvents = "none";

        setTimeout(function () {

            // Restore original phone number
            el.textContent = originalText;
            el.style.color = "#0a66c2";
            el.style.textDecoration = "underline";
            el.style.pointerEvents = "";
            el.dataset.copying = "false";

        }, 1000);

    }).catch(function (error) {

        console.error("Copy failed:", error);

        // Restore if clipboard fails
        el.textContent = originalText;
        el.style.color = "#0a66c2";
        el.style.textDecoration = "underline";
        el.style.pointerEvents = "";
        el.dataset.copying = "false";

    });
});


 
   // FUNCTION TO HANDLE THE POPUP ONCE
function checkAndTriggerPopup() {
    openkbFeedbackPopup(); // always open when called
}

   // ✅ LIKE BUTTON (THUMBS UP) CLICK
  likeBtn.addEventListener("click", function () {
    
 
    // ⭐ If thumbs up is YELLOW → make it normal
    if (likeBtn.classList.contains("kb-final")) {
        likeBtn.classList.remove("kb-final", "kb-active");
        dislikeBtn.classList.remove("kb-disabled");
        liked = false;
        return;
    }
 
    console.log("LIKE CLICKED");   // ← ADD IT HERE
     if (likeBtn.classList.contains("kb-disabled")) return;
 
    // Sync with button state (popup close removes kb-active)   ← NEW
    liked = likeBtn.classList.contains("kb-active");            // ← NEW
 
    if (liked) {
      // ✅ Remove like (Unlike action)
      //likeCount.innerText = parseInt(likeCount.innerText) - 1;
      likeBtn.classList.remove("kb-active");
      dislikeBtn.classList.remove("kb-disabled");
      liked = false;
 
      // 🚀 Trigger popup on first interaction (Unlike)
    //checkAndTriggerPopup("like");
    }
    
     else {
      // ✅ Add like (Like action)
     // likeCount.innerText = parseInt(likeCount.innerText) + 1;
      likeBtn.classList.add("kb-active");
      dislikeBtn.classList.add("kb-disabled");
      liked = true;
 
      // 🚀 Trigger popup on first interaction (Like)
      
     //saveFeedback(965810000, "Like");
          
     checkAndTriggerPopup();
    
    //let currentLikes = parseInt(likeCount.innerText) || 0;
    //likeCount.innerText = currentLikes + 1;
 
    //saveLikeFeedback(articleId);
 
    }
  });
   // ✅ DISLIKE BUTTON (THUMBS DOWN) CLICK
  dislikeBtn.addEventListener("click", function () {
 
    // ⭐ If thumbs down is YELLOW → make it normal
    if (dislikeBtn.classList.contains("kb-final")) {
        dislikeBtn.classList.remove("kb-final", "kb-active");
        likeBtn.classList.remove("kb-disabled");
        disliked = false;
        return;
    }
 
    // Block action if the button has the disabled class
    if (dislikeBtn.classList.contains("kb-disabled")) return;
 
    // Sync with button state (popup close removes kb-active)   ← NEW
    disliked = dislikeBtn.classList.contains("kb-active");      // ← NEW
 
    if (disliked) {
      // ✅ Remove dislike (Undislike action)
     // dislikeCount.innerText = parseInt(dislikeCount.innerText) - 1;
      dislikeBtn.classList.remove("kb-active");
      likeBtn.classList.remove("kb-disabled");
      disliked = false;
 
      // 🚀 Trigger popup on first interaction (Undislike)
     //checkAndTriggerPopup("dislike");
    } else {
      // ✅ Add dislike (Dislike action)
      //dislikeCount.innerText = parseInt(dislikeCount.innerText) + 1;
      dislikeBtn.classList.add("kb-active");
      likeBtn.classList.add("kb-disabled");
      disliked = true;
 
      // 🚀 Trigger popup on first interaction (Dislike)
      //saveFeedback(965810001,"DisLike");
     
     checkAndTriggerPopup();
    }
  });
 

let rootArticleIdGlobal = null;
let currentArticleIdGlobal = null;
let articleVersionIdsGlobal = [];

function normalizeGuid(id) {
    return id ? id.replace(/[{}]/g, "").toLowerCase() : null;
}

// LOAD COUNTS FROM DATAVERSE
function loadFeedbackCounts() {
    const articleId = new URLSearchParams(window.location.search).get("articleId");

    console.log("Current Article Id:", articleId);

    if (!articleId) {
        console.error("Article Id not found");
        return;
    }

    currentArticleIdGlobal = normalizeGuid(articleId);

    webapi.safeAjax({
        type: "GET",
        url: "/_api/knowledgearticles(" + articleId + ")?$select=knowledgearticleid,_rootarticleid_value",
        contentType: "application/json",
        success: function (articleResult) {
            console.log("Current Article Result:", articleResult);

            rootArticleIdGlobal =
                normalizeGuid(articleResult._rootarticleid_value) ||
                normalizeGuid(articleResult.knowledgearticleid) ||
                currentArticleIdGlobal;

            console.log("Root Article Id:", rootArticleIdGlobal);
            console.log("Current Article Id Global:", currentArticleIdGlobal);

            loadArticleVersionsByRoot(rootArticleIdGlobal, currentArticleIdGlobal);
        },
        error: function (xhr) {
            console.error("Knowledge Article Error:", xhr.responseText);
        }
    });
}

function loadArticleVersionsByRoot(rootArticleId, currentArticleId) {
    const normalizedRootId = normalizeGuid(rootArticleId);
    const normalizedCurrentId = normalizeGuid(currentArticleId);

    const query =
        "/_api/knowledgearticles" +
        "?$select=knowledgearticleid,_rootarticleid_value" +
        "&$filter=_rootarticleid_value eq " + normalizedRootId;

    console.log("Article Versions Query:", query);

    webapi.safeAjax({
        type: "GET",
        url: query,
        contentType: "application/json",
        success: function (result) {
            console.log("Article Versions For Root:", result.value);

            articleVersionIdsGlobal = [];

            // Always include current article because feedback regardingobjectid points here
            if (normalizedCurrentId) {
                articleVersionIdsGlobal.push(normalizedCurrentId);
            }

            // Include root article too
            if (
                normalizedRootId &&
                !articleVersionIdsGlobal.includes(normalizedRootId)
            ) {
                articleVersionIdsGlobal.push(normalizedRootId);
            }

            // Include all version article IDs found by root
            result.value.forEach(function (article) {
                const versionId = normalizeGuid(article.knowledgearticleid);

                if (
                    versionId &&
                    !articleVersionIdsGlobal.includes(versionId)
                ) {
                    articleVersionIdsGlobal.push(versionId);
                }
            });

            console.log(
                "All Article Version Ids To Count:",
                articleVersionIdsGlobal
            );

            getCountsByArticleVersions(articleVersionIdsGlobal);
        },
        error: function (xhr) {
            console.error("Article Versions Error:", xhr.responseText);

            // Fallback: at least count feedback for current article
            articleVersionIdsGlobal = [];

            if (normalizedCurrentId) {
                articleVersionIdsGlobal.push(normalizedCurrentId);
            }

            if (
                normalizedRootId &&
                !articleVersionIdsGlobal.includes(normalizedRootId)
            ) {
                articleVersionIdsGlobal.push(normalizedRootId);
            }

            getCountsByArticleVersions(articleVersionIdsGlobal);
        }
    });
}

function getCountsByArticleVersions(articleVersionIds) {
    const query =
        "/_api/feedback" +
        "?$select=cat_ratings,_regardingobjectid_value";

    console.log("Feedback Query:", query);

    webapi.safeAjax({
        type: "GET",
        url: query,
        contentType: "application/json",
        success: function (result) {
            console.log("All Feedback Records:", result.value);

            let likes = 0;
            let dislikes = 0;

            result.value.forEach(function (item) {
                const regardingId = normalizeGuid(item._regardingobjectid_value);

                if (regardingId && articleVersionIds.includes(regardingId)) {
                    console.log("Matched Feedback:", item);

                    if (item.cat_ratings == 100000000) {
                        likes++;
                    }

                    if (item.cat_ratings == 100000001) {
                        dislikes++;
                    }
                }
            });

            console.log("Likes:", likes);
            console.log("Dislikes:", dislikes);

            document.getElementById("likeCount").innerText = likes;
            document.getElementById("dislikeCount").innerText = dislikes;
        },
        error: function (xhr) {
            console.error("Feedback Error:", xhr.responseText);
        }
    });
}

loadFeedbackCounts();
 
 
// SAVE FEEDBACK
function saveFeedback(reactionValue, title) {
 
    webapi.safeAjax({
 
        type: "POST",
 
        url: "/_api/feedback",
 
        contentType: "application/json",
 
        data: JSON.stringify({
 
            "title":reactionValue == 100000000 ? "Liked Feedback" : "Disliked Feedback",
 
           "cat_ratings": reactionValue,

         //"cat_knowledgearticle@odata.bind":"/knowledgearticles(" + articleId + ")"

 
        }),
 
        success: function () {
 
            console.log("Saved");
        },
 
        error: function (xhr) {
 
            console.log(xhr.responseText);
        }
    });
} 
});

// KA view count
(function (webapi, $) {
    webapi.safeAjax = function (ajaxOptions) {
        var deferredAjax = $.Deferred();

        shell.getTokenDeferred()
            .done(function (token) {
                ajaxOptions.headers = ajaxOptions.headers || {};
                ajaxOptions.headers["__RequestVerificationToken"] = token;
                ajaxOptions.headers["OData-Version"] = "4.0";
                ajaxOptions.headers["OData-MaxVersion"] = "4.0";
                ajaxOptions.headers["Accept"] = "application/json";

                $.ajax(ajaxOptions)
                    .done(function (data, textStatus, jqXHR) {
                        deferredAjax.resolve(
                            data,
                            textStatus,
                            jqXHR
                        );
                    })
                    .fail(function (
                        jqXHR,
                        textStatus,
                        errorThrown
                    ) {
                        deferredAjax.reject(
                            jqXHR,
                            textStatus,
                            errorThrown
                        );
                    });
            })
            .fail(function () {
                deferredAjax.rejectWith(
                    this,
                    arguments
                );
            });

        return deferredAjax.promise();
    };
})(
    window.webapi = window.webapi || {},
    jQuery
);

document.addEventListener("DOMContentLoaded", function () {
    const yesButton =
        document.getElementById("kaFeedbackYes");

    const noButton =
        document.getElementById("kaFeedbackNo");
    
    const initialQuestion =
        document.getElementById("kaInitialQuestion");

    const stopCaseQuestion =
        document.getElementById("kaStopCaseQuestion");

    const stopCaseYes =
        document.getElementById("kaStopCaseYes");

    const stopCaseNo =
        document.getElementById("kaStopCaseNo");

    const statusElement =
        document.getElementById("kaFeedbackStatus");

    const rootArticleElement =
        document.getElementById("kaRootArticleId");

    const currentArticleElement =
        document.getElementById("kaCurrentArticleId");

    const submittedByElement =
        document.getElementById("kaSubmittedById");

    if (
        !yesButton ||
        !noButton ||
        !statusElement ||
        !rootArticleElement
    ) {
        return;
    }

    function cleanGuid(value) {
        return String(value || "")
            .replace(/[{}]/g, "")
            .trim();
    }

    function setSavingState() {
        yesButton.disabled = true;
        noButton.disabled = true;

        statusElement.classList.remove("error");
        ;
    }

    function restoreButtons() {
        yesButton.disabled = false;
        noButton.disabled = false;
    }

    function closeArticlePopup() {
        try {
            const parentDocument =
                window.parent.document;

            const overlay =
                parentDocument.getElementById(
                    "articlePopupOverlay"
                );

            const frame =
                parentDocument.getElementById(
                    "articlePopupFrame"
                );

            if (overlay) {
                overlay.style.display = "none";
            }

            if (frame) {
                frame.setAttribute("src", "");
            }
        } catch (error) {
            console.error(
                "Unable to close article popup:",
                error
            );
        }
    }

    function clearFormAndRedirect() {
        try {
            const parentDocument =
                window.parent.document;

            const supportForm =
                parentDocument.getElementById(
                    "catSupportForm"
                );

            if (supportForm) {
                supportForm.reset();
            }

            const filePreviews =
                parentDocument.getElementById(
                    "file-previews"
                );

            if (filePreviews) {
                filePreviews.innerHTML = "";
            }

            window.parent.location.href = "/";
        } catch (error) {
            console.error(
                "Unable to clear the form:",
                error
            );

            window.parent.location.href = "/";
        }
    }

    function saveFeedback(answer) {
        const rootArticleId =
            cleanGuid(rootArticleElement.value);
        const currentArticleId =
    cleanGuid(
        currentArticleElement
            ? currentArticleElement.value
            : ""
    );

        const submittedById =
            cleanGuid(
                submittedByElement
                    ? submittedByElement.value
                    : ""
            );

        if (!rootArticleId) {
            statusElement.classList.add("error");
            // statusElement.textContent =
            //     "Root Article ID was not found.";
            statusElement.textContent =
            "{{ snippets['CAT_Error_ArticleNotFound'] }}";

            restoreButtons();
            return;
        }

        const isYes = answer === "Yes";

        setSavingState();

 const payload = {
    "title": isYes
        ? "Liked Feedback"
        : "Disliked Feedback",

    "source": 1,

    "cat_general_reason": 100000006,

    "cat_ratings": isYes
        ? 100000000
        : 100000001,

    "comments": answer,

    "KnowledgeArticleId@odata.bind":
    "/knowledgearticles(" +
    rootArticleId +
    ")"


};

if (submittedById) {
    payload["CreatedByContact@odata.bind"] =
        "/contacts(" +
        submittedById +
        ")";
}

console.log(
    "Feedback payload:",
    JSON.stringify(payload, null, 2)
);

console.log(
    "Root Article ID:",
    rootArticleId
);

webapi.safeAjax({
    type: "POST",
    url: "/_api/feedback",
    contentType:
        "application/json; charset=utf-8",
    data: JSON.stringify(payload),
    processData: false
})

        .done(function () {
            // Notify parent Knowledge Article page that feedback was submitted
            /*window.parent.postMessage(
                {
                    type: "feedbackSubmitted"
                },
                "*"
            );*/
            statusElement.classList.remove("error");
            statusElement.textContent = "";
        if (isYes) {
    if (initialQuestion) {
        initialQuestion.style.display =
            "none";
    }

    statusElement.textContent = "";

    if (stopCaseQuestion) {
        stopCaseQuestion.style.display =
            "flex";
    }
} else {
    if (initialQuestion) {
        initialQuestion.style.display =
            "none";
    }

    statusElement.classList.remove("error");
    statusElement.textContent = "Got it!";
}
        })
        .fail(function (
            xhr,
            textStatus,
            errorThrown
        ) {
            console.error(
                "Feedback save failed:",
                xhr.status,
                xhr.responseText,
                textStatus,
                errorThrown
            );

            statusElement.classList.add("error");
            // statusElement.textContent =
            //     "Feedback could not be saved. Please try again.";
            statusElement.textContent =
                    "{{ snippets['CAT_Error_FeedbackNotSaved'] }}";

            restoreButtons();
        });
    }

    yesButton.addEventListener("click", function () {
        saveFeedback("Yes");
    });

   noButton.addEventListener("click", function () {
    if (initialQuestion) {
        initialQuestion.style.display = "none";
    }

    statusElement.classList.remove("error");
    statusElement.textContent = "Got it!";

    requestAnimationFrame(function () {
        saveFeedback("No");
    });
});

    if (stopCaseYes) {
        stopCaseYes.addEventListener(
            "click",
            function () {
                clearFormAndRedirect();
            }
        );
    }

    if (stopCaseNo) {
    stopCaseNo.addEventListener(
        "click",
        function () {
            if (stopCaseQuestion) {
                stopCaseQuestion.style.display =
                    "none";
            }

            statusElement.classList.remove(
                "error"
            );

            statusElement.textContent =
                "Got it!";
        }
    );
}

    
});

// KA view count
$(document).ready(function () {
    async function createKnowledgeArticleView() {
      const articleId = new URLSearchParams(window.location.search).get("articleId");
      console.log("Article Id:", articleId);
      if (!articleId)
        return;
      /*const storageKey = "ka_view_" + articleId;
      if (sessionStorage.getItem(storageKey)) {
        console.log("Already counted");
        return;
      }*/
      shell.getTokenDeferred().done(async function (token) {
        try {
          const response =
            await fetch("/_api/knowledgearticleviews",
              {
                method: "POST",
                headers:
                {
                  "Content-Type": "application/json",
                  "__RequestVerificationToken": token
                },
                body:
                  JSON.stringify({
                    "knowledgearticleid@odata.bind": `/knowledgearticles(${articleId})`,
                    "knowledgearticleview": 1,
                    "viewdate": new Date().toISOString(),
                    "location": 2,
                    "cat_persona": window.kaViewPersona
                  })
              }
            );
          if (response.ok) {
            //sessionStorage.setItem(storageKey, "true");
            console.log("View created");
          }
          else {
            console.log(await response.text());
          }
        }
        catch (ex) {
          console.log(ex);
        }
        });
    }
    setTimeout(createKnowledgeArticleView, 1500);
  });


// ⭐ Apply yellow highlight after feedback form is submitted
// window.addEventListener("message", function (event) {

//     if (event.data === "feedbackSubmitted") {

//         console.log("Feedback submitted — applying yellow highlight");

//         const likeBtn = document.getElementById("likeBtn");
//         const dislikeBtn = document.getElementById("dislikeBtn");

//         // If user liked → turn thumbs up yellow
//         if (likeBtn.classList.contains("kb-active")) {
//             likeBtn.classList.add("kb-final");

//        var currentLikes = parseInt(likeSpan.innerText) || 0;
//        likeSpan.innerText = currentLikes + 1;

//         }

//         // If user disliked → turn thumbs down yellow
//         if (dislikeBtn.classList.contains("kb-active")) {
//             dislikeBtn.classList.add("kb-final");

//        var currentDislikes = parseInt(dislikeSpan.innerText) || 0;
//        dislikeSpan.innerText = currentDislikes + 1;

//         }
//     }

// });


window.addEventListener("message", function (event) {

    if (event.data === "feedbackSubmitted") {
        console.log("Feedback submitted – applying yellow highlight and count");
        const likeBtn = document.getElementById("likeBtn");
        const dislikeBtn = document.getElementById("dislikeBtn");

        // If user liked -> turn thumbs up yellow

        if (likeBtn && likeBtn.classList.contains("kb-active")) {
            likeBtn.classList.add("kb-final");
            var likeSpan = document.getElementById("likeCount"); 
            if (likeSpan) {
                var currentLikes = parseInt(likeSpan.innerText) || 0;
                likeSpan.innerText = currentLikes + 1;
            }
        }
        // If user disliked -> turn thumbs down yellow

        if (dislikeBtn && dislikeBtn.classList.contains("kb-active")) {
            dislikeBtn.classList.add("kb-final");
            var dislikeSpan = document.getElementById("dislikeCount"); 
            if (dislikeSpan) {
                var currentDislikes = parseInt(dislikeSpan.innerText) || 0;
                dislikeSpan.innerText = currentDislikes + 1;
            }
        }
    }
});
 


// to set the Header title fixed to help center
window.addEventListener("load", function () {
    var snippetText = "{{ snippets['CAT Browser Title'] | default: 'Help Center' }}";
 
    function applyTitle() {
        var cleanTitle = snippetText.trim();
 
        if (document.title !== cleanTitle) {
            document.title = cleanTitle;
        }
    }
 
    // Apply once
    applyTitle();
 
    // Re-apply if portal overrides it
    const observer = new MutationObserver(function () {
        applyTitle();
    });
 
    observer.observe(document.querySelector("title"), {
        childList: true
    });
});

     //hover
      document.addEventListener("DOMContentLoaded", function () {
       
        const popup = document.getElementById("kbArticlePreviewPopup");

        if (!popup) return;

        const popupTitle = popup.querySelector(".kb-preview-popup-title");
        const popupContent = popup.querySelector(".kb-preview-popup-content");

        // Hover only on article title
        const titleLinks = document.querySelectorAll(".kb-title-preview-trigger");

        function placePopupNearTile(titleLink) {
          const card = titleLink.closest(".kb-card");
          if (!card) return;

          const cardRect = card.getBoundingClientRect();

          const popupWidth = popup.offsetWidth || 420;
          const popupHeight = popup.offsetHeight || 300;
          const gap = 14;

          let left = cardRect.right + gap;
          let top = cardRect.top;

          // If there is no space on right, show on left side of tile
          if (left + popupWidth > window.innerWidth - 16) {
            left = cardRect.left - popupWidth - gap;
          }

          // If left side also has no space, keep inside viewport
          if (left < 16) {
            left = 16;
          }

          // Keep popup inside bottom viewport
          if (top + popupHeight > window.innerHeight - 16) {
            top = window.innerHeight - popupHeight - 16;
          }

          if (top < 16) {
            top = 16;
          }

          popup.style.left = left + "px";
          popup.style.top = top + "px";
        }

        titleLinks.forEach(function (titleLink) {
          titleLink.addEventListener("mouseenter", function () {
            const card = titleLink.closest(".kb-card");
            if (!card) return;

            const source = card.querySelector(".kb-preview-source");
            if (!source) return;

            const titleElement = source.querySelector(".kb-preview-source-title");
            const contentElement = source.querySelector(".kb-preview-source-content");

            const title = titleElement ? titleElement.textContent.trim() : "";
            const content = contentElement ? contentElement.textContent.trim() : "";

            popupTitle.textContent = title;
            popupContent.textContent = content;

            popup.classList.add("active");
            popup.setAttribute("aria-hidden", "false");

            // Static placement near the tile - calculated only once on hover
            placePopupNearTile(titleLink);
          });

          titleLink.addEventListener("mouseleave", function () {
            popup.classList.remove("active");
            popup.setAttribute("aria-hidden", "true");
          });
        });

        window.addEventListener("scroll", function () {
          popup.classList.remove("active");
          popup.setAttribute("aria-hidden", "true");
        });

        window.addEventListener("resize", function () {
          popup.classList.remove("active");
          popup.setAttribute("aria-hidden", "true");
        });
      });

     