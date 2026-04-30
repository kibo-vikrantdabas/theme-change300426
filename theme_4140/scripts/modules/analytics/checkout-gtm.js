define([], function () {

    var CheckoutGTM = {
      
        userPickupLocation : function(defaultLocation) {
            var locationData = JSON.parse(sessionStorage.getItem('userSelectedLocation')),
                userSelectedLocation =  locationData ? locationData.name : defaultLocation;
            var eventData = {
                'event':'eventTracker',
                'custom_event':	'cart page',
                'event_params':	{
                'event_act': 'link click',	
                'event_lbl':userSelectedLocation
            }
            };
            try {
                if(window.globalEventBus) window.globalEventBus.emit('userStorePickUpLocation', eventData);
            } catch (error) {
                console.log('Error Occured While Firing Event For CNC Store Selection', error);
            }
            
        }
       
  
    };
    return CheckoutGTM;
  });