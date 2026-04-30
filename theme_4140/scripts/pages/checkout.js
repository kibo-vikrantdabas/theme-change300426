require(["modules/jquery-mozu",
    "underscore", "hyprlive",
    "modules/backbone-mozu",
    "modules/models-checkout",
    "modules/views-messages",
    "modules/cart-monitor",
    'hyprlivecontext',
    'modules/editable-view',
    'modules/preserve-element-through-render',
    'modules/xpress-paypal',
    'modules/amazonpay',
    'modules/applepay',
    'modules/api',
    'modules/bluepay',
    'modules/mobile-checker',
    'modules/models-token',
    'modules/analytics/checkout-process-gtm',
    'modules/checkout/payment/BluePaymentAction',
    'modules/checkout/payment/BluePrepaidCardAction',
    'modules/checkout/payment/BlueWalletAction',
    'modules/checkout/HandleDefaultStatus',
    'modules/checkout/payment/OrderSubmitHandler',
    'modules/checkout/payment/BankRedirectHandler',
    'modules/garbage-dump',
    'modules/mobile-number-length',
    'modules/checkout/payment/EpgPaymentAction',
    'modules/transactionid-handler',
   
],
    function ($, _, Hypr, Backbone, CheckoutModels, messageViewFactory, CartMonitor, HyprLiveContext, EditableView, preserveElements, PayPal, AmazonPay, ApplePay, api, BluePay, MobileChecker, TokenModels, CheckoutEvents, BluePayAction, BluePrepaidCardAction, BlueWalletAction, Hanlder, OrderSubmitHandler, BankRedirectHandler, GarbageHandler, MobileNumberChecker, EpgPaymentHandler, TransactionHandler) {

    var ThresholdMessageView = Backbone.MozuView.extend({
      templateName: 'modules/checkout/checkout-discount-threshold-messages'
    });


    var CheckoutStepView = EditableView.extend({
        edit: function (event) {
            var user = require.mozuData('user');

            this.model.set("isSelectedAddress", false);
            if($(event.target).hasClass('mz-formstep-edit-address')) {
                this.model.set('displayAddressForm', true);
                this.model.set('displayAddressEditForm', true);
            }
            

            if((user.isAnonymous && !user.isAuthenticated) || this.model.get('displayAddressForm')) {
                var isDialingCodeExist = this.model.get('phoneNumbers').get('home').includes("+");
                if(isDialingCodeExist) {
                    var splitMobilNumber = this.model.get('phoneNumbers').get('home').split(" ")[1];
                    this.model.get('phoneNumbers').set('home', splitMobilNumber);
                }
            }
            
            this.model.set("isMarkDefaultAddressSelected", false);

            if(this.model.get('types')) {
                var shippingType = this.model.get('types').filter(function(item){ return item.name === "Shipping";});
                if(shippingType.length > 0) {
                    if(shippingType[0].isPrimary) {
                        this.model.set("isMarkDefaultAddressSelected", true);
                    }
                }
            }

           if(require.mozuData('user').isAnonymous) {
                if($(event.currentTarget).hasClass("mz-formstep-edit-summary-address")) {
                     if($("#step-shipping-address").hasClass("is-complete")) $("#step-shipping-address").removeClass("is-complete").addClass("is-incomplete");
                }
           }
        
           this.model.edit();
        },
        cancel: function(){
            this.model.cancelStep();
            this.model.set('displayAddressForm', false);
            this.model.set('displayAddressEditForm', false);
        },
        amazonShippingAndBilling: function() {
            //isLoading(true);
            window.location = "/checkout/"+window.order.id+"?isAwsCheckout=true&access_token="+window.order.get("fulfillmentInfo").get("data").addressAuthorizationToken+"&view="+AmazonPay.viewName;
        },
             
        next: function (event) {
            if($(event.currentTarget).hasClass("address-button")) {
                this.model.get("address").set("postalOrZipCode","00000");
                this.model.get('address').set('countryCode', Hypr.getThemeSetting('countrySpecificCode'));
                var selectedPhoneNumber = this.model.get("phoneNumbers").get("home");
                var dailingCode = this.model.get("phoneNumbers").get('dialingCode');
                if(!dailingCode) {
                    dailingCode = Hypr.getThemeSetting('countrySpecificDialingCode');
                    this.model.get("phoneNumbers").set('dialingCode', dailingCode);
                }
                if(selectedPhoneNumber && dailingCode) {
                    if(selectedPhoneNumber.indexOf('+') < 0)
                        this.model.get("phoneNumbers").set("home",this.model.get("phoneNumbers").get('dialingCode').concat(" ", selectedPhoneNumber));
                }
                if($('#cityOrTownBilling option:selected').val())
                if(!this.model.get('address').get('cityOrTown')) this.model.get('address').set('cityOrTown', $('#cityOrTownBilling option:selected').val());
            }

            // wait for blur validation to complete
            if(this.model.get('address'))
                this.model.set("isMarkDefaultAddressSelected", this.model.get('address').get('defaultAddress'));

            this.model.set('displayAddressForm',false);

            this.model.set('isEditShippingMethod', false); //For Shipping Method

            var me = this;
            me.editing.savedCard = false;
            me.editing.newCard =false;
            _.defer(function () {
                me.model.next();
            }); 
        },
        choose: function () {
            var me = this;
            me.model.choose.apply(me.model, arguments);
        },
        constructor: function () {
            var me = this;
            EditableView.apply(this, arguments);
            me.resize();
            setTimeout(function () {
                me.$('.mz-panel-wrap').css({ 'overflow-y': 'hidden'});
            }, 250);
            me.listenTo(me.model,'stepstatuschange', me.render, me);
            me.$el.on('keypress', 'input', function (e) {
                if (e.which === 13) {
                    me.handleEnterKey(e);
                    return false;
                }
            });

            me.messageView = new ThresholdMessageView({
              el: $('#mz-discount-threshold-messages'),
              model: window.order
            });
        },
        initStepView: function() {
            this.model.initStep();
        },
        handleEnterKey: function (e) {
            var selectedPhoneNumber = this.model.get("phoneNumbers").get("home");
            if(selectedPhoneNumber.length == MobileNumberChecker.getAllowedPhoneNumberLength() && MobileNumberChecker.validateMobileNumberFormat(selectedPhoneNumber)){
                this.model.next();
            }
        },
       
        render: function () {

            var user = require.mozuData('user');
            Hanlder.handleDefaultStatus.call(this, user);
            
            EditableView.prototype.render.apply(this, arguments);
            this.resize();
            setTimeout(function () {
                var totalQtyItems = 0;
                $('.mz-ordersummary-checkout-v2 .mz-ordersummary-lineitems .mz-ordersummary-line-item').each(function(){
                    var itemQty = $(this).find('.mz-ordersummary-item-product-details .mz-ordersummary-item-qty').attr('data-quantity');
                    totalQtyItems += parseInt(itemQty);
                });
                $('.mz-ordersummary-checkout-v2 #itemQtyCountOS').text(totalQtyItems);
            }, 2500);

            if($(".contact-saved-container").height() > 0 && $("#address-btn").length > 0 && $(window).width() > 500) {

                var contentSaveContainerHeight = parseInt($(".contact-saved-container").height())+50
                $("#address-btn").css({"top": contentSaveContainerHeight+"px","margin-top":0});
            }

            if(!_.isNull(document.getElementById("mz-total-saving-checkout"))) {
                document.getElementById("mz-total-saving-checkout").setAttribute("onclick", "toggleCheckout()"); 
            }
        },
        resize: _.debounce(function () {
            this.$('.mz-panel-wrap').animate({'height': this.$('.mz-inner-panel').outerHeight() });
        },200),
        
    });

    var OrderSummaryView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/checkout-order-summary',

        initialize: function () {
            this.listenTo(this.model.get('billingInfo'), 'orderPayment', this.onOrderCreditChanged, this);
        },

        editCart: function () {
            window.location =  (HyprLiveContext.locals.siteContext.siteSubdirectory||'') + "/cart";
        },

        onOrderCreditChanged: function (order, scope) {
            this.render();
        },

        // override loading button changing at inappropriate times
        handleLoadingChange: function () { }
    });

    var ShippingAddressView = CheckoutStepView.extend({
        templateName: 'modules/checkout/step-shipping-address',
        autoUpdate: [
            'firstName',
            'lastNameOrSurname',
            'phoneNumbers.dialingCode',
            'phoneNumbers.home',
            'address.cityOrTown',
            'address.countryCode',
            // 'address.stateOrProvince',
            'address.address1',
            'address.address2',
            'address.address3',
            'address.address4',
            'address.addressType',
            'address.defaultAddress',
            'address.countryName',
           // 'address.comments',
           // 'address.postalOrZipCode',
            'contactId',
            'email',
            'types'
        ],
        additionalEvents: {
            "input .mz-address-firstName": "validateInputField",
            "input .mz-address-lastName": "validateInputField",
            "input .mz-address-phoneNumber": "validateInputField",
            "change .mz-address-city": "validateInputField",
            "change .mz-address-state": "validateInputField",
            "input .mz-address-field": "validateInputField",
            "input .mz-address-field-street": "validateInputField",
            "input .mz-address-field-area": "validateInputField",
            "change .mz-shippingAdreessDropdown" : "hideShippingAddresEditForm",
            "click .mz-shippingAdreessDropdown" : "hideShippingAddresEditForm",
            "keydown .mz-address-phoneNumber": "preventChars",
        },
        preventChars : function(e) {
            var invalidChars = [
                "-",
                "+",
                "e",
              ];
              if (invalidChars.includes(e.key)) {
                e.preventDefault();
              }
        },
        initialize : function() {
            this.setInitialShippingCustomState();
            this.listenShippingCustomStateChange();
        },
        setInitialShippingCustomState : function() {
            var user = require.mozuData('user');
            
            if((user.isAnonymous && !user.isAuthenticated) || window.order.get('customer').get('contacts').length === 0) 
                this.model.set('address');

            this.model.set('displayAddressForm', false);
            this.model.set('displayAddressEditForm',false);
            
        },
        listenShippingCustomStateChange : function() {
            this.listenTo(this.model, 'change:displayAddressForm', this.render);
        },
        validateInputField : function(event) {

            $(event.target)
            .addClass(event.target.value.length > 0 ? 'is-valid' : 'is-invalid')
            .removeClass(event.target.value.length === 0 ? 'is-valid' : 'is-invalid');

            if($(event.target).hasClass('mz-address-phoneNumber')) {
                MobileNumberChecker.requriedMobileNumberLength(event);
                
                if(!_.isNull(document.querySelector('.mz-chooseAddressButtonContainer button'))){
                    if(event.target.value.length < MobileNumberChecker.getAllowedPhoneNumberLength()) {
                        document.querySelector('.mz-chooseAddressButtonContainer button').disabled = true;
                        $(event.target).addClass('is-invalid');
                    }
                    else {
                        document.querySelector('.mz-chooseAddressButtonContainer button').disabled = false;
                        $(event.target).removeClass('is-invalid');
                    }
                }
                    
                
                if(!_.isNull(document.querySelector('.mz-addressSaveButtonContainer button'))){
                    if(event.target.value.length < MobileNumberChecker.getAllowedPhoneNumberLength()) {
                        document.querySelector('.mz-addressSaveButtonContainer button').disabled = true;
                        $(event.target).addClass('is-invalid');
                    }
                    else {
                        document.querySelector('.mz-addressSaveButtonContainer button').disabled = false;
                        $(event.target).removeClass('is-invalid');
                    }
                }
                        
            
                if(!MobileNumberChecker.validateMobileNumberFormat(event.target.value)) {
                    $(event.target).addClass('is-invalid');
                    if(!_.isNull(document.querySelector('.mz-chooseAddressButtonContainer button')))
                        document.querySelector('.mz-chooseAddressButtonContainer button').disabled = true;
                
                    if(!_.isNull(document.querySelector('.mz-addressSaveButtonContainer button')))
                            document.querySelector('.mz-addressSaveButtonContainer button').disabled = true;
                }
            }
            
        },
        // editAddressBook: function(){
        //     var me = this;
        //     console.log(this);
        //     //if (this.model.requiresFulfillmentInfo()) {

        //         this.editing.editAddress = true;
        //         this.render();
        //   //  }
        // },
        renderOnChange: [
           // 'address.countryCode',
            'contactId'
        ],
        requiredBehaviors: [1003],
        beginAddContact: function () {
            this.model.set('contactId', '');
            this.model.set('contactId', 'new');         
            this.model.set("isSelectedAddress", false);
            this.model.set('displayAddressForm', true);
        },        

        /**
         * @description
         * This Method Hides The Shipping Address Form 
         * When User Selects The Existing Shipping Address 
         * From Delivery Address Dropdown
         */
        hideShippingAddresEditForm : function() {
            this.model.set("isSelectedAddress", true);
        }
    });

    var BillingAddressView = CheckoutStepView.extend({
        templateName:'modules/checkout/step-billing-address',
        autoUpdate: [
            'billingContact.firstName',
            'billingContact.lastNameOrSurname',
            'billingContact.phoneNumbers.home',
            'billingContact.email',
            'billingContact.address.cityOrTown',
            'billingContact.address.countryCode',
            // 'address.stateOrProvince',
            'billingContact.address.address1',
            'billingContact.address.address2',
            'billingContact.address.address3',
            // 'address.addressType',
           // 'address.comments',
           // 'address.postalOrZipCode',
            // 'types'
        ], additionalEvents: {
            "keyup .mz-address-firstName": "validateFirstName",//done for one
            "keyup .mz-address-lastName": "validateLastName",
            "keyup .mz-address-phoneNumber": "validatePhoneNumber",
            "click .mz-address-city": "validateCity",
            "click .mz-address-country": "validateCountry",
            "change .mz-address-state": "validateState",
            "change .mz-address-country": "onUpdateCountry",
            "keyup .mz-address-field": "validateAdress",
            "keyup .mz-address-field-street": "validateAdressStreet",
            "keyup .mz-address-field-area": "validateAdressArea",
            "click .home-address": "validateAdressTypeHome",
            "click .office-address": "validateAdressTypeOffice",
            "keyup .mz-addressform-comments-field": "validateComments",
            "change .mz-shippingAdreessDropdown" : "hideShippingAddresEditForm",
            "click .mz-shippingAdreessDropdown" : "hideShippingAddresEditForm",
            "change .billing-country":"checkCountryChange",
            "click  .stepBillingInfoData": "billingInfoSubmittedData"
        },

        editBillingAddress:function(){
            var isDialingCodeExist = this.model.get('billingContact').get('phoneNumbers').get('home').includes("+");
            if(isDialingCodeExist) {
                var splitMobilNumber = this.model.get('billingContact').get('phoneNumbers').get('home').split(" ")[1];
                this.model.get('billingContact').get('phoneNumbers').set('home', splitMobilNumber);
            }
            this.model.set('isBillingAddressSaved', false);
            
        },
        billingInfoSubmittedData: function (){
            var billingFormValid = true;
            $("input.billing-input-required").each(function(){
                if($(this).val().trim() == "") {
                    $(this).addClass("field-required");
                    billingFormValid = false;
                }
                else {
                    $(this).removeClass("field-required");
                }
            });

            if($('.mz-address-phoneNumber').val().length > 0 && $('.mz-address-phoneNumber').val().length < MobileNumberChecker.getAllowedPhoneNumberLength()  ){
                $('.mz-address-phoneNumber').addClass('is-invalid');
                $('.phone-number-image').removeClass('active');
               $('.mz-address-phoneNumber').addClass("field-required"); 
               billingFormValid = false;
           }
            if(!MobileNumberChecker.validateMobileNumberFormat($('.mz-address-phoneNumber').val())) {
                $('.phone-number-image').removeClass('active');
                $('.mz-address-phoneNumber').addClass('is-invalid');
                $('.mz-address-phoneNumber').addClass("field-required"); 
                billingFormValid = false;
            }

            if(billingFormValid) {
                var selectedPhoneNumber = this.model.get("billingContact").get("phoneNumbers").get("home");
                var dailingCode = this.model.get("billingContact").get("phoneNumbers").get('dialingCode');
                if(selectedPhoneNumber && dailingCode) {
                    if(selectedPhoneNumber.indexOf('+') < 0)
                        this.model.get("billingContact").get("phoneNumbers").set("home",this.model.get("billingContact").get("phoneNumbers").get('dialingCode').concat(" ", selectedPhoneNumber));
                }
                this.model.set('isBillingAddressSaved', true);
                $("#step-payment-info").find(".mz-formstep-body:eq(0)").show();
            }
            // this.model.next();
            
        },
        initialize:function(){
            
            if(this.model.get("billingContact") && !window.order.get('requiresFulfillmentInfo')) {                
               
                this.model.get("billingContact").get('phoneNumbers').set('dialingCode', Hypr.getThemeSetting('countrySpecificDialingCode'));
                
                if(this.model.get("billingContact").get("firstName")!=="" && this.model.get("billingContact").get("firstName")!== undefined && this.model.get("billingContact").get("address").get("address1")!=="" && this.model.get("billingContact").get("address").get("address2")!=="" && this.model.get("billingContact").get("address").get("address3")!=="" && this.model.get("billingContact").get("address").get("cityOrTown")!=="" && this.model.get("billingContact").get("phoneNumbers").get("home")!=="" && this.model.get("billingContact").get("phoneNumbers").get("home")!="n/a")
                {
                    var prefilledNumber = this.model.get("billingContact").get('phoneNumbers').get('home')? this.model.get("billingContact").get('phoneNumbers').get('home').split(' '): [];
                    if(prefilledNumber && prefilledNumber.length == 1) {
                        this.model.get("billingContact").get("phoneNumbers").set("home",this.model.get("billingContact").get("phoneNumbers").get('dialingCode').concat(" ", Hypr.getThemeSetting('countrySpecificDialingCode')));
                    }
                    this.model.set('isBillingAddressSaved', true);
                    setTimeout(function() {
                        $("#step-payment-info").find(".mz-formstep-body:eq(0)").show();
                    },300);
                }
                else {
                    
                    this.model.set('isBillingAddressSaved', false);
                    var user = require.mozuData('user');
                    var checkDisablePayment = true;
                    if(user.isAuthenticated) {                        
                        this.model.get("billingContact").set('email',user.email);
                        this.model.get("billingContact").set("userId", user.userId);
                        var customerData = window.order.get('customer').get('contacts').toJSON().filter(function(item) { return item.types.map(function(items) {return items.name;}).includes('Billing');});
                        if(customerData && customerData.length > 0) {
                            var previousBillingInfo = customerData[customerData.length - 1];
                            this.model.get("billingContact").set('firstName',previousBillingInfo.firstName);
                            this.model.get("billingContact").set('lastNameOrSurname',previousBillingInfo.lastNameOrSurname);
                            if(previousBillingInfo.lastNameOrSurname != "n/a" && previousBillingInfo.phoneNumbers.home != "n/a") {
                                this.model.get("billingContact").set('firstName',previousBillingInfo.firstName);
                                this.model.get("billingContact").set('lastNameOrSurname',previousBillingInfo.lastNameOrSurname);
                                this.model.get("billingContact").set('email',previousBillingInfo.email);
                                this.model.get("billingContact").get('phoneNumbers').set('home',previousBillingInfo.phoneNumbers.home);
                                this.model.get("billingContact").get('address').set('address1',previousBillingInfo.address.address1);
                                this.model.get("billingContact").get('address').set('address2',previousBillingInfo.address.address2);
                                this.model.get("billingContact").get('address').set('address3',previousBillingInfo.address.address3);
                                this.model.get("billingContact").get('address').set('cityOrTown',previousBillingInfo.address.cityOrTown);
                                // this.model.set("billingContact",previousBillingInfo);
                                var prefilledNumber = this.model.get("billingContact").get('phoneNumbers').get('home').split(' ');
                                if(prefilledNumber && prefilledNumber.length == 1) {
                                    this.model.get("billingContact").get("phoneNumbers").set("home",this.model.get("billingContact").get("phoneNumbers").get('dialingCode').concat(" ", this.model.get("billingContact").get("phoneNumbers").get('home')));
                                }
                                this.model.set('isBillingAddressSaved', true);
                                checkDisablePayment = false;
                            }
                            else {
                                this.model.get("billingContact").set('firstName',window.order.get('customer').get('firstName'));
                                this.model.get("billingContact").set('lastNameOrSurname',window.order.get('customer').get('lastName'));
                                var customerMobile = window.order.get('customer').get('attributes').toJSON().filter(function(item)  { return item.fullyQualifiedName == "Tenant~customer-registered-mobile";})
                             
                                if(customerMobile && customerMobile.length > 0) {
                                    customerMobile = customerMobile[0].values[0].split(' ')[1];
                                    this.model.get("billingContact").get('phoneNumbers').set('home', customerMobile);
                                }


                            }
                            
                        }
                        else {
                            this.model.get("billingContact").set('firstName',window.order.get('customer').get('firstName'));
                            this.model.get("billingContact").set('lastNameOrSurname',window.order.get('customer').get('lastName'));
                            var customerMobile = window.order.get('customer').get('attributes').toJSON().filter(function(item)  { return item.fullyQualifiedName == "Tenant~customer-registered-mobile";})
                         
                            if(customerMobile && customerMobile.length > 0) {
                                customerMobile = customerMobile[0].values[0].split(' ')[1];
                                this.model.get("billingContact").get('phoneNumbers').set('home', customerMobile);
                            }

                            
                        }
                    } else {                        
                        this.model.get("billingContact").set('email',$.cookie('guestUserEmail'));
                        
                    }
                    if(checkDisablePayment) {
                        setTimeout(function() {
                            $("#step-payment-info").find(".mz-formstep-body:eq(0)").hide();
                        }, 1200);
                    }
                }      
                this.model.get("billingContact").get('address').set('countryCode', Hypr.getThemeSetting('countrySpecificCode'));          
              
            }
            else if(window.order.get('requiresFulfillmentInfo')) {
                this.model.set('isBillingAddressSaved', false);
            }
        },
        validateFirstName: function(){
            
            if(!_.isEqual($('.mz-address-firstName').val(), "")){
               $('.first-name-image').addClass('active');
               $('.mz-address-firstName').addClass('add-input-border');
               $('.mz-address-firstName').removeClass("field-required");

            }
            else
            {
                $('.mz-address-firstName').removeClass('add-input-border');
                $('.first-name-image').removeClass('active');  
            }
        },
        validateLastName: function(){
            if(!_.isEqual($('.mz-address-lastName').val(), "")){
                $('.second-name-image').addClass('active');
                $('.mz-address-lastName').addClass('add-input-border');
                $('.mz-address-lastName').removeClass("field-required");

            }
            else
            {
                $('.mz-address-lastName').removeClass('add-input-border');
                $('.second-name-image').removeClass('active');  
            }
        },  
        validatePhoneNumber: function(){
            var mobileNumber = $('.mz-address-phoneNumber').val();
            if($('.mz-address-phoneNumber').val().length > MobileNumberChecker.getAllowedPhoneNumberLength() ) {
                mobileNumber = $('.mz-address-phoneNumber').val(MobileNumberChecker.requriedMobileNumberValueLength(mobileNumber));
                mobileNumber = $('.mz-address-phoneNumber').val();
                this.model.get('billingContact').get('phoneNumbers').set("home", mobileNumber);
            }
           
            mobileNumber = $('.mz-address-phoneNumber').val();
            if(!MobileNumberChecker.validateMobileNumberFormat(mobileNumber)) {
                $('.mz-address-phoneNumber').removeClass('add-input-border');
                $('.phone-number-image').removeClass('active'); 
                $('.mz-address-phoneNumber').addClass('is-invalid');
            }  
            else if(mobileNumber.length < MobileNumberChecker.getAllowedPhoneNumberLength()){
                $('.mz-address-phoneNumber').removeClass('add-input-border');
                $('.phone-number-image').removeClass('active'); 
                $('.mz-address-phoneNumber').addClass('is-invalid');
            }
            else if(!_.isEqual($('.mz-address-phoneNumber').val(), "")){
                $('.phone-number-image').addClass('active');
                $('.mz-address-phoneNumber').addClass('add-input-border');
                $('.mz-address-phoneNumber').removeClass("field-required");
                $('.mz-address-phoneNumber').removeClass('is-invalid');
            }           
            else
            {
                $('.mz-address-phoneNumber').removeClass('add-input-border');
                $('.phone-number-image').removeClass('active');  
                $('.mz-address-phoneNumber').addClass('is-invalid');
            }
        }, 
        validatePhoneNumberFormat: function (mobileNumber){
            var phoneFirstDigit = mobileNumber[0];
            if(Hypr.getThemeSetting('countrySpecificCode').toUpperCase() == "AE") {
              return phoneFirstDigit==5;
            }
            else if(Hypr.getThemeSetting('countrySpecificCode').toUpperCase() == "KW") {
                return phoneFirstDigit==5 || phoneFirstDigit==4 || phoneFirstDigit==6 || phoneFirstDigit==9;
            }
            else {
              return true;
            }
        },
        validateCity: function(e){
            var $el = $(e.currentTarget);
            var cityValue =  $el[0].innerText;
            if(!_.isEqual(cityValue, "")){
                $('.city-name-image').addClass('active');
                $el.addClass('add-input-border');
            }
            else
            {
                $el.removeClass('add-input-border');
                $('.city-name-image').removeClass('active');  
            }
        }, 
        validateCountry: function(e){
            var $el = $(e.currentTarget);
            var countryValue =  $el[0].innerText;
            if(!_.isEqual(countryValue, "")){
                $('.country-name-image').addClass('active');
                $el.addClass('add-input-border');
            }
            else
            {
                $el.removeClass('add-input-border');
                $('.country-name-image').removeClass('active');  
            }
          
        },
        validateState: function(event){
            var $el = $(event.currentTarget);
            var stateValue = event.target.value;
            if(!_.isEqual(stateValue, "")){
                $('.state-name-image').addClass('active');
                $el.addClass('add-input-border');
                $el.removeClass("field-required");
            }
            else
            {
                $el.removeClass('add-input-border');
                $('.state-name-image').removeClass('active');  
            }
        },
        onUpdateCountry: function(event){
            // update city on update country
            var currentValue = event.currentTarget.value;
            var selectedCountry = window.countryMapping.find(function(country){
                return country.countryCode == currentValue;
            });
            this.model.set("selectedAddressCity", selectedCountry);
            if(selectedCountry){
                $('#cityOrTown').empty();
                for (var i = 0; i < selectedCountry.cities.length; i++) {
                    var lookup = selectedCountry.cities[i];
                    $('#cityOrTown').append("<option value='" + lookup + "'>" + lookup + "</option>");
                }
            }
        },
        validateAdress: function(){
            if(!_.isEqual($('#address-line-1').val(), "")){
                $('.address-name-image').addClass('active');
                $('.mz-address-field').addClass('add-input-border');
                $('.mz-address-field').removeClass("field-required");
            }else{
                $('.mz-address-field').removeClass('add-input-border');
                $('.address-name-image').removeClass('active');  
            }
        }, 
        validateAdressArea: function(){
            if(!_.isEqual($('#address-line-2').val(), "")){
                $('.address-name-image-area').addClass('active');
                $('.mz-address-field-area').addClass('add-input-border');
                $('.mz-address-field-area').removeClass("field-required");
            }else{
                $('.mz-address-field-area').removeClass('add-input-border');
                $('.address-name-image-area').removeClass('active');  
            }
        }, 
        validateAdressStreet: function(){
            if(!_.isEqual($('#address-line-3').val(), "")){
                $('.address-name-image-street').addClass('active');
                $('.mz-address-field-street').addClass('add-input-border');
                $('.mz-address-field-street').removeClass("field-required");
            }else{
                $('.mz-address-field-street').removeClass('add-input-border');
                $('.address-name-image-street').removeClass('active');  
            }
        }, 
        validateAdressTypeHome: function(){
            var addressTypeValue = $('input[name="address-type"]:checked');
            if(addressTypeValue !== null){
                $('.address-type-image').addClass('active');
            }
        },
        validateAdressTypeOffice: function(){
            var addressTypeValue1 = $('input[name="address-type"]:checked');
            if(addressTypeValue1 !== null){
                //$('.address-type-image').addClass('active');
            }
        },
        validateComments: function(){
            if(!_.isEqual($('.mz-addressform-comments-field').val(), "")){
                $('.comments-image').addClass('active');
                $('.mz-addressform-comments-field').addClass('add-input-border');

            }
            else
            {
                $('.mz-addressform-comments-field').removeClass('add-input-border');
                $('.comments-image').removeClass('active');  
            }
        },
        renderOnChange: [
            'billingContact.address.countryCode',
            'isBillingAddressSaved'
         ],
         
         updateShippingCity : function() {
            var currentShippingCountryCode = $("#country.billing-country option").eq(0).attr("value");
            var selectedCountry = this.model.get("countries").find(function(country){
                     return country.countryCode == currentShippingCountryCode;
            });
            this.updateCities(selectedCountry);
        },
        updateCities : function(selectedCountry) {
            $('#cityOrTownBilling.billing-state').empty();
            setTimeout(function() { 
                for (var i = 0; i < selectedCountry.cities.length; i++) {
                         var lookup = selectedCountry.cities[i];
                         $('#cityOrTownBilling.billing-state').attr("data-mz-value",lookup);
                         if(i === 0 ) {
                             $('#cityOrTownBilling.billing-state').append("<option selected value='" + lookup + "'>" + lookup + "</option>");
                         }
                         else {
                             $('#cityOrTownBilling.billing-state').append("<option value='" + lookup + "'>" + lookup + "</option>");
                         }
                         
                    }
            } , 200);
        }

    })

    var ShippingInfoView = CheckoutStepView.extend({
        templateName: 'modules/checkout/step-shipping-method',
        renderOnChange: [
            'availableShippingMethods'
        ],
        additionalEvents: {
            "click .mz-confirm-delivery-btn": "updateShippingMethod",
            
        },
        initialize:function(){
            
            var shippingDayDuration = HyprLiveContext.locals.themeSettings.shippingDeliveryDuration,
                currentDate = new Date(),
                shippedBy = new Date(currentDate.setDate(currentDate.getDate() + parseInt(shippingDayDuration))), 
                fullWeekDay = shippedBy.toLocaleString('default', { weekday : 'long' }),
                fullMonth = shippedBy.toLocaleString('default', { month: 'long' }),
                shippedDate = (fullWeekDay).concat( ' ',shippedBy.getDate(), ' ', fullMonth);
                this.model.set("shippedDate", shippedDate);
            
            this.model.set('isEditShippingMethod', false);
            this.listenTo(this.model, 'change:isEditShippingMethod', this.render);
        },
        editShippingMethod:function(){
            this.model.set('isEditShippingMethod', true);
            $('.mz-checkoutform-shippingmethod').addClass('is-incomplete').removeClass('is-complete');
            // this.model.edit();
        },
        updateShippingMethod: function (e) {
            this.model.updateShippingMethod(this.$('[data-mz-shipping-method]:checked').val());
        }
    });

    var poCustomFields = function() {

        var fieldDefs = [];

        var isEnabled = HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder &&
            HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder.isEnabled;

            if (isEnabled) {
                var siteSettingsCustomFields = HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder.customFields;
                siteSettingsCustomFields.forEach(function(field) {
                    if (field.isEnabled) {
                        fieldDefs.push('purchaseOrder.pOCustomField-' + field.code);
                    }
                }, this);
            }

        return fieldDefs;
    };

    var visaCheckoutSettings = HyprLiveContext.locals.siteContext.checkoutSettings.visaCheckout;
    var pageContext = require.mozuData('pagecontext');
    var BillingInfoView = CheckoutStepView.extend({
        templateName: 'modules/checkout/step-payment-info',
        autoUpdate: [
            'savedPaymentMethodId',
            'paymentType',
            'card.paymentOrCardType',
            'card.cardNumberPartOrMask',
            'card.nameOnCard',
            'card.expireMonth',
            'card.expireYear',
            'card.cvv',
            'card.isCardInfoSaved',
            'check.nameOnCheck',
            'check.routingNumber',
            'check.checkNumber',
            'isSameBillingShippingAddress',
            'billingContact.firstName',
            'billingContact.lastNameOrSurname',
            'billingContact.address.address1',
            'billingContact.address.address2',
            'billingContact.address.address3',
            'billingContact.address.cityOrTown',
            'billingContact.address.countryCode',
            'billingContact.address.countryName',
            // 'billingContact.address.stateOrProvince',
            //'billingContact.address.postalOrZipCode',
            'billingContact.phoneNumbers.home',
           // 'billingContact.email',
            'creditAmountToApply',
            'digitalCreditCode',
            'purchaseOrder.purchaseOrderNumber',
            'purchaseOrder.paymentTerm',
            'giftCardNumber',
            'giftCardSecurityCode',
            'amountToPaid',
            'OTPNumber',
            'blueAccountMobileNumber',
            'dialingCode',
            'prepaidCardNumber',
            'prepaidCardPin'
        ].concat(poCustomFields()),
        renderOnChange: [
            'billingContact.address.countryCode',
            'paymentType',
            'isSameBillingShippingAddress',
            'usingSavedCard',
            'savedPaymentMethodId',
        ],
        additionalEvents: {
            "change [data-mz-digital-credit-enable]": "enableDigitalCredit",
            "change [data-mz-digital-credit-amount]": "applyDigitalCredit",
            "change [data-mz-gift-card-amount]": "applyGiftCard",
            "change [data-mz-gift-card-enable]": "enableGiftCard",
            "change [data-mz-digital-add-remainder-to-customer]": "addRemainderToCustomer",
            "change [name='paymentType']": "resetPaymentData",
            "change [data-mz-purchase-order-payment-term]": "updatePurchaseOrderPaymentTerm",
            "keyup [data-mz-card-number]":"checkCardNumber",
            "keyup .mz-card-expire-year":"setExpireYear",
            "click .saveCardView":"saveCardView",
            "click .addnewcard":"addNewCard",
            "change .mz-billingShippingAddressCheck":"hideSavedCardDetails",
            "change .saved-pyament-select":"hideCardForm",
            "change .mz-CashOnDeliveryInput:checked":"getCheckDetails",
            "keyup .card-cvv":"setExpireYearOnCVV",
            "keyup .card-cvv-saved":"checkCvvOnCard",
            "keyup .mz-cardholder-name":"validateCardName",
            "keyup .mz-card-expire-month":"validateExpireMonth",
            "input .billing-frst-name":"validateInputField",
            "input .billing-last-name":"validateInputField",
            "change .billing-city":"validateInputField",
            "input .billing-phone":"validateInputField",
            "change .billing-state":"validateInputField",
            "input .billing-street-address":"validateInputField",
            "input .billing-area-address":"validateInputField",
            "input .billing-street-input-address":"validateInputField",
            "click .mz-payment-blue-selector":"displayBlueModal",
            "click .mz-blue-wallet-image-container":"proceedToWallet",
            "click .mz-otp-submit":"submitOTP",
            "click .mz-blue-prepaid-image-container":"proceedToPrepaid",
            "click .mz-card-detail-submit":"submitCardDetail",
            "click .mz-useAnotherBlueAccountButton":"useAnotherBlueAccount",
            "click .mz-mobileNumberSubmit":"submitMobileNumber",
            "click .mz-otp-resend":"resendOTP",
            "click .mz-close-icon":"closeModal",
            "click .mz-open-arrow-icon":"backToBluePaymentMethods",
            "click .mz-payment-select-saved-payments":"cardClickfunct",
            "input .customValue":"customerValue",
            "click .edit-card-btn":"editCardDetails",
            "change .mz-countryCodeContainer":"onDialingCodeChange",
            "input .mz-card-pin-input":"handlePrepaidCardPin",
            "input .mz-card-number-input":"handlePrepaidCardNumber",
            "paste .mz-card-pin-input":"checkFreezCardPin",
            "input .mz-amount-deduct-input":"checkFreezCustomAmount",
            "keydown .mz-preventArrowKey":"preventArrowKeyInput",
            "click .mz-amount-deduct-submmit":'payAmountByBluePay',
            "input .mz-blue-otp-number-input":"handleOTPNumber",
            "input .mz-mobileNumberInput":"handleMobileNumber"
        },

        initialize: function () {
            // this.addPOCustomFieldAutoUpdate();
            this.model.set('hasPrepaidSelected',false);
            
            this.listenTo(this.model, 'change:giftCardNumber', this.onEnterGiftCardInfo, this);
            this.listenTo(this.model, 'change:giftCardSecurityCode', this.onEnterGiftCardInfo, this);
            this.listenTo(this.model, 'change:digitalCreditCode', this.onEnterDigitalCreditCode, this);
           
            this.listenTo(this.model, 'orderPayment', function (order, scope) {
                    this.render();
            }, this);
            this.listenTo(this.model, 'billingContactUpdate', function (order, scope) {
                    this.render();
            }, this);
            this.listenTo(this.model, 'change:savedPaymentMethodId', function (order, scope) {
                $('[data-mz-saved-cvv]').val('').change();
                this.render();
            }, this);
            this.codeEntered = !!this.model.get('digitalCreditCode');

            this.setInitialPaymentState();
            this.listenPaymentStateChange();
        },
        /**
         * @description - This Method Will Manage Initial Value Of All Custom States For All Payment Methods
         */
        setInitialPaymentState : function() {
            this.model.set('hasPaymentDone', false);
            this.model.set('agreeToTerms', true);
            this.model.set('isCheckPayment', false);
            this.model.set('isAuthError', false);

            //To Initialize  Blue Payment Custome State 
            BluePayAction.setInitialBluePaymentState.call(this, false, false);
            
            //To Initialize  Credit Card Payment Custome State
            this.setInitialCreditCardPaymentState();
        },
        listenPaymentStateChange : function() {

            //To Listen Only Those State Change Which Will be Changed During Blue Payment Process
            BluePayAction.listenBluePaymentStateChange.call(this);

            this.listenCreditCardPaymentStateChange();
        },
        /*************************** Blue Payment Functionality  Starts   *****************/
        
        displayBlueModal: function() { 
            GarbageHandler.session();
            if(Hypr.getThemeSetting('disableSplitPayment')) {
                if(this.model.activePayments().length) {
                    var activePayments = this.model.activePayments();
                    self = this;                
                    this.voidExistBluePaymentSetStatus()
                    .then(function() {
                        self.model.stepStatus('incomplete');
                        self.model.set('hasPaymentDone', false);
                        self.model.set('paymentType', "");
                        self.model.set("isCheckPayment", false);
                        self.model.set("isKNETPaymentType", false);
                        self.model.set("isCreditCardPayment", false);
                        self.model.set("isBenefitPayApply", false);
                        self.model.set("isQpayApply", false);
                        self.model.set('isOmanNetApply', false);
                        self.model.parent.initializeLoader('deactive', 'active');
                        
                    });
                }
                else {
                    this.model.set('hasPaymentDone', false);
                    this.model.set('paymentType', "");
                    this.model.set("isCheckPayment", false);
                    this.model.set("isKNETPaymentType", false);
                    this.model.set("isCreditCardPayment", false);
                    this.model.set("isBenefitPayApply", false);
                    this.model.set("isQpayApply", false);
                    this.model.set('isOmanNetApply', false);
                }
            }
            BluePayAction.displayBlueModal.call(this);
             
        },

        closeModal : function() { BluePayAction.closeModal.call(this); },

        backToBluePaymentMethods : function() { BluePayAction.backToBluePaymentMethods.call(this); },
        
        proceedToWallet : function() { BlueWalletAction.proceedToWallet.call(this, BluePayAction, BluePrepaidCardAction); },
        
        useAnotherBlueAccount : function() { BlueWalletAction.useAnotherBlueAccount.call(this); },

        handleMobileNumber : function(event) { BlueWalletAction.handleMobileNumber.call(this, event); },
        
        submitMobileNumber : function() { BlueWalletAction.submitMobileNumber.call(this); },

        handleOTPNumber : function(event) { BlueWalletAction.handleOTPNumber.call(this, event); },

        submitOTP : function() { BlueWalletAction.submitOTP.call(this); },

        resendOTP : function() { BlueWalletAction.resendOTP.call(this); },

        proceedToPrepaid:function() { BluePrepaidCardAction.proceedToPrepaid.call(this, BluePayAction); },

        handlePrepaidCardNumber : function(event) { BluePrepaidCardAction.handlePrepaidCardNumber.call(this, event); },

        handlePrepaidCardPin : function(event) { BluePrepaidCardAction.handlePrepaidCardPin.call(this, event); },

        checkFreezCardPin : function(event) { BluePrepaidCardAction.checkFreezCardPin(event); },

        submitCardDetail : function() { BluePrepaidCardAction.submitCardDetail.call(this); },
        

        customerValue: function (event) {  BluePayAction.customerValue.call(this, event); },

        checkFreezCustomAmount : function(event) { BluePayAction.checkFreezCustomAmount(event); },

        preventArrowKeyInput : function(event) { BluePayAction.preventArrowKeyInput.call(this, event); },
        
        payAmountByBluePay : function() {
            if(Hypr.getThemeSetting('disableSplitPayment')) {
                if(this.model.get('amountToPaid') < window.order.get('amountRemainingForPayment')) {
                    $(".mz-amountDeductLabelError").show();                    
                    return false;
                }
                else {
                    $(".mz-amountDeductLabelError").hide();
                    BluePayAction.setCaptureAmountByBluePay.call(this);

                    BluePay.init(this.model.get('tokenID'));
                }
            }
            else {
                BluePayAction.setCaptureAmountByBluePay.call(this);

                BluePay.init(this.model.get('tokenID'));
            }
        },
        
        /*************************** Blue Payment Functionality  Ends   *****************/

        /*************************** Credit Card Functionality Starts  *****************/
        setInitialCreditCardPaymentState : function() {
            this.model.set('displayNewCardForm', this.model.savedPaymentMethods() ? false : true);
        },
        listenCreditCardPaymentStateChange : function() {
                this.listenTo(this.model, 'change:displayNewCardForm', this.render);
        },
        editCardDetails:function(){
                 $('.change-payment-div').removeClass('hidden');
                 $('.edit-card-btn').addClass('hidden');
                 $('.current-payment-data').addClass('hidden');
                 $('.mz-payment-new-card-add').removeClass('hidden');
        },
        cardClickfunct:function(){
            $('.change-payment-div').removeClass('hidden');
            this.model.set('showNewAddress',false);
        },
        saveCardView:function(){
            this.model.set('showSavedCardForm',true);
            this.model.set('displayNewCardForm', false);
            $('.saved-cvv-validation-msg').text('');
            $('.card-cvv-saved').text('');
            $(".checkout-payment-saved-cards").removeClass("hidden");
            $(".checkout-payment-saved-cards-extra").removeClass("hidden");
            $(".mz-payment-new-card-add").addClass('hidden');
            $(".mz-payment-new-card-add-extra").addClass('hidden');
            $('.saved-pyament-select option:first').prop('selected',true).trigger( "change" );

        },
        addNewCard:function(){
          // this.model.unset('card');
           var modelData = this.model;
           this.model.set('isSameBillingShippingAddress',true);
           modelData.set('showNewAddress',true);
           modelData.set('usingSavedCard',false);
           this.cardFormReset();
           var card = this.model.get('card');
         
           card.unset('nameOnCard');
           card.unset('cardNumber');
           card.unset('cardNumberPart');
           card.unset('cardType');
           card.unset('id'); 
           card.clear();
           card.set('isSavedCard',false);
           modelData.set('showSavedCardForm',false);
           this.model.set('displayNewCardForm', true);
           setTimeout(function(){
            $(".checkout-payment-saved-cards").addClass("hidden");
            $(".checkout-payment-saved-cards-extra").addClass("hidden");
            $(".mz-payment-new-card-add").removeClass('hidden');
            $(".mz-payment-new-card-add-extra").removeClass('hidden');
            $('.current-payment-data').addClass('hidden');
            $('.card-edit').addClass('hidden');
           },180); 
        },
        /**
         * Below Implemented code hide the Existing Card Details And New Add Card Button
         * When User Check/Uncheck Billing/Shipping Address Checkbox In Billing Address Form
         * 
         * If We Remove Below Code Then 
         * When User Will Check/Uncheck Billing/Shipping Address Checkbox In Billing Address Form
         * Then the Existing Card Details And New Add Card Button And CVV Textbox will appear
         * Along With New Card Form
         */
        hideSavedCardDetails : function(e) {
            var me = this;
            var card =this.model.get('card');
            me.model.set('showSavedCardForm',false);
            var checkboxVal = e.target.checked;
            setTimeout(function() {
                $(".checkout-payment-saved-cards").addClass("hidden");
                $(".mz-payment-new-card-add").removeClass("hidden"); 
                $('.current-payment-data').addClass('hidden'); 
                $('.card-edit').addClass('hidden');
                if(!checkboxVal){
                    var flag = false;
                    if($(".mz-checkout-saved-card").length > 0) {
                        if($(".mz-checkout-saved-card").closest(".mz-formstep-summary").css("display") == "block") {
                            $(".mz-checkout-saved-card .mz-payment-new-card-add .billing-address-container .billing-input").each(function () {
                                if ($(this).val() === "" && $(this).attr("name") !== "postal-town") {
                                    flag = true;
                                    return false;
                                }
                            });
                        }   
                        else{
                            $(".mz-checkoutform-paymentinfo .mz-formstep-fields .mz-payment-new-card-add .billing-address-container .billing-input").each(function () {
                                if ($(this).val() === "" && $(this).attr("name") !== "postal-town") {
                                    flag = true;
                                    return false;
                                }
                            });
                        }                     
                    }
                    else {
                        $(".mz-checkoutform-paymentinfo .mz-formstep-fields .mz-payment-new-card-add .billing-address-container .billing-input").each(function () {
                            if ($(this).val() === "" && $(this).attr("name") !== "postal-town") {
                                flag = true;
                                return false;
                            }
                        });
                    }                    
                    $(".save-card-details-btn").prop("disabled", flag);
                }

            },250);
            $('.billing-input').val('');
            this.model.unset('billingContact.address');
            if(!checkboxVal) {
                this.model.set("billingContact.address.addressType","Residential");
                this.model.set("billingContact.address.countryCode","AE");
            }
            
        },
        /**
         * Below Implemented code hide the Card Form 
         * When User Select The Existing Card From The Crads Dropdown
         * 
         * If We Remove Below Code Then 
         * When User Will Select The Existing Card From The Crads Dropdown
         * Then Card Form Will Pop With The Selected Card Details
         */
        hideCardForm :  function(e) {
            setTimeout(function(){ $(".mz-payment-new-card-add").addClass("hidden");},350);
            var $qField = $(e.currentTarget);
            if($qField.val() === "noCard"){
                this.model.unset('card');
                $(".mz-payment-new-card-add").addClass("hidden");
            }
            $('.change-payment-div').removeClass('hidden');
            this.model.set('showNewAddress',false);
        },
        cardFormReset : function() {
            $(".mz-payment-new-card-add input").val("");
        },
        resetPaymentData: function (e) {
           // this.beginEditingCard();
           GarbageHandler.session();
            switch (e.target.value) {
                case "Check":
                    window.order.set("isCOD",true);
                    this.model.set("isCOD",true);
                    this.model.set('isCheckPayment',true);
                    this.model.next();
                    break;
                default:
                    window.order.set("isCOD",false);
                    this.model.set('isCheckPayment',false);
            }
            if($(e.currentTarget).hasClass("mz-credit-card-payment-type")) {
                if(window.order.get("customer").get("cards").length) {
                    setTimeout(function() {
                        $(".mz-payment-new-card-add").addClass('hidden');
                    },300);
                }
            }
            if(e.target.value === "CreditCard"){
                $('.card-payment-main-container').removeClass('hidden');
                this.model.set('usingSavedCard',true);

                if(this.model.activePayments().length && !e.target.dataset.mzCardtype) {
                    self = this;
                    // EpgPaymentHandler.initiateLoader.call(window.order);
                    this.voidExistPaymentSetStatus()
                    .then(function() {
                        self.model.stepStatus('incomplete');
                        self.model.parent.initializeLoader('deactive', 'active');
                    });
                }
                /*if (e.target.value === "OmanNet") {
                    var self = this;
                    this.model.set('disablePaymentOption', true);
                    this.model.set('isOmanNetApply', true);  // ✅ Set OmanNet flag
                    this.model.set('isKNETPaymentType', false);
                    this.model.set('isApplePayPaymentType', false);
                    this.model.set('isBenefitPayApply', false);
                    this.model.set('isCreditCardPayment', false); // ✅ Not credit card
                    this.model.set('usingSavedCard', false);
                    this.model.set('displayNewCardForm', false);
                
                    // Optional: Clear out existing card info if needed
                    this.model.get('card').clear();
                
                    this.voidExistPaymentSetStatus().then(function () {
                        self.model.next();
                    });
                
                    return; // ✅ Prevent further logic from treating it like a credit card
                }*/
                
            }else if(e.target.value === "Check"){
                //this.model.unset('activePayments');
                this.model.set('disablePaymentOption', true);
                this.model.set('showNewAddress',false);
                this.model.unset('card');
                $('.edit-card-btn').addClass('hidden');
                $('.cod-payment-type').prop('checked');
                $('.card-payment-main-container').addClass('hidden');
            }
            this.model.set('paymentType',e.target.value);
            this.model.set('showNewAddress',false);
            const inSufficientBlueBalance=this.model.get('inSufficientBlueBalance');
            const currentBlueBalanceAmount=this.model.get('currentBlueBalanceAmount');
            if(window.order.get('requiresFulfillmentInfo')) {
                this.model.clear();
            }
            else {
                const updateBillingContact = this.model.get('billingContact').toJSON();
                const isBillingAddressSaved = this.model.get('isBillingAddressSaved');
                this.model.clear();
                this.model.set('billingContact',updateBillingContact);           
                this.model.set('isBillingAddressSaved', isBillingAddressSaved);
            }
            if(Hypr.getThemeSetting('disableSplitPayment') ){
                this.model.set('inSufficientBlueBalance',inSufficientBlueBalance);
                this.model.set('currentBlueBalanceAmount',currentBlueBalanceAmount);
           }
            if(e.target.value === "CreditCard" && e.target.dataset.mzCardtype ==="KNET" ) {
                var self = this;
                this.model.set('disablePaymentOption', true);
                this.model.set('isKNETPaymentType', true); 
                this.model.set('isApplePayPaymentType', false); 
                this.model.set('isBenefitPayApply', false);
                this.model.set('isQpayApply', false);
                this.model.set('isOmanNetApply', false); // ✅ Not OmanNet
                this.model.set('isCreditCardPayment', false);
                this.model.set('usingSavedCard',true);
                 sessionStorage.setItem('isKNETPaymentType', true); 
                //EpgPaymentHandler.initiateLoader.call(window.order);
                this.voidExistPaymentSetStatus()
                .then(function() {
                    self.model.next();
                });
            }
            if(e.target.value === "CreditCard" && e.target.dataset.mzCardtype === 'ApplePay' ) {
                var self = this;
                this.model.set('disablePaymentOption', true);
                this.model.set('isApplePayPaymentType', true); 
                this.model.set('isKNETPaymentType', false);
                this.model.set('isBenefitPayApply', false); 
                this.model.set('isQpayApply', false);
                this.model.set('isOmanNetApply', false); // ✅ Not OmanNet 
                this.model.set('isCreditCardPayment', false);
                this.model.set('usingSavedCard',true);
                 sessionStorage.setItem('isApplePayPaymentType', true); 
                // EpgPaymentHandler.initiateLoader.call(window.order);
                this.voidExistPaymentSetStatus()
                .then(function() {
                    self.model.next();
                });
                
            }
            if (e.target.value === "CreditCard" && e.target.dataset.mzCardtype === 'BenefitPay') {
                var self = this;
                this.model.set('disablePaymentOption', true);
                this.model.set('isBenefitPayApply', true); 
                this.model.set('isKNETPaymentType', false); 
                this.model.set('isApplePayPaymentType', false); 
                this.model.set('isCreditCardPayment', false);
                this.model.set('usingSavedCard', false);
              //  this.model.set('displayNewCardForm', false);
                sessionStorage.setItem('isBenefitPayApply', true);            
                this.voidExistPaymentSetStatus()
                    .then(function () {
                        self.model.next();
                    });
            }
            if (e.target.value === "CreditCard" && e.target.dataset.mzCardtype === 'Qpay') {
                var self = this;
                this.model.set('disablePaymentOption', true);
                this.model.set('isQpayApply', true); 
                this.model.set('isBenefitPayApply', false); 
                this.model.set('isOmanNetApply', false);
                this.model.set('isKNETPaymentType', false);
                this.model.set('isApplePayPaymentType', false); 
                this.model.set('isCreditCardPayment', false);
                this.model.set('usingSavedCard', false);
                //  this.model.set('displayNewCardForm', false);
                sessionStorage.setItem('isQpayApply', true);
            }
            if (e.target.value === "CreditCard" && e.target.dataset.mzCardtype === 'OmanNet') {
                var self = this;
                this.model.set('disablePaymentOption', true);
                this.model.set('isBenefitPayApply', false); 
                this.model.set('isQpayApply', false);
                this.model.set('isOmanNetApply', true); // ✅ Not OmanNet
                this.model.set('isKNETPaymentType', false); 
                this.model.set('isApplePayPaymentType', false); 
                this.model.set('isCreditCardPayment', false);
                this.model.set('usingSavedCard', false);
              //  this.model.set('displayNewCardForm', false);
                sessionStorage.setItem('isOmanNetApply', true);

            
               this.voidExistPaymentSetStatus().then(function () {
                self.model.next();
            });
        
            return;
            }
            
            
            if(HyprLiveContext.locals.siteContext.checkoutSettings.purchaseOrder.isEnabled) {
                this.model.resetPOInfo();
            }
        },
        checkCvvOnCard:function(e){
            var card = this.model.get('card');
            var cvv=e.target.value;
            var numbers = /^[0-9]+$/;
            var cardType = card.get('cardType');
            var me = this;
            if(cvv ===''){
                this.$el.find('.card-cvv-saved').addClass('is-invalid');
                this.$el.find('.card-cvv-saved').removeClass('is-valid'); 
             }else if(!cvv.match(numbers)){
                this.$el.find('.card-cvv-saved').addClass('is-invalid');
                this.$el.find('.card-cvv-saved').removeClass('is-valid'); 
                this.$el.find('.saved-cvv-validation-msg').text(Hypr.getLabel('invalidCvvMessage'));
             }else if(cvv.toString().length <3 || cvv.toString().length >4 ){
                this.$el.find('.card-cvv-saved').addClass('is-invalid');
                this.$el.find('.card-cvv-saved').removeClass('is-valid'); 
                this.$el.find('.saved-cvv-validation-msg').text(Hypr.getLabel('invalidCvvMessage'));
             }
             else if(cvv.match(numbers) && cvv.toString().length == 3 && cardType != "AMEX")
             {
                this.$el.find('.saved-cvv-validation-msg').text('');
                this.$el.find('.card-cvv-saved').addClass('is-valid');
                this.$el.find('.card-cvv-saved').removeClass('is-invalid'); 
                card.set('cvv',cvv);
                card.set('isCardInfoSaved',true);
                me.model.next();
             }else if(cvv.match(numbers) && cvv.toString().length == 4 && cardType == "AMEX"){
                this.$el.find('.saved-cvv-validation-msg').text('');
                this.$el.find('.card-cvv-saved').addClass('is-valid');
                this.$el.find('.card-cvv-saved').removeClass('is-invalid'); 
                card.set('cvv',cvv); 
                card.set('isCardInfoSaved',true);
                me.model.next();
             }
        },
        setExpireYearOnCVV:function(e){
            var card = this.model.get('card');
            var cvv=e.target.value;
            var numbers = /^[0-9]+$/;
            if(cvv === ''){
                this.$el.find('.card-cvv').addClass('is-invalid');
                this.$el.find('.card-cvv').removeClass('is-valid');  
             }else if(!cvv.match(numbers)){
                this.$el.find('.card-cvv').removeClass('is-valid');
                this.$el.find('.card-cvv').addClass('is-invalid');  
                this.$el.find('.cvv-validation-msg').text(Hypr.getLabel('invalidCvvMessage'));
             }
             else
             {
                this.$el.find('.cvv-validation-msg').text('');
                this.$el.find('.card-cvv').addClass('is-valid');
                this.$el.find('.card-cvv').removeClass('is-invalid');  
             }
            var NewExpireYear = this.concatenate(20,card.get('expireYear'));
            if(NewExpireYear.toString().length === 4){
                card.set('expireYear', NewExpireYear);
            }
          
        },
        concatenate:function(a, b, base) {
            if(typeof base == 'undefined') {
                base = 10;
            }
            return a * Math.pow(base, Math.floor(Math.log(b) / Math.log(base)) + 1) + b;
        },
        validateExpireMonth:function(e){
            var expireMonth=e.target.value;
            if(expireMonth=== ""){
                this.$el.find('.mz-card-expire-month').addClass('is-invalid');
                this.$el.find('.mz-card-expire-month').removeClass('is-valid');  
             }else if(expireMonth.toString().length!=2){
                this.$el.find('.mz-card-expire-month').addClass('is-invalid');
                this.$el.find('.mz-card-expire-month').removeClass('is-valid');  
                if(expireMonth.toString().length>2){
                    this.$el.find('.mz-card-expire-month').val('');
                }
             }else if(expireMonth>12){
                this.$el.find('.mz-card-expire-month').addClass('is-invalid');
                this.$el.find('.mz-card-expire-month').removeClass('is-valid');  
                this.$el.find('.mz-card-expire-month').val('');
             }
             else
             {
                this.$el.find('.mz-card-expire-month').addClass('is-valid');
                this.$el.find('.mz-card-expire-month').removeClass('is-invalid');  
             }
        },
        setExpireYear:function(e){
            var card = this.model.get('card');
            if(e.target.value.toString().length != 2){
                $('.mz-card-expire-year').removeClass('is-valid');
                $('.mz-card-expire-year').addClass('is-invalid');
                if (e.target.value.toString().length > 2){
                    this.$el.find('.mz-card-expire-year').val('');
                    $('.expire-date-validation').text(Hypr.getLabel('cardExpYearValid'));
                }
              
            }else if (e.target.value.toString().length === 2 ){
                $('.mz-card-expire-year').addClass('is-valid');
                $('.mz-card-expire-year').removeClass('is-invalid');
                $('.expire-date-validation').text('');
            }
        },
        validateCardName:function(e){
            var cardName=e.target.value;
            if(!_.isEqual(cardName, "")){
                this.$el.find('.mz-cardholder-name').addClass('is-valid');
                this.$el.find('.mz-cardholder-name').removeClass('is-invalid');  
                $('.mz-payment-credit-card-number-row').css('margin-top','20px');
                $('.card-name-validation').text('');
             }
             else
             {
                this.$el.find('.mz-cardholder-name').addClass('is-invalid');
                this.$el.find('.mz-cardholder-name').removeClass('is-valid');  
                $('.card-name-validation').text(Hypr.getLabel('cardNameMissing'));
                $('.mz-payment-credit-card-number-row').css('margin-top','36px');
             }
        },
        cc_format:function(value) {
            var v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            var matches = v.match(/\d{4,20}/g);
            var match = matches && matches[0] || '';
            var parts = [];
            var cardNumber = '';
            for (var i=0, len=match.length; i<len; i+=4) {
                parts.push(match.substring(i, i+4));
            }
        
            if (parts.length) {
              
               $('[data-mz-card-number]').val(parts.join(' '));
               cardNumber = parts.join(' ');
               cardNumber = cardNumber.split(" ").join("");
               this.validateCardNumber(parseInt(cardNumber));
            } else {
             
                $('[data-mz-card-number]').val(value);
                cardNumber = value;
                cardNumber = cardNumber.split(" ").join("");
                this.validateCardNumber(parseInt(cardNumber));
            }
        },
        validateCardNumber:function(cardNumber){
         var amex = new RegExp('^3[47][0-9]{13}$');
         var visa = new RegExp('^4[0-9]{12}(?:[0-9]{3})?$');
         var mastercard = new RegExp('^5[1-5][0-9]{14}$');
         var mastercard2 = new RegExp('^2[2-7][0-9]{14}$');
         var jcb = /^(?:(?:2131|1800|35\d{3})\d{11})$/;
         var cardType='';

         var card = this.model.get('card');
        
         if(_.isEqual(cardNumber, "")){
             $('[data-mz-card-number]').addClass('is-invalid');
             $('[data-mz-card-number]').removeClass('is-valid');  
            
          }
          else if(cardNumber.toString().length<12)
          {
             $('[data-mz-card-number]').addClass('is-invalid');
             $('[data-mz-card-number]').removeClass('is-valid');  
             $('.card-number-validation').text(Hypr.getLabel('cardValidation'));
          }else{
             $('[data-mz-card-number]').addClass('is-valid');
             $('[data-mz-card-number]').removeClass('is-invalid');  
             $('.card-number-validation').text('');
          }

         if (visa.test(cardNumber)) {
             this.$el.find('.visa').removeClass('hidden');
             this.$el.find('.card').addClass('hidden');
             this.$el.find('.mastercard').addClass('hidden');
             this.$el.find('.amex').addClass('hidden');
             this.$el.find('.cc').addClass('hidden');
             this.$el.find('.jcb').addClass('hidden');
             this.$el.find('[data-mz-card-type]').val('VISA');
             $('[data-mz-card-number]').addClass('is-valid');
             $('[data-mz-card-number]').removeClass('is-invalid');  
             $('.card-number-validation').text('');
             cardType='VISA';
           }else if (amex.test(cardNumber)) {
             this.$el.find('.visa').addClass('hidden');
             this.$el.find('.card').addClass('hidden');
             this.$el.find('.mastercard').addClass('hidden');
             this.$el.find('.amex').removeClass('hidden');
             this.$el.find('.cc').addClass('hidden');
             this.$el.find('.jcb').addClass('hidden');
             this.$el.find('[data-mz-card-type]').val('AMEX');
             $('[data-mz-card-number]').addClass('is-valid');
             $('[data-mz-card-number]').removeClass('is-invalid');  
             $('.card-number-validation').text('');
             cardType='AMEX';
           }else if (mastercard.test(cardNumber) || mastercard2.test(cardNumber)) {
             this.$el.find('.visa').addClass('hidden');
             this.$el.find('.card').addClass('hidden');
             this.$el.find('.mastercard').removeClass('hidden');
             this.$el.find('.amex').addClass('hidden');
             this.$el.find('.cc').addClass('hidden');
             this.$el.find('.jcb').addClass('hidden');
             this.$el.find('[data-mz-card-type]').val('MC');
             $('[data-mz-card-number]').addClass('is-valid');
             $('[data-mz-card-number]').removeClass('is-invalid');  
             $('.card-number-validation').text('');
             cardType='MC';
           }else if(jcb.test(cardNumber)){
             this.$el.find('.cc').addClass('hidden');
             this.$el.find('.visa').addClass('hidden');
             this.$el.find('.card').addClass('hidden');
             this.$el.find('.mastercard').addClass('hidden');
             this.$el.find('.amex').addClass('hidden');
             this.$el.find('.jcb').removeClass('hidden');
             this.$el.find('[data-mz-card-type]').val('JCB');
             $('[data-mz-card-number]').addClass('is-valid');
             $('[data-mz-card-number]').removeClass('is-invalid');  
             $('.card-number-validation').text('');
             cardType='JCB';
           }else{
             this.$el.find('.cc').addClass('hidden');
             this.$el.find('.visa').addClass('hidden');
             this.$el.find('.card').removeClass('hidden');
             this.$el.find('.mastercard').addClass('hidden');
             this.$el.find('.amex').addClass('hidden');
             this.$el.find('.jcb').addClass('hidden');
             this.$el.find('[data-mz-card-type]').val('');
             $('[data-mz-card-number]').addClass('is-invalid');
             $('[data-mz-card-number]').removeClass('is-valid');  
             $('.card-number-validation').text(Hypr.getLabel('cardValidationMsg'));
             cardType='';
             card.set('cardNumber','');
             card.set('cardNumberPart','');
             card.set('cardNumberPartOrMask','');
           }
         //  this.$el.find('.cc').removeClass('hidden');
           card.set('paymentOrCardType',cardType);
        },
        checkCardNumber:function(e){
            var cardNumber=e.target.value;
              this.cc_format(cardNumber);
        },
        updatePurchaseOrderPaymentTerm: function(e) {
            this.model.setPurchaseOrderPaymentTerm(e.target.value);
        },
        validateInputField : function(event) {
            
            $(event.target)
            .addClass(event.target.value.length > 0 ? 'is-valid' : 'is-invalid')
            .removeClass(event.target.value.length === 0 ? 'is-valid' : 'is-invalid');


            if($(event.target).hasClass('billing-phone')) MobileNumberChecker.requriedMobileNumberLength(event);

            this.validateAdressInputField();
        },
        validateAdressInputField: function(){           
            var flag = false;
            if($(".mz-checkout-saved-card").length > 0) {
                if($(".mz-checkout-saved-card").closest(".mz-formstep-summary").css("display") == "block") {
                    $(".mz-checkout-saved-card .mz-payment-new-card-add .billing-address-container .billing-input").each(function () {
                        if ($(this).val() === "" && $(this).attr("name") !== "postal-town") {
                            flag = true;
                            return false;
                        }
                    });
                }   
                else{
                    $(".mz-checkoutform-paymentinfo .mz-formstep-fields .mz-payment-new-card-add .billing-address-container .billing-input").each(function () {
                        if ($(this).val() === "" && $(this).attr("name") !== "postal-town") {
                            flag = true;
                            return false;
                        }
                    });
                }                     
            }
            else {
                $(".mz-checkoutform-paymentinfo .mz-formstep-fields .mz-payment-new-card-add .billing-address-container .billing-input").each(function () {
                    if ($(this).val() === "" && $(this).attr("name") !== "postal-town") {
                        flag = true;
                        return false;
                    }
                });
            } 
            $(".save-card-details-btn").prop("disabled", flag);
        },
        render: function() {

            preserveElements(this, ['.v-button', '.p-button','#amazonButtonPaymentSection', '.apple-pay-button'], function() {
                CheckoutStepView.prototype.render.apply(this, arguments);
            });

            if ($("#AmazonPayButton").length > 0 && $("#amazonButtonPaymentSection").length > 0)
                $("#AmazonPayButton").removeAttr("style").appendTo("#amazonButtonPaymentSection");

            if (visaCheckoutSettings.isEnabled && !this.visaCheckoutInitialized && this.$('.v-button').length > 0) {
                window.onVisaCheckoutReady = _.bind(this.initVisaCheckout, this);
                require([pageContext.visaCheckoutJavaScriptSdkUrl]);
                this.visaCheckoutInitialized = true;
            }
            
            if(this.model.get('card').get('paymentServiceCardId')){
                this.model.set('showNewAddress',false); 
            }
            if(this.model.get('activePayments')){
                this.model.set('showNewAddress',false);
            }
            if($('.multipayment-view').length > 1){
                $('.multipayment-view').eq(0).hide();
            }
            if (this.$(".apple-pay-button").length > 0)
                ApplePay.init();

            if (this.$(".p-button").length > 0)
                PayPal.loadScript();
            
            this.checkUpdateBluePaymentData();

            this.updateCODPaymentData();

            this.disableSubmitButtonElements();

            this.setAuthError();

        },
        checkUpdateBluePaymentData : function() {
            var orderSummaryModel = window.checkoutViews.orderSummary.model;
            
            if(orderSummaryModel.get("blueWallet") > 0){
                if(this.model.get('isCheckPayment')) {
                    this.model.unset('blueWalletDeductAmount');
                    orderSummaryModel.unset('blueWallet');
                    return;
                 }
                 this.model.set('blueWalletDeductAmount', orderSummaryModel.get("blueWallet"));
            } 
            
            if(orderSummaryModel.get("bluePrepaidCard") > 0) {
                 if(this.model.get('isCheckPayment')) {
                    this.model.unset('bluePrepaidCardDeductAmount');
                    orderSummaryModel.unset('bluePrepaidCard');
                    return;
                 }
                 this.model.set('bluePrepaidCardDeductAmount', orderSummaryModel.get("bluePrepaidCard"));
            }
            
        },
        disableSubmitButtonElements : function() {
            if(this.model.get('isAnotherBlueAccount') && !this.model.get('blueAccountMobileNumber')) 
                document.getElementById('mz-submitMobileNumber')?document.getElementById('mz-submitMobileNumber').disabled = true : '';
            
            if(this.model.get('displayBluePrepaidForm') && this.model.get('prepaidCardNumber').length === 0)
                document.getElementById('mz-submitMobileNumber') ? document.getElementById('mz-submitPrepaidCardDetails').disabled = true : '';
        },
        updateCODPaymentData: function() {
            if(this.model.get('isCheckPayment') && this.model.get('paymentType').toLowerCase() == "check") 
                this.model.set('hasPaymentDone', true);
        },
        setAuthError: function() {
           if(sessionStorage.getItem('isAuthError')){
                this.model.parent.reThrowAuthError();
           }else{
               const errorDiv = document.getElementsByClassName("mz-errors");
               if(errorDiv && errorDiv[0]) if(errorDiv[0].textContent.includes('payment')) errorDiv[0].remove();
           }
        },
        // updateAcceptsMarketing: function(e) {
        //     this.model.getOrder().set('acceptsMarketing', $(e.currentTarget).prop('checked'));
        // },
        updatePaymentType: function(e) {
            var newType = $(e.currentTarget).val();
            this.model.set('usingSavedCard', e.currentTarget.hasAttribute('data-mz-saved-credit-card'));
            this.model.set('paymentType', newType);
        },
        beginEditingCard: function() {
            var me = this;
            if (!this.model.isExternalCheckoutFlowComplete()) {
                this.editing.savedCard = true;
                this.render();
            } else {
                this.cancelExternalCheckout();
            }
        },
        beginAddNewCard: function(){
            var me = this;
            if (!this.model.isExternalCheckoutFlowComplete()) {
                this.editing.newCard = true;
                this.render();
            } else {
                this.cancelExternalCheckout();
            }
        },
        beginEditingExternalPayment: function () {
            var me = this;
            if (this.model.isExternalCheckoutFlowComplete()) {
                this.doModelAction('cancelExternalCheckout').then(function () {
                    me.editing.savedCard = true;
                    me.render();
                });
            }
        },
        beginEditingBillingAddress: function() {
            this.editing.savedBillingAddress = true;
            this.render();
        },
        beginApplyCredit: function () {
            this.model.beginApplyCredit();
            this.render();
        },
        cancelApplyCredit: function () {
            this.model.closeApplyCredit();
            this.render();
        },
        cancelExternalCheckout: function () {
            var me = this;
            this.doModelAction('cancelExternalCheckout').then(function () {
                me.editing.savedCard = false;
                me.editing.newCard = false;
                me.render();
            });
        },
        finishApplyCredit: function () {
            var self = this;
            this.model.finishApplyCredit().then(function() {
                self.render();
            });
        },
        removeCredit: function (e) {
            var self = this,
                id = $(e.currentTarget).data('mzCreditId');
            this.model.removeCredit(id).then(function () {
                self.render();
            });
        },
        getDigitalCredit: function (e) {
            var self = this;
            this.$el.addClass('is-loading');
            this.model.getDigitalCredit().ensure(function () {
                self.$el.removeClass('is-loading');
            });
        },
        getGatewayGiftCard: function (e) {
            var self = this;
            this.$el.addClass('is-loading');
            this.model.getGatewayGiftCard().ensure(function() {
                 self.$el.removeClass('is-loading');
             });
        },
        stripNonNumericAndParseFloat: function (val) {
            if (!val) return 0;
            var result = parseFloat(val.replace(/[^\d\.]/g, ''));
            return isNaN(result) ? 0 : result;
        },
        applyDigitalCredit: function(e) {
            var val = $(e.currentTarget).prop('value'),
                creditCode = $(e.currentTarget).attr('data-mz-credit-code-target');  //target
            if (!creditCode) {
                //window.console.log('checkout.applyDigitalCredit could not find target.');
                return;
            }
            var amtToApply = this.stripNonNumericAndParseFloat(val);

            this.model.applyDigitalCredit(creditCode, amtToApply, true);
            this.render();
        },
        applyGiftCard: function(e) {
            var self = this,
                val = $(e.currentTarget).prop('value'),
                giftCardId = $(e.currentTarget).attr('data-mz-gift-card-target');
            if (!giftCardId) {
              return;
            }
            var amtToApply = this.stripNonNumericAndParseFloat(val);
            this.$el.addClass('is-loading');
            return this.model.applyGiftCard(giftCardId, amtToApply, true).then(function(){
                self.$el.removeClass('is-loading');
                this.render();
            }, function(error){
                self.$el.removeClass('is-loading');
            });
        },
        onEnterGiftCardInfo: function(model) {
            if (model.get('giftCardNumber') && model.get('giftCardSecurityCode')){
              this.$el.find('input#gift-card-security-code').siblings('button').prop('disabled', false);
            } else {
              this.$el.find('input#gift-card-security-code').siblings('button').prop('disabled', true);
            }
          },
        onEnterDigitalCreditCode: function(model, code) {
            if (code && !this.codeEntered) {
                this.codeEntered = true;
                this.$el.find('input#digital-credit-code').siblings('button').prop('disabled', false);
            }
            if (!code && this.codeEntered) {
                this.codeEntered = false;
                this.$el.find('input#digital-credit-code').siblings('button').prop('disabled', true);
            }
        },
        enableDigitalCredit: function(e) {
            var creditCode = $(e.currentTarget).attr('data-mz-credit-code-source'),
                isEnabled = $(e.currentTarget).prop('checked') === true,
                targetCreditAmtEl = this.$el.find("input[data-mz-credit-code-target='" + creditCode + "']"),
                me = this;

            if (isEnabled) {
                targetCreditAmtEl.prop('disabled', false);
                me.model.applyDigitalCredit(creditCode, null, true);
            } else {
                targetCreditAmtEl.prop('disabled', true);
                me.model.applyDigitalCredit(creditCode, 0, false);
                me.render();
            }
        },
        enableGiftCard: function(e){
            var isEnabled = $(e.currentTarget).prop('checked') === true,
                giftCardId = $(e.currentTarget).attr('data-mz-payment-id'),
                targetAmtEl = this.$el.find("input[data-mz-gift-card-target='" + giftCardId + "']"),
                me = this;

            if (isEnabled) {
              targetAmtEl.prop('disabled', false);
              me.model.applyGiftCard(giftCardId, null, true);
            } else {
              targetAmtEl.prop('disabled', true);
              me.model.applyGiftCard(giftCardId, 0, false);
            }
        },
        addRemainderToCustomer: function (e) {
            var creditCode = $(e.currentTarget).attr('data-mz-credit-code-to-tie-to-customer'),
                isEnabled = $(e.currentTarget).prop('checked') === true;
            this.model.addRemainingCreditToCustomerAccount(creditCode, isEnabled);
        },
        handleEnterKey: function (e) {
            var source = $(e.currentTarget).attr('data-mz-value');
            if (!source) return;
            switch (source) {
                case "creditAmountApplied":
                    return this.applyDigitalCredit(e);
                case "digitalCreditCode":
                    return this.getDigitalCredit(e);
                case "giftCardNumber":
                    if (this.model.get('giftCardNumber') && this.model.get('giftCardSecurityCode')){
                        return this.getGatewayGiftCard(e);
                    } else {
                        //TODO: trigger error message
                    }
                    break;
                case "giftCardSecurityCode":
                    if (this.model.get('giftCardNumber') && this.model.get('giftCardSecurityCode')){
                        return this.getGatewayGiftCard(e);
                    } else {
                        //TODO: trigger error message
                    }
                    break;
            }
        },
        /* begin visa checkout */
        initVisaCheckout: function () {
            var me = this;
            var visaCheckoutSettings = HyprLiveContext.locals.siteContext.checkoutSettings.visaCheckout;
            var apiKey = visaCheckoutSettings.apiKey || '0H1JJQFW9MUVTXPU5EFD13fucnCWg42uLzRQMIPHHNEuQLyYk';
            var clientId = visaCheckoutSettings.clientId || 'mozu_test1';
            var orderModel = this.model.getOrder();


            if (!window.V) {
                //window.console.warn( 'visa checkout has not been initilized properly');
                return false;
            }
            // on success, attach the encoded payment data to the window
            // then call the sdk's api method for digital wallets, via models-checkout's helper
            window.V.on("payment.success", function(payment) {
                //window.console.log({ success: payment });
                me.editing.savedCard = false;
                me.editing.newCard = false;
                me.model.parent.processDigitalWallet('VisaCheckout', payment);
            });



            window.V.init({
                apikey: apiKey,
                clientId: clientId,
                paymentRequest: {
                    currencyCode: orderModel.get('currencyCode'),
                    subtotal: "" + orderModel.get('subtotal')
                }
            });
        },
        /* end visa checkout */
        
        voidExistPaymentSetStatus: function() {
            var activePayments = this.model.activePayments(), self = this;
            
            if (activePayments.length) {
                var currentType = activePayments[0].paymentType.toLowerCase();
                
                if (currentType === 'benefitpay' || currentType === 'qpay' || currentType === 'omannet') { // ✅ Added OmanNet
                    return this.model.parent.apiModel.voidPayment(activePayments[0].id);
                } else {
                    return new Promise(function(resolve) { resolve(); });
                }
            } else {
                return new Promise(function(resolve) { resolve(); });
            }
        },
        voidExistBluePaymentSetStatus: function() {
            var activePayments = this.model.activePayments(), self = this;
            if( activePayments.length) {
                return this.model.parent.apiModel.voidPayment(activePayments[0].id);
                
            }
            else {
                return new Promise(function(resolve) { resolve(); });
            }
        }
    });

    var CouponView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/coupon-code-field',
        handleLoadingChange: function (isLoading) {
            // override adding the isLoading class so the apply button
            // doesn't go loading whenever other parts of the order change
        },
        initialize: function () {
            var me = this;
            this.listenTo(this.model, 'change:couponCode', this.onEnterCouponCode, this);
            this.codeEntered = !!this.model.get('couponCode');
            this.$el.on('keypress', 'input', function (e) {
                if (e.which === 13) {
                    if (me.codeEntered) {
                        me.handleEnterKey();
                    }
                    return false;
                }
            });

            me.messageView = new ThresholdMessageView({
              el: $('#mz-discount-threshold-messages'),
              model: window.order
            });
        },
        onEnterCouponCode: function (model, code) {
            if (code && !this.codeEntered) {
                this.codeEntered = true;
                this.$el.find('button').prop('disabled', false);
            }
            if (!code && this.codeEntered) {
                this.codeEntered = false;
                this.$el.find('button').prop('disabled', true);
            }
        },
        autoUpdate: [
            'couponCode'
        ],
        addCoupon: function (e) {
            // add the default behavior for loadingchanges
            // but scoped to this button alone
            var self = this;
            this.$el.addClass('is-loading');
            this.model.addCoupon().ensure(function() {
                self.$el.removeClass('is-loading');
                self.model.unset('couponCode');
                self.updateCartEvent();
                self.render();
                self.messageView.render();
            });
        },
        handleEnterKey: function () {
            this.addCoupon();
        },
        updateCartEvent: function() {
            try {
                if(!_.isEmpty(this.model.get('couponCodes'))) {

                    var cartItems = this.model.get('items'),
                    existCartWishlistEvent = JSON.parse(localStorage.getItem('cartEvent')), itemIndex;
    
                    cartItems.forEach(function(value){
                        if(!_.isUndefined(value.product.variationProductCode)) {
                            itemIndex = existCartWishlistEvent.findIndex(function(eventObjectItem){ return eventObjectItem.variationProductCode == value.product.variationProductCode; });
                        }
                        else {
                            itemIndex = existCartWishlistEvent.findIndex(function(eventObjectItem){ return eventObjectItem.item_id == value.productCode; });
                        }
    
                        if(!_.isEmpty(value.productDiscounts)){
                            value.productDiscounts.forEach(function(discount) {
                                if(!_.isNull(discount.couponCode)) {
                                    existCartWishlistEvent[itemIndex].discount = discount.impact;
                                    existCartWishlistEvent[itemIndex].coupon = discount.couponCode;
                                    localStorage.setItem('cartEvent', JSON.stringify(existCartWishlistEvent));
                                }
                            });
                        }
                    });
                }
            } catch (error) {
                console.log('Error Occured While Updating Cart Event After Applying Coupon', error.message);
            }
            
        }
    });

    var CommentsView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/comments-field',
        autoUpdate: ['shopperNotes.comments']
    });

    var attributeFields = function(){
        var me = this;

        var fields = [];

        var storefrontOrderAttributes = require.mozuData('pagecontext').storefrontOrderAttributes;
        if(storefrontOrderAttributes && storefrontOrderAttributes.length > 0) {

            storefrontOrderAttributes.forEach(function(attributeDef){
                fields.push('orderAttribute-' + attributeDef.attributeFQN);
            }, this);

        }

        return fields;
    };

    var ReviewOrderView = Backbone.MozuView.extend({
        templateName: 'modules/checkout/step-review',
        autoUpdate: [
            'createAccount',
            'agreeToTerms',
            'emailAddress',
            'password',
            'confirmPassword'
        ].concat(attributeFields()),
        renderOnChange: [
            'createAccount',
            'isReady'
        ],
        initialize: function () {
            var me = this;
            this.$el.on('keypress', 'input', function (e) {
                if (e.which === 13) {
                    me.handleEnterKey();
                    return false;
                }
            });
            this.model.on('passwordinvalid', function(message) {
                me.$('[data-mz-validationmessage-for="password"]').text(message);
            });
            this.model.on('userexists', function (user) {
                me.$('[data-mz-validationmessage-for="emailAddress"]').html(Hypr.getLabel("customerAlreadyExists", user, encodeURIComponent(window.location.pathname)));
            });

            BankRedirectHandler.init.call(this, OrderSubmitHandler);
        },
        //submit: function () { OrderSubmitHandler.submit.call(this); },
        submit: function () {
            var isShortCodeRequired = HyprLiveContext.locals.themeSettings.countrySpecificCode === 'SA' ? true : false ;

            if(isShortCodeRequired){
                var entityListFullName = "countryselector@afg";

                // Get city from SHIPPING/FULFILLMENT address (Delivery address), not billing
                // Priority: 1. DOM dropdown, 2. Fulfillment model, 3. Billing fallback
                
                // Try shipping address dropdown first (data-mz-value for fulfillment contact)
                var savedCity = $('select[data-mz-value="address.cityOrTown"]').val();
                
                
                // Try fulfillment model if DOM is empty
                if (!savedCity) {
                    savedCity = this.model
                        .get("fulfillmentInfo")
                        .get("fulfillmentContact")
                        .get("address")
                        .get("cityOrTown");
                }
                
                // Try shippingAddress view model
                if (!savedCity && window.checkoutViews && window.checkoutViews.steps && window.checkoutViews.steps.shippingAddress) {
                    savedCity = window.checkoutViews.steps.shippingAddress.model.get("address").get("cityOrTown");
                }
                
                // Fallback to billing if no shipping address (e.g., digital products)
                if (!savedCity) {
                    savedCity = $('select[data-mz-value="billingContact.address.cityOrTown"]').val();
                }
                
                if (!savedCity) {
                    savedCity = this.model
                        .get("billingInfo")
                        .get("billingContact")
                        .get("address")
                        .get("cityOrTown");
                }


                var self = this;
            
                api.request(
                    "GET",
                    "/api/platform/entitylists/" + entityListFullName + "/entities"
                )
                .then(function (res) {
            
                    var allCountriesKSA = [];
            
                    for (var i = 0; i < res.items.length; i++) {
                        if (res.items[i].countryCode === "SA") {
                            allCountriesKSA = res.items[i].cities || [];
                            break;
                        }
                    }
            
                    var normalizedSavedCity = (savedCity || "").toLowerCase();
                    var isValidCity = false;
            
                    for (var j = 0; j < allCountriesKSA.length; j++) {
                        if (allCountriesKSA[j].toLowerCase() === normalizedSavedCity) {
                            isValidCity = true;
                            break;
                        }
                    }
            
                    if (isValidCity) {
                        OrderSubmitHandler.submit.call(self);
                    } else {
                        $(document).scrollTop(0);
                        $('.mz-messagebar').html(
                            '<div class="mz-messagebar" data-mz-message-bar="">' +
                            '<ul class="is-showing mz-errors">' +
                            '<li class="mz-message-item">' +
                            Hypr.getLabel("nationalAddressShortCodeInval") +
                            '</li></ul></div>'
                        );
                        return false;
                    }
                });
            } else{
                OrderSubmitHandler.submit.call(this);
            }
        }, 
        handleEnterKey: function () {
            this.submit();
        },
        enablePlacePay: function(event) {
            if(!_.isNull(document.getElementById('place-order-sticky-btn')))
                document.getElementById('place-order-sticky-btn').disabled = event.target.checked ? false : true;
        }

    });

    var ParentView = function(conf) {
      var gutter = parseInt(Hypr.getThemeSetting('gutterWidth'), 10);
      if (isNaN(gutter)) gutter = 15;
      var mask;
      conf.model.on('beforerefresh', function() {
         killMask();
         conf.el.css('opacity',0.5);
         var pos = conf.el.position();
         mask = $('<div></div>', {
           'class': 'mz-checkout-mask'
         }).css({
           width: conf.el.outerWidth() + (gutter * 2),
           height: conf.el.outerHeight() + (gutter * 2),
           top: pos.top - gutter,
           left: pos.left - gutter
         }).insertAfter(conf.el);
      });
      function killMask() {
        conf.el.css('opacity',1);
        if (mask) mask.remove();
      }
      conf.model.on('refresh', killMask);
      conf.model.on('error', killMask);
      return conf;
    };

    var detectStickyPlaceOrderBtn = function() {
        $(window).scroll(function(){
            var myElement = document.getElementById('place-order-btn');
            if(myElement) {
                var bounding = myElement.getBoundingClientRect();
                var myElementHeight = myElement.offsetHeight;
                var myElementWidth = myElement.offsetWidth;
                if (bounding.top >= -myElementHeight && bounding.left >= -myElementWidth && bounding.right <= (window.innerWidth || document.documentElement.clientWidth) + myElementWidth && bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) + myElementHeight) {
                    $('.mz-checkout-sticky-place-order-btn').slideUp("fast");
                } else {
                    $('.mz-checkout-sticky-place-order-btn').slideDown("fast");
                }
            }
        });
    };

    var stickyPlaceOrder = function(){
        $('#place-order-sticky-btn').click(function(){
            EpgPaymentHandler.initiateLoader.call(window.order);
            window.checkoutViews.parentView.model.submit();
        });
    };

    $(document).ready(function () {
        $(document).on('click','.save-card-details-btn', function(e){
            var isSaveCardSaved = $('#toSaveCard').is(':checked');
            if(isSaveCardSaved) {
                $.cookie("checkboxState", "checked", {expires: 5 / 1440, path: '/'}); // Cookie saved for 5 minutes
            } else {
                $.removeCookie("checkboxState", {path: '/'});
            }
        });

        if(MobileChecker.isPhoneOrTablet()){
            $('.mz-checkout-sticky-place-order-btn').show();
            detectStickyPlaceOrderBtn();
            stickyPlaceOrder();
        }
        $(document).scrollTop(0); 
        $(document).on('change','#mz-terms-and-conditions', function(e){
            if(e.target.checked) {
              if(window.order.get("billingInfo").get("hasPaymentDone"))
                $("#place-order-btn").prop("disabled", false);
              else 
                $("#place-order-btn").prop("disabled", true);
              $('.checkout-agreeToTerms').addClass('hidden');
            }
            else{
                $("#place-order-btn").prop("disabled", true);
                $('.checkout-agreeToTerms').removeClass('hidden');
            }
        });

        var $checkoutView = $('#checkout-form'),
            checkoutData = require.mozuData('checkout');

        AmazonPay.init(true);

        checkoutData.isAmazonPayEnable = AmazonPay.isEnabled;
        
        var checkoutModel = window.order = new CheckoutModels.CheckoutPage(checkoutData);
        var fulfillmentContactModel = checkoutModel.get('fulfillmentInfo').get('fulfillmentContact');
        if(fulfillmentContactModel.get("address").get("countryCode") !== Hypr.getThemeSetting('countrySpecificCode')) {
            var availabeContact = checkoutModel.get('customer').get('contacts').filter(function(item){ return item.get("address").get("countryCode") === Hypr.getThemeSetting('countrySpecificCode');});
            if(availabeContact.length > 0) {
                checkoutModel.get('fulfillmentInfo').set('fulfillmentContact', availabeContact[availabeContact.length-1]);
            }
            else {
                checkoutModel.get('fulfillmentInfo').set('fulfillmentContact', {
                    "email": fulfillmentContactModel.get("email"),
                    "firstName": "",
                    "lastNameOrSurname": "",
                    "phoneNumbers": {
                        "home": "",
                        "dialingCode": ""
                    },
                    "address": {
                        "address1": "",
                        "address2": "",
                        "address3": "",
                        "cityOrTown": "",
                        "stateOrProvince": "n/a",
                        "postalOrZipCode": "00000",
                        "countryCode": Hypr.getThemeSetting('countrySpecificCode'),
                        "addressType": "Residential",
                        "isValidated": false,
                        "candidateValidatedAddresses": null,
                        "defaultAddress": false
                    }
                });
            }
        }
        
        var checkoutViews = {
                parentView: new ParentView({
                  el: $checkoutView,
                  model: checkoutModel
                }),
                steps: {
                    shippingAddress: new ShippingAddressView({
                        el: $('#step-shipping-address'),
                        model: checkoutModel.get('fulfillmentInfo').get('fulfillmentContact')
                    }),
                    billingAddress: new BillingAddressView({
                        el: $('#step-billing-address'),
                        model: checkoutModel.get('billingInfo')
                    }),
                    shippingInfo: new ShippingInfoView({
                        el: $('#step-shipping-method'),
                        model: checkoutModel.get('fulfillmentInfo')
                    }),
                    paymentInfo: new BillingInfoView({
                        el: $('#step-payment-info'),
                        model: checkoutModel.get('billingInfo')
                    })
                },
                orderSummary: new OrderSummaryView({
                    el: $('#order-summary'),
                    model: checkoutModel
                }),
                couponCode: new CouponView({
                    el: $('#coupon-code-field'),
                    model: checkoutModel
                }),
                comments: Hypr.getThemeSetting('showCheckoutCommentsField') && new CommentsView({
                    el: $('#comments-field'),
                    model: checkoutModel
                }),

                reviewPanel: new ReviewOrderView({
                    el: $('#step-review'),
                    model: checkoutModel
                }),
                messageView: messageViewFactory({
                    el: $checkoutView.find('[data-mz-message-bar]'),
                    model: checkoutModel.messages
                })
            };

        window.checkoutViews = checkoutViews;
       
        var hasHandledCheckoutComplete = false;

        var hasHandledCheckoutComplete = false;

checkoutModel.on('complete', function() {
    if (hasHandledCheckoutComplete) return;
    hasHandledCheckoutComplete = true;

    console.log("it cames for confirmation page");

    CartMonitor.setCount(0);
    if (window.amazon) window.amazon.Login.logout();

    var userInfo = require.mozuData('user');
    var successRediectUrl = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/checkout/" + checkoutModel.get('id') + "/confirmation";

    var isPaymentMethodKent = false;
    var kentTranasctionId = "";

    if (userInfo.isAuthenticated) {
        if (checkoutModel.get('billingInfo').get("paymentType").toLowerCase() === "creditcard") {
            var cardInfo = checkoutModel.get('billingInfo').get("card");
            if (cardInfo) {
                cardInfo = cardInfo.toJSON();
                if (cardInfo.cardType.toLowerCase() === "knetcard") {
                    isPaymentMethodKent = true;
                    kentTranasctionId = checkoutModel.get('billingInfo').get("data").TransactionId;
                }
            }
        }
    }

    if (isPaymentMethodKent) {
        TransactionHandler
            .init(kentTranasctionId)
            .then(function () {
                window.location = successRediectUrl;
            })
            .catch(function (error) {
                console.log('Transaction Id Update Operation Failed', error);
            });
    } else {
        var isPending = false;
        var payments = checkoutModel.get('payments');

        if (payments && payments.length) {
            for (var i = 0; i < payments.length; i++) {
                var interactions = payments[i].interactions;
                if (interactions && interactions.length) {
                    for (var j = 0; j < interactions.length; j++) {
                        var respCode = interactions[j].gatewayResponseCode;
                        var respText = interactions[j].gatewayResponseText ? interactions[j].gatewayResponseText.toLowerCase() : '';
                        if (respCode === '007') {
                            isPending = true;
                            break;
                        }
                    }
                }
                if (isPending) break;
            }
        }

        if (isPending) {
            console.log("✅ Detected gateway timeout — clearing cart and redirecting to confirmation");
            clearCartAndRedirect(successRediectUrl);
        } else if (this.attributes.isFulfillable !== true && this.attributes.isCOD !== true) {
            var original = location.href;
            var replaceWith = window.location.href.substring(window.location.href.lastIndexOf('/') + 1).split("?")[0];
            var indexOf = original.indexOf(replaceWith);
            original = original.replace(original.substring(indexOf, indexOf + replaceWith.length), "");
            window.history.pushState("", "Title", original);
            $('.mz-messagebar').html('<div class="mz-messagebar" data-mz-message-bar=""><ul class="is-showing mz-errors"><li class="mz-message-item">' + Hypr.getLabel('paymentAuthCreditCardError') + '</li></ul></div>');
        } else {
            window.location = successRediectUrl;
        }
    }
});

             // ✅ Helper function to clear cart and then redirect
             function clearCartAndRedirect(redirectUrl) {
                try {
                    var CartModel = require('modules/models-cart').Cart;
                    CartModel.fromCurrent().apiDel().then(function () {
                        console.log("🗑️ Cart cleared before redirecting");
                        window.location = redirectUrl;
                    }).catch(function (err) {
                        console.warn("⚠️ Cart clear failed, proceeding with redirect anyway");
                        window.location = redirectUrl;
                    });
                } catch (e) {
                    console.error("⚠️ Cart deletion failed with error:", e);
                    window.location = redirectUrl;
                }
            }

        
        // var $reviewPanel = $('#step-review');
        // checkoutModel.on('change:isReady',function (model, isReady) {
        //     if (isReady) {
        //         window.scrollTo(0, 0); 
        //         //setTimeout(function () { window.scrollTo(0, $reviewPanel.offset().top); }, 750);
        //     }
        // });

        _.invoke(checkoutViews.steps, 'initStepView');

        $checkoutView.noFlickerFadeIn();

        function fireAddShippingInfoEvent() {
            try {
                CheckoutEvents.fireEvent.call(checkoutModel, 'add_shipping_info');
            } catch (error) {
                console.log(error.message);
            }
        }
        setTimeout(function(){
            if($('.mz-checkoutform-shippingaddress').hasClass('is-complete')){
                fireAddShippingInfoEvent();
            }
        }, 1000)
        $(document).on("click",".address-button", function(){
            fireAddShippingInfoEvent();
        })
        

        if (AmazonPay.isEnabled)
            AmazonPay.addCheckoutButton(window.order.id, false);

        // function to close popup from outside click
        $('.mz-backdrop').on('click',function(event){
            $(event.currentTarget).hide();
            checkoutViews.steps.paymentInfo.closeModal();

            BlueWalletAction.stopOTPTimer();
            
        });
    });
});

    

