define([
    "modules/jquery-mozu"
], function($) {

    var countrySelectorGAHandler = {
        init: function() {
            var isLocale = JSON.parse(localStorage.getItem('locale'));
            if(window.globalEventBus && !isLocale){
                var eventData = {
                    'custom_event': 'country and language switcher',
                    'event_params':{
                    'event_act': 'select country and language',
                    'event_lbl': $("#country").val() + ":" + $("#language").val()
                    }
                };
                window.globalEventBus.emit('dataLayerEvent', eventData);
                localStorage.setItem('locale', 'true');
            }
        }
    };

    return countrySelectorGAHandler;
    
});