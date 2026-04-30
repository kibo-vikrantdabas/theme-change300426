define(['hyprlive'], function (Hypr) {
    var loginEvent = {
        userLogin: function (){ 
            var pageContext = require.mozuData('pagecontext') ? require.mozuData('pagecontext') : '';
            var user = require.mozuData('user') ? require.mozuData('user'): '';
            var pageURL = window.location.href;
            var pageTitle = (pageContext.cmsContext)? pageContext.cmsContext.template.path.toLowerCase():"";
            var currentPage = localStorage.getItem('currentPage');
            if(window.globalEventBus && pageTitle !== currentPage){  
                var eventData = {
                'event': 'pageView',    
                'pageUrl': pageURL,
                'pageTitle': pageTitle,
                'login_status': user.isAuthenticated && !user.isAnonymous ? "logged-in" : "guest",
                'locale':Hypr.getThemeSetting('isArabicLanguageSite') ? Hypr.getThemeSetting('arSiteLocale') : Hypr.getThemeSetting('enSiteLocale')
                };
                window.globalEventBus.emit('dataLayerEvent', eventData);
                localStorage.setItem('currentPage', pageTitle);
            }
        }
    };
    return loginEvent;
});