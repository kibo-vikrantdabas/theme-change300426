define(['modules/jquery-mozu'], function($)  {

    var applyRemoveBackdrop = function (addedClass, removedClass) {
        if(addedClass === 'active') $(".mz-backdrop").attr("style","height:" + $(document).height() + "px !important;");
        
        $(".mz-backdrop").addClass(addedClass).removeClass(removedClass);
    };

    return {
        applyRemoveBackdrop: applyRemoveBackdrop 
    };
});