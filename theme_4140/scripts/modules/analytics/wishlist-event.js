define([
    'underscore'
], function(_) {
     
    var triggerEvents = [];
    var WishlistEventObject = {
        init : function() {
            WishlistEventObject.updateCartEvent.call(this);
        },
        updateCartEvent : function() {
            var cartEvents = WishlistEventObject.getEvents('cart'),
                wishlistEvent = WishlistEventObject.getRemoveWishlistItem.call(this),
                eventIndex;

                //When Cart Is Empty And User Added Item From Wishlist
                if(!_.isUndefined(wishlistEvent)) {
                     
                    WishlistEventObject.initCartEventStorage.call(this, cartEvents, wishlistEvent);
               

                    eventIndex = WishlistEventObject.getEventIndex.call(this,cartEvents);

                    //If Cart Event Already Exist Then Just Update The Quantity
                    if(eventIndex > -1 ) {
                        cartEvents[eventIndex].quantity += 1;
                        WishlistEventObject.updateEvents('cart', cartEvents);
                        if(this.isSingleLineItem) {
                            WishlistEventObject.triggerEvent([wishlistEvent]);
                            return;
                        }
                    }

                    //If Cart Event Is New Then Add 
                    if(eventIndex == -1 ) {
                        cartEvents.push(wishlistEvent);
                        WishlistEventObject.updateEvents('cart', cartEvents);
                        if(this.isSingleLineItem) WishlistEventObject.triggerEvent([wishlistEvent]);
                    }
                }
        },
        initCartEventStorage: function(cartEvents, wishlistEvent) {
            if(_.isNull(cartEvents)) {
                WishlistEventObject.updateEvents('cart', [wishlistEvent]);
                if(this.isSingleLineItem){
                    WishlistEventObject.triggerEvent([wishlistEvent]);
                    return;
                } 
            }
        },
        getRemoveWishlistItem: function() {
             var wishlistEvents = WishlistEventObject.getEvents('wishlist'),
             wishListEvent, eventIndex;

             if(!_.isNull(wishlistEvents)) {

                if(_.isEmpty(wishlistEvents)) return;
                
                eventIndex = WishlistEventObject.getEventIndex.call(this, wishlistEvents);
                wishListEvent = wishlistEvents[eventIndex]; // Specific Wishlist Event Object
                wishlistEvents.splice(eventIndex, 1);
                triggerEvents.push(wishListEvent);
                WishlistEventObject.updateEvents('wishlist', wishlistEvents);
                return wishListEvent;
             }
        },
        getEvents : function (eventType) {
            return JSON.parse(localStorage.getItem(eventType.concat('Event')));
        },
        updateEvents: function(eventType, events) {
            localStorage.setItem(eventType.concat('Event'), JSON.stringify(events));
        },
        getEventIndex: function(events) {
            var self = this;
            if(!_.isUndefined(self.variationProductCode)) return events.findIndex(function(event){  return event.variationProductCode == self.variationProductCode; });
               
            if(!_.isUndefined(self.productCode)) return  events.findIndex(function(event){  return event.productCode == self.productCode; });
            
        },
        triggerEvent: function(eventItem) {
            var eventData = {
                event:'add_to_cart',
                ecommerce : {
                    items:eventItem
                }
            };

            window.globalEventBus.emit('dataLayerEvent', eventData);
        },
        triggerAddAllBagEvent: function() {
            var eventData = {
                event:'add_to_cart',
                ecommerce : {
                    items:triggerEvents
                }
            };
            
            window.globalEventBus.emit('dataLayerEvent', eventData);
        }
       
    };
    
    return WishlistEventObject;
});