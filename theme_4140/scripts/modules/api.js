/**
 * Creates an interface object to the Mozu store's Web APIs. It pulls in the Mozu
 * JavaScript SDK and initializes it with the current store's context values
 * (tenant, catalog and store IDs, and authorization tickets).
 */

define(['sdk', 'jquery', 'hyprlive', 'hyprlivecontext'], function (Mozu, $, Hypr, hlc) { 
    function replaceApiUrls(object, siteSubdirectory) {
        for (var key in object) {
          if (object.hasOwnProperty(key) && typeof object[key] === 'string') {
            if(key != "wishlistService"){
                object[key] = object[key].replace('/api/', siteSubdirectory+'/api/');
            }
          }
        }
        return object;
    }

    var apiConfig = require.mozuData('apicontext');
    var siteSubdirectory = hlc.locals.siteContext.siteSubdirectory;
    if (siteSubdirectory) {
        apiConfig.urls = replaceApiUrls(apiConfig.urls, siteSubdirectory);
    }
    Mozu.setServiceUrls(apiConfig.urls);
    
    var api = Mozu.Store(apiConfig.headers).api();
    var extendedPropertyParameters = Hypr.getThemeSetting('extendedPropertyParameters');
    if (extendedPropertyParameters && Hypr.getThemeSetting('extendedPropertiesEnabled')) {
        api.setAffiliateTrackingParameters(extendedPropertyParameters.split(','));
    }

    if (Hypr.getThemeSetting('useDebugScripts') || require.mozuData('pagecontext').isDebugMode) {
        api.on('error', function (badPromise, xhr, requestConf) {
            var e = "Error communicating with Mozu web services";
            if (requestConf && requestConf.url) e += (" at " + requestConf.url);
            var correlation = xhr && xhr.getResponseHeader && xhr.getResponseHeader('x-vol-correlation');
            if (correlation) e += " --- Correlation ID: " + correlation;
            //if (window && window.console) window.console.error(e, badPromise, xhr);
        });
    }
    return api;
});
