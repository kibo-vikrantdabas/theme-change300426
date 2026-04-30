define([
    'underscore',
    'modules/api',
    'modules/checkout/payment/PaymentPayload',
    'modules/jquery-mozu',
    "hyprlive"
], function(_, api, PaymentPayload, $, Hypr) {
    var OrderSubmitHanlder = {};

    var pageContext = require.mozuData('pagecontext');

    var BankRedirectHandler = {
        init: function(handler) {

            // if(this.model.apiModel.getActivePayments().length === 0) { //Must Verify With OTP Process
            //     this.model.deleteStorage();
            //     return ;
            // }

            if(sessionStorage.getItem('TransId')) {

                this.model.initializeLoader('active','deactive');
                
                Object.assign(OrderSubmitHanlder, handler);

                if(!_.isNull(sessionStorage.getItem('splitPayments'))) {
                     BankRedirectHandler.executeMultiPayment.call(this, 0, 1);
                }
                else {
                    BankRedirectHandler.executeSignlePayment.call(this);
                }
            }
        },
        executeSignlePayment : function() {
            var self = this,
                createPaymentPayload = {};

                if(!self.model.get('requiresFulfillmentInfo') &&  !self.model.get('requiresShippingMethod')) {
                    var billingContactData = self.model.get("billingInfo").get("billingContact").toJSON();
                    
                    createPaymentPayload = {
                        newBillingInfo: {
                            "billingContact": {
                                "email": billingContactData.email,
                                "firstName": billingContactData.firstName,
                                "lastNameOrSurname": billingContactData.lastNameOrSurname,
                                "phoneNumbers": {
                                    "home": billingContactData.phoneNumbers.home
                                },
                                "address": {
                                    "address1": billingContactData.address.address1,
                                    "address2": billingContactData.address.address2,
                                    "address3": billingContactData.address.address3,
                                    "address4": null,
                                    "cityOrTown": billingContactData.address.cityOrTown ? billingContactData.address.cityOrTown: Hypr.getThemeSetting('countrySpecificCode') == "AE" ? 'Dubai' : 'Abbasiyah',
                                    "stateOrProvince": "n/a",
                                    "postalOrZipCode": "00000",
                                    "countryCode": billingContactData.address.countryCode
                                },
                                "orderId": "1567abc47e37f30001474346000186b0"
                            },
                        }
                     };
                     BankRedirectHandler.updateBillingAddressForCNC(createPaymentPayload);
                     createPaymentPayload.amount = this.model.get('total');
                     createPaymentPayload.currencyCode = window.order.toJSON().currencyCode;
                     createPaymentPayload.newBillingInfo.billingContact.orderId =  this.model.get('id');
                     BankRedirectHandler.updateBillingDetails.call(createPaymentPayload.newBillingInfo, this.model.get('billingInfo').get('card').toJSON(), this.model.get('id')); 
                }
                else {
                    
                    createPaymentPayload = BankRedirectHandler.createCreditCardPayload.call(self);
                }

                var currentPayment = self.model.apiModel.getCurrentPayment();

                if(currentPayment) {
                    this.model.apiModel.voidPayment(currentPayment.id)
                    .then(function() {
                        BankRedirectHandler.createPayment.call(self, createPaymentPayload);
                    });
                }
                else {
                    BankRedirectHandler.createPayment.call(self, createPaymentPayload);
                }
                
        },
        executeMultiPayment : function(activePaymentIndex, retry) {
            var self = this,
                createPaymentPayload = {};
            if(this.model.apiModel.getActivePayments().length !== 0 && retry <= 2) {
                var activePaymentObject = this.model.apiModel.getActivePayments()[activePaymentIndex],
                    paymentId;

                if(activePaymentObject) paymentId = activePaymentObject.id;
                
                retry++;
                
                if(paymentId) {
                    this.model.apiModel.voidPayment(paymentId)
                    .then(function() { BankRedirectHandler.executeMultiPayment.call(self, 0, retry); });
                }
                
            }
            else {
                
                self.model.apiModel.createPayment(JSON.parse(sessionStorage.getItem('splitPayments'))[0])
                .then(function() {  
                        var billingContactData = self.model.get("billingInfo").get("billingContact").toJSON(); 
                        createPaymentPayload = {
                            newBillingInfo: {
                                "billingContact": {
                                    "email": billingContactData.email,
                                    "firstName": billingContactData.firstName,
                                    "lastNameOrSurname": billingContactData.lastNameOrSurname,
                                    "phoneNumbers": {
                                        "home": billingContactData.phoneNumbers.home
                                    },
                                    "address": {
                                        "address1": billingContactData.address.address1,
                                        "address2": billingContactData.address.address2,
                                        "address3": billingContactData.address.address3,
                                        "address4": null,
                                        "cityOrTown": billingContactData.address.cityOrTown ? billingContactData.address.cityOrTown: Hypr.getThemeSetting('countrySpecificCode') == "AE" ? 'Dubai' : 'Abbasiyah',
                                        "stateOrProvince": "n/a",
                                        "postalOrZipCode": "00000",
                                        "countryCode": billingContactData.address.countryCode
                                    },
                                    "orderId": "1567abc47e37f30001474346000186b0"
                                },
                            }
                        };
                        if(!self.model.get('requiresFulfillmentInfo') &&  !self.model.get('requiresShippingMethod')) {
                            BankRedirectHandler.updateBillingAddressForCNC(createPaymentPayload);
                        }

                    createPaymentPayload.amount = self.model.get('total');
                    createPaymentPayload.currencyCode = window.order.toJSON().currencyCode;
                    createPaymentPayload.newBillingInfo.billingContact.orderId =  self.model.get('id');
                    BankRedirectHandler.updateBillingDetails.call(createPaymentPayload.newBillingInfo, self.model.get('billingInfo').get('card').toJSON(), self.model.get('id')); 
                    createPaymentPayload.amount =  JSON.parse(sessionStorage.getItem('splitPayments'))[1].amount;
                    var temppaymentArr = JSON.parse(sessionStorage.getItem('splitPayments'));
                    temppaymentArr[1] = createPaymentPayload;
                    sessionStorage.setItem('splitPayments', JSON.stringify(temppaymentArr));
                    self.model.apiModel.createPayment(JSON.parse(sessionStorage.getItem('splitPayments'))[1])
                    .then(function(){
                        api.request("POST", "/splitPayment", { "orderId": window.order.get('id'), splitPayments: JSON.parse(sessionStorage.getItem('splitPayments')) })
                            .then(function (res) {
                                if (res) OrderSubmitHanlder.payAndPlaceOrder.call(self);

                            });
                    });
                 });
            }
        },
        createCreditCardPayload : function() {
            var billingInfo = this.model.get('billingInfo'),
            billingContact = billingInfo.get('billingContact'),
            paymentArgs = [ undefined, undefined, this.model.get('total') ],
            createPaymentPayload = PaymentPayload.createPaymentPayload.apply(billingContact, paymentArgs);

            BankRedirectHandler.updateBillingDetails.call(createPaymentPayload.newBillingInfo, billingInfo.get('card').toJSON(), this.model.get('id'));

            return createPaymentPayload;
        },
        updateBillingDetails: function(existingCardInfo, orderId) {
            this.paymentType = 'CreditCard';
            this.billingContact.orderId = orderId;
             console.log("ℹ️ Using BenefitPay" + sessionStorage.getItem('isBenefitPayApply'));

            if(sessionStorage.getItem('isKNETPaymentType')) {
                existingCardInfo.cardType = 'KNETCARD';
                existingCardInfo.paymentOrCardType = 'KNETCARD';
                sessionStorage.removeItem('isKNETPaymentType');
            }else if(sessionStorage.getItem('isApplePayPaymentType')) {
                existingCardInfo.cardType = 'APPLEPAY';
                existingCardInfo.paymentOrCardType = 'APPLEPAY';
                sessionStorage.removeItem('isApplePayPaymentType');
            }else if (sessionStorage.getItem('isBenefitPayApply')) {
                console.log("ℹ️ Using BenefitPay");
                existingCardInfo.cardType = 'BENEFITCARD';
                existingCardInfo.paymentOrCardType = 'BENEFITWALLET';
                sessionStorage.removeItem('isBenefitPayApply');
            }else if (sessionStorage.getItem('isQpayApply')) {
                existingCardInfo.cardType = 'QPAY';
                existingCardInfo.paymentOrCardType = 'QPAYWALLET';
                sessionStorage.removeItem('isQpayApply'); // ✅ clear flag
            }else if (sessionStorage.getItem('isOmanNetApply')) {
                existingCardInfo.cardType = 'OMANWALLET';
                existingCardInfo.paymentOrCardType = 'OMANWALLET';
                sessionStorage.removeItem('isOmanNetApply'); // ✅ clear flag
            }
            
            this.card = existingCardInfo;
            //console.log("existing card"+ existingCardInfo)
            
            this.externalTransactionId = sessionStorage.getItem('TransId');
            this.data = { TransactionId:sessionStorage.getItem('TransId') };

           //  console.log("📇 Final card object:", JSON.stringify(this.card, null, 2));
            console.log("📨 External Transaction ID:", this.externalTransactionId);

            delete this.token;
        },
        createPayment: function(createPaymentPayload) {
              console.log("✅ It came to create payment");

    try {
      // console.log("📦 createPaymentPayload:", JSON.stringify(createPaymentPayload, null, 2));
        var self = this;
        self.model.apiModel.createPayment(createPaymentPayload)
            .then(function() {
                console.log("✅ Payment creation successful, placing order...");
                OrderSubmitHanlder.payAndPlaceOrder.call(self);
            })
            .catch(function(err) {
                console.error("❌ Error while creating payment:", err);
            });

    } catch (e) {
        console.error("🔥 Exception in createPayment:", e);
    }
},
        updateBillingAddressForCNC: function(createPaymentPayload) {
            var user = require.mozuData('user');
            
            /*createPaymentPayload.newBillingInfo.billingContact = createPaymentPayload.newBillingInfo.billingContact;*/
           // createPaymentPayload.newBillingInfo.billingContact = this.model.get('billingInfo').get('billingContact');
           createPaymentPayload.newBillingInfo.billingContact.firstName = createPaymentPayload.newBillingInfo.billingContact.firstName;
           createPaymentPayload.newBillingInfo.billingContact.email = createPaymentPayload.newBillingInfo.billingContact.email;
            createPaymentPayload.newBillingInfo.billingContact.lastNameOrSurname = createPaymentPayload.newBillingInfo.billingContact.lastNameOrSurname;
            createPaymentPayload.newBillingInfo.billingContact.phoneNumbers = {
                "home": createPaymentPayload.newBillingInfo.billingContact.phoneNumbers.home,
                "dialingCode": createPaymentPayload.newBillingInfo.billingContact.phoneNumbers.dialingCode
            };
            createPaymentPayload.newBillingInfo.billingContact.address = {
                "candidateValidatedAddresses": null,
                "countryCode": Hypr.getThemeSetting('countrySpecificCode'),
                "addressType": "Residential",
                "defaultAddress": false,
                "address1": createPaymentPayload.newBillingInfo.billingContact.address.address1,
                "address2": createPaymentPayload.newBillingInfo.billingContact.address.address2,
                "address3": createPaymentPayload.newBillingInfo.billingContact.address.address3,
                "postalOrZipCode": "00000",
                "cityOrTown": createPaymentPayload.newBillingInfo.billingContact.address.cityOrTown,
                "stateOrProvince": "n/a",
                "isValidated": false
            };

        },
        // createPaymentForCNC: function() {
        //     var createPaymentPayload = {
        //         newBillingInfo :  {} 
        //     }
        //     var paymentArgs = [ undefined, undefined, this.model.get('total') ]

        //     createPaymentPayload = PaymentPayload.createPaymentPayload.apply(billingContact, paymentArgs);

        //     BankRedirectHandler.updateBillingDetails.call(createPaymentPayload.newBillingInfo, billingInfo.get('card').toJSON(), this.model.get('id'));

        // }
            

    };
    return BankRedirectHandler;
});