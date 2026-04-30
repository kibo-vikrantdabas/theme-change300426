define([
    "modules/jquery-mozu"
], function($) {
    var footerGTMHandler = {
        footerLinksGTM: function() {
            $(".accordian .footer-link-text").click(function () {
                const eventData = {
                  custom_event: 'navigation',
                  event_params:{
                    event_act: "footer links",
                    event_lbl: $(this).text().toLowerCase()
                  }
                
                };
                if (window.globalEventBus) {
                  window.globalEventBus.emit('dataLayerEvent', eventData);
                }
            });
        }
    };

    return footerGTMHandler;
    
});