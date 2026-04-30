define(["underscore"], function(_) {
  var eventData = {
      'event':'eventTracker',
      'custom_event':	'pdp page',
      'event_params':	{
          'event_act': '',
          'event_lbl':''	
      }
  };
  var pageContext = require.mozuData('pagecontext');

  var productPageEvent = {
      findStore : function(skuDesc, sku) {
          if(skuDesc) {
              var act = 'Find in store',
              lbl = skuDesc.concat("|", sku);
              this.assignActLabel(act, lbl);
          }
      },
      notifyMe : function(skuDesc, sku) {
          if(skuDesc) {
              var act = 'Notify me when back in stock',
              lbl = skuDesc.concat("|", sku);
              this.assignActLabel(act, lbl);
          }
      },
      assignActLabel : function(act, label) {
          eventData.event_params.event_act = act ;
          eventData.event_params.event_lbl = label ;
          window.globalEventBus.emit("dataLayerEvent", eventData);
      },

      variantSelectorEvent: function (color, size1, size2) {
        var colorLbl = this.model.get('currentColor') ? this.model.get('currentColor').split('_')[1] : this.model.get('selectedColor').split('_')[1],
          eventData = {
            custom_event:'pdp page',
            event_params: {
              event_lbl: this.model.get('content').get('productName').toLowerCase() + "|" + this.model.get('productCode')
            }
          },
          sizeLblOne , sizeLblTwo;

          if (size1) {
            sizeLblOne = size1 ? size1 : this.model.get('selectedSize1') || (size2 ? size2 : this.model.get('selectedSize2'));
            eventData.event_params.event_act = colorLbl && sizeLblOne ? colorLbl.concat(':', sizeLblOne).toLowerCase() : sizeLblOne.toLowerCase();
          }

          if (size2) {
            sizeLblTwo = size2 ? size2 : this.model.get('selectedSize2');
            eventData.event_params.event_act = colorLbl && sizeLblTwo ? colorLbl.concat(':', sizeLblTwo).toLowerCase() : sizeLblTwo.toLowerCase();
          }

          if(sizeLblOne && sizeLblTwo)
            eventData.event_params.event_act = colorLbl ? colorLbl.concat(':', sizeLblOne, '/' , sizeLblTwo).toLowerCase() : sizeLblOne.concat('/', sizeLblTwo).toLowerCase();


          window.globalEventBus.emit('dataLayerEvent', eventData);
      }
  };

  /**
   * @des - Handling Wishlist And Add To Cart GA4 Event 
   */
  var pdpGTMEventObject = {
      gtmObjectForCart: function (event, eventType) {
        var self = this;
        try {
          var gtmProductName = self.model.get('productName');
          if(this.model.get('analyticsData')) {
            var analyticsData = this.model.get('analyticsData');
            gtmProductName = analyticsData.item_name;
          }
          // if (window.globalEventBus) {
            var eventData = {
              event:event,
              eventType:eventType,
              productName: gtmProductName,
              productCode: self.model.get('productCode'),
              price: self.model.get('price').get('salePrice') ? self.model.get('price').get('salePrice') : self.model.get('price').get('price'),
              productQuantity: self.model.get('quantity'),
              color:self.model.get('currentColor'),
              variationProductCode : self.model.get('variationProductCode')
            };
            try {
              pdpGTMEventObject.requireEventData(eventData);
            } catch (error) {
              console.log('Error Occured In requireEventData() method', error.message);
            }
          // }
        } catch (error) {
          console.log("Error occured in adding gtm data in pdp page or fetching data from session storage", error.message);
        }
      },

      gtmObjectFromCart:function (event, eventType) {
        var self = this;
        try {
          // if (window.globalEventBus) {
            var eventData = {
              event:event,
              eventType:eventType,
              productName: self.productName,
              productCode: self.productCode,
              price: self.price,
              productQuantity: self.productQuantity,
              color:self.color ? self.color.toLowerCase(): '',
              variationProductCode : self.variationProductCode,
              removeFlag:self.removeFlag,
              removedQuantity:self.removedQuantity
            };
            try {
              if(!self.removeFlag){
                pdpGTMEventObject.UpdateQunatityOnDecrease(eventData);
              }
              pdpGTMEventObject.requireEventData(eventData);
            } catch (error) {
              console.log('Error Occured In requireEventData() method', error.message);
            }
          // }
        } catch (error) {
          console.log("Error occured in adding gtm data in pdp page or fetching data from session storage", error.message);
        }
      },

      UpdateQunatityOnDecrease: function(eventData){
        var existCartWishlistEvent =  JSON.parse(localStorage.getItem('cartEvent'));
        var itemIndex;
        if(!_.isUndefined(eventData.variationProductCode)) {
            itemIndex = existCartWishlistEvent.findIndex(function(eventObjectItem){ return eventObjectItem.variationProductCode == eventData.variationProductCode; });
            // existCartWishlistEvent[itemIndex].variationProductCode = eventData.variationProductCode;
        }
        else {
            itemIndex = existCartWishlistEvent.findIndex(function(eventObjectItem){ return eventObjectItem.item_id == eventData.productCode; });
        }
        if(itemIndex > -1 ) {

            // Update Existing Events
            if(eventData.productQuantity != existCartWishlistEvent[itemIndex].quantity)  existCartWishlistEvent[itemIndex].quantity = eventData.productQuantity;
               localStorage.setItem('cartEvent',JSON.stringify(existCartWishlistEvent));

        }
      },

      /**
       * 
       * @param {*} eventData - Object
       * @desc - Check The Status Of Local Storage With Respect To Event Type
       */

      requireEventData : function(eventData) {
          var existEvents = JSON.parse(localStorage.getItem('eventItems')),
              existCartWishlistEvent = [];
              
              //Get Exisitng Events Either Of Wishlist Or Cart
              existCartWishlistEvent = JSON.parse(localStorage.getItem(eventData.eventType.concat("Event"))); //Get Exisitng Events Either Of Wishlist Or Cart
           
          try { 
              pdpGTMEventObject.checkAndAssignEvent(existCartWishlistEvent, eventData, existEvents);
          } catch (error) {
              console.log('Error Occured In checkAndAssignEvent() method', error.message);
          }
           
      },

      /**
       * 
       * @param {*} existCartWishlistEvent - Array Of Objects / Null
       * @param {*} eventData - Object
       * @param {*} existEvents - Array of Object - Represent Data Which Is Stored When User Click On Prdouct
       * @desc - Status Of Localstorage With Respect To Event
       *         if status == null 
       *              Initiate LocalStorage Item
       *         else
       *              if new item => Push Item
       *              if exist item => Update Item
       *         
       */
      checkAndAssignEvent : function(existCartWishlistEvent, eventData, existEvents) {

        if(eventData.color && eventData.color.split('_')[1]) eventData.color = eventData.color.split('_')[1].toLowerCase();

        if(_.isNull(existCartWishlistEvent)) {
            // existCartWishlistEvent.push(existEvents[0]);
            var eventObject = existEvents[0];
            eventObject.quantity = eventData.productQuantity;
            eventObject.variationProductCode = eventData.variationProductCode;
            eventObject.price = Number(eventData.price).toFixed(2);
            eventObject.item_variant = eventData.color;
            eventObject.item_variant_id = eventData.variationProductCode;
            existCartWishlistEvent = [];
            existCartWishlistEvent.push(eventObject);
            pdpGTMEventObject.updateLocalStorage(existCartWishlistEvent, eventData, existEvents);
         }
         else {
            try {
              pdpGTMEventObject.assignEventToExistingStorage(existCartWishlistEvent, eventData, existEvents);
            } catch (error) {
               console.log('Error Occured While Assigning Event', error.message);
            }
             
         }
      },

      /**
       * 
        @param {*} existCartWishlistEvent - Array Of Objects / Null
       * @param {*} eventData - Object
       * @param {*} existEvents - Array of Object - Represent Data Which Is Stored When User Click On Prdouct
       * @desc - Status Of Localstorage With Respect To Event(Based On Index Of Item In Local Storage)
       *         if Item == Exisiting 
       *              Update Item
       *         else
       *              Push Item
       */
      assignEventToExistingStorage : function(existCartWishlistEvent, eventData, existEvents) {
        var itemIndex;
            if(!_.isUndefined(eventData.variationProductCode)) {
                itemIndex = existCartWishlistEvent.findIndex(function(eventObjectItem){ return eventObjectItem.variationProductCode == eventData.variationProductCode; });
                // existCartWishlistEvent[itemIndex].variationProductCode = eventData.variationProductCode;
            }
            else {
                itemIndex = existCartWishlistEvent.findIndex(function(eventObjectItem){ return eventObjectItem.item_id == eventData.productCode; });
            }
            if(itemIndex > -1 ) {

                // Update Existing Events
                existCartWishlistEvent[itemIndex].quantity += eventData.productQuantity;
                if(eventData.removeFlag) {

                  if(eventData.event =="remove_from_cart") {

                     existCartWishlistEvent.splice(itemIndex ,1);

                  }

                }
              
                 pdpGTMEventObject.updateLocalStorage(existCartWishlistEvent, eventData, existEvents);
                 

            }
            else {
                // Add New Event 
                var eventObject = existEvents[0];
                eventObject.quantity = eventData.productQuantity;
                eventObject.variationProductCode = eventData.variationProductCode;
                eventObject.price = Number(eventData.price).toFixed(2);
                eventObject.item_variant = eventData.color;
                eventObject.item_variant_id = eventData.variationProductCode;
                existCartWishlistEvent.push(eventObject);
                pdpGTMEventObject.updateLocalStorage(existCartWishlistEvent, eventData, existEvents);
            }
      },
      removeCartItemFromLocalStorage: function(eventData, existEvents){
       var existCartWishlistEvent =  JSON.parse(localStorage.getItem('cartEvent'));
       var itemIndex;
       if(!_.isUndefined(eventData.variationProductCode)) {
           itemIndex = existCartWishlistEvent.findIndex(function(eventObjectItem){ return eventObjectItem.variationProductCode == eventData.variationProductCode; });
       }
       else {
           itemIndex = existCartWishlistEvent.findIndex(function(eventObjectItem){ return eventObjectItem.item_id == eventData.productCode; });
       }
       if(itemIndex > -1 ) {
           // Update Existing Events
              existCartWishlistEvent.splice(itemIndex ,1);
              localStorage.setItem('cartEvent',JSON.stringify(existCartWishlistEvent));

       }
       
      },

      updateLocalStorage : function(existCartWishlistEvent, eventData, existEvents) {
        localStorage.setItem(eventData.eventType.concat("Event"),JSON.stringify(existCartWishlistEvent));
        pdpGTMEventObject.triggerEvent(existEvents, eventData);
      },
      triggerEvent : function(existEvents, eventData) {

        if(eventData.color && eventData.color.split('_')[1]) eventData.color = eventData.color.split('_')[1].toLowerCase();

          //Update Event Data For New Trigger
          existEvents[0].quantity = eventData.productQuantity;
          existEvents[0].price = Number(eventData.price).toFixed(pageContext.currencyInfo.precision);
          existEvents[0].item_variant = eventData.color;
          existEvents[0].item_variant_id = eventData.variationProductCode;

          if(eventData.event == 'remove_from_cart' && !eventData.removeFlag && eventData.removedQuantity) 
              existEvents[0].quantity = eventData.removedQuantity;

          //Removed VPC as VPC is not need in event data
          if(existEvents[0].variationProductCode) delete existEvents[0].variationProductCode;
     
          var eventObject = {
              event : eventData.event,
              ecommerce: {
                items:existEvents,
                currency:pageContext.currencyInfo.symbol,
                value:existEvents[0].price
            },
          };

          if(eventData.event == 'remove_from_cart' && !eventData.removeFlag && eventData.removedQuantity) 
              eventObject.ecommerce.value = eventData.removedQuantity * existEvents[0].price;
          
          if(eventData.event == 'remove_from_cart' && eventData.removeFlag) 
              eventObject.ecommerce.value = existEvents[0].quantity * existEvents[0].price;

          if(eventData.removeFlag) {
            if(eventData.event == "add_to_wishlist") {
              pdpGTMEventObject.removeCartItemFromLocalStorage(eventData, existEvents);
           
            }
          }
          //Fire Event --->
         window.globalEventBus.emit('productAddToCart', eventObject);
      }
  };
  return { 
      productPageEvent : productPageEvent,
      cartWishlistEvent : pdpGTMEventObject
  };
  
});