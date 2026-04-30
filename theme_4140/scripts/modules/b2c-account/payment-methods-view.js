define([
    "modules/jquery-mozu",
    'underscore',
    "hyprlive",
    "modules/editable-view",
    "modules/mobile-number-length"
], function($, _, Hypr, EditableView, MobileNumberChecker) {

    var PaymentMethodsView = EditableView.extend({
        templateName: "modules/my-account/my-account-paymentmethods",
        autoUpdate: [
          "editingCard.isDefaultPayMethod",
          "editingCard.paymentOrCardType",
          "editingCard.nameOnCard",
          "editingCard.cardNumberPartOrMask",
          "editingCard.expireMonth",
          "editingCard.expireYear",
          "editingCard.cvv",
          "editingCard.isCvvOptional",
          "editingCard.contactId",
          "editingContact.firstName",
          "editingContact.lastNameOrSurname",
          "editingContact.address.address1",
          "editingContact.address.address2",
          "editingContact.address.address3",
          "editingContact.address.cityOrTown",
          "editingContact.address.countryCode",
          "editingContact.address.stateOrProvince",
          "editingContact.address.postalOrZipCode",
          "editingContact.address.addressType",
          "editingContact.phoneNumbers.home",
          "editingContact.phoneNumbers.dialingCode",
          "editingContact.title.titleName",
          "editingContact.address.addressname",
    
          "editingContact.isBillingContact",
          "editingContact.isPrimaryBillingContact",
          "editingContact.isShippingContact",
          "editingContact.isPrimaryShippingContact",
        ],
        renderOnChange: [
          //"editingCard.isDefaultPayMethod",
          //  'editingCard.contactId'
          "editingContact.address.countryCode",
        ],
        additionalEvents: {
            "keydown .mz-preventArrowKey":"preventArrowKeyInput",
            "input .mz-userMobileNumber":"validateMobileNumberLength",
            "input #mz-payment-expiration-month":"validateExpireMonth",
            "input #mz-payment-expiration-year":"validateExpireYear",
            "input .mz-creditCardNumber":"validateCardNumberLength",
            "change .mz-credtiCardType":"validateCardType"
        },

        initialize: function() {
            this.setInitialEditingCardState();
            this.listenEditingCardStateChange();
        },

        setInitialEditingCardState: function() {
            this.model.get('editingCard').set('saveCardFirstStep', false);
            this.model.get('editingCard').set('saveCardSecondStep', false);
            this.model.get('editingCard').set('isInvalidDate', false);
        },

        listenEditingCardStateChange: function() {
            this.listenTo(this.model.get('editingCard'), 'change:saveCardFirstStep', this.render);
            this.listenTo(this.model.get('editingCard'), 'change:saveCardSecondStep', this.render);
            this.listenTo(this.model.get('editingCard'), 'change:isInvalidDate', this.render);
        },
       

        continueCard: function () {
          var expiryMonth = this.model.get('editingCard').get('expireMonth'),
              expiryYear = "20".concat(this.model.get('editingCard').get('expireYear')),
              dateObject = new Date(),
              isInvalidExDate = ( dateObject.getTime() > dateObject.setFullYear(expiryYear, expiryMonth) ) || expiryMonth > 12 || expiryMonth < 1; 

            this.model.get('editingCard').set('isInvalidDate', isInvalidExDate ? true : false);
            this.model.get('editingCard').set('expireYear', expiryYear);

            if(!isInvalidExDate) {
                this.model.updateCountryCities();
                this.model.get('editingCard').set("contactId","new");
                this.model.get('editingCard').set('saveCardFirstStep', false);
                this.model.get('editingCard').set('saveCardSecondStep', true);
            }
            
        },
        
        beginEditCard: function (e) {
            e.preventDefault();
            $(document).scrollTop(0);

            var id = this.editing.card = e.currentTarget.getAttribute('data-mz-card'),
                isNewCard = $(e.target).hasClass('btn-add-new-card');

            this.model.beginEditCard(id);

            if(id != "new") {
                this.model.beginEditContact(this.model.get("editingCard").get("contactId"));
                this.updateMobileNumber(true);
                this.model.updateCountryCities();
            }

            this.model.get('editingCard').set('saveCardFirstStep', isNewCard  ? true  : false);
            this.model.get('editingCard').set('saveCardSecondStep', isNewCard ? false : true);

            this.render();

            $(".credit-continue").attr("disabled", "disabled");
            this.modalFunction();
        },
        
        finishEditCard: function () {
            this.initiateLoader();
            this.updateMobileNumber(false);
            this.editing.displayError = false;
            this.editing.displayErrorMessage = "";
            $(".account-credit-card-alert-message").addClass("hidden");
            this.model.get("editingContact").get("address").set("postalOrZipCode","00000");

            var self = this;
            var operation = this.doModelAction("saveCard");
            
            if (operation) {                
                operation.otherwise(function (e) {                   
                    self.editing.card = true;
                    var errorMessage = e.name == "CARD_NUMBER_UNRECOGNIZED" ? Hypr.getLabel("invalidCardNumber"): e.message;
                    $(".account-credit-card-alert-message").find(".mz-message-item").text(errorMessage);
                    $(".account-credit-card-alert-message").removeClass("hidden");
                    self.editing.displayError = true;
                    self.editing.displayErrorMessage = errorMessage;
                });
                this.editing.card = false;
            }
            
            self.setInitialEditingCardState();
        },

        cancelEditCard: function () {
            this.editing.card = false;
            this.model.endEditCard();
            this.setInitialEditingCardState();
            this.render();
            $(".account-paymentmethods-body #account-messages").hide();
        },

        beginDeleteCard: function (e) {
            var id = e.currentTarget.getAttribute("data-mz-card"),
                card = this.model.get("cards").get(id);
                
            if (window.confirm(Hypr.getLabel("confirmDeleteCard", card.get("cardNumberPart")))) this.doModelAction("deleteCard", id); 

        },

        modalFunction: function () {
            if(this.model.get("editingCard").get("contactId") && this.model.get("editingCard").get("contactId") !== "new"){
              $(".mz-creditcard-save").prop("disabled", false);
            }
        },

        validateCardType: function(event){
            var regex;

            switch(event.target.value){
                case 'VISA':
                    regex =  new RegExp('^4[0-9]{12}(?:[0-9]{3})?$');
                    break;
                case 'MC':
                    regex = new RegExp('^5[1-5][0-9]{14}$');
                    break;
                case 'JCB':
                    regex = /^(?:(?:2131|1800|35\d{3})\d{11})$/;
                    break;
                case 'AMEX':
                    regex = new RegExp('^3[47][0-9]{13}$');
                    break;
            }
            var cardNumber = this.model.get('editingCard').get('cardNumber');
            if(cardNumber && regex) $(".credit-continue").prop("disabled", !regex.test(cardNumber) ? true : false);
        },

        preventArrowKeyInput: function (event) {
            if (event.keyCode === 38 || event.keyCode === 40) this.model.set('isArrowKeyInput', true);
        },
        
        updateMobileNumber: function(isBeginEdit) {
            var phoneNumbers = this.model.get("editingContact").get("phoneNumbers"),
                homeNumber = phoneNumbers.get("home"),
                finalPhoneNumber;

            if(isBeginEdit) {
                finalPhoneNumber = homeNumber.split(" ");
                if(finalPhoneNumber.length) phoneNumbers.set("home",finalPhoneNumber[1]);
                return;
            }
            
            var dailingCode = phoneNumbers.get('dialingCode');
            if(!dailingCode) {
                dailingCode = Hypr.getThemeSetting('countrySpecificDialingCode');
                phoneNumbers.set('dialingCode', dailingCode);                
            }
            phoneNumbers.set("home", phoneNumbers.get('dialingCode').concat(" ", homeNumber));
            
        },

        initiateLoader: function() {
            window.scrollTo(0, 0);
            this.model.initializeLoader('active', 'deactive');
            $('.redirect-text').addClass('hidden');
        },

        validateMobileNumberLength: function(event) { MobileNumberChecker.requriedMobileNumberLength(event); },

        validateCardNumberLength: function(event) {
            var cardType = this.model.get('editingCard').get('cardType');

            //Allow User To Enter Only 16 Digit If Card Type Is Not Selected
            if(cardType === '' || _.isUndefined(cardType)) {
                if(event.target.value.length > 16) event.target.value = event.target.value.slice(0,16);
                $(".credit-continue").prop("disabled", true);
                return;
            }

            //When Card Type Has Not Choosed As AMEX Then Allow User To Enter Card Number Upto 16digit
            if(event.target.value.length > 16) event.target.value = event.target.value.slice(0,16);

            //When User Enter And Then Clear Either Expected Expiry Month Or Year
            if(this.checkExpireMonthOrYear()) {
                $(".credit-continue").prop("disabled", true);
                return;
            } 

            //When Card Type Has Choosed As AMEX Then Allow User To Enter Card Number Upto 15digit
            if(cardType == 'AMEX') {
                if(event.target.value.length > 15) event.target.value = event.target.value.slice(0,15); 
                
                $(".credit-continue").prop("disabled", event.target.value.length === 15 ? this.isAnyDetailMissing() ? true : false : true);
                    
                return;
            }

            if(event.target.value < 1){
                $(".credit-continue").prop("disabled", true);
                return false;
            }

            //When Card Type Has Not Choosed As AMEX Then Allow User To Enter Card Number Upto 16digit
            // if(event.target.value.length > 16) event.target.value = event.target.value.slice(0,16);

            $(".credit-continue").prop("disabled", event.target.value.length === 16 ? this.isAnyDetailMissing() ? true : false : true);

        },

        validateExpireMonth: function(event) {

            //Allow User To Enter Expected Expire Month With Length 2 Only
            if(event.target.value.length > 2) event.target.value = event.target.value.slice(0,2);

            //Checks - Is There Any Undefined Value
            if(this.isAnyDetailMissing('expireMonth')) {
                $(".credit-continue").prop("disabled", true);
                return;
            }

            //When User Change The Option Of Card Type But Don't Choose Any Card Type
            if(this.model.get('editingCard').get('cardType') === '') {
                $(".credit-continue").prop("disabled", true);
                return;
            }

            //Checks Length Of Card Number - Even With/Without Choosing Card Type
            if(this.checkCardLength(this.model.get('editingCard').get('cardNumber'))) {
                $(".credit-continue").prop("disabled", true);
                return;
            }
           
            //When User Enter And Then Clear Expected Expire Year Or Enter Passed Year
            var expiryYear = this.model.get('editingCard').get('expireYear');
            if(expiryYear === 0 || "20".concat(expiryYear) < new Date().getFullYear()) {
                $(".credit-continue").prop("disabled", true);
                return;
            } 
            // var expiryMonth = this.model.get('editingCard').get('expireMonth'),
            var expiryMonth = event.target.value,
            // expiryYear = "20".concat(event.target.value),
            expiryYear = "20".concat(expiryYear),
            dateObject = new Date(),
            checkMonthYear = dateObject.getFullYear() == expiryYear && expiryMonth < (dateObject.getMonth()+1) ? true : false,
            // isInvalidExDate = dateObject.getTime() > dateObject.setFullYear(expiryYear, expiryMonth);
            isInvalidExDate = ( dateObject.getTime() > dateObject.setFullYear(expiryYear, expiryMonth) ) || expiryMonth > 12 || expiryMonth < 1; 
            if(checkMonthYear){
                $(".credit-continue").prop("disabled", true);
                return;
            }
            if(isInvalidExDate){
                $(".credit-continue").prop("disabled", true);
                return;
            }
            // $(".credit-continue").prop("disabled", checkMonthYear ? true : isInvalidExDate ? true: false);

            if(this.model.get('editingCard').get('cardNumber') < 1){
                $(".credit-continue").prop("disabled", true);
                return false;
            }

            $(".credit-continue").prop("disabled", event.target.value < 1 || event.target.value > 12 ? true : false);
        },

        validateExpireYear: function(event) {
            
            //Allow User To Enter Expected Expire Year With Length 2 Only
            if(event.target.value.length > 2) event.target.value = event.target.value.slice(0,2);

            //Checks - Is There Any Undefined Value
            if(this.isAnyDetailMissing('expireYear')) {
                $(".credit-continue").prop("disabled", true);
                return;
            }

            //When User Change The Option Card Type But Don't Choose Any Card Type
            if(this.model.get('editingCard').get('cardType') === '') {
                $(".credit-continue").prop("disabled", true);
                return;
            }
            
            //Checks Length Of Card Number - Even With/Without Choosing Card Type
            if(this.checkCardLength(this.model.get('editingCard').get('cardNumber'))) {
                $(".credit-continue").prop("disabled", true);
                return;
            }

            //When User Enter And Then Clear Expected Expire Month Or Enter Upcoming
            if(this.model.get('editingCard').get('expireMonth') === 0 || this.model.get('editingCard').get('expireMonth') > 12)  {
                $(".credit-continue").prop("disabled", true);
                return;
            }

            var expiryMonth = this.model.get('editingCard').get('expireMonth'),
            expiryYear = "20".concat(event.target.value),
            dateObject = new Date(),
            checkMonthYear = dateObject.getFullYear() == expiryYear && expiryMonth < (dateObject.getMonth()+1) ? true : false,
            isInvalidExDate = dateObject.getTime() > dateObject.setFullYear(expiryYear, expiryMonth);

            if(this.model.get('editingCard').get('cardNumber') < 1){
                $(".credit-continue").prop("disabled", true);
                return false;
            }

            $(".credit-continue").prop("disabled", checkMonthYear ? true : isInvalidExDate ? true: false);
        },

        isAnyDetailMissing: function(excludeKey) {
            var self = this;
            return ['cardType', 'cardNumber', 'expireMonth', 'expireYear'].some(function(key) {
                if(excludeKey !== key ) return self.model.get('editingCard').get(key) === undefined;
            });

        },

        checkExpireMonthOrYear: function() {
            // return this.model.get('editingCard').get('expireMonth') === 0 || this.model.get('editingCard').get('expireYear') === 0;
            var expiryYear = this.model.get('editingCard').get('expireYear');
            if(expiryYear === 0 || "20".concat(expiryYear) < new Date().getFullYear() || this.model.get('editingCard').get('expireMonth') === 0 ) {
            // $(".credit-continue").prop("disabled", true);
            return true;
            } 
            else{
                var expiryMonth = this.model.get('editingCard').get('expireMonth'),
                expiryYear = "20".concat(expiryYear),
                dateObject = new Date(),
                checkMonthYear = dateObject.getFullYear() == expiryYear && expiryMonth < (dateObject.getMonth()+1) ? true : false,
                isInvalidExDate = ( dateObject.getTime() > dateObject.setFullYear(expiryYear, expiryMonth) ) || expiryMonth > 12 || expiryMonth < 1; 
                if(checkMonthYear){
                    return true;
                }
                if(isInvalidExDate){
                    return true;
                }
            }
        },

        checkCardLength: function(currentCardNumber) {
            var cardType = this.model.get('editingCard').get('cardType');

            if(_.isUndefined(cardType)) return;

            return cardType == 'AMEX' ? currentCardNumber.length < 15 ? true : false : currentCardNumber.length < 16 ? true : false;

        }

      });

    return PaymentMethodsView;
    
});