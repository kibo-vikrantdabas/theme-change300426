define([
    'modules/jquery-mozu',
    'underscore',
    'hyprlive',
    'modules/backbone-mozu',
    'modules/api',
    'hyprlivecontext',
    'modules/models-customer',
    'modules/checkout/steps/models-base-checkout-step',
    'modules/modal-dialog'
],
function ($, _, Hypr, Backbone, api, HyprLiveContext, CustomerModels, CheckoutStep, ModalDialog) {

    // Helper function to validate National Address Short Code format
    var validateAddress4Format = function(destination) {
        var isRequired = HyprLiveContext.locals.themeSettings.nationalAddressShortCodeRequired;
        if (!isRequired) return null; // No validation needed
        
        var address4Value = null;
        if (destination.get('destinationContact') && destination.get('destinationContact').get('address')) {
            address4Value = destination.get('destinationContact').get('address').get('address4');
        }
        
        if (!address4Value) {
            return Hypr.getLabel('nationalAddressShortCodeMissing');
        }
        
        // Validate format: exactly 4 letters followed by exactly 4 numbers (e.g., ABCD1234)
        var shortCodePattern = /^[A-Z]{4}[0-9]{4}$/;
        if (!shortCodePattern.test(address4Value.toUpperCase())) {
            return Hypr.getLabel('nationalAddressShortCodeInvalidFormat');
        }
        
        return null; // Valid
    };

    var ShippingDestination = Backbone.MozuModel.extend({
        relations: {
            destinationContact: CustomerModels.Contact
        },
        dataTypes: {
            destinationId: function(val) {
                return (val === 'new') ? val : Backbone.MozuModel.DataTypes.Int(val);
            }
        },
        validation: this.validationDefault,
        validationDefault : {
            'destinationId': function (value) {
                if (!value || typeof value !== "number") return Hypr.getLabel('passwordMissing');
            }
        },
        validationDigitalDestination : {
            "destinationContact.email" : {
                fn: function (value) {
                    if (!value || !value.match(Backbone.Validation.patterns.email)) return Hypr.getLabel('emailMissing');
                }
            }
        },
        requiredBehaviors: [1002],
        initialize : function(){
            var self = this;
            //We do not persit a Gift Card Destination Flag
            //Instead we determine from the bloew checks and set Validation and Flag for a Gift Card Destination here
            if(self.get('destinationContact').get('email') && !self.get('destinationContact').get('address').get('address1')){
                self.validation = self.validationDigitalDestination;
                self.set('isGiftCardDestination', true);
            }
        },
        getCheckout : function(){
            return this.collection.parent;
        },
        validateDigitalDestination: function(){
            this.validation = this.validationDigitalDestination();
            var validationErrors =  this.validate();

            this.validation = this.validationDefault;

            return validationErrors;
        },
        selectedFulfillmentAddress : function(){
            var self = this;
            return self.collection.pluck("id");
        },
        removeDestination: function(lineId, id){
            var self = this;
            self.get(lineId).get('items').remove(id);
        },
        isDestinationSaved: function(){
            return (this.get('id')) ? true : false;
        },
        saveDestinationAsync: function(){
            var self = this;
            return self.collection.apiSaveDestinationAsync(self).then(function(data){
                self.trigger('sync');
                return data;
            });
        }
    });

    var ShippingDestinations = Backbone.Collection.extend({
         model : ShippingDestination,
         validation: {
            ShippingDestination : "validateShippingDestination"
        },
        requiredBehaviors: [1002],
        validateShippingDestination : function(value, attr, computedState){
            var itemValidations =[];
            this.collection.each(function(item,idx){
                var validation = item.validate();
                if(validation.ShippingDestinationItem.length) itemValidations = itemValidations.concat(validation.ShippingDestinationItem);
            });
            return (itemValidations.length) ? itemValidations : null; 
        },
        getCheckout : function(){
            return this.parent;
        },
        newDestination : function(contact, isCustomerAddress, customerContactType){
            var destination = {destinationContact : contact || new CustomerModels.Contact()};

            if(isCustomerAddress && contact.get('id')){
               destination.customerContactId = contact.get('id');
            }

            if(customerContactType){
                destination.customerContactType = customerContactType;
                if(customerContactType === "Billing" && !destination.id){
                    destination.id = _.uniqueId("billing_");
                }
            }

            var shippingDestination = new ShippingDestination(destination);
            this.add(shippingDestination);
            return shippingDestination;
        },
        newGiftCardDestination : function(){
            var self = this;
            var user = require.mozuData('user');
            var destination = {destinationContact : new CustomerModels.Contact({})};
            var giftCardDestination = new ShippingDestination(destination);

            giftCardDestination.validation = giftCardDestination.validationDigitalDestination;
            giftCardDestination.set('isGiftCardDestination', true);

            if (user.isAuthenticated) {
                giftCardDestination.get('destinationContact').set('email', user.email);
            }

            self.add(giftCardDestination);
            return giftCardDestination;
        },
        nonGiftCardDestinations : function(){
            var destinations = this.filter(function(destination, idx){
                return !destination.get('isGiftCardDestination');
            });
            return destinations;
        },
        singleShippingDestination : function(){
            var self = this;
            var shippingDestinations = this.nonGiftCardDestinations();
            var destination = "";

            if(!shippingDestinations.length) {
                destination = this.newDestination();
                destination.set('isSingleShipDestination', true);
            }
 
            if(!destination) {
                destination = this.find(function(destination, idx){
                    return (destination.get('isSingleShipDestination'));
                });
            }

            if(!destination) {
                destination = shippingDestinations[0];
            } 

            
            return destination;
        },
        hasDestination: function(destinationContact){
            var self = this;
            var foundDestination = self.find(function(destination){
                return self.compareAddressObjects(destination.get('destinationContact').get('address').toJSON(), destinationContact.get('address').toJSON());
            });
            return (foundDestination) ? foundDestination : false;
        },
        compareAddressObjects: function(obj1, obj2) {
            var areEqual = _.isMatch(obj1, {
                address1 : obj2.address1,
                addressType : obj2.addressType,
                cityOrTown : obj2.cityOrTown,
                countryCode : obj2.countryCode,
                postalOrZipCode : obj2.postalOrZipCode,
                stateOrProvince : obj2.stateOrProvince
            });
            return areEqual;
        },
        apiSaveDestinationAsync : function(destination){
            var self = this;
            // Validate address4 format before saving
            var validationError = validateAddress4Format(destination);
            if (validationError) {
                return $.Deferred().reject({ message: validationError }).promise();
            }
            
            var contactJson = destination.get('destinationContact').toJSON();
            // Ensure address4 flows through payload when present
            if (destination.get('destinationContact') && destination.get('destinationContact').get('address')) {
                contactJson.address = _.extend({}, contactJson.address, {
                    address4: destination.get('destinationContact').get('address').get('address4')
                });
            }
            return self.getCheckout().apiModel.addShippingDestination({DestinationContact : contactJson});
        },
        saveShippingDestinationAsync: function(destination){
            var self = this;
            return self.apiSaveDestinationAsync(destination).then(function(data){
                // Preserve address4 locally if API response omits it
                if (destination.get('destinationContact') && destination.get('destinationContact').get('address')) {
                    var localAddress4 = destination.get('destinationContact').get('address').get('address4');
                    if (localAddress4 && data.data && data.data.destinationContact && data.data.destinationContact.address && !data.data.destinationContact.address.address4) {
                        data.data.destinationContact.address.address4 = localAddress4;
                    }
                }
                self.add(data.data);
                return data;
            });
        },
        updateShippingDestinationAsync : function(destination){
            var self = this;
            return self.apiUpdateShippingDestinationAsync(destination).then(function(data){
                var entry = self.findWhere({id: data.data.id});
                    if(entry) {
                        //var mergedDestinationContact = _.extend(entry.get('destinationContact'),  data.data.destinationContact);
                        // Preserve address4 if API response does not echo it back
                        if (destination.get('destinationContact') && destination.get('destinationContact').get('address')) {
                            var localAddress4 = destination.get('destinationContact').get('address').get('address4');
                            if (localAddress4 && data.data && data.data.destinationContact && data.data.destinationContact.address && !data.data.destinationContact.address.address4) {
                                data.data.destinationContact.address.address4 = localAddress4;
                            }
                        }
                        entry.set('destinationContact', data.data.destinationContact); 
                        self.trigger('sync');
                        self.trigger('destinationsUpdate');
                    }
                return data;
            });
        },
        apiUpdateShippingDestinationAsync: function(destination){
            var self = this;
             // Validate address4 format before updating
            var validationError = validateAddress4Format(destination);
            if (validationError) {
                return $.Deferred().reject({ message: validationError }).promise();
            }
            var dest = destination.toJSON();
             // ensure address4 is preserved on update payload
            if (dest.destinationContact && dest.destinationContact.address && destination.get('destinationContact') && destination.get('destinationContact').get('address')) {
                dest.destinationContact.address.address4 = destination.get('destinationContact').get('address').get('address4');
            }
            dest.destinationId = dest.id;
            dest.checkoutId = this.getCheckout().get('id');
            return self.getCheckout().apiModel.updateShippingDestination(dest).then(function(data){
                return data;
            });
        }        
    });
   
    return {
        ShippingDestinations: ShippingDestinations,
        ShippingDestination : ShippingDestination
    };
});