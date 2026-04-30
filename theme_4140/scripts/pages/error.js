require(["jquery",'hyprlivecontext'], function ($, HyprLiveContext) {
    
    $('.mz-errordetail-expander').click(function() {
        $(this).toggleClass('is-expanded')
        .next().toggleClass('is-expanded');
    });
    $(document).ready(function(){
        var errorMessage = $('.mz-errordetail-header').text();
        var errorMessageText = $('.error-message-input').val();
        if(errorMessageText.includes('out of stock')){
            window.location.href=(HyprLiveContext.locals.siteContext.siteSubdirectory||'')+'/cart';
	    }else if (errorMessageText == "Cannot create Order from an empty Cart"){
            window.location.href=(HyprLiveContext.locals.siteContext.siteSubdirectory||'')+'/cart';
        }else{
            $('.mz-errordetail').removeClass('hidden');
        }
    });
});
