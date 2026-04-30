define([
    'modules/api',
    'underscore',
    'modules/checkout/payment/PaymentPayload'
], function(api, _ , PaymentPayload) {

    var SplitPaymentHandler = {
        init: function(currentPayment, orderId, orderTotal) {
            var bluePaymentsArr = window.order.get("bluePayments");
            
            if(!_.isEmpty(bluePaymentsArr)) {
                var splitPayment = [], existCreditCardPaymentIndex,
                remainingBalance = SplitPaymentHandler.calculateRemainingAmount(bluePaymentsArr, orderTotal),
                creditCardPayment = SplitPaymentHandler.creditCartPayload(currentPayment,  orderId, remainingBalance);

                creditCardPayment.amount = remainingBalance;
                splitPayment = bluePaymentsArr;

                existCreditCardPaymentIndex = SplitPaymentHandler.checkExistCreditCardPayment(creditCardPayment);

                SplitPaymentHandler.updateSplitPaymentCollection(splitPayment, existCreditCardPaymentIndex, creditCardPayment);

                window.order.set("splitPayments", splitPayment);

                SplitPaymentHandler.isPaymentServiceIdExist();

                if(window.order.get('isPaymentServiceIdExist')) SplitPaymentHandler.addCardMultiPayment(orderId, splitPayment);
            }
        },

        calculateRemainingAmount:  function(bluePaymentsArr, orderTotal) {
            var totalBlueAmountRequested = 0;

            _.each(bluePaymentsArr, function(bluePayment) {
                    totalBlueAmountRequested += bluePayment.amount;
            });

            return orderTotal - totalBlueAmountRequested;
        },

        checkExistCreditCardPayment: function(creditCardPayment) {
            if(!_.isUndefined(creditCardPayment.newBillingInfo.card)) {
                return   _.findIndex(window.order.get("splitPayments"), function(paymentObject) {
                            if(!_.isUndefined(paymentObject.newBillingInfo.card)) {
                                return paymentObject.newBillingInfo.card.paymentOrCardType !== 'BLUEPREPAIDCARD';
                            }
                        });
            }
        },

        updateSplitPaymentCollection : function(splitPayment, existCreditCardPaymentIndex, creditCardPayment) {
            if(existCreditCardPaymentIndex < 0) {
                splitPayment.push(creditCardPayment);
            }
            else {
                splitPayment.fill(creditCardPayment,existCreditCardPaymentIndex, (existCreditCardPaymentIndex + 1));
            }
        },

        isPaymentServiceIdExist : function() {
            var creditCardSplitPaymentObject = _.filter(window.order.get("splitPayments"), function(paymentObject) {
                if(!_.isUndefined(paymentObject.newBillingInfo.card)) {
                    if(paymentObject.newBillingInfo.card.paymentOrCardType !== 'BLUEPREPAIDCARD') {
                        if(_.isUndefined(paymentObject.newBillingInfo.card.paymentServiceCardId)) {
                            return paymentObject;
                        }
                    }
                }
            });

            SplitPaymentHandler.updatePaymentServiceIdStatus(creditCardSplitPaymentObject);
           
        },

        updatePaymentServiceIdStatus: function(creditCardSplitPaymentObject) {
            if(_.isEmpty(creditCardSplitPaymentObject)) {
                window.order.set("isPaymentServiceIdExist",true);
           }else {
                window.order.set("creditCardSplitPaymentObject",creditCardSplitPaymentObject);
                window.order.set("isPaymentServiceIdExist",false);
           }
        },

        addPaymentServiceId: function() {
            window.order.get('creditCardSplitPaymentObject').at(0).newBillingInfo.card.paymentServiceCardId = this.get('card').get('paymentServiceCardId');
            
            if(_.isUndefined(window.order.get('creditCardSplitPaymentObject').at(0).newBillingInfo.card.paymentServiceCardId))
                window.order.get('creditCardSplitPaymentObject').at(0).newBillingInfo.card.paymentServiceCardId = window.order.get('paymentServiceCardId');
        },

        addCardMultiPayment: function(orderId, splitPayment) {
            api.request("POST", "/splitPayment", { "orderId":orderId, splitPayments : splitPayment}).then(function(res){
                sessionStorage.setItem('splitPayments', JSON.stringify(splitPayment));
            });
        },

        creditCartPayload: function(currentPayment, orderId, remainingBalance) {
            var billingContact = currentPayment.get('billingContact'),
            paymentArgs = [ undefined, undefined, remainingBalance],
            creditCardPayment = PaymentPayload.createPaymentPayload.apply(billingContact, paymentArgs);

            SplitPaymentHandler.updateBillingDetails.call(creditCardPayment.newBillingInfo, currentPayment.get('card').toJSON(), orderId);
            
            return creditCardPayment;
        },

        updateBillingDetails: function(existingCardInfo, orderId) {
            this.paymentType = 'CreditCard';
            this.billingContact.orderId = orderId;
            this.card = existingCardInfo;

            delete this.token;
        }
    };

    return SplitPaymentHandler;
    
});