define(['modules/jquery-mozu', 'modules/backdrop' ], function($, BackdropHandler)  {

    var mouserEntered = function (event) {
        if (!$(event.currentTarget).find(".mz-sitenav-link").hasClass("mz-emptyCategory")) 
            BackdropHandler.applyRemoveBackdrop("active", "deactive");
    };

    var mouseLeft =  function () {
        BackdropHandler.applyRemoveBackdrop("deactive", "active");
    };
     
    var backgroundFilter = function (parentCategoryEl) {
      parentCategoryEl.hover(mouserEntered, mouseLeft);
    };

    var desktopFlyout = function () {
      var parentCategoryEl = $(".mz-sitenav [data-mz-parent-item]");
      backgroundFilter(parentCategoryEl);
    };

    return {
        desktopFlyout:desktopFlyout
    };
    
});