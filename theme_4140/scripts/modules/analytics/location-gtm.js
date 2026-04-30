define([], function() {
    var eventData = {
        'event':'eventTracker',
        'custom_event':	'store locator',
        'event_params':	{
        'event_act': '',	
        'event_lbl': ''
        }};
    var locationGTM = {
        useUserCurrentLocation: function() {
            eventData.event_params.event_act = 'use my location' ;
            eventData.event_params.event_lbl = 'use my location' ;
            if(window.globalEventBus) window.globalEventBus.emit("useUserCurrentLocation", eventData);
        },
        userSearchedLocation: function(searchInput) {
            eventData.event_params.event_act = 'search' ;
            eventData.event_params.event_lbl = searchInput ;
            if(window.globalEventBus) window.globalEventBus.emit("userSearchedLocation", eventData);
        }
    };

    return locationGTM;
    
});