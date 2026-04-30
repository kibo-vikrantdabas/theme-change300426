

define(["modules/jquery-mozu",
"underscore", 
'modules/models-token',
'modules/card-token',
'hyprlive',
'modules/transactionid-handler',
'modules/transactionid-handler-applepay'
], function($, _, TokenModels, CardTokenHandler, Hypr, TransactionHandler,TransactionHandlerApplepay) {
    var pageContext = require.mozuData('pagecontext'),
        errorCases = {
            "GET_SESSION_FAILED" : 0
        },
        customerAttributes = [],
        tokenizedObject = {
            cardID:'',
            tokenID:''
        },
        transactionIdDetail = {
            isTransactionIdExist:false,
            transactionId:null,
            isKNETPaymentType:false,
            isApplePayPaymentType: false,
            isBenefitPayApply: false,
            isQpayApply: false,
            isOmanNetApply: false
        };
        

    var EPGPayment = {
        

        init: function() {
            console.log("it came here benefit");
        
        
            var card = this.get('billingInfo').get('cardData'),
            isKNETPaymentType = this.get('billingInfo').get('isKNETPaymentType'),
            isApplePayPaymentType = this.get('billingInfo').get('isApplePayPaymentType'),
            isBenefitPayApply = this.get('billingInfo').get('isBenefitPayApply'),
            isQpayApply = this.get('billingInfo').get('isQpayApply'),
            isOmanNetApply = this.get('billingInfo').get('isOmanNetApply'),
            sessionPayload, tokenModelArgs;
            
            transactionIdDetail.isKNETPaymentType = isKNETPaymentType;
            transactionIdDetail.isApplePayPaymentType = isApplePayPaymentType;
            transactionIdDetail.isBenefitPayApply = isBenefitPayApply;
            transactionIdDetail.isQpayApply = isQpayApply;
            transactionIdDetail.isOmanNetApply = isOmanNetApply;

            console.log("KNET: ", isKNETPaymentType);
            console.log("BenefitPay: ", isBenefitPayApply);
            console.log("QPay: ", isQpayApply);
            console.log("ApplePay: ", isApplePayPaymentType);
            console.log("OmanNet: ", isOmanNetApply);
            
            EPGPayment.refactorCardKeys.call(card); 

            sessionPayload = EPGPayment.createSessionPayload.call(this, card, isKNETPaymentType,isBenefitPayApply, isOmanNetApply);

            tokenModelArgs = [card, "session", sessionPayload, isKNETPaymentType, isApplePayPaymentType,isBenefitPayApply, isOmanNetApply];

            EPGPayment.deleteBluePaymentDetails();
            EPGPayment.initiateLoader.call(this);

            Object.assign(customerAttributes, this.toJSON().customer.attributes);          
           // EPGPayment.createTokenModel.apply(this, tokenModelArgs);
           // === Route logic based on payment type ===
    if (isBenefitPayApply) {
        console.log("➡️ Handling BenefitPay flow");
        tokenModelArgs = [card, "session", sessionPayload, false, false, true,false];
        EPGPayment.createTokenModel.apply(this, tokenModelArgs);
    }
    else if (isQpayApply) {
        console.log("➡️ Handling QPay flow");
        tokenModelArgs = [card, "session", sessionPayload, false, false, false,false];
        EPGPayment.createTokenModel.apply(this, tokenModelArgs);
    }
    else if (isOmanNetApply) {
        console.log("➡️ Handling OmanNet flow");
        tokenModelArgs = [card, "session", sessionPayload, false, false, false,true];
        EPGPayment.createTokenModel.apply(this, tokenModelArgs);    
    }
    else if (isKNETPaymentType) {
        console.log("➡️ Handling KNET flow");
        tokenModelArgs = [card, "session", sessionPayload, true, false, false,false];
        EPGPayment.createTokenModel.apply(this, tokenModelArgs);
    }
    else if (isApplePayPaymentType) {
        console.log("➡️ Handling ApplePay flow");
        tokenModelArgs = [card, "session", sessionPayload, false, true, false,false];
        EPGPayment.createTokenModel.apply(this, tokenModelArgs);
    }
    else {
        console.log("➡️ Handling default EPG wallet flow");
        tokenModelArgs = [card, "session", sessionPayload, false, false, false,false];
        EPGPayment.createTokenModel.apply(this, tokenModelArgs);
    }

        },
        

        createTokenModel: function(card, methodName, sessionPayload, isKNETPaymentType, isApplePayPaymentType, isBenefitPayApply,isQpayApply, isOmanNetApply) {
            this.epgCardTokenModel =  new TokenModels.Token({
                type: isBenefitPayApply ? "BENEFITWallet" : 
                isQpayApply ? "QPAYWALLET" :
                isOmanNetApply ? "OMANWALLET" :
                isKNETPaymentType ? "KNETWallet" :
                isApplePayPaymentType ? "APPLEPAY" : "EPGWALLET",
                tokenObject: card
            });
            EPGPayment[card.cardNumber.startsWith("*") ? 'getExistingTokenId':'createNewTokenId']
            .call(this, this.epgCardTokenModel, methodName, sessionPayload, isKNETPaymentType, isApplePayPaymentType, isBenefitPayApply, isQpayApply, isOmanNetApply);

        
        //     const method = card.cardNumber.startsWith("*") ? 'getExistingTokenId' : 'createNewTokenId';
        
        //     EPGPayment[method].call(
        //         this,
        //         this.epgCardTokenModel,
        //         methodName,
        //         sessionPayload,
        //         isKNETPaymentType,
        //         isApplePayPaymentType,
        //         isBenefitPayApply,
        //         isOmanNetApply // Pass OmanNet apply status
        //     );
         },
        
        createNewTokenId: function(epgCardTokenModel, methodName, sessionPayload, isKNETPaymentType,isApplePayPaymentType, isBenefitPayApply, isQpayApply, isOmanNetApply) {
            var self = this;
            console.log("is omannet"+isOmanNetApply);
            epgCardTokenModel.apiCreate()
            .then(function(res){
                if(res.isSuccessful) { 

                    tokenizedObject.cardID = self.get('billingInfo').get('card').get('id');

                    if(isKNETPaymentType) 
                        EPGPayment.checkTransactionIDDetails(isKNETPaymentType,"KNET");
                    else if(isApplePayPaymentType)
                        EPGPayment.checkTransactionIDDetails(isApplePayPaymentType,"APPLEPAY");
                    else if(isBenefitPayApply)
                        EPGPayment.checkTransactionIDDetails(isBenefitPayApply, "BENEFITPAY");
                    else if(isQpayApply)
                        EPGPayment.checkTransactionIDDetails(isQpayApply, "QPAY");
                    else if(isOmanNetApply)
                        EPGPayment.checkTransactionIDDetails(isOmanNetApply, "OMANNET");
                    else 
                        CardTokenHandler.init(undefined, self.get('billingInfo').get('card').get('id'), res.id, false);

                    EPGPayment.executeSession.call(self, epgCardTokenModel, methodName, res.id, sessionPayload, isKNETPaymentType,isApplePayPaymentType, isBenefitPayApply, isQpayApply, isOmanNetApply); 
                }
            }, EPGPayment.handleError);
        },

        getExistingTokenId: function(epgCardTokenModel, methodName, sessionPayload) {
            var tokenID, cardDetailsValues, existingTokenIds,
                cardId = epgCardTokenModel.get('tokenObject').id,
                cardDetailsAttr = _.findWhere(customerAttributes, {fullyQualifiedName:"Tenant~customer-card-details"});

                if(cardDetailsAttr) { cardDetailsValues = cardDetailsAttr.values; } else { return; }

                if(cardDetailsValues.length) { existingTokenIds = JSON.parse(cardDetailsValues[0]); } else { return; }

                tokenID = _.pick(existingTokenIds, cardId)[cardId];

                if(tokenID)  EPGPayment.executeSession.call(this, epgCardTokenModel, methodName, tokenID, sessionPayload);
        },

        executeSession: function(epgCardTokenModel, methodName, epgPaymentServiceTokenId, sessionPayload, isKNETPaymentType, isApplePayPaymentType, isBenefitPayApply, isQpayApply, isOmanNetApply) {
            
            if(isKNETPaymentType || isBenefitPayApply || isQpayApply || isOmanNetApply) { 
                sessionPayload.Recurrence = {
                    "Type": "M"
                };
                
                if(transactionIdDetail.isTransactionIdExist)
                    sessionPayload.ExtraData = {
                        "RecurrenceID": transactionIdDetail.transactionId
                    };
            }
            console.log("it came to session");

            // if(isApplePayPaymentType) { 
            //     sessionPayload.Recurrence = {
            //         "Type": "M"
            //     };
                
            //     if(transactionIdDetail.isTransactionIdExist)
            //         sessionPayload.ExtraData = {
            //             "RecurrenceID": transactionIdDetail.transactionId
            //         };
            // }
            console.log("is it benfit walet" + isBenefitPayApply);
            console.log("is it qpay walet" + isQpayApply);
            console.log("is it omannet walet" + isOmanNetApply);
            console.log("🔍 apiModel object:", epgCardTokenModel.apiModel);
           console.log("🔍 Has method?", typeof epgCardTokenModel.apiModel.thirdPartyPaymentExecute);
            epgCardTokenModel.apiModel.thirdPartyPaymentExecute({
                methodName: methodName,
                cardType: isBenefitPayApply ? "BENEFITWallet" : isQpayApply ? "QPAY" : isOmanNetApply ? "OMANWALLET": isKNETPaymentType ? "KNETWallet" : isApplePayPaymentType ? "APPLEPAY" : "EPGWALLET",
                tokenId: epgPaymentServiceTokenId,
                body:sessionPayload,
            })
                .then(function(response) {
                    console.log("✅ sessionCallback reached with response:", response);
                    EPGPayment.sessionCallback(response);
                }, function(error) {
                    console.error("❌ handleError reached with error:", error);
                    EPGPayment.handleError(error);
                })
                .catch(function(err) {
                    console.error("❗ Unexpected failure in catch:", err);
                });
                         },

        sessionCallback: function(response) {
            console.log("redirect url" + response.RedirectionURL);
            if (response && response.TransactionID && response.RedirectionURL) {
                sessionStorage.setItem("TransId", response.TransactionID);
                EPGPayment.CheckAndUpdateMultiPaymentStorage();
        
                if (transactionIdDetail.isKNETPaymentType) {
                    window.order.get("billingInfo").set("data", { knetTransactionId: response.TransactionID });
                    window.order.apiUpdate().then(function() {
                        EPGPayment.handleKNETRedirection(response.RedirectionURL,response.TransactionID)
                    });
                } else if (transactionIdDetail.isApplePayPaymentType) {
                    EPGPayment.handleAppleRedirection(response.RedirectionURL, response.TransactionID);
                } else if (transactionIdDetail.isBenefitPayApply) {
                     window.order.get("billingInfo").set("data", { knetTransactionId: response.TransactionID });
                    window.order.apiUpdate().then(function() {
                        EPGPayment.redirectToEPGPortal(response.RedirectionURL)
                    });
                }
                else if (transactionIdDetail.isQpayApply) {
                    window.order.get("billingInfo").set("data", { knetTransactionId: response.TransactionID });
                    window.order.apiUpdate().then(function() {
                        EPGPayment.redirectToEPGPortal(response.RedirectionURL)
                    });
                } else if (transactionIdDetail.isOmanNetApply) {
                    window.order.get("billingInfo").set("data", { knetTransactionId: response.TransactionID });
                    window.order.apiUpdate().then(function() {
                        EPGPayment.redirectToEPGPortal(response.RedirectionURL)
                    });
                }else {
                    EPGPayment.redirectToEPGPortal(response.RedirectionURL);
                }
            }
        
            if (!_.isNull(response)) {
                if (response.isDeclined) EPGPayment.handleSessionError(response);
            }
        },
        
        
        payAmount: function() {
            // if(this.get('bluePayments')) {
            //     if(this.get('bluePayments').length == 2 ) return this.get('total');
            //     return this.get('total') - this.get('bluePayments')[0].amount;
            // }
            var splitPaymentsArr = JSON.parse(sessionStorage.getItem('splitPayments'));
            if(!_.isNull(splitPaymentsArr) && !_.isUndefined(splitPaymentsArr)) {
                if(!_.isEmpty(splitPaymentsArr)) {
                    return this.get('total') - splitPaymentsArr[0].amount;
                }
            }
            return this.get('total');
        },


        createSessionPayload: function (card, isKNETPaymentType, isBenefitPayApply, isQpayApply, isOmanNetApply) {
            console.log("it came to create session payload" + " " + isBenefitPayApply + " " + isQpayApply + " " + isOmanNetApply);
            var user = require.mozuData('user'),
                billingMobileNumber;
            if(user.isAnonymous && !user.isAuthenticated) billingMobileNumber = '';

            if(!user.isAnonymous && user.isAuthenticated) {
                if(this.get('requiresFulfillmentInfo') && this.get('requiresShippingMethod')) {
                    billingMobileNumber = this.get('billingInfo').get('billingContact').get('phoneNumbers').get('home');
                }
                else {
                    billingMobileNumber = this.get('billingInfo').get('customerBlueNumber');
                }
            }
            return {
                Currency:this.get('currencyCode'),
                ReturnPath:Hypr.getThemeSetting('epgRedirectURL')+this.get('id'),
                TransactionHint:"CPT:N;VCC:Y;",
                OrderID: this.get('orderNumber'),
                OrderName:this.get('orderNumber'),
                Channel:"Web",
                Amount:Number(EPGPayment.payAmount.call(this)).toFixed(pageContext.currencyInfo.precision),
                confirmationCode:"****".concat(card.cvv),
                OrderDetails : {
                    PayerDetails:{
                        FullName:card.nameOnCard,
                        MSISDN : billingMobileNumber,
                        Email: this.get('billingInfo').get('billingContact').get('email')
                    },
                    CartDetails:{
                        CartID:this.get('originalCartId'),
                        items:EPGPayment.getOrderItems.call(this),
                        TotalItems: this.get('items').length,
                        NetAmount: Number(this.get('subtotal')).toFixed(pageContext.currencyInfo.precision),
                        TotalTax: Number(this.get('taxTotal')).toFixed(pageContext.currencyInfo.precision),
                        TotalShipAmount: Number(this.get('shippingSubTotal') + this.get('shippingTaxTotal')).toFixed(pageContext.currencyInfo.precision),
                        TotalDiscount:Number(this.get('discountTotal')).toFixed(pageContext.currencyInfo.precision),
                        TotalFees:Number(this.get('feeTotal')).toFixed(pageContext.currencyInfo.precision),
                        GrossAmount: Number(this.get('total')).toFixed(pageContext.currencyInfo.precision)
                        //GrossAmount: Number(this.get('subtotal') + this.get('taxTotal')).toFixed(pageContext.currencyInfo.precision)
                    }
                }
            };
        },

        deleteBluePaymentDetails: function() {
            var bluePayments = JSON.parse(sessionStorage.getItem('bluePayments'));
            if(!_.isNull(bluePayments)) if(bluePayments.length > 1) sessionStorage.removeItem('bluePayments');
        },

        CheckAndUpdateMultiPaymentStorage: function() {
            var splitPaymentsArr = JSON.parse(sessionStorage.getItem('splitPayments'));

            if(!_.isNull(splitPaymentsArr)) {
                
                EPGPayment.updateBillingDetails.call(splitPaymentsArr[1].newBillingInfo);
                sessionStorage.setItem('splitPayments', JSON.stringify(splitPaymentsArr));
            }
        },
        
        updateBillingDetails: function() {
            this.externalTransactionId = sessionStorage.getItem('TransId');
            this.data = { TransactionId:sessionStorage.getItem('TransId') };
        },

        refactorCardKeys: function() {
            var requriedCardDetails = ['cardNumber', 'cardType', 'cvv', 'expireMonth', 'expireYear', 'id', 'nameOnCard', 'paymentOrCardType', 'paymentServiceCardId'];

            for (var key in this) {
                if(!requriedCardDetails.includes(key)) delete this[key];
            }

            if(!this.cardNumber.startsWith("*")) this.cardNumber =  this.cardNumber.split(' ').join('');
        },

        handleError: function(error) {
            switch (errorCases[error.name]) {
                case 0:
                    error.ResponseText = 'The Server Is Not Reachable';
                    if(!transactionIdDetail.isKNETPaymentType) CardTokenHandler.init(undefined, tokenizedObject.cardID, true, customerAttributes, true);
                    EPGPayment.handleSessionError(error);
                    break;
                case 1:
                    error.ResponseText = 'The Server Is Not Reachable';
                    if(!transactionIdDetail.isBenefitPayApply) CardTokenHandler.init(undefined, tokenizedObject.cardID, true, customerAttributes, true);
                    EPGPayment.handleSessionError(error);
                    break;
                case 2:
                    error.ResponseText = 'The Session Is Not Valid';
                    if(!transactionIdDetail.isOmanNetApply) CardTokenHandler.init(undefined, tokenizedObject.cardID, true, customerAttributes, true);
                    EPGPayment.handleSessionError(error);
                    break;
                case 3:
                    error.ResponseText = 'The Server Is Not Reachable';
                    if(!transactionIdDetail.isQpayApply) CardTokenHandler.init(undefined, tokenizedObject.cardID, true, customerAttributes, true);
                    EPGPayment.handleSessionError(error);
                    break;
                default:
                    console.log(error.message);
                    break;
            }
            EPGPayment.handleSessionError(error); // <-- log this too
        },

        handleSessionError: function(response) {
            var modelData = window.checkoutViews.reviewPanel.model;
            var paymentMethoderror = {"items":[{name: 'Session Error', message: response.ResponseText }]};
            modelData.initializeLoader('deactive', 'active');
            modelData.onCheckoutError(paymentMethoderror);
        },

        initiateLoader: function() {
            window.scrollTo(0, 0);
            this.get('billingInfo').parent.initializeLoader('active', 'deactive');
            $('.redirect-text').addClass('hidden');
        },

        getOrderItems: function() {
            var orderItems = [], itemObject;
            _.each(this.get('items'), function(item) {
                 itemObject = {
                    Name: item.product.name,
                    Identifier: item.product.productUsage.toLowerCase() == "configurable" ? item.product.variationProductCode:item.product.productCode,
                    Quantity: item.quantity,
                    UnitPrice: item.product.price.salePrice ? item.product.price.salePrice :item.product.price.price,
                    TotalPrice: item.subtotal
                };
                orderItems.push(itemObject);
            });

            return orderItems;
        },

        getTransactionId: function(val,type) {
            var transactionIdDetailAttr, transactionIdValue;

            if (val && type === "KNET")
                transactionIdDetailAttr = _.findWhere(customerAttributes, {fullyQualifiedName:"Tenant~customer-knet-transaction-id"});
            if (val && type === "APPLEPAY")
                transactionIdDetailAttr = _.findWhere(customerAttributes, {fullyQualifiedName:"Tenant~customer-applepay-transaction-id"});
            if (val && type === "BENEFITPAY")
                transactionIdDetailAttr = _.findWhere(customerAttributes, {fullyQualifiedName:"Tenant~customer-benefitpay-transaction-id"});
            if (val && type === "QPAY")
                transactionIdDetailAttr = _.findWhere(customerAttributes, {fullyQualifiedName:"Tenant~customer-qpay-transaction-id"});
            if (val && type === "OMANNET")
                transactionIdDetailAttr = _.findWhere(customerAttributes, {fullyQualifiedName:"Tenant~customer-omannet-transaction-id"}); // ✅ Add this
        
            if (transactionIdDetailAttr) transactionIdValue = transactionIdDetailAttr.values;
            if (transactionIdValue && transactionIdValue.length)
                return JSON.parse(transactionIdValue[0]);
        },
        checkTransactionIDDetails: function(val,type) {
            // If User  Authenticate && Not Anonymous 
            // Then If isTransactionId Exist
            // Fetch TransactionId
            // else Set Flag To Notify To Add TransactionId
            /*if(!EPGPayment.isAuthenticateGuestUser()) {*/
            var transactionIdValue = EPGPayment.getTransactionId(val, type);
            if (transactionIdValue) {
                transactionIdDetail.transactionId = transactionIdValue;
                transactionIdDetail.isTransactionIdExist = true;
                transactionIdDetail.isKNETPaymentType = (type === "KNET") ? val : false;
                transactionIdDetail.isApplePayPaymentType = (type === "APPLEPAY") ? val : false;
                transactionIdDetail.isBenefitPayApply = (type === "BENEFITPAY") ? val : false;
                transactionIdDetail.isOmanNetApply = (type === "OMANNET") ? val : false; // ✅ Add this
                transactionIdDetail.isQpayApply = (type === "QPAY") ? val : false; // ✅ Add this
                }
            /*}*/
        },

        isAuthenticateGuestUser: function() {
            return pageContext.user.isAnonymous && pageContext.user.isAuthenticated;
        },

        redirectToEPGPortal: function(RedirectionURL) { window.location.href = RedirectionURL; },

        updateTransactionID: function(TransactionID, RedirectionURL) {
            TransactionHandler
            .init(TransactionID)
            .then(function() {
                EPGPayment.redirectToEPGPortal(RedirectionURL);
            })
            .catch(function(error) {
                console.log('Transaction Id Update Operation Failed',error);
            });
        },

        updateApplePayTransactionID: function(TransactionID, RedirectionURL) {
            TransactionHandlerApplepay
            .init(TransactionID)
            .then(function() {
                EPGPayment.redirectToEPGPortal(RedirectionURL);
            })
            .catch(function(error) {
                console.log('Transaction Id Update Operation Failed',error);
            });
        },

        handleKNETRedirection: function(RedirectionURL, TransactionID) {
            EPGPayment.redirectToEPGPortal(RedirectionURL);
            /*if(!pageContext.user.isAuthenticated)
                EPGPayment.redirectToEPGPortal(RedirectionURL); 
            else 
                EPGPayment.updateTransactionID(TransactionID, RedirectionURL);*/
        },
        handleBenefitPayRedirection: function(RedirectionURL, TransactionID) {
           console.log("BenefitPay Redirection URL:", RedirectionURL);
            window.order.get("billingInfo").set("data", { benefitTransactionId: TransactionID});
                    window.order.apiUpdate().then(function() {
                        EPGPayment.redirectToEPGPortal(RedirectionURL)
                    });
            
            //EPGPayment.redirectToEPGPortal(RedirectionURL);
            // Or, if you're using transaction update like ApplePay:
            // if (!EPGPayment.isAuthenticateGuestUser() || transactionIdDetail.isTransactionIdExist)
            //     EPGPayment.redirectToEPGPortal(RedirectionURL); 
            // else 
            //     EPGPayment.updateTransactionID(TransactionID, RedirectionURL);
        },
        handleQpayRedirection: function(RedirectionURL, TransactionID) {
            console.log("QPay Redirection URL:", RedirectionURL)
            window.order.get("billingInfo").set("data", { qpayTransactionId: TransactionID});
                    window.order.apiUpdate().then(function() {
                        EPGPayment.redirectToEPGPortal(RedirectionURL)
                    });
            
            //EPGPayment.redirectToEPGPortal(RedirectionURL);       
            // Or, if you're using transaction update like ApplePay:
            // if (!EPGPayment.isAuthenticateGuestUser() || transactionIdDetail.isTransactionIdExist)
            //     EPGPayment.redirectToEPGPortal(RedirectionURL);
            // else 
            //     EPGPayment.updateTransactionID(TransactionID, RedirectionURL);
        },
        handleOmanNetRedirection: function(RedirectionURL, TransactionID) {
            console.log("OmanNet Redirection URL:", RedirectionURL)
            window.order.get("billingInfo").set("data", { omannetTransactionId: TransactionID});
                    window.order.apiUpdate().then(function() {
                        EPGPayment.redirectToEPGPortal(RedirectionURL)
                    });
            
            //EPGPayment.redirectToEPGPortal(RedirectionURL);
            // Or, if you're using transaction update like ApplePay:
            // if (!EPGPayment.isAuthenticateGuestUser() || transactionIdDetail.isTransactionIdExist)
            //     EPGPayment.redirectToEPGPortal(RedirectionURL); 
            // else 
            //     EPGPayment.updateTransactionID(TransactionID, RedirectionURL);
        },

        handleAppleRedirection: function(RedirectionURL, TransactionID) {
            if(!EPGPayment.isAuthenticateGuestUser() || transactionIdDetail.isTransactionIdExist)
                EPGPayment.redirectToEPGPortal(RedirectionURL); 
            else 
                EPGPayment.updateApplePayTransactionID(TransactionID, RedirectionURL);
        }
        
        
    };

    return EPGPayment;
});