define([], function() {
    var eventData = {
        'event':'eventTracker',
        'custom_event':	'faq',
        'event_params':	{
        'event_act': '',	
        'event_lbl': ''
        }};
    var faqGTM = {
        sideBarOption: function(link) {
            this.assignActLabel('need some help', link.text());
        },
        otherHelpOptionGTM: function(link) {
            var text = link.text().toLowerCase();
            if(text.includes("blue")) {
                this.assignActLabel('blue loyality', 'register for blue loyalty');
            }
            else if(text.includes("login")) {
                eventData.custom_event = 'account';
                this.assignActLabel('sign in', 'sign in');
            }
            else if(text.includes("customer service")) {
                this.assignActLabel('contact customer service', 'customer service');
            }
            
        },
        contentQueryAnsGTM : function(link, headline) {
            this.assignActLabel(headline, link.text().replace(/\n/g, '').trim());
        },
        assignActLabel : function(act, label) {
            eventData.event_params.event_act = act ;
            eventData.event_params.event_lbl = label ;
            window.globalEventBus.emit("dataLayerEvent", eventData);
        }
    };

    return faqGTM;
    
});