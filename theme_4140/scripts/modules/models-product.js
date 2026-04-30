define(["modules/jquery-mozu", "underscore", "modules/backbone-mozu", "hyprlive", "modules/models-price", "modules/api",
    "hyprlivecontext"], function($, _, Backbone, Hypr, PriceModels, api,
        HyprLiveContext) {

    function zeroPad(str, len) {
        str = str.toString();
        while (str.length < 2) str = '0' + str;
        return str;
    }
    function formatDate(d) {
        var date = new Date(Date.parse(d) + (new Date()).getTimezoneOffset() * 60000);
        return [zeroPad(date.getFullYear(), 4), zeroPad(date.getMonth() + 1, 2), zeroPad(date.getDate(), 2)].join('-');
    }


    var ProductOption = Backbone.MozuModel.extend({
        helpers: ['isChecked'],
        initialize: function() {
            var me = this;
            _.defer(function() {
                me.listenTo(me.collection, 'invalidoptionselected', me.handleInvalid, me);
            });

            var equalsThisValue = function(fvalue, newVal) {
                return fvalue.value.toString() === newVal.toString();
            },
            containsThisValue = function(existingOptionValueListing, newVal) {
                return _.some(newVal, function(val) {
                    return equalsThisValue(existingOptionValueListing, val);
                });
            },
            attributeDetail = me.get('attributeDetail');
            if (attributeDetail) {
                if (attributeDetail.valueType === ProductOption.Constants.ValueTypes.Predefined) {
                    this.legalValues = _.chain(this.get('values')).pluck('value').map(function(v) { return !_.isUndefined(v) && !_.isNull(v) ? v.toString() : v; }).value();
                }
                if (attributeDetail.inputType === ProductOption.Constants.InputTypes.YesNo) {
                    me.on('change:value', function(model, newVal) {
                        var values;
                        if (me.previous('value') !== newVal) {
                            values = me.get('values');
                            _.first(values).isSelected = newVal;
                            me.set({
                                value: newVal,
                                shopperEnteredValue: newVal,
                                values: values
                            }, {
                                silent: true
                            });
                            me.trigger('optionchange', newVal, me);
                        }
                    });
                } else {
                    me.on("change:value", function(model, newVal) {
                        var newValObj, values = me.get("values"),
                            comparator = this.get('isMultiValue') ? containsThisValue : equalsThisValue;
                        if (typeof newVal === "string") newVal = $.trim(newVal);
                        if (newVal || newVal === false || newVal === 0 || newVal === '') {
                            _.each(values, function(fvalue) {
                                if (comparator(fvalue, newVal)) {
                                    newValObj = fvalue;
                                    fvalue.isSelected = true;
                                    me.set("value", newVal, { silent: true });
                                } else {
                                    fvalue.isSelected = false;
                                }
                            });
                            me.set("values", values);
                            if (me.get("attributeDetail").valueType === ProductOption.Constants.ValueTypes.ShopperEntered) {
                                me.set("shopperEnteredValue", newVal, { silent: true });
                            }
                        } else {
                            me.unset('value');
                            me.unset("shopperEnteredValue");
                        }
                        if (newValObj && !newValObj.isEnabled) me.collection.trigger('invalidoptionselected', newValObj, me);
                        me.trigger('optionchange', newVal, me);
                    });
                }
            }
        },
        handleInvalid: function(newValObj, opt) {
            if (this !== opt && !newValObj.autoAddEnabled) {
                this.unset("value");
                _.each(this.get("values"), function(value) {
                    value.isSelected = false;
                });
            }
        },
        parse: function(raw) {
            var selectedValue, vals, storedShopperValue;
            if (raw.isMultiValue) {
                vals = _.pluck(_.where(raw.values, { isSelected: true }), 'value');
                if (vals && vals.length > 0) raw.value = vals;
            } else {
                selectedValue = _.findWhere(raw.values, { isSelected: true });
                if (selectedValue) raw.value = selectedValue.value;
            }
            if (raw.attributeDetail) {
                if (raw.attributeDetail.valueType !== ProductOption.Constants.ValueTypes.Predefined) {
                    storedShopperValue = raw.values[0] && raw.values[0].shopperEnteredValue;
                    if (storedShopperValue || storedShopperValue === 0) {
                        raw.shopperEnteredValue = storedShopperValue;
                        raw.value = storedShopperValue;
                    }
                }
                if (raw.attributeDetail.inputType === ProductOption.Constants.InputTypes.Date && raw.attributeDetail.validation) {
                    raw.minDate = formatDate(raw.attributeDetail.validation.minDateValue);
                    raw.maxDate = formatDate(raw.attributeDetail.validation.maxDateValue);
                }
            }
            return raw;
        },
        isChecked: function() {
            var attributeDetail = this.get('attributeDetail'),
                values = this.get('values');

            return !!(attributeDetail && attributeDetail.inputType === ProductOption.Constants.InputTypes.YesNo && values && this.get('shopperEnteredValue'));
        },
        isValidValue: function() {
            var value = this.getValueOrShopperEnteredValue();
            return value !== undefined && value !== '' && (this.get('attributeDetail').valueType !== ProductOption.Constants.ValueTypes.Predefined || (this.get('isMultiValue') ? !_.difference(_.map(value, function(v) { return v.toString(); }), this.legalValues).length : _.contains(this.legalValues, value.toString())));
        },
        getValueOrShopperEnteredValue: function() {
            return this.get('value') || (this.get('value') === 0) ? this.get('value') : this.get('shopperEnteredValue');
        },
        isConfigured: function() {
            var attributeDetail = this.get('attributeDetail');
            if (!attributeDetail) return true; // if attributeDetail is missing, this is a preconfigured product
            return attributeDetail.inputType === ProductOption.Constants.InputTypes.YesNo ? this.isChecked() : this.isValidValue();
        },
        toJSON: function(options) {
            var j = Backbone.MozuModel.prototype.toJSON.apply(this, arguments);
            if (j && j.attributeDetail && j.attributeDetail.valueType !== ProductOption.Constants.ValueTypes.Predefined && this.isConfigured()) {
                var val = j.value || j.shopperEnteredValue;
                if (j.attributeDetail.dataType === "Number") val = parseFloat(val);
                j.shopperEnteredValue = j.value = val;
            }

            return j;
        },
        addConfiguration: function(biscuit, options) {
            var fqn, value, attributeDetail, valueKey, pushConfigObject, optionName,stringValue;
            if (this.isConfigured()) {
                if (options && options.unabridged) {
                    biscuit.push(this.toJSON());
                } else {                    
                    fqn = this.get('attributeFQN');
                    value = this.getValueOrShopperEnteredValue();
                    attributeDetail = this.get('attributeDetail');
                    var selectedValues  = this.get('values');
                    stringValue = value;
                    if(selectedValues) {
                        var selectedFilter = selectedValues.filter(function(attr) {
                                return attr.isSelected === true;
                        });
                        if(selectedFilter.length > 0) {
                            stringValue = selectedFilter[0].stringValue || value;
                        }
                    }
                    /*
                        Validation To Check that Is Opt and it's associatied value undefined or not 
                        as on some pages it's throwing error of undefined
                    */
                    if(!_.isUndefined(attributeDetail)) {
                        optionName = attributeDetail.name;
                        valueKey = attributeDetail.valueType === ProductOption.Constants.ValueTypes.ShopperEntered ? "shopperEnteredValue" : "value";
                        if (attributeDetail.dataType === "Number") value = parseFloat(value);
                    }
                    pushConfigObject = function(val) {
                        var o = {
                            attributeFQN: fqn,
                            name: optionName
                        };
                        o[valueKey] = val;
                        o.stringValue = stringValue;
                        biscuit.push(o);
                    };
                    if (_.isArray(value)) {
                        _.each(value, pushConfigObject);
                    } else {
                        pushConfigObject(value);
                    }
                }
            }
        }
    }, {
        Constants: {
            ValueTypes: {
                Predefined: "Predefined",
                ShopperEntered: "ShopperEntered",
                AdminEntered: "AdminEntered"
            },
            InputTypes: {
                List: "List",
                YesNo: "YesNo",
                Date: "Date"
            }
        }
    }),

    ProductContent = Backbone.MozuModel.extend({}),

    Product = Backbone.MozuModel.extend({
        mozuType: 'product',
        idAttribute: 'productCode',
        handlesMessages: true,
        helpers: ['mainImage', 'notDoneConfiguring', 'hasPriceRange', 'supportsInStorePickup', 'isPurchasable','hasVolumePricing'],
        defaults: {
            purchasableState: {},
            quantity: 1
        },
        dataTypes: {
            quantity: Backbone.MozuModel.DataTypes.Int
        },
        validation: {
            quantity: {
                min: 1,
                msg: Hypr.getLabel('enterProductQuantity')
            }
        },
        relations: {
            content: ProductContent,
            price: PriceModels.ProductPrice, 
            priceRange: PriceModels.ProductPriceRange,
            options: Backbone.Collection.extend({
                model: ProductOption
            })
        },
        getBundledProductProperties: function(opts) {
            var self = this,
                loud = !opts || !opts.silent;
            if (loud) {
                this.isLoading(true);
                this.trigger('request');
            }

            var bundledProducts = this.get('bundledProducts'),
                numReqs = bundledProducts.length,
                deferred = api.defer();
            _.each(bundledProducts, function(bp) {
                var op = api.get('product', bp.productCode);
                op.ensure(function() {
                    if (--numReqs === 0) {
                        _.defer(function() {
                            self.set('bundledProducts', bundledProducts);
                            if (loud) {
                                this.trigger('sync', bundledProducts);
                                this.isLoading(false);
                            }
                            deferred.resolve(bundledProducts);
                        });
                    }
                });
                op.then(function(p) {
                    _.each(p.prop('properties'), function(prop) {
                        if (!prop.values || prop.values.length === 0 || prop.values[0].value === '' || prop.values[0].stringValue === '') {
                            prop.isEmpty = true;
                        }
                    });
                    _.extend(bp, p.data);
                });
            });

            return deferred.promise;
        },
        hasPriceRange: function() {
            return this._hasPriceRange;
        },
        hasVolumePricing: function() {
            return this._hasVolumePricing;
        },
        calculateHasPriceRange: function(json) {
            this._hasPriceRange = json && !!json.priceRange;
        },
        initialize: function(conf) {
            var self = this;
            this.setSelectedOptions();
            this.setInitialPageLoad(true);
            this.setAvailableInventory('initial');
            this.setShowOOSDisplay(false);
            //get live product data
            this.noSelectedSizesInitialState();
            var selectedColor = this.getSelectedColor(this.get('options'));
            if(selectedColor){
                this.configureSizeDisplay();
            } else {
                if(this.get('options')){
                    var preSelectedColor;
                    this.get('options').forEach(function (opt){
                        if(opt.get('attributeFQN') === 'tenant~color' || opt.get('attributeFQN') === 'tenant~colour' ){
                            
                            /*
                               Validation To Check that Is Opt and it's associatied value undefined or not 
                               as on some pages it's throwing error of undefined
                            */
                            if(!_.isUndefined(opt.get('values'))) {
                                var colorVal = self.getColorFromURL() || opt.get('values')[0].value;
                                opt.set('value',colorVal);
                                preSelectedColor = colorVal;
                            }
                        }
                    });

                    if(preSelectedColor){
                        this.configureSizeDisplay(preSelectedColor);
                    } else {
                        this.setInitialPageLoad(false);
                        this.trigger('availableInventory');
                    }
                }
            }
            var slug = this.get('content').get('seoFriendlyUrl');
            _.bindAll(this, 'calculateHasPriceRange', 'onOptionChange');
            this.listenTo(this.get("options"), "optionchange", this.onOptionChange);
            this._hasVolumePricing = false;
            this._minQty = 1;
            if (this.get('volumePriceBands') && this.get('volumePriceBands').length > 0) {
                this._hasVolumePricing = true;
                this._minQty = _.first(this.get('volumePriceBands')).minQty;
                if (this._minQty > 1) {
                    if (this.get('quantity') <= 1) {
                        this.set('quantity', this._minQty);
                    }
                    this.validation.quantity.msg = Hypr.getLabel('enterMinProductQuantity', this._minQty);
                }
            }
            this.updateConfiguration = _.debounce(this.updateConfiguration, 300);
            this.set({ url: (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + (slug ? "/" + slug : "") +  "/p/" + this.get("productCode")});
            this.lastConfiguration = [];
            this.calculateHasPriceRange(conf);
            this.on('sync', this.calculateHasPriceRange);
            if(window.location.href.includes(this.id)){
                this.setProductInventory();  
                this.updateConfiguration();
            }
        },
        getProductInventory: function(productCode){
            var postData = {
                "items": [
                    {"upc": productCode}
                ]
            };
            return api.request(
                "POST", 
                "/api/commerce/inventory/v5/inventory/aggregate", 
                postData
            );
        },
        setProductInventory: function(){
            var self = this;
            var productCode = self.get('variationProductCode') ||self.get('productCode');
            if(productCode){
                self.getProductInventory(productCode)
                .then(function(res){
                    self.setAvailableInventory(res[0].available);
                    self.setAvailableInventoryArray(res[0].available);
                    self.trigger('inventoryArray');
                }).catch(function(err){
                    if(self.get('initialPageLoad')){
                        if(self.get('isOneSize')){
                            self.setAvailableInventory(0);
                            self.setShowOOSDisplay(true);
                        } else {
                            self.setAvailableInventory('initial');
                        }
                    } else {
                        self.setAvailableInventory(0);
                        self.setShowOOSDisplay(true);
                    }
                    self.trigger('inventoryArray');
                });
            }
        },
        getColorFromURL: function() {
            var url = new URL(window.location.href);
            var color = url.searchParams.get('color');
            return color;
        },
        setInitialPageLoad: function(bool) {
            this.set('initialPageLoad', bool);
        },
        mainImage: function() {
            var productImages = this.get('content.productImages');
            return productImages && productImages[0];
        },
        notDoneConfiguring: function() {
            return this.get('productUsage') === Product.Constants.ProductUsage.Configurable && !this.get('variationProductCode');
        },
        isPurchasable: function() {
            var self = this;
            var purchaseState = this.get('purchasableState');
            if (purchaseState.isPurchasable){
                return true;
            }
            if (this._hasVolumePricing && purchaseState.messages && purchaseState.messages.length === 1 && purchaseState.messages[0].validationType === 'MinQtyNotMet') {
                return true;
            }
            if(self.get('inventoryInfo')){
                if(self.get('inventoryInfo').onlineStockAvailable === 0 && self.get('availableInventory') > 0) {
                    return true;
                }
            }
            return false;
        },
        supportsInStorePickup: function() {
            return _.contains(this.get('fulfillmentTypesSupported'), Product.Constants.FulfillmentTypes.IN_STORE_PICKUP);
        },
        getConfiguredOptions: function(options) {
            return this.get('options').reduce(function(biscuit, opt) {
                var len = biscuit.length;
                for(var i = 0; i < len; i ++){
                }
                opt.addConfiguration(biscuit, options);
                return biscuit;
            }, []);
        },
        addToCart: function (stopRedirect) {
            var me = this;

            return this.whenReady(function () {
                if (!me.validate()) {
                    var fulfillMethod = me.get('fulfillmentMethod');
                    if (!fulfillMethod) {
                        fulfillMethod = (me.get('goodsType') === 'Physical') ? Product.Constants.FulfillmentMethods.SHIP : Product.Constants.FulfillmentMethods.DIGITAL;
                    }
                    return me.apiAddToCart({
                        options: me.getConfiguredOptions(),
                        fulfillmentMethod: fulfillMethod,
                        quantity: me.get("quantity")
                    }).then(function (item) {
                        if(window.globalEventBus){
                            window.globalEventBus.emit('dataLayerAddedtocart',item);
                        }
                        me.trigger('addedtocart', item, stopRedirect);
                    });
                }
            });
        },
        addToWishlist: function() {
            var me = this;
            this.whenReady(function() {
                if (!me.validate()) {
                    me.apiAddToWishlist({
                        customerAccountId: require.mozuData('user').accountId,
                        quantity: me.get("quantity"),
                        options: me.getConfiguredOptions()
                    }).then(function(item) {
                        me.trigger('addedtowishlist', item);
                        me.displayWishlistCount();
                    });
                }
            });
        },
        addToCartForPickup: function(locationCode, locationName, quantity) {
            var me = this;
            this.whenReady(function() {
                return me.apiAddToCartForPickup({
                    fulfillmentLocationCode: locationCode,
                    fulfillmentMethod: Product.Constants.FulfillmentMethods.PICKUP,
                    fulfillmentLocationName: locationName,
                    quantity: quantity || 1
                }).then(function(item) {
                    me.trigger('addedtocart', item);
                });
            });
        },
        getSelectedColor: function(options) {
            var selectedColor;
            options.forEach(function(opt){
                if(opt.attributes.attributeFQN === "tenant~colour" || opt.attributes.attributeFQN === "tenant~color") {
                    if(opt.attributes.values){
                        opt.attributes.values.forEach(function(color) {
                            if(color.isSelected){
                                selectedColor = color.value;
                            }
                        });
                    }
                   
                }
            });
            return selectedColor;
        },
        getConfirmationColor: function(){
            var options = this.getConfiguredOptions();
            var color = _.findWhere(options, {"attributeFQN": "tenant~color"});
            var colour = _.findWhere(options, {"attributeFQN": "tenant~colour"});
            
            if(color){
                return color.stringValue || color.value;
            } else if (colour) {
                return colour.stringValue || colour.value;
            } else{
                return;
            }
         
        },
        getConfirmationSizes: function(){
            var options = this.getConfiguredOptions();
            var size1 = _.findWhere(options, {"attributeFQN": "tenant~size1"});
            var size2 = _.findWhere(options, {"attributeFQN": "tenant~size2"});            
            if(size1 && size2){
                if(size1.stringValue && size2.stringValue) {
                    return size1.stringValue + ' / ' + size2.stringValue;
                }
                else {
                    return size1.value + ' / ' + size2.value;
                }
                
            } else if (size1) {
                return size1.stringValue || size1.value;
            } else{
                return;
            }
         
        },
        getProductColorIds: function() {
            var colors = [];
            this.get('options').models.forEach(function(m){
                if(m.get('attributeFQN') === 'tenant~color'){
                  colors = m.get('values');
                }
            });
            if(colors.length){
                return colors.map(function(c){
                    return c.attributeValueId;
                });
            } else {
                return colors;
            }
        },
        getSelectedOptions: function(options) {
            var selectedOptions = {};
            options.forEach(function(opt) {
                if(opt.attributes.values){
                    opt.attributes.values.forEach(function(val) {
                        if(val.isSelected){
                            selectedOptions[opt.attributes.attributeFQN] = val.value;
                        }
                    });
                }
            });
            return selectedOptions;
        },
        getVariationsByColor: function(variations, color) {
            return variations.filter(function(v) {
                var colorMatch = false;
                v.options.forEach(function(opt) {
                    if(opt.attributeFQN === "tenant~colour" || opt.attributeFQN === "tenant~color"){
                        if(opt.value === color){
                            colorMatch = true;
                        }
                    }
                });
                return colorMatch;
            });
        },
        setSelectedOptions: function(){
            var self = this;
            var hasSize2 = self.get('options').find(function(opt){ return opt.attributes.attributeFQN.toLowerCase() === 'tenant~size2';}) !== undefined;
            var hasSize1 = self.get('options').find(function(opt){ return opt.attributes.attributeFQN.toLowerCase() === 'tenant~size2';}) !== undefined;
            var selectSize2 = false;
            var selectSize1 = false;
            
            var productOptions = self.get('options').map(function(opt){
                var values = opt.get('values');
                var attFQN = opt.get('attributeFQN').split('~')[1];

                var selectedOption =  _.findWhere(values, {isSelected: true});
                if(selectedOption && attFQN){
                     selectedOption.attFQN = attFQN;
                     if(attFQN === 'size1'){
                        selectSize1 = true;
                     }
                     if(attFQN === 'size2'){
                        selectSize2 = true;
                     }
                }
                return selectedOption;
            });            
            productOptions.forEach(function(opt){
                if(opt){
                    if(opt.attFQN === 'color' || opt.attFQN === 'colour'){
                        self.setIsColorSelected(true);
                    } 
                    if(opt.attFQN === 'primary-size' || opt.attFQN === 'size1' || opt.attFQN === 'size2' && opt.value){
                        if(hasSize2 && hasSize1) {
                            if(selectSize1 && selectSize2) {
                                self.setIsSizeSelected(true);
                            }
                        }
                        else {
                            self.setIsSizeSelected(true);
                        }
                        
                    }
                }
            });
        },
        setCartBtnClicked: function(bool){
            this.set('hasClickedCartBtn', bool);
        },
        setIsSizeSelected: function(bool){
            this.set('isSizeSelected', bool);
        },
        setIsColorSelected: function(bool){
            this.set('isColorSelected', bool);
        },
        setMobileSelectedSize: function(input){
            this.set('mobileSelectedSize', input);
        },
        setShowOOSDisplay: function(bool){
            this.set('showOOSDisplay', bool);
        },
        formatSizeData: function(variations, options) {
            var hasNoSize2 = options.find(function(opt){ return opt.attributes.attributeFQN === 'tenant~size2';}) === undefined;
            var hasNoSize1 = options.find(function(opt){ return opt.attributes.attributeFQN === 'tenant~size1';}) === undefined;
            var selectedOptions = this.getSelectedOptions(options);
            if(hasNoSize2 && hasNoSize1){
                return [];
            }
            var optionSize1;
            var sizeLabel;
            if(hasNoSize2){
                 optionSize1 = options.find(function(opt){ return opt.attributes.attributeFQN === 'tenant~size1';});
                variations.forEach(function(v){
                    var sizeOne = v.options.find(function(opt){ return opt.attributeFQN === 'tenant~size1' || opt.attributeFQN === "tenant~primary-size";}).value;
                    if(sizeOne === selectedOptions["tenant~size1"]){
                        v.isSelected = true;
                    } else {
                        v.isSelected = false;
                    }
                    v.options.forEach(function(opt) {
                        if(opt.attributeFQN.toLowerCase() === 'tenant~size1'){
                             sizeLabel = optionSize1.get('values').find(function(os){ return os.value === sizeOne;});
                            opt.stringValue = sizeLabel.stringValue || sizeOne;
                        }
                        
                    });
                });
                return variations;
            } else {
                var sizeTwoStore = {};
                var sizeTwoOptions = {};
                var optionSize2 = options.find(function(opt){ return opt.attributes.attributeFQN === 'tenant~size2';});
                 optionSize1 = options.find(function(opt){ return opt.attributes.attributeFQN === 'tenant~size1';});
                variations.forEach(function(v) {
                    var sizeTwo = v.options.find(function(opt){ return opt.attributeFQN === 'tenant~size2';}).value;
                    var sizeOne = v.options.find(function(opt){ return opt.attributeFQN === 'tenant~size1';}).value;
                    v.options.forEach(function(opt) {
                        if(opt.attributeFQN.toLowerCase() === 'tenant~size1'){
                             sizeLabel = optionSize1.get('values').find(function(os){ return os.value === sizeOne;});
                            opt.stringValue = sizeLabel.stringValue || sizeOne;
                        }
                        if(opt.attributeFQN.toLowerCase() === 'tenant~size2'){
                             sizeLabel = optionSize2.get('values').find(function(os){ return os.value === sizeTwo;});
                            sizeTwoOptions[sizeTwo] = sizeLabel.stringValue || sizeTwo;
                        }
                        
                    });
                    if(sizeOne === selectedOptions["tenant~size1"]){
                        v.isSelected = true;
                    } else {
                        v.isSelected = false;
                    }                    
                    if(!sizeTwoStore[sizeTwo]) {
                        sizeTwoStore[sizeTwo] = [v];
                    } else {
                        sizeTwoStore[sizeTwo].push(v);
                    }
                });
                var sizeTwoModel = [];
    
                for(var size in sizeTwoStore){
                    var sizeStore = {"size2": size};
                    
                    sizeStore.stringValue = sizeTwoOptions[size] || size;
                    if(selectedOptions["tenant~size2"] === size){
                        sizeStore.isSelected = true;
                    } else {
                        sizeStore.isSelected = false;
                    }
                    sizeStore.sizeOneOptions = sizeTwoStore[size];
                    sizeTwoModel.push(sizeStore);
                }
                return sizeTwoModel;

            }
            
        },
        setIsOneSize: function(bool){
            this.set('isOneSize', bool);
        },
        isOneSize: function(options) {
            var self = this;    
            var sizeOneOptions = options.find(function(opt){ return opt.attributes.attributeFQN === 'tenant~size1';});
            if(sizeOneOptions) {
                var hasOneSize = sizeOneOptions.attributes.values.length === 1;
                if(hasOneSize){
                    self.setIsOneSize(true);
                }
                return hasOneSize;
            } else {
                return false;
            }
        },
        setHasNoSizes: function(bool){
            this.set('hasNoSizes', bool);
        },
        hasNoSizes: function(options){
            var noSizes = options.models.length === 1 && options.models[0].get('attributeFQN') !== 'tenant~size1' && options.models[0].get('attributeFQN') !== 'tenant~size2';
            
            if(noSizes){
                this.setHasNoSizes(true);
            } else {
                this.setHasNoSizes(false);
            }
            return noSizes;
        },
        resetSizeSelection: function() {
            var options = this.get('options');
            options.forEach(function(opt){
                if(opt.attributes.value && (opt.attributes.attributeFQN === "tenant~size1" || opt.attributes.attributeFQN === "tenant~size2")){
                    delete opt.attributes.value;
                }
            });
            this.setIsSizeSelected(false);
        },
        clearSelectedSizes: function(){
            var options = this.get('options');
            options.forEach(function(option){
                var attrs = option.attributes;
                if(attrs.attributeFQN === "tenant~size1" || attrs.attributeFQN === "tenant~size2"){
                    if(!_.isUndefined( attrs.values)) {
                        attrs.values.forEach(function(val){
                            val.isSelected = false;
                        });
                    }
                }
            });
        },
        shouldClearSizes: function() {
            var shouldClear = true;
            this.get('options').forEach(function(opt){
                if(!_.isUndefined(opt.attributes.values)) {
                    if(opt.attributes.attributeFQN === "tenant~size1" && opt.attributes.values.length === 1){
                        shouldClear = false;
                    }
                }
            });
            return shouldClear;
        },
        noSelectedSizesInitialState: function() {
            if(this.shouldClearSizes()){
                this.clearSelectedSizes();
            } 
        },
        clearSelectedVariations: function() {
            this.get('variations').forEach(function(v){
                if(v.isSelected === true){
                    v.isSelected = false;
                }
            });
        },
        configureSizeDisplay: function(preSelectedColor) {
            var self = this;
            var currentColor = this.get('currentColor');
            var selectedColor = preSelectedColor || this.getSelectedColor(this.get('options'));
            var isOneSize = this.isOneSize(this.get('options'));
            var isDiffColor = selectedColor !== currentColor;

            if(this.hasNoSizes(this.get('options'))){
                this.setInitialPageLoad(false);
            } else {
                if(!isOneSize) {
                    if(isDiffColor) {
                        if(currentColor !== undefined){
                            this.resetSizeSelection();
                            this.setCartBtnClicked(false);
                            this.setIsSizeSelected(false);
                            this.setInitialPageLoad(true);
                            this.set('colorChange', true);
                        }
                        this.set('currentColor', selectedColor);
                        this.setCartBtnClicked(false);
                        this.setIsSizeSelected(false);
                        var variationsByColor = this.getVariationsByColor(this.get('variations'), selectedColor);
                        this.set('variationsByColor', variationsByColor);
                    } else {
                        this.setInitialPageLoad(false);
                        this.set('colorChange', false);
                    }

                    var availableVariants = this.get('variationsByColor') || [];
    
                    var sizeDisplay = this.formatSizeData(availableVariants, this.get('options').models);
                    if(selectedColor !== currentColor && currentColor !== undefined){
                        sizeDisplay.forEach(function(size){
                            if(size.isSelected === true){
                                size.isSelected = false;
                            }
                        });
                    }
        
                    if(sizeDisplay.length > 0){
                        this.set('sizes', sizeDisplay);
                        this.trigger('sizesupdated');
                    }
                } else {
                    var oneSizeByColor = this.getVariationsByColor(this.get('variations'), selectedColor);

                    var oneSizeDisplay = self.formatSizeData(oneSizeByColor, self.get('options').models);
                    self.set('sizes', oneSizeDisplay);
                    self.trigger('sizesupdated');
                }
            }
        },
        getLiveInventory: function(sizes){
            var self = this;
            var inventoryReq = sizes.map(function(size){
                return self.getProductInventory(size.productCode);
            });
            return Promise.all(inventoryReq);
        },
        setQuantityWarning: function(bool) {
            this.set('quantityWarning', bool);
        },
        setAvailableInventory: function(num){
            this.set('availableInventory', num);
        },
        setAvailableInventoryArray: function(inv){
            var arrForRender = Array.from(Array(inv)).map(function(e,i){ return i+1;});

            this.set('inventoryArray', arrForRender);
        },
        setLocationData :  function(productCode, cb) {
            var locations = [],
            self = this;
            var promises = []; // Store promises in an array

            api
            .request("GET", "/api/commerce/catalog/storefront/products/" + productCode + "/locationinventory")
            .then(function (res) {
              res.items.forEach(function (element) {
                var result = element.locationCode,
                  stockAvailable = element.stockAvailable;
                var promise = api
                  .request("GET", "/api/commerce/storefront/locations/" + result)
                  .then(function (response) {
                    if (response.address.countryCode === Hypr.getThemeSetting("countrySpecificCode")) {
                      var locationDetailObject = {
                        locationName: response.name,
                        inHandStock: stockAvailable,
                      };
                      locations.push(locationDetailObject);
                    }
                  });
                promises.push(promise); // Add the promise to the promises array
              });

              // Use Promise.all() to wait for all promises to resolve
              Promise.all(promises).then(function () {
                self.set("availableLocations", locations);
                cb();
              });
            });
            
        },
        onOptionChange: function() {
            var selectedColor = this.getSelectedColor(this.get('options'));
            this.setInitialPageLoad(false);
            this.setShowOOSDisplay(false);
            this.set('quantityWarning', false);
            this.isLoading(true);
            if(this.get('availableInventory') === 0){
                this.setShowOOSDisplay(true);
            } else {
                this.setShowOOSDisplay(false);
                this.setAvailableInventory('initial');                
            }
            this.updateConfiguration();
            this.configureSizeDisplay();
            this.set('currentColor', selectedColor);
        },
        updateQuantity: function (newQty) {
            if (this.get('quantity') === newQty) return;
            this.set('quantity', newQty);
            if (!this._hasVolumePricing) return;
            if (newQty < this._minQty) {
                return this.showBelowQuantityWarning();
            }
            this.isLoading(true);
            this.apiConfigure({ options: this.getConfiguredOptions()}, { useExistingInstances: true });
        },
        showBelowQuantityWarning: function () {
            this.validation.quantity.min = this._minQty;
            this.validate();
            this.validation.quantity.min = 1;
        },
        handleMixedVolumePricingTransitions: function (data) {
            if (!data || !data.volumePriceBands || data.volumePriceBands.length === 0) return;
            if (this._minQty === data.volumePriceBands[0].minQty) return;
            this._minQty = data.volumePriceBands[0].minQty;
            this.validation.quantity.msg = Hypr.getLabel('enterMinProductQuantity', this._minQty);
            if (this.get('quantity') < this._minQty) {
                this.updateQuantity(this._minQty);
            }
        },
        updateConfiguration: function(addToCartConfigure) {
            var me = this,
              newConfiguration = this.getConfiguredOptions();

            if (JSON.stringify(this.lastConfiguration) !== JSON.stringify(newConfiguration)) {
                this.lastConfiguration = newConfiguration;
                this.apiConfigure({ options: newConfiguration, skipInventoryCheck:true},{ useExistingInstances: true } )
                    .then(function (apiModel) {
                        if (me._hasVolumePricing) {
                            me.handleMixedVolumePricingTransitions(apiModel.data);
                        }
                        me.trigger('optionsUpdated');
                     })
                     .then(function(){
                        var productCode = me.get('variationProductCode') || me.get('productCode');
                        if(productCode){
                            me.getProductInventory(productCode)
                            .then(function(res){
                                if(res.length){
                                    var inv = res[0].available;
                                    me.setAvailableInventory(inv);
                                    me.setAvailableInventoryArray(inv);
                                } else {
                                    if(me.get('colorChange') || (me.get('initialPageLoad') && !me.get('isOneSize'))){
                                        me.setAvailableInventory('initial');
                                    } else {
                                        me.setShowOOSDisplay(true);
                                        me.setAvailableInventory(0);
                                    }
                                }
                                me.setSelectedOptions();
                                me.trigger('availableInventory');
                                if(addToCartConfigure){
                                    me.trigger('addToCartConfigure');
                                }
                            })
                            .catch(function(e){
                                console.log(e);
                            });
                        }
                     });
            } else {
                me.trigger('availableInventory');
                this.isLoading(false);
             }
        },
        displayWishlistCount: function(e){
            if(require.mozuData("user").isAuthenticated){
                api.request("GET", "/api/commerce/wishlists")
                .then(function(wishlistsData) {
                if(wishlistsData.items.length > 0) {
                    api.request("GET", "/api/commerce/wishlists/customers/"+ require.mozuData("user").accountId +"/my_wishlist")
                    .then(function(wishlistData) {
                    var wishlistItemModel = wishlistData.items;
                    if (wishlistItemModel.length > 0) {
                        $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').html('<span class="wishlist-count">'+wishlistItemModel.length+ '</span>');
                        $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon').hide();
                        $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon-green').show();
                        $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').show();
                    }
                    else {
                        $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').html('<span class="wishlist-count">0</span>');
                        $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').hide();
                        $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon').show();
                        $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon-green').hide();
                    }
                    });
                }
                });
            } else {
                var wishlisteItemObject = JSON.parse(($.cookie("guestWishlistN"))? ($.cookie("guestWishlistN")): false);
                if(wishlisteItemObject.length > 0){
                $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').html('<span class="wishlist-count">'+wishlisteItemObject.length+ '</span>');
                $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon').hide();
                $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon-green').show();
                $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').show();
                }
                else {
                $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').html('<span class="wishlist-count">0</span>');
                $('.mz-utilitynav .wishlist-popup .afg-wishlist-count').hide();
                $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon').show();
                $('.mz-utilitynav .wishlist-popup .mz-wishlist-icon-green').hide();
                }
            }
            },
        parse: function(prodJSON) {
            if (prodJSON && prodJSON.productCode && !prodJSON.variationProductCode) {
                this.unset('variationProductCode');
            }
            return prodJSON;
        },
        toJSON: function(options) {
            var j = Backbone.MozuModel.prototype.toJSON.apply(this, arguments);
            if (!options || !options.helpers) {
                j.options = this.getConfiguredOptions({ unabridged: true });
            }
            if (options && options.helpers) {
                if (typeof j.mfgPartNumber == "string") j.mfgPartNumber = [j.mfgPartNumber];
                if (typeof j.upc == "string") j.upc = [j.upc];
                if (j.bundledProducts && j.bundledProducts.length === 0) delete j.bundledProducts;
            }
            return j;
        }
    }, {
        Constants: {
            FulfillmentMethods: {
                SHIP: "Ship",
                PICKUP: "Pickup",
                DIGITAL: "Digital"
            },
            // for catalog instead of commerce
            FulfillmentTypes: {
                IN_STORE_PICKUP: "InStorePickup"
            },
            ProductUsage: {
                Configurable: 'Configurable'
            }
        }
    }),


    ProductCollection = Backbone.MozuModel.extend({
        relations: {
            items: Backbone.Collection.extend({
                model: Product
            })
        }
    });

    return {
        Product: Product,
        Option: ProductOption,
        ProductCollection: ProductCollection
    };

});
