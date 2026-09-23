
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
       },
       error: function(xhr, status, error)
       {
           console.error(
               "Filter Error:",
               error
           );
       }
   });
}
document.addEventListener("DOMContentLoaded", function () {

    const saved = JSON.parse(
        sessionStorage.getItem("selectedCategories") || "[]"
    );

    saved.forEach(id => {

        const cb = document.querySelector(
            '.cat-checkbox[data-id="' + id + '"]'
        );

        if (cb) {
            cb.checked = true;
        }
    });
     updateClearAllState(); // Add this

    if (saved.length > 0) {
        updateFilter();
    }
});

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
   url.searchParams.delete("Page");
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
       }
   });
   
sessionStorage.removeItem("selectedCategories");

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

//Global Product Filter Starts 
document.addEventListener("DOMContentLoaded", function () {
   const product =
       (sessionStorage.getItem("currentProduct") || "")
       .toLowerCase()
       .trim();
   if (!product) return;
   const matchingCheckbox =
       document.querySelector(
           `.parent-cat[data-title="${product}"]`
       );
   if (!matchingCheckbox) return;
   matchingCheckbox.checked = true;
   categoryChanged(matchingCheckbox);
   applyFilters();
});
// Global Product Filter Ends

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


