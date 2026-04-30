define(['underscore', 'modules/backbone-mozu', 'hyprlive', "modules/api", "modules/models-product",
    "hyprlivecontext", 'modules/models-location', 'modules/cart/discount-dialog/models-discount-dialog', "modules/jquery-mozu"
  ], function (_, Backbone, Hypr, api, ProductModels,
      HyprLiveContext, LocationModels, DiscountDialogModels, $) {

    var CartItemProduct = ProductModels.Product.extend({
        helpers: ['mainImage','directShipSupported', 'inStorePickupSupported'],
        mainImage: function() {
            var imgs = this.get("productImages"),
                img = imgs && imgs[0],
                imgurl = 'http://placehold.it/160&text=' + Hypr.getLabel('noImages');
            return img || { ImageUrl: imgurl, imageUrl: imgurl }; // to support case insensitivity
        },
        initialize: function() {
            var url = (HyprLiveContext.locals.siteContext.siteSubdirectory || '')  + "/product/" + this.get("productCode");
            this.set({ Url: url, url: url });
        },
        directShipSupported: function(){
            return (_.indexOf(this.get('fulfillmentTypesSupported'), "DirectShip") !== -1) ? true : false;
        },
        inStorePickupSupported: function(){
            return (_.indexOf(this.get('fulfillmentTypesSupported'), "InStorePickup") !== -1) ? true : false;
        }

    }),

    CartItem = Backbone.MozuModel.extend({
        relations: {
            product: CartItemProduct
        },
        validation: {
            quantity: {
                min: 1
            }
        },
        dataTypes: {
            quantity: Backbone.MozuModel.DataTypes.Int
        },
        mozuType: 'cartitem',
        handlesMessages: true,
        helpers: ['priceIsModified', 'storeLocation', 'setInventoryDisplay'],
        priceIsModified: function() {
            var price = this.get('unitPrice');
            return price.baseAmount != price.discountedAmount;
        },
        saveQuantity: function(){
            var self = this;
            var oldQuantity = this.previous("quantity");
            var newQuantity = this.get("quantity");
        
            console.log("saveQuantity triggered - Old Quantity:", oldQuantity, "New Quantity:", newQuantity);
        
            if (this.hasChanged("quantity")) {
                console.log("🔄 Sending quantity update request to API...");
        
                this.apiModel.updateQuantity(newQuantity)
                    .then(function() {
                        console.log("Quantity successfully updated in backend.");
                        console.log("Fetching latest cart data...");
        
                        if (self.collection && self.collection.parent) {
                            return self.collection.parent.fetch();
                        } else {
                            console.warn("Cart reference missing. Skipping fetch.");
                            return Promise.resolve();
                        }
                    })
                    .then(function(cart) {
                        console.log("Directly checking for free products in the cart (ignoring suggested discounts)...");
        
                        // ✅ Find items that were auto-added (free products)
                        var freeProducts = cart.get("items").filter(function(item) {
                            return item.get("autoAddDiscountId") || 
                                   (item.get("unitPrice") && item.get("unitPrice").baseAmount === 0);
                        });
        
                        // ✅ Remove free products if they exist
                        if (freeProducts.length > 0) {
                            console.log("Removing detected free products:", freeProducts.map(function(p) {
                                return p.get("productCode");
                            }));
        
                            var removalPromises = freeProducts.map(function(freeItem) {
                                return freeItem.apiModel.del();
                            });
        
                            return Promise.all(removalPromises).then(function() {
                                console.log("✅ Free products removed. Refreshing cart...");
                                return cart.fetch().then(function() {
                                    console.log("🔄 Checking if free product should be re-added...");
                                  //  return self.recheckBOGA(cart); // ✅ Re-add free product if needed
                                  return cart.checkBOGA();
                                });
                            });
                        }
        
                        console.log("No free products found. Checking if free product should be added...");
                //return self.recheckBOGA(cart); // ✅ Ensure free product is re-added when needed
                return cart.checkBOGA();
                    })
                    .catch(function(error) {
                        console.error("Error in saveQuantity:", error);
        
                        // Rollback to old quantity if update fails
                        self.set("quantity", oldQuantity);
                        self.trigger("quantityupdatefailed", self, oldQuantity);
                    });
            } else {
                console.log("uantity was not changed, no API call made.");
            }
        },
    
        storeLocation: function(){
            var self = this;
            if(self.get('fulfillmentLocationCode')) {
                return self.collection.parent.get('storeLocationsCache').getLocationByCode(self.get('fulfillmentLocationCode'));
            }
            return;
        },
        setInventoryDisplay: function() {
            var data = this.get('data');
            if(data.availableInventory){
                var inv = data.availableInventory;
                var arrForRender = Array.from(Array(inv)).map(function(e,i){ return i+1;});
                this.set('inventoryArray', arrForRender);
            }
        }
    }),
    StoreLocationsCache = Backbone.Collection.extend({
        addLocation : function(location){
          this.add(new LocationModels.Location(location), {merge: true});
        },
        getLocations : function(){
            return this.toJSON();
        },
        getLocationByCode : function(code){
            if(this.get(code)){
                return this.get(code).toJSON();
            }
        }
    }),

    Cart = Backbone.MozuModel.extend({
        mozuType: 'cart',
        handlesMessages: true,
        helpers: ['isEmpty','count','displayPickupLinks', 'hasRequiredBehavior', 'isGiftHamper'],
        relations: {
            items: Backbone.Collection.extend({
                model: CartItem
            }),
            storeLocationsCache : StoreLocationsCache,
            discountModal: DiscountDialogModels
        },
        requiredBehaviors: [ 1008 ],
        initialize: function() {
            this.set('isModalReady', false);
            var self = this;
            if(sessionStorage.getItem('userSelectedLocation')){
                this.handleUserSelectedLocation(sessionStorage.getItem('userSelectedLocation'));
            } else {
                // this.setDefaultLocation();
            }
            if(require.mozuData('pagecontext').cmsContext) {
            var pageType = require.mozuData('pagecontext').cmsContext.template.path;
            if(pageType === "cart" || pageType ==="location"){
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(function (geo) {
                        if(!window.currentGeo){
                            window.currentGeo = geo;
                        }
                        //self.nearestInStorePickupLocation(geo);
                    }, function (err) {
                       console.log('error setting navigator', err);
                       window.currentGeo = {coords: {latitude: 25.276987, longitude: 55.296249}};
                       self.nearestInStorePickupLocation(window.currentGeo);
    
                    }, {
                      timeout: 10000
                    });
                  }
            }
           }
          
              
            this.get("items").on('sync remove', this.fetch, this)
                             .on('loadingchange', this.isLoading, this);

            this.get("items").each(function(item, el) {
                if(item.get('fulfillmentLocationCode')) {
                    self.get('storeLocationsCache').addLocation({
                        code: item.get('fulfillmentLocationCode')
                    });
                }
            });

            this.get('discountModal').set('discounts', this.getSuggestedDiscounts());
            //TODO
              //compute delivery method
            this.computeFulfillmentMethod();
        },
        computeFulfillmentMethod: function() {
            var self = this;
            var items = this.get('items');
            var fulfillmentMethod;
            if(items.length){
                items.forEach(function(item){
                    fulfillmentMethod = item.get('fulfillmentMethod');
                });
                self.setSelectedFulfillmentMethod(fulfillmentMethod);
            }
        },
        setSelectedFulfillmentMethod: function(input){
            var self = this;
            self.set('selectedFulfillmentMethod', input);
        },
        handleUserSelectedLocation: function(loc){
            var self = this;
            loc = JSON.parse(loc);
            if(Object.keys(loc).length) {
                self.set('cookieLocation', loc.name);
                this.set('defaultLocation', loc.name);
                this.set('selectedLocation', loc.code);
                this.set('nearestLocation', loc.name);
                if(loc.geo){
                    var lat = loc.geo.lat || loc.geo.coords.latitude;
                    var lng = loc.geo.lng || loc.geo.coords.longitude;
                    window.storeGeo = {coords: {latitude: lat, longitude: lng}};
                }
            }
            //window.currentGeo = {coords: {latitude: loc.geo.lat, longitude: loc.geo.lng}};
            //if user selected location, need to update api with all products location in stored location
        },
        getSuggestedDiscounts: function(){
            var self = this;

            var rejectedDiscounts = self.get('rejectedDiscounts') || [];
            console.log("rejected discount",rejectedDiscounts)
            var suggestedDiscounts = self.get('suggestedDiscounts') || [];
            var filteredDiscounts = [];
            if (suggestedDiscounts.length) {
                filteredDiscounts = _.filter(suggestedDiscounts, function(discount){
                    return !_.findWhere(rejectedDiscounts, {discountId: discount.discountId});
                });
            }
            
            return filteredDiscounts;
        },

        
        checkBOGA: function(retry){
            var me = this;

             // ✅ Ensure retry is defined
              if (typeof retry === "undefined") {
                   retry = true; // ✅ Manually set default value
               }
        
            console.log("Running checkBOGA...");
        
            // ✅ Fetch the latest cart data before checking for discounts
            return me.fetch().then(function() {
                var suggestedDiscounts = me.get("suggestedDiscounts") || [];
                var cartItems = me.get("items") || [];
        
                console.log("Checking suggested discounts:", suggestedDiscounts);

                // ✅ Modify `autoAdd` if it's false
        suggestedDiscounts.forEach(function(discount) {
            if (discount.autoAdd === false) {
                console.warn("AutoAdd is false for ${discount.productCode}. Changing to true.",discount.productCode);
                discount.autoAdd = true;  // ✅ Force autoAdd to true
            }
        });
        
                if (!suggestedDiscounts.length) {
                    console.log("No suggested discounts found. Keeping free products as is.");
                    return;
                }
        
                // ✅ Accurately check if the free product is already in the cart
                var freeProductsInCart = cartItems.filter(function(cartItem) {
                    return cartItem.autoAddDiscountId || (cartItem.unitPrice && cartItem.unitPrice.baseAmount === 0);
                });
                console.log("🛒 Detected free products in cart:", freeProductsInCart);
        
                if (freeProductsInCart.length === 0 && retry) {
                    console.log("No free products found, but discounts exist. Retrying BOGO check...");
                      return me.checkBOGA(false); // ✅ Retry once
                }
        
                // ✅ If discounts exist, but free products are missing, re-add them
                var productsToAdd = suggestedDiscounts.filter(function(discountItem) {
                    return discountItem.autoAdd && !cartItems.some(function(cartItem) {
                        return cartItem.productCode === discountItem.productCode;
                    });
                });

        
                if (productsToAdd.length === 0) {
                    console.log("Discounts exist, and free products are already present. No action needed.");                 
                    //return me.checkBOGA(false); // ✅ Retry once
                }
        
                console.log("Adding missing free products due to BOGO...");
        
                var renderCartWhenFinished = _.after(productsToAdd.length, function() {
                    me.fetch().then(function() {
                        console.log("✅ Cart updated after BOGO check.");
                    });
                });
        
                var addProductsToCart = function(productIndex) {
                    if (productIndex >= productsToAdd.length) {
                        return;
                    }
        
                    var productToAdd = productsToAdd[productIndex];
                    var bogaProduct = new CartItemProduct({ productCode: productToAdd.productCode });
                    
        
                    bogaProduct.fetch()
                        .then(function() {
                            console.log("boga product",bogaProduct.autoAdd)
                            return bogaProduct.apiAddToCart({ autoAddDiscountId: productToAdd.discountId });
                        })
                        .then(function(cartItem) {
                            console.log("Free product added:", cartItem.productCode);
                            renderCartWhenFinished();
                            addProductsToCart(productIndex + 1);
                        })
                        .catch(function(error) {
                            console.error("Error adding free product:", error);
                            renderCartWhenFinished();
                            addProductsToCart(productIndex + 1);
                        });
                };
        
                addProductsToCart(0);
            }).catch(function(error) {
                console.error("Error fetching cart before BOGO check:", error);
            });
        },
        isEmpty: function() {
            return this.get("items").length < 1;
        },
        count: function() {
            return this.apiModel.count();
            //return this.get("Items").reduce(function(total, item) { return item.get('Quantity') + total; },0);
        },
        setDefaultLocation: function(){
            var self = this;
            var defaultLocationCode = HyprLiveContext.locals.themeSettings.defaultCNCLocationCode || {coords: {latitude: 25.223893, longitude: 55.351079}};
            var location = new LocationModels.Location();
            location.apiGet({code: defaultLocationCode}).then(function(res){
                var locData = res.data;
                var name = locData.name;
                var geo = locData.geo;
                var address = locData.address.address1 + locData.address.address2 + locData.address.cityOrTown;
                self.set('defaultLocation', name);
                self.set('selectedLocation', defaultLocationCode);
                self.set('nearestLocation', name);
                self.set('defaultLocationAddress', address);
                //window.storeGeo = {coords: {latitude: geo.lat, longitude: geo.lng}};
            }).catch(function(e){

                self.set('defaultLocation', "M&S, Dubai Festival City");
                self.set('selectedLocation', 1201);
                self.set('nearestLocation', "M&S, Dubai Festival City");
                self.set('defaultLocationAddress', "7976 Crescent Dr Ground & 1st Floor, Festival Centre -  Dubai");
                //window.storeGeo = {coords: {latitude: 25.223893, longitude: 55.351079}};
            });
        },
        nearestInStorePickupLocation: function(geo) {
            if(geo){
                var self = this;
                var items = this.get('items');
                var productCodes = [];
                items.forEach(function(item){
                    var product = item.get('product');
                    var upc = product.get('variationProductCode') || product.get('productCode');
                    productCodes.push(upc);
                });

                var promiseArray = [];
                    
                productCodes.forEach(function(productCode){
                    var locationsCollection = new LocationModels.LocationCollection();
                    promiseArray.push(locationsCollection.apiGetForProduct({productCode: productCode}).then(function(collection){
                        return collection.data;
                    }));
                });
                var allLocations = [];
                Promise.all(promiseArray).then(function(locationsWithInventory){
                      locationsWithInventory.forEach(function(group){
                          allLocations = allLocations.concat(group.items);
                      });
                    var locationsWithCartInventory = _.uniq(allLocations, "code");
                    if(locationsWithCartInventory.length > 0){
                        var nearestLocation = self.getNearestLocation(locationsWithCartInventory, geo);
                        self.set('nearestLocation', nearestLocation.name);
                        //self.set('nearestGeoCoords', nearestLocation.geo);
                        self.set('selectedLocation', nearestLocation.code);
                    }
                });
            }

        },
        getNearestLocation: function(locations, geog){
            var self = this;
            var geo = geog.coords;
            locations.forEach(function(location){
                var currentLat = geo.latitude;
                var currentLng = geo.longitude;
                var locLat = location.geo.lat;
                var locLng = location.geo.lng;
                var approxDistance = self.getApproxDistFromCurrent(currentLat, currentLng, locLat, locLng);
                location.approxDistance = approxDistance;
            });
            var sortedByDistance = locations.sort(function(loc1, loc2) {
                return loc1.approxDistance - loc2.approxDistance;
            });
            return sortedByDistance[0];
        },
        getApproxDistFromCurrent: function(lat1, lon1, lat2, lon2){
            function deg2rad(deg) {
                return deg * (Math.PI/180);
            }
            var R = 6371; // Radius of the earth in km
            var dLat = deg2rad(lat2-lat1);  // deg2rad below
            var dLon = deg2rad(lon2-lon1); 
            var a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2)
                ; 
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
            var d = R * c; // Distance in km
            if(d > 100){
                return Number(Math.round(d));
            } else{
                return Number.parseFloat(d).toFixed(1);      
            }
        },
        displayPickupLinks: function() {
            var displayLinks = true;
            this.get('items').forEach(function(item){
                var fulfillmentTypes = item.get('product').get('fulfillmentTypesSupported');
                var supportsInStorePickup = fulfillmentTypes.includes('InStorePickup');

                if(supportsInStorePickup === false){
                    displayLinks = false;
                }
            });
            
            return displayLinks;
        },
        isGiftHamper: function(){
            var isGiftHamper = false;
            this.get('items').forEach(function(item){
                var properties = item.get('product').get('properties');
                var gifthamper = _.findWhere(properties, {"attributeFQN" : "tenant~mns_isgifthamper"});
                if(gifthamper){
                    const values = _.findWhere(gifthamper.values, { value: 'TRUE' });
                    if(values.value === "TRUE"){
                        isGiftHamper = true;
                    }
                }
                
            });
            
            return isGiftHamper;
        },
        assignSTHFulfillment: _.debounce(function(triggerFromCheckout) {
            if(this.get('selectedFulfillmentMethod') !== 'Ship' || triggerFromCheckout ){
                this.setSelectedFulfillmentMethod('Ship');
                var self = this;
                var cartItems = self.get('items').models;
    
                cartItems.forEach(function(cartItem){

                    var oldFulfillmentMethod = cartItem.get('fulfillmentMethod');
                    var oldPickupLocation = cartItem.get('fulfillmentLocationName');
                    var oldLocationCode = cartItem.get('fulfillmentLocationCode');
    
                    cartItem.set('fulfillmentMethod', 'Ship');
                    cartItem.set('fulfillmentLocationCode', '');
                    cartItem.set('fulfillmentLocationName', '');
               
                });
                self.apiUpdate()
                .then(function(){
                })
                .catch(function(e){
                    console.log("Error updating items", e);
                });

            } else {
                return 0;
            }
      
        }, 0),
        assignPickupLocation: _.debounce(function(locationData){
                this.setSelectedFulfillmentMethod('Pickup');
               var locationCode = (locationData && locationData.code);
                var locationName = locationData.name; 
                var self = this;
    
                var cartItems = self.get('items').models;
                cartItems.forEach(function(cartItem){
    
                    var oldFulfillmentMethod = cartItem.get('fulfillmentMethod');
                    var oldLocationCode = cartItem.get('fulfillmentLocationCode');
                    var oldPickupLocation = cartItem.get('fulfillmentLocationName');
    
                    cartItem.set('fulfillmentMethod', 'Pickup');
                    cartItem.set('fulfillmentLocationCode', locationCode);
                    cartItem.set('purchaseLocation', locationName);
                    cartItem.set('fulfillmentLocationName', locationName);
    
                    self.set('selectedPickupLocation', locationName);

                });
                self.apiUpdate()
                .then(function(){
                })
                .catch(function(e){
                    console.log("Error updating items", e);
                });
            
        }, 0),
        toOrder: function() {
            var me = this;
            me.apiCheckout().then(function(order) {
                me.trigger('ordercreated', order);
            });
        },
        toCheckout: function() {
            var me = this;
            me.apiCheckout2().then(function(checkout) {
                me.trigger('checkoutcreated', checkout);
            });
        },
        removeItem: function (id) {
            return this.get('items').get(id).apiModel.del()
        },
        addCoupon: function () {
            var me = this;
            var code = this.get('couponCode');
            var orderDiscounts = me.get('orderDiscounts');
            if (orderDiscounts && _.findWhere(orderDiscounts, { couponCode: code })) {
                // to maintain promise api
                var deferred = api.defer();
                deferred.reject();
                deferred.promise.otherwise(function () {
                    me.trigger('error', {
                        message: Hypr.getLabel('promoCodeAlreadyUsed', code)
                    });
                });
                return deferred.promise;
            }
            this.isLoading(true);
            return this.apiAddCoupon(this.get('couponCode')).then(function () {
                me.set('couponCode', '');
                var productDiscounts = _.flatten(_.pluck(_.pluck(me.get('items').models, 'attributes'), 'productDiscounts'));
                var shippingDiscounts = _.flatten(_.pluck(_.pluck(me.get('items').models, 'attributes'), 'shippingDiscounts'));

                var allDiscounts = me.get('orderDiscounts').concat(productDiscounts).concat(shippingDiscounts);
                var allCodes = me.get('couponCodes') || [];
                var lowerCode = code.toLowerCase();

                var couponExists = _.find(allCodes, function(couponCode) {
                    return couponCode.toLowerCase() === lowerCode;
                });
                if (!couponExists) {
                    me.trigger('error', {
                        message: Hypr.getLabel('promoCodeError', code)
                    });
                }

                var couponIsNotApplied = (!allDiscounts || !_.find(allDiscounts, function(d) {
                    return d.couponCode && d.couponCode.toLowerCase() === lowerCode;
                }));
                me.set('tentativeCoupon', couponExists && couponIsNotApplied ? code : undefined);
                // if (me.getSuggestedDiscounts().length) {
                //     me.get('discountModal').set('discounts', me.getSuggestedDiscounts());
                //     window.cartView.discountModalView.render();
                // }
                me.checkBOGA();
                me.isLoading(false);
            });
        },
        toJSON: function(options) {
            var j = Backbone.MozuModel.prototype.toJSON.apply(this, arguments);
            return j;
        }
    });

    return {
        CartItem: CartItem,
        Cart: Cart
    };
});
