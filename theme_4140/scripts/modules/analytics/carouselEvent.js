define([], function() {
    var eventData = {
        'event':'eventTracker',
        'custom_event':	'',
        'event_params':	{
            'event_act': '',
            'event_lbl':''	
        }
    };
    var carouselEvent = {
        carouselArrowEvent: function(custom_event, act, label) {
            eventData.custom_event = custom_event;
            this.assignActLabel(act, label);
        },
        assignActLabel : function(act, label) {
            eventData.event_params.event_act = act ;
            eventData.event_params.event_lbl = label ;
            window.globalEventBus.emit("dataLayerEvent", eventData);
        }
    };

    return carouselEvent;
    
});